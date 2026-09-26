import logging

from langchain_core.tools import tool

from app.schemas.meal_plan import MealPlanSaveResult, ScheduledMeal
from app.services.meal_plan_repository import append_meals
from app.services.chat_graph.tools.meal_plan import MealPlanRequirements

logger = logging.getLogger(__name__)


@tool
async def save_meal_plan(user_id: str, entries: list[ScheduledMeal], requirements: MealPlanRequirements) -> str:
    """Append explicitly requested meals to the authenticated user's calendar atomically.

    The application supplies user_id and verified selections, never recipe prose or model-selected ownership.
    Existing identical entries are returned without inserting duplicates.
    """
    try:
        saved = await append_meals(user_id, entries, requirements)
        result = MealPlanSaveResult(status='saved' if any(e.status == 'saved' for e in saved) else 'unchanged', entries=saved)
    except Exception as exc:
        logger.warning('Meal-plan save failed: %s', type(exc).__name__)
        result = MealPlanSaveResult(status='failed', reason='Could not confirm saving. Check the calendar before retrying.')
    return result.model_dump_json()
