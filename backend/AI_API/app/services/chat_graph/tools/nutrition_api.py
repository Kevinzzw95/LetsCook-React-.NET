async def summarize_nutrition_constraints(query: str) -> list[str]:
    normalized_query = query.lower()
    notes: list[str] = []

    if "high protein" in normalized_query:
        notes.append("Prioritize protein-forward options.")
    if "low carb" in normalized_query:
        notes.append("Avoid carb-heavy bases unless the user asks for them.")
    if "low calorie" in normalized_query:
        notes.append("Prefer lighter cooking methods and portion guidance.")

    return notes
