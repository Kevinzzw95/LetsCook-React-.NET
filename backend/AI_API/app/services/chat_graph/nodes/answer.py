import json

from fastapi import HTTPException
from langchain_core.messages import SystemMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import BaseTool

from app.core.config import get_settings
from app.services.chat_graph.state import ChatGraphState, ensure_system_message
from app.services.chat_graph.tools.chat_tools import CHAT_TOOLS


TOOL_USAGE_PROMPT = """Tool rules:
- Use search tools only when their data is needed to answer accurately.
- A qualified web recipe has a title, source URL, at least one ingredient, and at least one instruction step.
- If the final answer recommends a qualified recipe returned by search_public_recipes/search_web, call
  create_recipe_preview with that returned recipe's actual fields.
- For social results, only call create_recipe_preview when the result contains enough recipe detail for a useful preview.
- Never call create_recipe_preview for internal recipes or invented recipes.
- After create_recipe_preview succeeds, ask whether the user would like to see it and tell them to use the
  "Show recipe preview" button. Do not print the preview JSON.
"""


def _build_context(state: ChatGraphState) -> str:
    context_lines: list[str] = []

    intent = state.get("intent")
    if intent:
        context_lines.append(f"Detected user intent: {intent}.")

    search_sources = state.get("search_sources", [])
    if search_sources:
        context_lines.append(f"Selected search sources: {', '.join(search_sources)}.")

    recipe_attributes = state.get("recipe_attributes", {})
    if recipe_attributes:
        context_lines.append(f"Extracted recipe attributes: {recipe_attributes}.")

    nutrition_notes = state.get("nutrition_notes", [])
    if nutrition_notes:
        context_lines.append("Nutrition notes: " + " ".join(nutrition_notes))

    health_notes = state.get("health_notes", [])
    if health_notes:
        context_lines.append("Health notes: " + " ".join(health_notes))

    ranked_results = state.get("ranked_results", [])
    if ranked_results:
        context_lines.append(f"Retrieved {len(ranked_results)} candidate result(s) from tools.")
        context_lines.append(
            "Use the following retrieved recipe context to answer the user. "
            "Do not invent recipe facts that conflict with it:\n"
            + json.dumps(ranked_results[:10], ensure_ascii=False, default=str)
        )

    return "\n".join(context_lines)


async def answer(state: ChatGraphState, tools: list[BaseTool] | None = None) -> ChatGraphState:
    settings = get_settings()
    llm = ChatOpenAI(model=settings.openai_model, api_key=settings.openai_api_key).bind_tools(tools or CHAT_TOOLS)
    messages = ensure_system_message(state.get("messages", []))
    context = _build_context(state)

    if context:
        messages = [*messages, SystemMessage(content=context)]
    messages = [*messages, SystemMessage(content=TOOL_USAGE_PROMPT)]

    response = await llm.ainvoke(messages)
    if not response.content and not response.tool_calls:
        raise HTTPException(status_code=502, detail="OpenAI returned an empty response")

    return {
        "messages": [response],
    }
