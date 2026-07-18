from typing import Annotated, Any, Literal, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import add_messages

from app.schemas.chat import ChatMessage


ChatIntent = Literal[
    "recipe_search",
    "meal_plan",
    "shopping_list",
    "nutrition",
    "general",
]

SearchSource = Literal["internal", "web", "social"]


SYSTEM_MESSAGE = (
    "You are Chef Bot, a friendly cooking assistant for LetsCook. "
    "Help users plan meals, adapt recipes, substitute ingredients, and create practical cooking steps. "
    "Keep answers concise, actionable, and safe for a home cook."
)


class ChatGraphState(TypedDict, total=False):
    messages: Annotated[list[Any], add_messages]
    request: str
    recipe_attributes: dict[str, Any]
    cuisine: str | None
    diet: str | None
    calories: int | None
    protein: int | None
    allergies: list[str]
    health_goals: list[str]
    dietary_constraints: list[str]
    intent: ChatIntent
    search_sources: list[SearchSource]
    classifications: list[dict[str, Any]]
    agent_source: SearchSource
    agent_query: str
    internal_results: list[dict[str, Any]]
    web_results: list[dict[str, Any]]
    social_results: list[dict[str, Any]]
    nutrition_notes: list[str]
    health_notes: list[str]
    ranked_results: list[dict[str, Any]]


def build_initial_messages(message: str, history: list[ChatMessage]) -> list[Any]:
    messages: list[Any] = []

    for item in history:
        content = item.content.strip()
        if not content:
            continue

        if item.role == "assistant":
            messages.append(AIMessage(content=content))
        elif item.role == "system":
            messages.append(SystemMessage(content=content))
        else:
            messages.append(HumanMessage(content=content))

    messages.append(HumanMessage(content=message))
    return messages


def get_latest_user_message(messages: list[Any]) -> str:
    for message in reversed(messages):
        if isinstance(message, HumanMessage):
            return str(message.content)

    return ""


def ensure_system_message(messages: list[Any]) -> list[Any]:
    for message in messages:
        if isinstance(message, SystemMessage):
            message.content = SYSTEM_MESSAGE
            return messages

    return [SystemMessage(content=SYSTEM_MESSAGE), *messages]
