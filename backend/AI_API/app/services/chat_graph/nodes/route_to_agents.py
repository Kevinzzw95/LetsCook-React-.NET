from typing import Any

from langgraph.types import Send

from app.services.chat_graph.state import ChatGraphState


SOURCE_NODE_MAP = {
    "internal": "search_internal",
    "web": "search_web",
    "social": "search_social",
}


async def prepare_agent_routes(state: ChatGraphState) -> ChatGraphState:
    return {}


def _classification_query(classification: dict[str, Any]) -> str:
    return str(classification.get("query") or "")


def route_to_agents(state: ChatGraphState) -> list[Send]:
    classifications = state.get("classifications", [])
    sends: list[Send] = []

    for classification in classifications:
        source = classification.get("source")
        node_name = SOURCE_NODE_MAP.get(str(source))
        if not node_name:
            continue

        sends.append(
            Send(
                node_name,
                {
                    **state,
                    "agent_source": source,
                    "agent_query": _classification_query(classification) or state.get("request", ""),
                },
            )
        )

    if sends:
        return sends

    return [Send("nutrition_filter", state)]
