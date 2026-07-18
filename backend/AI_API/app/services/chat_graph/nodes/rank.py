from app.services.chat_graph.state import ChatGraphState


async def rank(state: ChatGraphState) -> ChatGraphState:
    ranked_results = [
        *state.get("internal_results", []),
        *state.get("web_results", []),
        *state.get("social_results", []),
    ]

    return {
        "ranked_results": ranked_results,
    }
