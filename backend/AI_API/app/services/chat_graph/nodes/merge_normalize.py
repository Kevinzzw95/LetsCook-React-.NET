from typing import Any

from app.services.chat_graph.state import ChatGraphState


def _candidate_key(candidate: dict[str, Any]) -> str:
    source = str(candidate.get("source") or "")
    identity = (
        candidate.get("id")
        or candidate.get("source_url")
        or candidate.get("url")
        or candidate.get("title")
        or candidate.get("content")
    )
    return f"{source}:{identity}"


async def merge_normalize(state: ChatGraphState) -> ChatGraphState:
    candidates: list[dict[str, Any]] = []

    for source_rank, result in enumerate(state.get("internal_results", []), start=1):
        if isinstance(result, dict):
            candidates.append({**result, "source": "internal", "source_rank": source_rank})

    for source_rank, url in enumerate(state.get("web_results", []), start=1):
        if isinstance(url, str) and url.strip():
            candidates.append({
                "source": "web",
                "url": url,
                "source_url": url,
                "source_rank": source_rank,
            })

    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for candidate in candidates:
        key = _candidate_key(candidate)
        if key in seen:
            continue
        normalized.append(candidate)
        seen.add(key)

    return {"normalized_results": normalized}
