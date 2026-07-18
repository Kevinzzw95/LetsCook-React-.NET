from fastapi import HTTPException
from openai import APIError, OpenAIError
from langgraph.graph import END, START, StateGraph

from app.core.config import get_settings
from app.schemas.chat import ChatMessage
from app.services.chat_graph.nodes.answer import answer
from app.services.chat_graph.nodes.classify_intent import classify_intent
from app.services.chat_graph.nodes.health_rules import health_rules
from app.services.chat_graph.nodes.nutrition_filter import nutrition_filter
from app.services.chat_graph.nodes.rank import rank
from app.services.chat_graph.nodes.route_to_agents import prepare_agent_routes, route_to_agents
from app.services.chat_graph.nodes.search_internal import search_internal
from app.services.chat_graph.nodes.search_social import search_social
from app.services.chat_graph.nodes.search_web import search_web
from app.services.chat_graph.nodes.understand_request import understand_request
from app.services.chat_graph.state import ChatGraphState, build_initial_messages


def build_chat_graph():
    graph_builder = StateGraph(ChatGraphState)

    graph_builder.add_node("understand_request", understand_request)
    graph_builder.add_node("classify_intent", classify_intent)
    graph_builder.add_node("route_to_agents", prepare_agent_routes)
    graph_builder.add_node("search_internal", search_internal)
    graph_builder.add_node("search_web", search_web)
    graph_builder.add_node("search_social", search_social)
    graph_builder.add_node("nutrition_filter", nutrition_filter)
    graph_builder.add_node("health_rules", health_rules)
    graph_builder.add_node("rank", rank)
    graph_builder.add_node("answer", answer)

    graph_builder.add_edge(START, "understand_request")
    graph_builder.add_edge("understand_request", "classify_intent")
    graph_builder.add_edge("classify_intent", "route_to_agents")
    graph_builder.add_conditional_edges("route_to_agents", route_to_agents)
    graph_builder.add_edge("search_internal", "nutrition_filter")
    graph_builder.add_edge("search_web", "nutrition_filter")
    graph_builder.add_edge("search_social", "nutrition_filter")
    graph_builder.add_edge("nutrition_filter", "health_rules")
    graph_builder.add_edge("health_rules", "rank")
    graph_builder.add_edge("rank", "answer")
    graph_builder.add_edge("answer", END)

    return graph_builder.compile()


async def run_chat_graph(message: str, history: list[ChatMessage]) -> str:
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

    graph = build_chat_graph()
    state: ChatGraphState = {
        "messages": build_initial_messages(message, history),
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

    return str(reply)
