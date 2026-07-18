from app.services.chat_graph.state import ChatGraphState


async def health_rules(state: ChatGraphState) -> ChatGraphState:
    notes: list[str] = []
    request = state.get("request", "").lower()

    if "pregnant" in request or "allergy" in request or "allergic" in request:
        notes.append("Mention safety-sensitive dietary needs and suggest checking with a qualified professional.")

    return {
        "health_notes": notes,
    }
