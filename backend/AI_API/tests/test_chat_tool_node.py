import json

import pytest
from langchain_core.messages import AIMessage, ToolMessage
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition

from app.services.chat_graph.graph import build_chat_graph
from app.services.chat_graph.state import ChatGraphState
from app.services.chat_graph.tools.chat_tools import (
    CHAT_TOOLS,
    create_recipe_preview,
    extract_recipe_preview,
    get_nutrition_constraints,
)


def test_tool_node_contains_multiple_decorated_tools():
    assert [tool.name for tool in CHAT_TOOLS] == [
        "search_letscook_recipes",
        "search_public_recipes",
        "search_social_recipe_trends",
        "get_nutrition_constraints",
        "create_recipe_preview",
    ]


def test_tools_condition_routes_only_messages_with_tool_calls():
    tool_request = AIMessage(
        content="",
        tool_calls=[{
            "name": "get_nutrition_constraints",
            "args": {"query": "high protein dinner"},
            "id": "tool-call-1",
            "type": "tool_call",
        }],
    )
    final_response = AIMessage(content="Here is your dinner suggestion.")

    assert tools_condition({"messages": [tool_request]}) == "tools"
    assert tools_condition({"messages": [final_response]}) == "__end__"


@pytest.mark.asyncio
async def test_decorated_nutrition_tool_executes():
    result = await get_nutrition_constraints.ainvoke({"query": "high protein and low carb"})

    assert json.loads(result) == [
        "Prioritize protein-forward options.",
        "Avoid carb-heavy bases unless the user asks for them.",
    ]


def test_graph_compiles_with_shared_tool_node():
    graph = build_chat_graph()

    assert "tools" in graph.get_graph().nodes


@pytest.mark.asyncio
async def test_preview_tool_converts_web_result_to_recipe_draft():
    source_recipe = {
        "title": "Lemon Salmon",
        "source_url": "https://recipes.example/lemon-salmon",
        "images": ["https://recipes.example/salmon.jpg"],
        "servings": 2,
        "preparation_minutes": 25,
        "ingredients": [{"name": "salmon", "amount": "2", "unit": "fillets"}],
        "steps": [{"description": "Bake the salmon."}],
    }
    tool_call = AIMessage(
        content="",
        tool_calls=[{
            "name": "create_recipe_preview",
            "args": {
                "source": "web",
                "title": "Lemon Salmon",
                "servings": 2,
                "preparation_minutes": 25,
                "ingredients": [{"name": "salmon", "amount": "2", "unit": "fillets"}],
                "steps": [{"description": "Bake the salmon."}],
                "images": source_recipe["images"],
                "source_url": source_recipe["source_url"],
            },
            "id": "preview-call-1",
            "type": "tool_call",
        }],
    )

    builder = StateGraph(ChatGraphState)
    builder.add_node("tools", ToolNode([create_recipe_preview]))
    builder.add_edge(START, "tools")
    builder.add_edge("tools", END)
    graph = builder.compile()

    result = await graph.ainvoke({
        "messages": [tool_call],
        "web_results": [source_recipe],
    })
    preview = extract_recipe_preview(result["messages"])

    assert preview is not None
    assert preview["title"] == "Lemon Salmon"
    assert preview["ingredients"][0]["name"] == "salmon"
    assert preview["steps"][0]["stepNumber"] == 1
    assert preview["sourceUrl"] == source_recipe["source_url"]


def test_preview_extractor_ignores_other_tool_messages():
    message = ToolMessage(content="[]", name="search_public_recipes", tool_call_id="search-1")

    assert extract_recipe_preview([message]) is None


@pytest.mark.asyncio
async def test_preview_tool_rejects_recipe_without_external_search_provenance():
    tool_call = AIMessage(
        content="",
        tool_calls=[{
            "name": "create_recipe_preview",
            "args": {
                "source": "web",
                "title": "Invented Recipe",
                "images": ["https://example.com/invented.jpg"],
            },
            "id": "preview-call-2",
            "type": "tool_call",
        }],
    )
    builder = StateGraph(ChatGraphState)
    builder.add_node("tools", ToolNode([create_recipe_preview]))
    builder.add_edge(START, "tools")
    builder.add_edge("tools", END)

    result = await builder.compile().ainvoke({"messages": [tool_call]})

    assert extract_recipe_preview(result["messages"]) is None
    assert "must be based on a web or social search result" in result["messages"][-1].content


@pytest.mark.asyncio
async def test_preview_tool_rejects_incomplete_web_recipe():
    source_recipe = {
        "title": "Lemon Salmon",
        "source_url": "https://recipes.example/lemon-salmon",
        "ingredients": [],
        "steps": [],
    }
    tool_call = AIMessage(
        content="",
        tool_calls=[{
            "name": "create_recipe_preview",
            "args": {
                "source": "web",
                "title": source_recipe["title"],
                "source_url": source_recipe["source_url"],
            },
            "id": "preview-call-3",
            "type": "tool_call",
        }],
    )
    builder = StateGraph(ChatGraphState)
    builder.add_node("tools", ToolNode([create_recipe_preview]))
    builder.add_edge(START, "tools")
    builder.add_edge("tools", END)

    result = await builder.compile().ainvoke({
        "messages": [tool_call],
        "web_results": [source_recipe],
    })

    assert extract_recipe_preview(result["messages"]) is None
    assert "does not contain enough detail" in result["messages"][-1].content
