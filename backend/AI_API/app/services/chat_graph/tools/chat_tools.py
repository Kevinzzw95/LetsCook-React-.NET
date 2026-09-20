import json

from langchain_core.tools import BaseTool, tool

from app.services.chat_graph.tools.meal_plan import plan_daily_meals
from app.services.chat_graph.tools.nutrition_api import summarize_nutrition_constraints
from app.services.chat_graph.tools.recipe_db import recipe_documents_to_results, retrieve_recipe_documents
from app.services.chat_graph.tools.web_search import search_web


@tool
async def search_internal(
    query: str,
    user_id: str | None = None,
    cuisine: str | None = None,
    diet: str | None = None,
    maximum_calories: int | None = None,
    minimum_protein: int | None = None,
    allergies: list[str] | None = None,
) -> str:
    """Search the LetsCook recipe database when saved recipe facts or matches are needed."""
    attributes = {
        "user_id": user_id,
        "cuisine": cuisine,
        "diet": diet,
        "calories": maximum_calories,
        "protein": minimum_protein,
        "allergies": allergies or [],
    }
    documents = await retrieve_recipe_documents(query, attributes)
    return json.dumps(recipe_documents_to_results(documents), ensure_ascii=False, default=str)


@tool
async def nutrition_tool(query: str) -> str:
    """Extract high-protein, low-carb, or low-calorie guidance when nutrition constraints are needed."""
    notes = await summarize_nutrition_constraints(query)
    return json.dumps(notes, ensure_ascii=False)


CHAT_TOOLS: list[BaseTool] = [
    search_internal,
    search_web,
    nutrition_tool,
    plan_daily_meals,
]
