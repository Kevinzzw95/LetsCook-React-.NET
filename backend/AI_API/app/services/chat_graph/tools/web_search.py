from typing import Any

from app.services.chat_graph.state import ChatIntent


async def search_web_for_recipes(query: str, intent: ChatIntent) -> list[dict[str, Any]]:
    # TODO: Add a web search provider when one is configured for AI_API.
    return []
