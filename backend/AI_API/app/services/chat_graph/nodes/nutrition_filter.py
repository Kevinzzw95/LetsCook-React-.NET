from app.services.chat_graph.state import ChatGraphState
from app.services.chat_graph.tools.nutrition_api import summarize_nutrition_constraints


async def nutrition_filter(state: ChatGraphState) -> ChatGraphState:
    return {
        "nutrition_notes": await summarize_nutrition_constraints(state.get("request", "")),
    }
