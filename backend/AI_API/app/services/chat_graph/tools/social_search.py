from typing import Any

from app.services.chat_graph.state import ChatIntent


async def search_social_recipes(query: str, intent: ChatIntent) -> list[dict[str, Any]]:
    # TODO: Connect this to crawler/social recipe collection if needed.
    return []
