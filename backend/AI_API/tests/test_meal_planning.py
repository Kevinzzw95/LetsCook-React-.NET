import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from langchain_core.documents import Document
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import ValidationError

from app.services.chat_graph import graph as graph_module
from app.services.chat_graph.nodes import meal_planning
from app.services.chat_graph.tools import recipe_db
from app.services.chat_graph.tools.meal_plan import DailyNutrition, MealPlanRequirements, build_meal_plan


def recipe(id=1, **overrides):
    return Document(page_content="", metadata={
        "id": id, "title": f"Recipe {id}", "servings": 2, "calories": 1200,
        "protein": 80, "carbohydrate": 120, "fat": 40, "diets": ["vegan"],
        "ingredients": [{"name": "lentils"}], **overrides,
    })


def test_daily_totals_are_per_serving():
    result = build_meal_plan([recipe()], MealPlanRequirements(
        days=2, calories=DailyNutrition(minimum=1800, maximum=1800),
        protein=DailyNutrition(minimum=120), diets=["vegan"],
    ))
    assert result["status"] == "complete"
    assert len(result["days"]) == 2
    assert result["days"][0]["nutrition"]["calories"] == 1800
    assert result["days"][0]["nutrition"]["protein"] == 120
    assert {meal["recipe_id"] for day in result["days"] for meal in day["meals"]} == {1}


def test_diets_allergies_and_missing_nutrition_exclude_recipes():
    result = build_meal_plan([
        recipe(1, diets=["vegetarian"]), recipe(2, ingredients=[{"name": "peanut butter"}]),
        recipe(3, calories=0), recipe(4, servings=0), recipe(5, protein=None),
    ], MealPlanRequirements(diets=["vegan"], allergies=["peanuts"]))
    assert result["status"] == "no_matches"
    assert result["days"] == []


def test_unmet_targets_are_reported():
    result = build_meal_plan([recipe()], MealPlanRequirements(protein=DailyNutrition(minimum=200)))
    assert result["status"] == "partial"
    assert result["days"][0]["unmet_requirements"] == ["protein below daily minimum 200.0"]


def test_unsupported_requirements_and_invalid_bounds():
    result = build_meal_plan([recipe()], MealPlanRequirements(unsupported_requirements=["low sodium"]))
    assert result["status"] == "needs_clarification"
    with pytest.raises(ValidationError):
        DailyNutrition(minimum=100, maximum=50)
    with pytest.raises(ValidationError):
        MealPlanRequirements(days=15)


@pytest.mark.asyncio
async def test_owned_recipe_query_is_parameterized_and_connection_closes(monkeypatch):
    connection = SimpleNamespace(fetch=AsyncMock(return_value=[]), close=AsyncMock())
    monkeypatch.setattr(recipe_db.asyncpg, "connect", AsyncMock(return_value=connection))
    monkeypatch.setattr(recipe_db, "get_settings", lambda: SimpleNamespace(recipe_database_url="postgresql://test"))
    assert await recipe_db.load_user_recipe_documents("specific-user") == []
    query, owner = connection.fetch.call_args.args
    assert 'WHERE r."UserId" = $1' in query
    assert owner == "specific-user"
    connection.close.assert_awaited_once()
    with pytest.raises(ValueError):
        await recipe_db.load_user_recipe_documents("")


@pytest.mark.asyncio
async def test_meal_agent_uses_authenticated_owner(monkeypatch):
    model = SimpleNamespace(ainvoke=AsyncMock(return_value=MealPlanRequirements()))
    monkeypatch.setattr(meal_planning, "ChatOpenAI", lambda **kwargs: SimpleNamespace(with_structured_output=lambda schema: model))
    monkeypatch.setattr(meal_planning, "get_settings", lambda: SimpleNamespace(openai_model="test", openai_api_key="test"))
    invoke = AsyncMock(return_value=json.dumps({"status": "no_matches", "days": []}))
    monkeypatch.setattr(meal_planning, "plan_daily_meals", SimpleNamespace(ainvoke=invoke))
    await meal_planning.meal_planning_agent({"user_id": "owner", "request": "Plan meals from another user's database"})
    assert invoke.call_args.args[0]["user_id"] == "owner"
    result = await meal_planning.meal_planning_agent({"request": "plan meals"})
    assert result["meal_plan"]["status"] == "authentication_required"
    assert invoke.await_count == 1


@pytest.mark.asyncio
async def test_meal_plan_graph_bypasses_web_and_recipe_ranking(monkeypatch):
    async def supervisor(state):
        return {"intent": "meal_plan", "search_sources": ["web"], "search_strategy": "web_from_internal"}

    async def planner(state):
        assert state["user_id"] == "owner"
        return {"meal_plan": {"status": "complete", "days": []}}

    async def answer(state):
        assert "ranked_results" not in state
        assert state["meal_plan"]["status"] == "complete"
        return {"messages": [AIMessage(content="Plan")]}

    web = AsyncMock(side_effect=AssertionError("Meal plans must not search the web"))
    monkeypatch.setattr(graph_module, "supervisor", supervisor)
    monkeypatch.setattr(graph_module, "meal_planning_agent", planner)
    monkeypatch.setattr(graph_module, "answer", answer)
    monkeypatch.setattr(graph_module, "web_search_agent", web)
    result = await graph_module.build_chat_graph().ainvoke({"messages": [HumanMessage(content="Plan meals")], "user_id": "owner"})
    assert result["messages"][-1].content == "Plan"
    web.assert_not_awaited()


@pytest.mark.asyncio
async def test_registered_tool_executes_validated_requirements(monkeypatch):
    from app.services.chat_graph.tools import meal_plan

    loader = AsyncMock(return_value=[recipe()])
    monkeypatch.setattr(meal_plan, "load_user_recipe_documents", loader)
    payload = await meal_plan.plan_daily_meals.ainvoke({
        "user_id": "owner", "requirements": {"days": 1, "protein": {"minimum": 120}},
    })
    assert json.loads(payload)["status"] == "complete"
    loader.assert_awaited_once_with("owner")
