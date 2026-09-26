import json
import re

from fastapi import HTTPException
from langchain_core.messages import AIMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.core.config import get_settings
from app.services.chat_graph.state import ChatGraphState, ensure_system_message, get_latest_user_message


ANSWER_PROMPT = """Answer rules:
- The supervisor and specialist agents have already completed tool use. Do not request more tools.
- Web search results contain candidate URLs only. Present relevant URLs without claiming recipe details that were not retrieved.
- Do not offer or create recipe previews.
- Respect all nutrition validation and safety notes.
- For meal plans, use only the meal_plan tool output. Show each day, meal, saved recipe ID, servings, and daily totals.
- Never invent or substitute recipes, alter calculated totals, or claim unmet targets were satisfied.
- When candidate_recipes are present, suggest relevant saved recipes using only their retrieved facts, even if days is empty. Explain which requirements remain unverified and ask targeted follow-up questions where necessary. Do not present candidates as a completed meal plan or claim semantic search validated unsupported requirements or daily nutrition targets.
- If both the plan and candidates are empty, explain its status and ask for the missing requirements or saved recipes.
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


def format_save_confirmation(result: dict, chinese: bool, candidates: list | None = None) -> str:
    labels = {"breakfast": "早餐", "lunch": "午餐", "dinner": "晚餐"}
    if result["status"] == "failed":
        return ("未能确认餐单是否保存成功，请检查 meal plan 后再重试。" if chinese else
                "Could not confirm whether the meals were saved. Check your meal plan before retrying.")
    lines = []
    for entry in result.get("entries", []):
        action = ("已加入" if entry["status"] == "saved" else "已在餐单中，未重复添加") if chinese else (
            "Added" if entry["status"] == "saved" else "Already scheduled; not added again")
        slot = labels.get(entry["meal_type"], entry["meal_type"]) if chinese else entry["meal_type"]
        lines.append(f"{action}：{entry['planned_date']} {slot} — {entry['recipe_title']} (#{entry['recipe_id']})")
    if not lines:
        lines.append("没有添加任何餐单。" if chinese else "No meals were added.")
        if result.get("reason"):
            reasons = {
                "Specify the date before saving meals.": "请先指定要安排的日期。",
                "Some requirements remain unverified; candidate recipes have not been saved.": "部分要求尚无法验证，因此未保存候选食谱。",
                "The calendar supports breakfast, lunch and dinner; choose a supported meal slot.": "餐单支持早餐、午餐和晚餐，请选择对应餐次。",
                "Daily nutrition requirements could not be verified; no meals were saved.": "无法确认满足每日营养要求，因此未保存。",
                "No matching recipes were found; no meals were saved.": "未找到符合要求的食谱。",
            }
            lines.append(reasons.get(result["reason"], result["reason"]) if chinese else result["reason"])
    if result.get("unverified_requirements"):
        lines.append(("待确认要求：" if chinese else "Unverified requirements: ") + "; ".join(result["unverified_requirements"]))
    if candidates and result["status"] == "not_saved":
        lines.append("候选食谱（未保存）：" if chinese else "Candidate recipes (not saved):")
        lines.extend(f"{candidate.get('title', '')} (#{candidate['id']})" for candidate in candidates[:5])
    for slot in result.get("unfilled_slots", []):
        meal = labels.get(slot["meal_type"], slot["meal_type"]) if chinese else slot["meal_type"]
        lines.append(f"{slot['planned_date']} {meal}：" + ("没有足够的匹配食谱，暂未安排。" if chinese else "Not filled: insufficient matching recipes."))
    return "\n".join(lines)


async def answer(state: ChatGraphState) -> ChatGraphState:
    if state.get("meal_plan_save_result") is not None:
        chinese = bool(re.search(r"[\u3400-\u9fff]", get_latest_user_message(state.get("messages", []))))
        return {"messages": [AIMessage(content=format_save_confirmation(state["meal_plan_save_result"], chinese, state.get("meal_plan", {}).get("candidate_recipes")))]}
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
