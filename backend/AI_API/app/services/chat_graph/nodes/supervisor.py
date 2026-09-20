import logging

from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.types import Send
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.chat_graph.nodes.understand_request import _extract_recipe_attributes
from app.services.chat_graph.state import (
    ChatGraphState,
    ChatIntent,
    SearchSource,
    SearchStrategy,
    get_latest_user_message,
)


logger = logging.getLogger(__name__)


class SpecialistTask(BaseModel):
    source: SearchSource = Field(description="Specialist agent that should handle this task")
    query: str = Field(description="Focused query for that specialist")


class SupervisorDecision(BaseModel):
    intent: ChatIntent = Field(description="Overall user intent")
    strategy: SearchStrategy = Field(
        default="parallel",
        description="Use web_from_internal when web discovery depends on recipes found internally",
    )
    tasks: list[SpecialistTask] = Field(
        default_factory=list,
        description="Only the specialist tasks needed to answer the request",
    )


SUPERVISOR_PROMPT = """You are the supervisor for a cooking assistant.
Requests to schedule daily meals or plan menus have meal_plan intent; these use only saved recipes.
Decide which specialist agents are needed and give each selected specialist one focused query.

Available specialists:
- internal: searches recipes saved in LetsCook and user-owned cooking data
- web: discovers public recipe candidate URLs
- nutrition: extracts nutrition, dietary, allergy, and safety constraints

Intent choices: recipe_search, meal_plan, shopping_list, nutrition, general.

Rules:
- Select only specialists that materially help answer the request.
- Use internal for saved recipes, meal plans, pantry context, and normal recipe discovery.
- Use web for broader public recipe inspiration or when internal results alone may be insufficient.
- Use nutrition when calories, macros, diets, allergies, health goals, or food safety matter.
- General conversation can have no specialist tasks.
- Use strategy web_from_internal when the user asks to search the web for recipes based on, inspired by,
  or similar to recipes in their LetsCook database. This requires internal and web tasks.
- Otherwise use strategy parallel.
- Return at most one task per specialist.
"""


def _requires_internal_seeded_web_search(request: str) -> bool:
    normalized = " ".join(request.lower().split())
    internal_reference = any(
        phrase in normalized
        for phrase in (
            "my recipe",
            "my saved recipe",
            "my database",
            "recipes in my database",
            "recipes on my database",
            "based on my",
        )
    )
    similarity_request = any(
        phrase in normalized
        for phrase in (
            "similar recipe",
            "recipes similar",
            "similar on the web",
            "search similar",
            "find similar",
            "based on",
            "inspired by",
        )
    )
    web_request = any(term in normalized for term in ("web", "online", "internet"))
    return internal_reference and (similarity_request or web_request)


def _fallback_intent(request: str) -> ChatIntent:
    normalized = request.lower()
    if any(term in normalized for term in ("meal plan", "plan", "prep")):
        return "meal_plan"
    if any(term in normalized for term in ("shopping", "grocery", "groceries")):
        return "shopping_list"
    if any(term in normalized for term in ("breakfast", "cook", "dinner", "dish", "ingredient", "lunch", "meal", "recipe")):
        return "recipe_search"
    if any(term in normalized for term in ("calorie", "protein", "carb", "fat", "nutrition", "healthy")):
        return "nutrition"
    return "general"


def _fallback_tasks(request: str, intent: ChatIntent, attributes: dict) -> list[SpecialistTask]:
    if intent == "general":
        return []
    if intent == "shopping_list":
        return [SpecialistTask(source="internal", query=request)]

    tasks = [SpecialistTask(source="internal", query=request)]
    if intent in {"recipe_search", "meal_plan"}:
        tasks.append(SpecialistTask(source="web", query=request))
    if intent == "nutrition" or any(
        attributes.get(key)
        for key in ("diet", "calories", "protein", "allergies", "health_goals", "dietary_constraints")
    ):
        tasks.append(SpecialistTask(source="nutrition", query=request))
    return tasks


