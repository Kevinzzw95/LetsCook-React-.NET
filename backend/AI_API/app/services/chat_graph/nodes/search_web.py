from app.services.chat_graph.state import ChatGraphState
from app.services.chat_graph.tools.web_search import search_web_for_recipes


async def search_web(state: ChatGraphState) -> ChatGraphState:
    if "web" not in state.get("search_sources", []):
        return {"web_results": []}

    return {
        "web_results": await search_web_for_recipes(state.get("agent_query") or state.get("request", ""), state.get("intent", "general")),
    }
