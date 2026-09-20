from typing import Any

from app.services.chat_graph.state import ChatGraphState


def _number(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


async def nutrition_validation(state: ChatGraphState) -> ChatGraphState:
    attributes = state.get("recipe_attributes", {})
    maximum_calories = _number(attributes.get("calories"))
    minimum_protein = _number(attributes.get("protein"))
    validated: list[dict[str, Any]] = []
    validation_notes = list(state.get("nutrition_notes", []))
    excluded_count = 0

    for candidate in state.get("normalized_results", []):
        violations: list[str] = []
        calories = _number(candidate.get("calories"))
        protein = _number(candidate.get("protein"))

        if maximum_calories is not None and calories is not None and calories > maximum_calories:
            violations.append(f"calories exceed {maximum_calories:g}")
        if minimum_protein is not None and protein is not None and protein < minimum_protein:
            violations.append(f"protein is below {minimum_protein:g}g")

        if violations:
            excluded_count += 1
            continue

        has_known_nutrition = calories is not None or protein is not None
        validated.append({
            **candidate,
            "nutrition_validation": "passed" if has_known_nutrition else "unknown",
        })

    if excluded_count:
        validation_notes.append(
            f"Excluded {excluded_count} candidate(s) that conflict with explicit nutrition limits."
        )
    if any(result.get("source") == "web" for result in validated):
        validation_notes.append(
            "Nutrition and allergen details for web URL candidates were not available for validation."
        )

    request = state.get("request", "").lower()
    if "pregnant" in request or "allergy" in request or "allergic" in request:
        validation_notes.append(
            "Mention safety-sensitive dietary needs and suggest checking with a qualified professional."
        )

    return {
        "validated_results": validated,
        "validation_notes": list(dict.fromkeys(validation_notes)),
    }
