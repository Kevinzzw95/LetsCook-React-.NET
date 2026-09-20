import json

from fastapi import HTTPException
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import get_settings
from app.services.chat_graph.state import ChatGraphState, ensure_system_message


ANSWER_PROMPT = """Answer rules:
- The supervisor and specialist agents have already completed tool use. Do not request more tools.
- Web search results contain candidate URLs only. Present relevant URLs without claiming recipe details that were not retrieved.
- Do not offer or create recipe previews.
- Respect all nutrition validation and safety notes.
- For meal plans, use only the meal_plan tool output. Show each day, meal, saved recipe ID, servings, and daily totals.
- Never invent or substitute recipes, alter calculated totals, or claim unmet targets were satisfied.
- If the plan is empty, explain its status and ask for the missing requirements or saved recipes.
- A plan is a suggestion, not a saved calendar entry. Surface tool notes relevant to the requirements.
"""


def _build_context(state: ChatGraphState) -> str:
    context_lines: list[str] = []

    if "meal_plan" in state:
        return "Meal planning tool output:\n" + json.dumps(state["meal_plan"], ensure_ascii=False, default=str)

    intent = state.get("intent")
    if intent:
        context_lines.append(f"Detected user intent: {intent}.")

    search_sources = state.get("search_sources", [])
    if search_sources:
        context_lines.append(f"Selected search sources: {', '.join(search_sources)}.")

    if state.get("search_strategy") == "web_from_internal":
        context_lines.append(
            "The internal recipes are similarity seeds; the web URLs were discovered from their recipe characteristics."
        )
        similarity_profile = state.get("similarity_profile", {})
        if similarity_profile:
            context_lines.append(f"Similarity profile: {similarity_profile}.")

    recipe_attributes = state.get("recipe_attributes", {})
    if recipe_attributes:
        context_lines.append(f"Extracted recipe attributes: {recipe_attributes}.")

    validation_notes = state.get("validation_notes", [])
    if validation_notes:
        context_lines.append("Nutrition validation notes: " + " ".join(validation_notes))

    ranked_results = state.get("ranked_results", [])
    if ranked_results:
        context_lines.append(f"Retrieved {len(ranked_results)} candidate result(s) from tools.")
        context_lines.append(
            "Use the following retrieved recipe context to answer the user. "
            "Do not invent recipe facts that conflict with it:\n"
            + json.dumps(ranked_results[:10], ensure_ascii=False, default=str)
        )

    return "\n".join(context_lines)


async def answer(state: ChatGraphState) -> ChatGraphState:
    settings = get_settings()
    llm = ChatOpenAI(model=settings.openai_model, api_key=settings.openai_api_key)
    messages = ensure_system_message(state.get("messages", []))
    context = _build_context(state)

    if context:
        messages = [*messages, SystemMessage(content=context)]
    messages = [*messages, SystemMessage(content=ANSWER_PROMPT)]

    response = await llm.ainvoke(messages)
    if not response.content:
        raise HTTPException(status_code=502, detail="OpenAI returned an empty response")

    return {
        "messages": [response],
    }
