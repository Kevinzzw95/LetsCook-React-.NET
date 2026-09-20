import json
from typing import Any

from app.services.chat_graph.state import ChatGraphState
from app.services.chat_graph.tools.chat_tools import nutrition_tool, search_internal
from app.services.chat_graph.tools.web_search import search_web


def _tool_list(payload: Any) -> list[Any]:
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            return []
    return payload if isinstance(payload, list) else []


async def internal_search_agent(state: ChatGraphState) -> ChatGraphState:
    attributes = state.get("recipe_attributes", {})
    payload = await search_internal.ainvoke({
        "query": state.get("agent_query") or state.get("request", ""),
        "user_id": state.get("user_id"),
        "cuisine": attributes.get("cuisine"),
        "diet": attributes.get("diet"),
        "maximum_calories": attributes.get("calories"),
        "minimum_protein": attributes.get("protein"),
        "allergies": attributes.get("allergies", []),
    })
    return {
        "internal_results": [item for item in _tool_list(payload) if isinstance(item, dict)],
    }


async def web_search_agent(state: ChatGraphState) -> ChatGraphState:
    payload = await search_web.ainvoke({
        "query": (
            state.get("web_query")
            or state.get("agent_query")
            or state.get("agent_queries", {}).get("web")
            or state.get("request", "")
        ),
    })
    return {
        "web_results": [item for item in _tool_list(payload) if isinstance(item, str)],
    }


async def nutrition_agent(state: ChatGraphState) -> ChatGraphState:
    payload = await nutrition_tool.ainvoke({
        "query": state.get("agent_query") or state.get("request", ""),
    })
    return {
        "nutrition_notes": [item for item in _tool_list(payload) if isinstance(item, str)],
    }
