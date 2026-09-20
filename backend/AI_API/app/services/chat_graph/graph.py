from dataclasses import dataclass

from fastapi import HTTPException
from openai import APIError, OpenAIError
from langgraph.graph import END, START, StateGraph

from app.core.config import get_settings
from app.schemas.chat import ChatMessage
from app.services.chat_graph.nodes.answer import answer
from app.services.chat_graph.nodes.meal_planning import meal_planning_agent
from app.services.chat_graph.nodes.merge_normalize import merge_normalize
from app.services.chat_graph.nodes.nutrition_validation import nutrition_validation
from app.services.chat_graph.nodes.rank import rank_recipes
from app.services.chat_graph.nodes.similarity_query import build_similarity_query
from app.services.chat_graph.nodes.specialists import (
    internal_search_agent,
    nutrition_agent,
    web_search_agent,
)
from app.services.chat_graph.nodes.supervisor import (
    route_after_internal,
    route_after_web,
    route_to_specialists,
    supervisor,
)
from app.services.chat_graph.state import ChatGraphState, build_initial_messages


@dataclass(frozen=True)
class ChatGraphResult:
    reply: str


def build_chat_graph():
    graph_builder = StateGraph(ChatGraphState)

    graph_builder.add_node("supervisor", supervisor)
    graph_builder.add_node("meal_planning_agent", meal_planning_agent)
    graph_builder.add_edge("meal_planning_agent", "answer")
    graph_builder.add_node("internal_search_agent", internal_search_agent)
    graph_builder.add_node("web_search_agent", web_search_agent)
    graph_builder.add_node("nutrition_agent", nutrition_agent)
    graph_builder.add_node("build_similarity_query", build_similarity_query)
    graph_builder.add_node("merge_normalize", merge_normalize)
    graph_builder.add_node("nutrition_validation", nutrition_validation)
    graph_builder.add_node("rank_recipes", rank_recipes)
    graph_builder.add_node("answer", answer)

    graph_builder.add_edge(START, "supervisor")
    graph_builder.add_conditional_edges("supervisor", route_to_specialists)
    graph_builder.add_conditional_edges(
        "internal_search_agent",
        route_after_internal,
        {
            "build_similarity_query": "build_similarity_query",
            "merge_normalize": "merge_normalize",
        },
    )
    graph_builder.add_edge("build_similarity_query", "web_search_agent")
    graph_builder.add_conditional_edges(
        "web_search_agent",
        route_after_web,
        {
            "nutrition_agent": "nutrition_agent",
            "merge_normalize": "merge_normalize",
        },
    )
    graph_builder.add_edge("nutrition_agent", "merge_normalize")
    graph_builder.add_edge("merge_normalize", "nutrition_validation")
    graph_builder.add_edge("nutrition_validation", "rank_recipes")
    graph_builder.add_edge("rank_recipes", "answer")
    graph_builder.add_edge("answer", END)

    return graph_builder.compile()


async def run_chat_graph(
    message: str,
    history: list[ChatMessage],
    user_id: str | None = None,
) -> ChatGraphResult:
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    graph = build_chat_graph()
    state: ChatGraphState = {
        "messages": build_initial_messages(message, history),
        "user_id": user_id,
    }

    try:
        result = await graph.ainvoke(state)
        reply = result["messages"][-1].content
    except HTTPException:
        raise
    except APIError as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {exc}") from exc
    except OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI SDK error: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Chat graph failed: {exc}") from exc

    if not reply:
        raise HTTPException(status_code=502, detail="Chat graph returned an empty response")

    return ChatGraphResult(reply=str(reply))
