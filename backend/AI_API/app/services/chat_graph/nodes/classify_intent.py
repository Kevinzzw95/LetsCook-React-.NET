from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI

from app.core.config import get_settings
from app.services.chat_graph.state import ChatGraphState, ChatIntent, SearchSource


class Classification(BaseModel):
    source: SearchSource = Field(description="Search agent/source to invoke")
    query: str = Field(description="Targeted sub-question optimized for this source")


class ClassificationResult(BaseModel):
    """Result of classifying a user query into agent-specific sub-questions."""

    intent: ChatIntent = Field(description="Overall user intent")
    classifications: list[Classification] = Field(
        default_factory=list,
        description="List of agents to invoke with their targeted sub-questions",
    )


CLASSIFICATION_SYSTEM_PROMPT = """Analyze this cooking query and decide which LetsCook agents should be invoked.
For each relevant source, generate a targeted sub-question optimized for that source.

Intent choices:
- recipe_search: User wants recipe ideas, meal suggestions, substitutions, cooking steps, or ingredient-based recipes
- meal_plan: User wants meals planned across multiple days/meals or prep strategy
- shopping_list: User wants groceries or shopping-list help
- nutrition: User asks primarily about calories, protein, macros, health goals, or nutrition facts
- general: General conversation that does not need recipe, nutrition, or search help

Available sources:
- internal: LetsCook recipe database, saved recipes, user meal plans, pantry/shopping context
- web: Public web recipe and nutrition information
- social: Social recipe trends from TikTok, Instagram, Xiaohongshu/RedNote, or similar platforms

Routing rules:
- Use internal for recipe_search, meal_plan, shopping_list, and nutrition when app data could help.
- Use web when public recipe/nutrition knowledge or broader inspiration could help.
- Use social only when the user asks for trends, viral recipes, or names a social platform.
- For general chat, return an empty classifications list.
- Return only sources relevant to the query.
"""


def _fallback_intent(request: str) -> ChatIntent:
    normalized_request = request.lower()

    if any(term in normalized_request for term in ("meal plan", "plan", "prep")):
        return "meal_plan"
    if any(term in normalized_request for term in ("shopping", "grocery", "groceries")):
        return "shopping_list"
    if any(term in normalized_request for term in ("breakfast", "cook", "dinner", "dish", "ingredient", "lunch", "make", "meal", "recipe")):
        return "recipe_search"
    if any(term in normalized_request for term in ("calorie", "protein", "carb", "fat", "nutrition", "healthy")):
        return "nutrition"

    return "general"


def _fallback_classifications(request: str, intent: ChatIntent) -> list[Classification]:
    if intent == "general":
        return []

    if intent == "shopping_list":
        return [
            Classification(
                source="internal",
                query=f"What LetsCook recipes, meal plans, or pantry context can help build this shopping list: {request}",
            )
        ]

    classifications = [
        Classification(
            source="internal",
            query=f"What matching LetsCook recipes or user context exist for this request: {request}",
        ),
        Classification(
            source="web",
            query=f"What public recipe or nutrition information can help answer this request: {request}",
        ),
    ]

    if any(term in request.lower() for term in ("social", "tiktok", "instagram", "xiaohongshu", "rednote", "viral", "trend")):
        classifications.append(
            Classification(
                source="social",
                query=f"What relevant social or viral recipe ideas match this request: {request}",
            )
        )

    return classifications


def _dedupe_sources(classifications: list[Classification]) -> list[SearchSource]:
    sources: list[SearchSource] = []
    for classification in classifications:
        if classification.source not in sources:
            sources.append(classification.source)

    return sources


async def classify_intent(state: ChatGraphState) -> ChatGraphState:
    settings = get_settings()
    request = state.get("request", "")
    router_llm = ChatOpenAI(model=settings.openai_model, api_key=settings.openai_api_key)
    structured_llm = router_llm.with_structured_output(ClassificationResult)

    result = await structured_llm.ainvoke(
        [
            {"role": "system", "content": CLASSIFICATION_SYSTEM_PROMPT},
            {"role": "user", "content": request},
        ]
    )

    intent = result.intent or _fallback_intent(request)
    classifications = result.classifications or _fallback_classifications(request, intent)

    return {
        "intent": intent,
        "search_sources": _dedupe_sources(classifications),
        "classifications": [classification.model_dump() for classification in classifications],
    }
