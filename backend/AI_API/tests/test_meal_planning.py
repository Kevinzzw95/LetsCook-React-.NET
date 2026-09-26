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
    assert result["status"] == "candidates_found"
    assert result["unverified_requirements"] == ["low sodium"]
    assert result["days"] == []
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
    model = SimpleNamespace(ainvoke=AsyncMock(return_value=MealPlanRequirements(
        ingredients=["lentils"], diets=["vegan"], allergies=["peanuts"],
        protein=DailyNutrition(minimum=120),
    )))
    monkeypatch.setattr(meal_planning, "ChatOpenAI", lambda **kwargs: SimpleNamespace(with_structured_output=lambda schema: model))
    monkeypatch.setattr(meal_planning, "get_settings", lambda: SimpleNamespace(openai_model="test", openai_api_key="test"))
    search = AsyncMock(return_value=json.dumps([{"id": 1}, {"id": 1}, {"title": "No ID"}]))
    monkeypatch.setattr(meal_planning, "search_internal", SimpleNamespace(ainvoke=search))
    invoke = AsyncMock(return_value=json.dumps({"status": "no_matches", "days": []}))
    monkeypatch.setattr(meal_planning, "plan_daily_meals", SimpleNamespace(ainvoke=invoke))
    await meal_planning.meal_planning_agent({"user_id": "owner", "request": "Plan meals from another user's database"})
    assert invoke.call_args.args[0]["user_id"] == "owner"
    assert invoke.call_args.args[0]["candidate_recipe_ids"] == ["1"]
    assert search.call_args.args[0] == {
        "query": "lentils vegan",
        "user_id": "owner", "ingredients": ["lentils"], "ingredient_match_mode": "all",
        "diet": "vegan", "allergies": ["peanuts"],
    }
    result = await meal_planning.meal_planning_agent({"request": "plan meals"})
    assert result["meal_plan"]["status"] == "authentication_required"
    assert invoke.await_count == 1
    assert search.await_count == 1


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


def test_required_ingredients_filter_real_ingredient_records():
    requirements = MealPlanRequirements(ingredients=["  RICE ", "rice", "black   beans"])
    assert requirements.ingredients == ["rice", "black beans"]
    result = build_meal_plan([
        recipe(1, ingredients=[{"name": "brown rice"}, {"original": "1 cup black beans"}]),
        recipe(2, ingredients=[{"name": "licorice"}, {"name": "black beans"}]),
        recipe(3, title="Rice and black beans", ingredients=[]),
        recipe(4, ingredients=[{"name": "rice"}]),
    ], requirements)
    assert result["status"] == "complete"
    assert {meal["recipe_id"] for meal in result["days"][0]["meals"]} == {1}
    assert result["requirements"]["ingredients"] == ["rice", "black beans"]
    with pytest.raises(ValidationError):
        MealPlanRequirements(ingredients=[" "])


def test_required_ingredient_cannot_override_exclusion():
    result = build_meal_plan([recipe()], MealPlanRequirements(ingredients=["lentils"], allergies=["lentils"]))
    assert result["status"] == "no_matches"


@pytest.mark.asyncio
async def test_search_candidates_are_reloaded_and_rechecked(monkeypatch):
    from app.services.chat_graph.tools import meal_plan

    loader = AsyncMock(return_value=[recipe(1), recipe(2), recipe(3, ingredients=[])])
    monkeypatch.setattr(meal_plan, "load_user_recipe_documents", loader)
    result = json.loads(await meal_plan.plan_daily_meals.ainvoke({
        "user_id": "owner", "requirements": {"ingredients": ["lentils"]},
        "candidate_recipe_ids": ["2", "3", "999"],
    }))
    assert {meal["recipe_id"] for meal in result["days"][0]["meals"]} == {2}
    loader.assert_awaited_once_with("owner")


@pytest.mark.asyncio
async def test_empty_search_results_do_not_fall_back_to_unfiltered_recipes(monkeypatch):
    from app.services.chat_graph.tools import meal_plan

    loader = AsyncMock()
    monkeypatch.setattr(meal_plan, "load_user_recipe_documents", loader)
    result = json.loads(await meal_plan.plan_daily_meals.ainvoke({
        "user_id": "owner", "requirements": {}, "candidate_recipe_ids": [],
    }))
    assert result["status"] == "no_matches"
    loader.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize("search_results", [[{"id": 2}, {"id": 1}, {"id": 999}], []])