def _normalize_tasks(tasks: list[SpecialistTask], request: str) -> list[SpecialistTask]:
    normalized: list[SpecialistTask] = []
    seen: set[SearchSource] = set()
    for task in tasks:
        if task.source in seen:
            continue
        query = " ".join(task.query.split()).strip() or request
        normalized.append(SpecialistTask(source=task.source, query=query))
        seen.add(task.source)
    return normalized


def _dependent_tasks(tasks: list[SpecialistTask], request: str) -> list[SpecialistTask]:
    by_source = {task.source: task for task in tasks}
    ordered = [
        by_source.get("internal", SpecialistTask(source="internal", query=request)),
        by_source.get("web", SpecialistTask(source="web", query=request)),
    ]
    if "nutrition" in by_source:
        ordered.append(by_source["nutrition"])
    return ordered


async def supervisor(state: ChatGraphState) -> ChatGraphState:
    settings = get_settings()
    request = get_latest_user_message(state.get("messages", []))
    attributes = _extract_recipe_attributes(request)

    try:
        model = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=0,
        ).with_structured_output(SupervisorDecision)
        decision = await model.ainvoke([
            SystemMessage(content=SUPERVISOR_PROMPT + "\nUse conversation context to classify follow-up requirements for an existing meal plan."),
            *[message for message in state.get("messages", []) if message.type in {"human", "ai"}],
        ])
        intent = decision.intent
        strategy = decision.strategy
        tasks = _normalize_tasks(decision.tasks, request)
        if intent != "general" and not tasks:
            tasks = _fallback_tasks(request, intent, attributes)
        if _requires_internal_seeded_web_search(request):
            strategy = "web_from_internal"
    except Exception as exc:
        logger.warning("Supervisor planning failed; using deterministic routing: %s", type(exc).__name__)
        intent = _fallback_intent(request)
        tasks = _fallback_tasks(request, intent, attributes)
        strategy = "web_from_internal" if _requires_internal_seeded_web_search(request) else "parallel"

    if intent == "meal_plan":
        strategy = "parallel"
        tasks = []
    elif strategy == "web_from_internal":
        tasks = _dependent_tasks(tasks, request)

    return {
        "request": request,
        "recipe_attributes": attributes,
        "cuisine": attributes["cuisine"],
        "diet": attributes["diet"],
        "calories": attributes["calories"],
        "protein": attributes["protein"],
        "allergies": attributes["allergies"],
        "health_goals": attributes["health_goals"],
        "dietary_constraints": attributes["dietary_constraints"],
        "intent": intent,
        "search_strategy": strategy,
        "search_sources": [task.source for task in tasks],
        "agent_queries": {task.source: task.query for task in tasks},
    }


SPECIALIST_NODE_MAP = {
    "internal": "internal_search_agent",
    "web": "web_search_agent",
    "nutrition": "nutrition_agent",
}


def route_to_specialists(state: ChatGraphState) -> list[Send]:
    if state.get("intent") == "meal_plan":
        return [Send("meal_planning_agent", state)]
    queries = state.get("agent_queries", {})
    if state.get("search_strategy") == "web_from_internal":
        return [Send(
            "internal_search_agent",
            {
                **state,
                "agent_source": "internal",
                "agent_query": queries.get("internal") or state.get("request", ""),
            },
        )]

    sends = [
        Send(
            SPECIALIST_NODE_MAP[source],
            {
                **state,
                "agent_source": source,
                "agent_query": queries.get(source) or state.get("request", ""),
            },
        )
        for source in state.get("search_sources", [])
        if source in SPECIALIST_NODE_MAP
    ]
    return sends or [Send("merge_normalize", state)]


def route_after_internal(state: ChatGraphState) -> str:
    if state.get("search_strategy") == "web_from_internal":
        return "build_similarity_query"
    return "merge_normalize"


def route_after_web(state: ChatGraphState) -> str:
    if (
        state.get("search_strategy") == "web_from_internal"
        and "nutrition" in state.get("search_sources", [])
    ):
        return "nutrition_agent"
    return "merge_normalize"
