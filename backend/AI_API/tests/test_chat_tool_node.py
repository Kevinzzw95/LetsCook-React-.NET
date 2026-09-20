import json
from types import SimpleNamespace

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.services.chat_graph import graph as graph_module
from app.services.chat_graph.graph import build_chat_graph
from app.services.chat_graph.nodes.merge_normalize import merge_normalize
from app.services.chat_graph.nodes.nutrition_validation import nutrition_validation
from app.services.chat_graph.nodes.rank import rank_recipes
from app.services.chat_graph.nodes import similarity_query as similarity_query_module
from app.services.chat_graph.nodes import supervisor as supervisor_module
from app.services.chat_graph.nodes.similarity_query import build_similarity_query
from app.services.chat_graph.nodes.supervisor import (
    route_after_internal,
    route_after_web,
    route_to_specialists,
)
from app.services.chat_graph.tools import web_search
from app.services.chat_graph.tools.chat_tools import CHAT_TOOLS, nutrition_tool


def test_graph_contains_requested_pipeline_nodes():
    graph = build_chat_graph().get_graph()

    assert {
        "supervisor",
        "internal_search_agent",
        "web_search_agent",
        "nutrition_agent",
        "build_similarity_query",
        "merge_normalize",
        "nutrition_validation",
        "rank_recipes",
        "answer",
    }.issubset(graph.nodes)
    assert "tools" not in graph.nodes
    assert "classify_intent" not in graph.nodes
    assert "search_web" not in graph.nodes


@pytest.mark.asyncio
async def test_parallel_specialists_converge_before_final_answer(monkeypatch):
    async def fake_supervisor(state):
        return {
            "request": "high protein chicken",
            "recipe_attributes": {"protein": 30},
            "search_sources": ["internal", "web", "nutrition"],
            "agent_queries": {
                "internal": "saved chicken",
                "web": "public chicken",
                "nutrition": "protein constraints",
            },
        }

    async def fake_internal(state):
        return {"internal_results": [{"id": 1, "title": "Saved chicken", "protein": 40}]}

    async def fake_web(state):
        return {"web_results": ["https://recipes.example/chicken"]}

    async def fake_nutrition(state):
        return {"nutrition_notes": ["Prioritize protein-forward options."]}

    async def fake_answer(state):
        assert len(state["ranked_results"]) == 2
        assert state["validation_notes"]
        return {"messages": [AIMessage(content="Combined answer")]}

    monkeypatch.setattr(graph_module, "supervisor", fake_supervisor)
    monkeypatch.setattr(graph_module, "internal_search_agent", fake_internal)
    monkeypatch.setattr(graph_module, "web_search_agent", fake_web)
    monkeypatch.setattr(graph_module, "nutrition_agent", fake_nutrition)
    monkeypatch.setattr(graph_module, "answer", fake_answer)

    result = await graph_module.build_chat_graph().ainvoke({
        "messages": [HumanMessage(content="high protein chicken")],
    })

    assert result["messages"][-1].content == "Combined answer"


@pytest.mark.asyncio
async def test_internal_seeded_web_search_runs_sequentially(monkeypatch):
    calls = []

    async def fake_supervisor(state):
        calls.append("supervisor")
        return {
            "request": "Based on my recipes, find similar recipes on the web",
            "recipe_attributes": {},
            "search_strategy": "web_from_internal",
            "search_sources": ["internal", "web"],
            "agent_queries": {"internal": "my recipes", "web": "similar recipes"},
        }

    async def fake_internal(state):
        calls.append("internal")
        return {"internal_results": [{"title": "Sichuan Beef", "cuisine": "Chinese"}]}

    async def fake_similarity_query(state):
        calls.append("similarity_query")
        assert state["internal_results"][0]["title"] == "Sichuan Beef"
        return {"web_query": "Chinese Sichuan beef recipe", "similarity_profile": {}}

    async def fake_web(state):
        calls.append("web")
        assert state["web_query"] == "Chinese Sichuan beef recipe"
        return {"web_results": ["https://recipes.example/sichuan-beef"]}

    async def fake_answer(state):
        calls.append("answer")
        return {"messages": [AIMessage(content="Similar recipe URL") ]}

    monkeypatch.setattr(graph_module, "supervisor", fake_supervisor)
    monkeypatch.setattr(graph_module, "internal_search_agent", fake_internal)
    monkeypatch.setattr(graph_module, "build_similarity_query", fake_similarity_query)
    monkeypatch.setattr(graph_module, "web_search_agent", fake_web)
    monkeypatch.setattr(graph_module, "answer", fake_answer)

    await graph_module.build_chat_graph().ainvoke({
        "messages": [HumanMessage(content="find similar recipes")],
    })

    assert calls == ["supervisor", "internal", "similarity_query", "web", "answer"]


