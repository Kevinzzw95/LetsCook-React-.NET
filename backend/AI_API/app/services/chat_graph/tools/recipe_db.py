from typing import Any

from app.services.chat_graph.state import ChatIntent


async def search_recipes(query: str, intent: ChatIntent) -> list[dict[str, Any]]:
    # TODO: Connect this to LetsCook recipe data when the AI API has database access.
    return []
