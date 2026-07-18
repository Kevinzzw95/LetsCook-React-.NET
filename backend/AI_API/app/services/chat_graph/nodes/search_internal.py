from app.services.chat_graph.state import ChatGraphState
from app.services.chat_graph.tools.recipe_db import search_recipes


async def search_internal(state: ChatGraphState) -> ChatGraphState:
    if "internal" not in state.get("search_sources", []):
        return {"internal_results": []}

    return {
        "internal_results": await search_recipes(state.get("agent_query") or state.get("request", ""), state.get("intent", "general")),
    }