def test_specialist_tools_have_explicit_names():
    assert [tool.name for tool in CHAT_TOOLS] == [
        "search_internal",
        "search_web",
        "nutrition_tool",
        "plan_daily_meals",
    ]


def test_supervisor_routes_selected_sources_in_parallel():
    routes = route_to_specialists({
        "request": "high protein chicken dinner",
        "search_sources": ["internal", "web", "nutrition"],
        "agent_queries": {
            "internal": "saved chicken recipes",
            "web": "high protein chicken recipes",
            "nutrition": "high protein constraints",
        },
    })

    assert [route.node for route in routes] == [
        "internal_search_agent",
        "web_search_agent",
        "nutrition_agent",
    ]
    assert [route.arg["agent_query"] for route in routes] == [
        "saved chicken recipes",
        "high protein chicken recipes",
        "high protein constraints",
    ]


def test_supervisor_routes_general_chat_to_merge():
    routes = route_to_specialists({"request": "hello", "search_sources": []})

    assert len(routes) == 1
    assert routes[0].node == "merge_normalize"


def test_dependent_strategy_routes_internal_before_web():
    state = {
        "request": "Based on my recipes, find similar recipes online",
        "search_strategy": "web_from_internal",
        "search_sources": ["internal", "web", "nutrition"],
        "agent_queries": {"internal": "my saved recipes", "web": "similar recipes"},
    }

    routes = route_to_specialists(state)

    assert [route.node for route in routes] == ["internal_search_agent"]
    assert route_after_internal(state) == "build_similarity_query"
    assert route_after_web(state) == "nutrition_agent"


@pytest.mark.asyncio
async def test_supervisor_fallback_selects_needed_specialists(monkeypatch):
    class FailingChatOpenAI:
        def __init__(self, **kwargs):
            raise RuntimeError("provider unavailable")

    monkeypatch.setattr(supervisor_module, "ChatOpenAI", FailingChatOpenAI)
    monkeypatch.setattr(
        supervisor_module,
        "get_settings",
        lambda: SimpleNamespace(openai_model="test-model", openai_api_key="test-key"),
    )

    result = await supervisor_module.supervisor({
        "messages": [HumanMessage(content="Find a high protein chicken dinner recipe")],
    })

    assert result["intent"] == "recipe_search"
    assert result["search_sources"] == ["internal", "web", "nutrition"]
    assert result["protein"] is None
    assert result["diet"] == "high-protein"


@pytest.mark.asyncio
async def test_supervisor_detects_database_dependent_web_search(monkeypatch):
    class FailingChatOpenAI:
        def __init__(self, **kwargs):
            raise RuntimeError("provider unavailable")

    monkeypatch.setattr(supervisor_module, "ChatOpenAI", FailingChatOpenAI)
    monkeypatch.setattr(
        supervisor_module,
        "get_settings",
        lambda: SimpleNamespace(openai_model="test-model", openai_api_key="test-key"),
    )

    result = await supervisor_module.supervisor({
        "messages": [HumanMessage(
            content="Based on my recipes in my database, search similar recipes on the web"
        )],
    })

    assert result["search_strategy"] == "web_from_internal"
    assert result["search_sources"][:2] == ["internal", "web"]


