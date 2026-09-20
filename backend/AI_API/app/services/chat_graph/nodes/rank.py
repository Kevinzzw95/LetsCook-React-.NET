from typing import Any

from app.services.chat_graph.state import ChatGraphState


def _ranking_score(candidate: dict[str, Any]) -> float:
    source_rank = candidate.get("source_rank", 1)
    try:
        position_score = 1 / max(1, int(source_rank))
    except (TypeError, ValueError):
        position_score = 0.0

    relevance = candidate.get("relevance", 0.0)
    try:
        relevance_score = float(relevance)
    except (TypeError, ValueError):
        relevance_score = 0.0

    source_score = 2.0 if candidate.get("source") == "internal" else 1.0
    validation_score = 0.2 if candidate.get("nutrition_validation") == "passed" else 0.0
    return source_score + validation_score + relevance_score + position_score


async def rank_recipes(state: ChatGraphState) -> ChatGraphState:
    ranked = sorted(
        state.get("validated_results", []),
        key=_ranking_score,
        reverse=True,
    )
    ranked_results = [
        {**candidate, "rank": rank}
        for rank, candidate in enumerate(ranked, start=1)
    ]

    return {
        "ranked_results": ranked_results,
    }
