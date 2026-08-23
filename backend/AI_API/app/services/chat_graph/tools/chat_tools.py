import json
from typing import Annotated, Any, Literal

from langchain_core.messages import ToolMessage
from langchain_core.tools import BaseTool, tool
from langgraph.prebuilt import InjectedState

from app.services.chat_graph.tools.nutrition_api import summarize_nutrition_constraints
from app.services.chat_graph.tools.recipe_db import recipe_documents_to_results, retrieve_recipe_documents
from app.services.chat_graph.tools.social_search import search_social_recipes
from app.services.chat_graph.tools.web_search import search_web_for_recipes


@tool
async def search_letscook_recipes(
    query: str,
    cuisine: str | None = None,
    diet: str | None = None,
    maximum_calories: int | None = None,
    minimum_protein: int | None = None,
    allergies: list[str] | None = None,
) -> str:
    """Search the LetsCook recipe database when saved recipe facts or matches are needed."""
    attributes = {
        "cuisine": cuisine,
        "diet": diet,
        "calories": maximum_calories,
        "protein": minimum_protein,
        "allergies": allergies or [],
    }
    documents = await retrieve_recipe_documents(query, attributes)
    return json.dumps(recipe_documents_to_results(documents), ensure_ascii=False, default=str)


@tool
async def search_public_recipes(query: str) -> str:
    """Search public web recipe information when broader recipe knowledge is required."""
    results = await search_web_for_recipes(query, "recipe_search")
    return json.dumps(results, ensure_ascii=False, default=str)


@tool
async def search_social_recipe_trends(query: str) -> str:
    """Search social recipe trends when the user asks about viral or platform-specific recipes."""
    results = await search_social_recipes(query, "recipe_search")
    return json.dumps(results, ensure_ascii=False, default=str)


@tool
async def get_nutrition_constraints(query: str) -> str:
    """Extract high-protein, low-carb, or low-calorie guidance when nutrition constraints are needed."""
    notes = await summarize_nutrition_constraints(query)
    return json.dumps(notes, ensure_ascii=False)


def _external_search_payload(state: dict[str, Any], source: Literal["web", "social"]) -> list[Any]:
    payloads: list[Any] = list(state.get(f"{source}_results", []))
    tool_name = "search_public_recipes" if source == "web" else "search_social_recipe_trends"
    for message in state.get("messages", []):
        if not isinstance(message, ToolMessage) or message.name != tool_name:
            continue
        try:
            parsed = json.loads(str(message.content))
        except json.JSONDecodeError:
            continue
        payloads.extend(parsed if isinstance(parsed, list) else [parsed])
    return payloads


def _matching_external_recipe(
    payloads: list[Any],
    title: str,
    source_url: str | None,
) -> dict[str, Any] | None:
    normalized_title = title.strip().lower()
    normalized_url = (source_url or "").strip().lower()
    for payload in payloads:
        if not isinstance(payload, dict):
            continue
        payload_title = str(payload.get("title") or "").strip().lower()
        payload_url = str(payload.get("source_url") or "").strip().lower()
        if normalized_url and payload_url == normalized_url:
            return payload
        if normalized_title and payload_title == normalized_title:
            return payload
    return None


def _is_qualified_web_recipe(recipe: dict[str, Any]) -> bool:
    return bool(
        str(recipe.get("title") or "").strip()
        and str(recipe.get("source_url") or "").strip()
        and isinstance(recipe.get("ingredients"), list)
        and recipe["ingredients"]
        and isinstance(recipe.get("steps"), list)
        and recipe["steps"]
    )


def extract_recipe_preview(messages: list[Any]) -> dict[str, Any] | None:
    for message in reversed(messages):
        if not isinstance(message, ToolMessage) or message.name != "create_recipe_preview":
            continue
        try:
            payload = json.loads(str(message.content))
        except json.JSONDecodeError:
            return None
        if isinstance(payload, dict) and payload.get("kind") == "recipe_preview":
            recipe = payload.get("recipe")
            return recipe if isinstance(recipe, dict) else None
    return None


@tool
async def create_recipe_preview(
    source: Literal["web", "social"],
    title: str,
    ingredients: list[dict[str, Any]] | None = None,
    steps: list[dict[str, Any]] | None = None,
    servings: int = 1,
    preparation_minutes: int = 0,
    images: list[str] | None = None,
    source_url: str | None = None,
    recipe_type: str | None = None,
    cuisine: str | None = None,
    diet: str | None = None,
    state: Annotated[dict[str, Any], InjectedState] = None,
) -> str:
    """Create a RecipeDraft preview only for a recipe returned by a web or social search tool."""
    search_payload = _external_search_payload(state or {}, source)
    matched_recipe = _matching_external_recipe(search_payload, title, source_url)
    if matched_recipe is None:
        return json.dumps({
            "kind": "recipe_preview_error",
            "error": "A recipe preview must be based on a web or social search result",
        })

    if source == "web":
        if not _is_qualified_web_recipe(matched_recipe):
            return json.dumps({
                "kind": "recipe_preview_error",
                "error": "The web result does not contain enough detail for a recipe preview",
            })
        title = str(matched_recipe["title"])
        ingredients = matched_recipe["ingredients"]
        steps = matched_recipe["steps"]
        servings = int(matched_recipe.get("servings") or 1)
        preparation_minutes = int(matched_recipe.get("preparation_minutes") or 0)
        images = matched_recipe.get("images") or []
        source_url = str(matched_recipe["source_url"])
        recipe_type = str(matched_recipe.get("type") or "")
        cuisine = str(matched_recipe.get("cuisine") or "")
        diet = str(matched_recipe.get("diet") or "")

    normalized_ingredients = [
        {
            "id": str(item.get("id") or index + 1),
            "name": str(item.get("name") or "").strip(),
            "amount": str(item.get("amount") or ""),
            "unit": str(item.get("unit") or ""),
            **({"image": item["image"]} if item.get("image") else {}),
        }
        for index, item in enumerate(ingredients or [])
        if isinstance(item, dict) and str(item.get("name") or "").strip()
    ]
    normalized_steps = [
        {
            "id": str(item.get("id") or index + 1),
            "stepNumber": index + 1,
            "description": str(item.get("description") or "").strip(),
        }
        for index, item in enumerate(steps or [])
        if isinstance(item, dict) and str(item.get("description") or "").strip()
    ]
    preview = {
        "title": title.strip(),
        "servings": max(1, servings),
        "preparationMinutes": max(0, preparation_minutes),
        "type": recipe_type or "",
        "cuisine": cuisine or "",
        "diet": diet or "",
        "ingredients": normalized_ingredients,
        "ingredientsEn": normalized_ingredients,
        "steps": normalized_steps,
        "images": [image for image in images or [] if image],
        "sourceName": source,
        "sourceUrl": source_url,
    }
    return json.dumps({"kind": "recipe_preview", "recipe": preview}, ensure_ascii=False)


CHAT_TOOLS: list[BaseTool] = [
    search_letscook_recipes,
    search_public_recipes,
    search_social_recipe_trends,
    get_nutrition_constraints,
    create_recipe_preview,
]
