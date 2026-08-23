import json
import logging
import re
from html import unescape
from typing import Any, Iterator
from urllib.parse import quote_plus, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.core.config import get_settings
from app.services.chat_graph.state import ChatIntent


logger = logging.getLogger(__name__)


def _nodes(value: Any) -> Iterator[dict[str, Any]]:
    if isinstance(value, dict):
        recipe_type = value.get("@type")
        types = recipe_type if isinstance(recipe_type, list) else [recipe_type]
        if "Recipe" in types:
            yield value
        for child in value.values():
            yield from _nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from _nodes(child)


def _minutes(value: Any) -> int:
    if not isinstance(value, str):
        return 0
    match = re.fullmatch(r"P(?:(?P<days>\d+)D)?T?(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?", value)
    if not match:
        return 0
    return int(match.group("days") or 0) * 1440 + int(match.group("hours") or 0) * 60 + int(match.group("minutes") or 0)


def _images(value: Any) -> list[str]:
    values = value if isinstance(value, list) else [value]
    images: list[str] = []
    for item in values:
        url = item.get("url") if isinstance(item, dict) else item
        if isinstance(url, str) and url.startswith(("http://", "https://")):
            images.append(url)
    return list(dict.fromkeys(images))


def _instructions(value: Any) -> list[dict[str, Any]]:
    steps: list[dict[str, Any]] = []
    values = value if isinstance(value, list) else [value]
    for item in values:
        if isinstance(item, str):
            description = item
        elif isinstance(item, dict) and isinstance(item.get("itemListElement"), list):
            steps.extend(_instructions(item["itemListElement"]))
            continue
        elif isinstance(item, dict):
            description = item.get("text") or item.get("name") or ""
        else:
            description = ""
        if str(description).strip():
            steps.append({"stepNumber": len(steps) + 1, "description": str(description).strip()})
    return steps


def _servings(value: Any) -> int:
    if isinstance(value, list):
        value = value[0] if value else ""
    match = re.search(r"\d+", str(value or ""))
    return max(1, int(match.group())) if match else 1


def _plain_text(value: Any) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", unescape(str(value or "")))).strip()


def _recipe_result(recipe: dict[str, Any], source_url: str) -> dict[str, Any] | None:
    title = _plain_text(recipe.get("name") or recipe.get("headline"))
    if not title:
        return None
    prep_minutes = _minutes(recipe.get("prepTime"))
    cook_minutes = _minutes(recipe.get("cookTime"))
    total_minutes = _minutes(recipe.get("totalTime"))
    ingredients = [
        {"name": _plain_text(item), "amount": "", "unit": ""}
        for item in recipe.get("recipeIngredient", [])
        if _plain_text(item)
    ]
    return {
        "source": "web",
        "title": title,
        "summary": _plain_text(recipe.get("description")),
        "source_url": source_url,
        "images": _images(recipe.get("image")),
        "servings": _servings(recipe.get("recipeYield")),
        "preparation_minutes": prep_minutes or max(0, total_minutes - cook_minutes),
        "cooking_minutes": cook_minutes,
        "cuisine": _plain_text(recipe.get("recipeCuisine")),
        "type": _plain_text(recipe.get("recipeCategory")),
        "diet": _plain_text(recipe.get("suitableForDiet")),
        "ingredients": ingredients,
        "steps": _instructions(recipe.get("recipeInstructions", [])),
    }


def _extract_recipes(html: str, source_url: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    results: list[dict[str, Any]] = []
    for element in soup.select("script[type='application/ld+json']"):
        raw_json = element.string or element.get_text()
        if not raw_json.strip():
            continue
        try:
            payload = json.loads(raw_json)
        except json.JSONDecodeError:
            continue
        for recipe in _nodes(payload):
            normalized = _recipe_result(recipe, source_url)
            if normalized:
                results.append(normalized)
    return results


def _same_domain_links(html: str, source_url: str) -> list[str]:
    source_host = urlparse(source_url).netloc.lower()
    links: list[str] = []
    for element in BeautifulSoup(html, "html.parser").select("a[href]"):
        href = element.get("href")
        if not isinstance(href, str):
            continue
        absolute_url = urljoin(source_url, href).split("#", 1)[0]
        parsed = urlparse(absolute_url)
        if parsed.scheme in {"http", "https"} and parsed.netloc.lower() == source_host:
            links.append(absolute_url)
    return list(dict.fromkeys(links))


def _target_url(template: str, query: str, intent: ChatIntent) -> str | None:
    try:
        target = template.format(query=quote_plus(query), intent=quote_plus(intent))
    except (KeyError, ValueError):
        return None
    parsed = urlparse(target)
    return target if parsed.scheme in {"http", "https"} and parsed.netloc else None


async def search_web_for_recipes(query: str, intent: ChatIntent) -> list[dict[str, Any]]:
    settings = get_settings()
    targets = [
        target
        for template in settings.web_recipe_search_urls
        if (target := _target_url(template, query, intent))
    ]
    if not targets:
        return []

    maximum_results = settings.web_recipe_search_max_results
    results: list[dict[str, Any]] = []
    headers = {"User-Agent": "LetsCookRecipeSearch/1.0"}
    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=10.0) as client:
        for target in targets:
            if len(results) >= maximum_results:
                break
            try:
                response = await client.get(target)
            except httpx.HTTPError as exc:
                logger.warning("Recipe search request failed for %s: %s", target, exc)
                continue
            if response.status_code >= 400:
                logger.warning("Recipe search target returned HTTP %s: %s", response.status_code, target)
                continue

            direct_recipes = _extract_recipes(response.text, str(response.url))
            results.extend(direct_recipes[: maximum_results - len(results)])
            if len(results) >= maximum_results:
                break

            candidates = [
                link for link in _same_domain_links(response.text, str(response.url))
                if link != str(response.url).split("#", 1)[0]
            ]
            for candidate in candidates[: maximum_results * 4]:
                if len(results) >= maximum_results:
                    break
                try:
                    candidate_response = await client.get(candidate)
                except httpx.HTTPError:
                    continue
                if candidate_response.status_code >= 400:
                    continue
                recipes = _extract_recipes(candidate_response.text, str(candidate_response.url))
                results.extend(recipes[: maximum_results - len(results)])

    deduplicated: dict[str, dict[str, Any]] = {}
    for result in results:
        key = str(result.get("source_url") or result.get("title"))
        deduplicated.setdefault(key, result)
    return list(deduplicated.values())[:maximum_results]