@pytest.mark.asyncio
async def test_similarity_query_fallback_uses_internal_recipe_fields(monkeypatch):
    class FailingChatOpenAI:
        def __init__(self, **kwargs):
            raise RuntimeError("provider unavailable")

    monkeypatch.setattr(similarity_query_module, "ChatOpenAI", FailingChatOpenAI)
    monkeypatch.setattr(
        similarity_query_module,
        "get_settings",
        lambda: SimpleNamespace(openai_model="test-model", openai_api_key="test-key"),
    )

    result = await build_similarity_query({
        "request": "Find similar recipes",
        "internal_results": [{
            "title": "Sichuan Beef",
            "cuisine": "Chinese",
            "dish_type": "dinner",
            "ingredients": [{"name": "beef"}, {"name": "doubanjiang"}],
        }],
        "agent_queries": {"web": "similar beef recipes"},
    })

    assert result["similarity_profile"]["titles"] == ["Sichuan Beef"]
    assert result["web_query"] == "Chinese dinner beef doubanjiang recipe"


@pytest.mark.asyncio
async def test_decorated_web_search_tool_returns_url_list(monkeypatch):
    async def fake_search(query: str, intent: str) -> list[str]:
        assert query == "quick chicken recipe"
        assert intent == "recipe_search"
        return ["https://recipes.example/quick-chicken"]

    monkeypatch.setattr(web_search, "search_web_for_recipes", fake_search)

    result = await web_search.search_web.ainvoke({"query": "quick chicken recipe"})

    assert json.loads(result) == ["https://recipes.example/quick-chicken"]


@pytest.mark.asyncio
async def test_decorated_nutrition_tool_executes():
    result = await nutrition_tool.ainvoke({"query": "high protein and low carb"})

    assert json.loads(result) == [
        "Prioritize protein-forward options.",
        "Avoid carb-heavy bases unless the user asks for them.",
    ]


@pytest.mark.asyncio
async def test_merge_normalizes_and_deduplicates_sources():
    result = await merge_normalize({
        "internal_results": [{"id": 7, "title": "Chicken Soup"}],
        "web_results": [
            "https://recipes.example/soup",
            "https://recipes.example/soup",
        ],
    })

    assert result["normalized_results"] == [
        {"id": 7, "title": "Chicken Soup", "source": "internal", "source_rank": 1},
        {
            "source": "web",
            "url": "https://recipes.example/soup",
            "source_url": "https://recipes.example/soup",
            "source_rank": 1,
        },
    ]


@pytest.mark.asyncio
async def test_nutrition_validation_excludes_known_conflicts_and_keeps_unknown_web_urls():
    result = await nutrition_validation({
        "request": "under 500 calories",
        "recipe_attributes": {"calories": 500, "protein": None},
        "normalized_results": [
            {"source": "internal", "title": "Heavy", "calories": 700},
            {"source": "internal", "title": "Light", "calories": 400},
            {"source": "web", "url": "https://recipes.example/unknown"},
        ],
        "nutrition_notes": [],
    })

    assert [item.get("title") or item.get("url") for item in result["validated_results"]] == [
        "Light",
        "https://recipes.example/unknown",
    ]
    assert result["validated_results"][0]["nutrition_validation"] == "passed"
    assert result["validated_results"][1]["nutrition_validation"] == "unknown"
    assert any("Excluded 1" in note for note in result["validation_notes"])


@pytest.mark.asyncio
async def test_rank_recipes_prioritizes_validated_internal_relevance():
    result = await rank_recipes({
        "validated_results": [
            {"source": "web", "url": "https://recipes.example/one", "source_rank": 1},
            {
                "source": "internal",
                "title": "Best match",
                "source_rank": 2,
                "relevance": 0.9,
                "nutrition_validation": "passed",
            },
        ]
    })

    assert result["ranked_results"][0]["title"] == "Best match"
    assert [item["rank"] for item in result["ranked_results"]] == [1, 2]
