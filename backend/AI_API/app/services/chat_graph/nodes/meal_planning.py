import json

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import get_settings
from app.services.chat_graph.state import ChatGraphState
from app.services.chat_graph.tools.meal_plan import MealPlanRequirements, plan_daily_meals


async def meal_planning_agent(state: ChatGraphState) -> ChatGraphState:
    if not state.get("user_id"):
        return {"meal_plan": {"status": "authentication_required", "days": []}}
    settings = get_settings()
    model = ChatOpenAI(
        model=settings.openai_model, api_key=settings.openai_api_key, temperature=0,
    ).with_structured_output(MealPlanRequirements)
    try:
        requirements = await model.ainvoke([
            SystemMessage(content=(
                "Extract meal planning requirements from the conversation, with latest user changes taking precedence. "
                "Default to one day and breakfast, lunch, dinner. Nutrition bounds are daily: calories in kcal, "
                "protein/carbohydrate/fat in grams. Do not invent numerical targets for vague goals such as healthy "
                "or high protein: put requests needing numerical clarification in unsupported_requirements. "
                "Use diets for explicit diet labels (vegan, vegetarian, gluten-free, etc.) and allergies for "
                "excluded ingredients. All explicit requirements that this schema cannot express, including "
                "per-meal targets, portion sizes, timing and more than 14 days, go in unsupported_requirements. "
                "For an exact daily target set both minimum and maximum. Never silently drop a requirement."
            )),
            *[message for message in state.get("messages", []) if message.type in {"human", "ai"}],
            HumanMessage(content=state.get("request", "")),
        ])
    except Exception:
        return {"meal_plan": {
            "status": "needs_clarification", "days": [],
            "notes": ["Could not interpret meal requirements. Ask for days, diets, and daily nutrition ranges."],
        }}
    payload = await plan_daily_meals.ainvoke({
        "requirements": requirements.model_dump(), "user_id": state["user_id"],
    })
    return {"meal_plan": json.loads(payload)}
