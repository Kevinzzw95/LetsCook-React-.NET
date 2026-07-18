from app.services.chat_graph.state import ChatGraphState
from app.services.chat_graph.tools.social_search import search_social_recipes


async def search_social(state: ChatGraphState) -> ChatGraphState:
    if "social" not in state.get("search_sources", []):
        return {"social_results": []}

    return {
        "social_results": await search_social_recipes(state.get("agent_query") or state.get("request", ""), state.get("intent", "general")),
    }