async def test_unsupported_requirements_use_rag_and_return_owned_context(monkeypatch, search_results):
    from app.services.chat_graph.tools import meal_plan
    from app.services.chat_graph.nodes.answer import _build_context

    requirements = MealPlanRequirements(
        ingredients=["lentils"], diets=["vegan"], allergies=["peanuts"],
        protein=DailyNutrition(minimum=120),
        unsupported_requirements=["Use only lentils and rice from my pantry", "under 20 minutes"],
        recipe_search_attributes={"ingredients": ["lentils", "rice"], "maximum_cooking_minutes": 20},
    )
    model = SimpleNamespace(ainvoke=AsyncMock(return_value=requirements))
    monkeypatch.setattr(meal_planning, "ChatOpenAI", lambda **kwargs: SimpleNamespace(with_structured_output=lambda schema: model))
    monkeypatch.setattr(meal_planning, "get_settings", lambda: SimpleNamespace(openai_model="test", openai_api_key="test"))
    search = AsyncMock(return_value=json.dumps(search_results))
    monkeypatch.setattr(meal_planning, "search_internal", SimpleNamespace(ainvoke=search))
    documents = [recipe(1, user_id="owner"), recipe(2, user_id="owner", protein=None)]
    documents[1].page_content = "Saved recipe: quick lentil soup, simmer for 15 minutes."
    loader = AsyncMock(return_value=documents)
    monkeypatch.setattr(meal_plan, "load_user_recipe_documents", loader)

    result = await meal_planning.meal_planning_agent({"user_id": "owner", "request": "Use only my pantry"})

    search.assert_awaited_once()
    arguments = search.call_args.args[0]
    assert arguments["query"] == "lentils rice vegan cooking time under 20 minutes"
    assert "pantry" not in arguments["query"]
    assert arguments["user_id"] == "owner"
    assert arguments["ingredients"] == ["lentils"]
    assert arguments["diet"] == "vegan"
    assert arguments["allergies"] == ["peanuts"]
    assert "minimum_protein" not in arguments
    plan = result["meal_plan"]
    assert plan["days"] == []
    assert plan["unverified_requirements"] == requirements.unsupported_requirements
    assert plan["requirements"]["protein"]["minimum"] == 120
    if search_results:
        assert plan["status"] == "candidates_found"
        assert [item["id"] for item in plan["candidate_recipes"]] == [2, 1]
        assert all("user_id" not in item for item in plan["candidate_recipes"])
        assert "quick lentil soup" in _build_context(result)
        assert "under 20 minutes" in _build_context(result)
        loader.assert_awaited_once_with("owner")
    else:
        assert plan["status"] == "no_matches"
        assert plan["candidate_recipes"] == []
        loader.assert_not_awaited()


def test_unsupported_candidates_still_enforce_supported_filters():
    requirements = MealPlanRequirements(
        ingredients=["lentils"], diets=["vegan", "gluten-free"], allergies=["peanuts"],
        unsupported_requirements=["under 20 minutes"],
    )
    result = build_meal_plan([
        recipe(1, diets=["vegan", "gluten-free"], calories=None),
        recipe(2, diets=["vegan", "gluten-free"], ingredients=[{"name": "lentils and peanuts"}]),
        recipe(3, diets=["vegan", "gluten-free"], ingredients=[]),
        recipe(4, diets=["vegan", "gluten-free"], ingredients=[{"name": "rice"}]),
        recipe(5, diets=["vegan"]),
    ], requirements)
    assert result["status"] == "candidates_found"
    assert [item["id"] for item in result["candidate_recipes"]] == [1]
    assert result["days"] == []
    assert result["unverified_requirements"] == ["under 20 minutes"]


def test_recipe_query_excludes_original_request_and_planning_instructions():
    request = "安排一天的午餐和晚餐，包含鸡肉和猪肉，基于已有的川菜食谱，随机选择菜谱组合。"
    requirements = MealPlanRequirements(
        days=1, meals=["lunch", "dinner"],
        unsupported_requirements=[request],
        recipe_search_attributes={"cuisines": ["川菜"], "ingredients": ["鸡肉", "猪肉"]},
    )
    assert meal_planning.build_recipe_search_query(requirements) == "川菜 鸡肉 猪肉"


def test_recipe_query_normalizes_attributes_and_omits_daily_targets():
    requirements = MealPlanRequirements(
        days=7, ingredients=["chicken"], diets=["gluten-free"],
        protein=DailyNutrition(minimum=120),
        recipe_search_attributes={
            "cuisines": [" Sichuan "], "ingredients": ["Chicken", "pork"],
            "dish_types": ["stir-fry"], "cooking_methods": [" steamed "],
            "dietary_preferences": ["gluten-free", "high protein"], "equipment": ["wok"],
        },
        unsupported_requirements=["Choose a random combination"],
    )
    assert meal_planning.build_recipe_search_query(requirements) == (
        "Sichuan stir-fry chicken pork gluten-free high protein steamed wok"
    )


def test_recipe_query_without_attributes_never_falls_back_to_request_prose():
    requirements = MealPlanRequirements(unsupported_requirements=["Plan a random week from my database"])
    assert meal_planning.build_recipe_search_query(requirements) == "recipe"
