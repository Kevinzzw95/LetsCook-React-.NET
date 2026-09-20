import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from tavily import AsyncTavilyClient

from app.core.config import get_settings
from app.services.chat_graph.state import ChatIntent


logger = logging.getLogger(__name__)


class WebSearchQueryPlan(BaseModel):
    queries: list[str] = Field(min_length=2, max_length=3)


@dataclass
class RankedCandidate:
    url: str
    hits: int = 0
    reciprocal_rank: float = 0.0
    tavily_score: float = 0.0
    first_seen: int = 0


QUERY_PLANNER_PROMPT = """You plan web searches for recipes.
Break the user's request into 2 or 3 complementary, focused, standalone search queries.
Preserve explicit ingredients, cuisine, dietary restrictions, cooking method, and time constraints.
Do not add site: filters or domain names because the search provider applies domain filters separately.
Do not invent requirements. Return only the structured query plan."""


def _normalized_domain(value: str) -> str | None:
    candidate = value.strip()
    if not candidate:
        return None
    parsed = urlparse(candidate if "://" in candidate else f"//{candidate}")
    hostname = (parsed.hostname or "").lower().removeprefix("www.")
    if not hostname or hostname == "google.com" or hostname.endswith(".google.com"):
        return None
    return hostname


def _preferred_domains(settings: Any) -> list[str]:
    configured = getattr(settings, "web_recipe_preferred_domains", []) or []
    domains = [
        domain
        for value in configured
        if (domain := _normalized_domain(value))
    ]
    return list(dict.fromkeys(domains))


def _matches_preferred_domain(url: str, domains: list[str]) -> bool:
    if not domains:
        return True
    hostname = (urlparse(url).hostname or "").lower().removeprefix("www.")
    return any(hostname == domain or hostname.endswith(f".{domain}") for domain in domains)


def _tavily_results(payload: Any, domains: list[str]) -> list[tuple[str, float]]:
    if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
        return []

    results: list[tuple[str, float]] = []
    seen: set[str] = set()
    for item in payload["results"]:
        url = item.get("url") if isinstance(item, dict) else None
        if not isinstance(url, str):
            continue
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            continue
        candidate = url.split("#", 1)[0]
        if not _matches_preferred_domain(candidate, domains) or candidate in seen:
            continue
        raw_score = item.get("score", 0.0)
        score = float(raw_score) if isinstance(raw_score, (int, float)) else 0.0
        results.append((candidate, max(0.0, min(score, 1.0))))
        seen.add(candidate)
    return results


def _tavily_result_links(payload: Any, domains: list[str]) -> list[str]:
    return [url for url, _ in _tavily_results(payload, domains)]


def _needs_query_planning(query: str) -> bool:
    return len(query.split()) >= 8 or len("".join(query.split())) >= 32


def _normalized_queries(values: list[Any]) -> list[str]:
    queries: list[str] = []
    seen: set[str] = set()
    for value in values:
        if not isinstance(value, str):
            continue
        query = " ".join(value.split()).strip()
        key = query.casefold()
        if not query or key in seen:
            continue
        queries.append(query)
        seen.add(key)
    return queries[:3]


async def _plan_search_queries(query: str, intent: ChatIntent, settings: Any) -> list[str]:
    if not _needs_query_planning(query) or not settings.openai_api_key:
        return [query]

    try:
        planner = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=0,
        ).with_structured_output(WebSearchQueryPlan)
        plan = await planner.ainvoke([
            SystemMessage(content=QUERY_PLANNER_PROMPT),
            HumanMessage(content=f"Intent: {intent}\nUser request: {query}"),
        ])
        values = plan.queries if isinstance(plan, WebSearchQueryPlan) else plan.get("queries", [])
        planned_queries = _normalized_queries(values)
        if len(planned_queries) >= 2:
            logger.info("Web query planner produced %s focused queries", len(planned_queries))
            return planned_queries
    except Exception as exc:
        logger.warning("Web query planning failed: %s", type(exc).__name__)

    return [query]


def _rerank_candidates(result_sets: list[list[tuple[str, float]]], maximum_results: int) -> list[str]:
    candidates: dict[str, RankedCandidate] = {}
    first_seen = 0
    for results in result_sets:
        for rank, (url, tavily_score) in enumerate(results, start=1):
            candidate = candidates.get(url)
            if candidate is None:
                candidate = RankedCandidate(url=url, first_seen=first_seen)
                candidates[url] = candidate
                first_seen += 1
            candidate.hits += 1
            candidate.reciprocal_rank += 1 / (60 + rank)
            candidate.tavily_score = max(candidate.tavily_score, tavily_score)

    ranked = sorted(
        candidates.values(),
        key=lambda item: (-item.hits, -item.reciprocal_rank, -item.tavily_score, item.first_seen),
    )
    return [candidate.url for candidate in ranked[:maximum_results]]


async def _search_web_with_tavily(
    query: str,
    settings: Any,
    tavily_client: AsyncTavilyClient,
) -> list[tuple[str, float]]:
    maximum_results = settings.web_recipe_search_max_results
    domains = _preferred_domains(settings)

    try:
        logger.info("Tavily web discovery started for query=%r domains=%s", query, domains)
        search_payload = await tavily_client.search(
            query=query,
            search_depth="basic",
            topic="general",
            include_domains=domains or None,
            max_results=maximum_results,
            include_answer=False,
            include_raw_content=False,
            include_images=False,
        )
    except Exception as exc:
        logger.warning("Tavily web discovery failed: %s", type(exc).__name__)
        return []

    candidates = _tavily_results(search_payload, domains)[:maximum_results]
    logger.info("Tavily web discovery produced %s candidate URL(s)", len(candidates))
    return candidates


async def search_web_for_recipes(query: str, intent: ChatIntent) -> list[str]:
    settings = get_settings()
    if not settings.tavily_api_key:
        logger.warning("Tavily web discovery is disabled because TAVILY_API_KEY is not configured")
        return []

    tavily_client = AsyncTavilyClient(api_key=settings.tavily_api_key)
    try:
        planned_queries = await _plan_search_queries(query, intent, settings)
        result_sets = await asyncio.gather(*(
            _search_web_with_tavily(planned_query, settings, tavily_client)
            for planned_query in planned_queries
        ))
        return _rerank_candidates(result_sets, settings.web_recipe_search_max_results)
    finally:
        await tavily_client.close()


@tool
async def search_web(query: str) -> str:
    """Find public recipe pages and return ranked candidate URLs only."""
    results = await search_web_for_recipes(query, "recipe_search")
    return json.dumps(results, ensure_ascii=False)
