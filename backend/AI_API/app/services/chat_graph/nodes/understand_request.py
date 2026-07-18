import re
from typing import Any

from app.services.chat_graph.state import ChatGraphState, get_latest_user_message


CUISINES = (
    "american",
    "chinese",
    "french",
    "greek",
    "indian",
    "italian",
    "japanese",
    "korean",
    "mediterranean",
    "mexican",
    "middle eastern",
    "spanish",
    "thai",
    "vietnamese",
)

DIETARY_KEYWORDS = {
    "dairy free": "dairy-free",
    "dairy-free": "dairy-free",
    "gluten free": "gluten-free",
    "gluten-free": "gluten-free",
    "high protein": "high-protein",
    "high-protein": "high-protein",
    "keto": "keto",
    "kosher": "kosher",
    "low calorie": "low-calorie",
    "low-calorie": "low-calorie",
    "low carb": "low-carb",
    "low-carb": "low-carb",
    "paleo": "paleo",
    "pescatarian": "pescatarian",
    "plant based": "plant-based",
    "plant-based": "plant-based",
    "vegan": "vegan",
    "vegetarian": "vegetarian",
    "halal": "halal",
}

ALLERGEN_KEYWORDS = {
    "dairy": "dairy",
    "egg": "eggs",
    "eggs": "eggs",
    "fish": "fish",
    "gluten": "gluten",
    "milk": "dairy",
    "peanut": "peanuts",
    "peanuts": "peanuts",
    "sesame": "sesame",
    "shellfish": "shellfish",
    "soy": "soy",
    "tree nut": "tree nuts",
    "tree nuts": "tree nuts",
    "wheat": "wheat",
}

HEALTH_GOAL_KEYWORDS = {
    "blood sugar": "blood sugar control",
    "diabetes": "blood sugar control",
    "energy": "energy",
    "gut health": "gut health",
    "heart healthy": "heart health",
    "heart health": "heart health",
    "lower cholesterol": "lower cholesterol",
    "muscle gain": "muscle gain",
    "weight loss": "weight loss",
}


def _dedupe(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


def _extract_calories(message: str) -> int | None:
    match = re.search(r"(?:under|less than|below|around|about|max|maximum)?\s*(\d{2,4})\s*(?:calories|calorie|kcal|cal)\b", message)
    return int(match.group(1)) if match else None


def _extract_protein(message: str) -> int | None:
    match = re.search(r"(\d{1,3})\s*(?:g|grams?)\s*(?:of\s*)?protein\b", message)
    if match:
        return int(match.group(1))

    match = re.search(r"\bprotein\b\D{0,20}(\d{1,3})\s*(?:g|grams?)?\b", message)
    return int(match.group(1)) if match else None


def _extract_allergies(message: str) -> list[str]:
    allergies: list[str] = []
    allergy_context = re.search(r"\b(?:allergic to|allergy to|allergies include|avoid|without|no)\b(?P<items>[^.?!,;]*(?:[,;][^.?!]*)?)", message)
    text_to_scan = allergy_context.group("items") if allergy_context else message

    for keyword, allergy in ALLERGEN_KEYWORDS.items():
        if re.search(rf"\b{re.escape(keyword)}\b", text_to_scan):
            allergies.append(allergy)

    return _dedupe(allergies)


def _extract_recipe_attributes(message: str) -> dict[str, Any]:
    normalized_message = message.lower()
    cuisine = next((item for item in CUISINES if re.search(rf"\b{re.escape(item)}\b", normalized_message)), None)
    dietary_constraints = [
        value for keyword, value in DIETARY_KEYWORDS.items() if re.search(rf"\b{re.escape(keyword)}\b", normalized_message)
    ]
    health_goals = [
        value for keyword, value in HEALTH_GOAL_KEYWORDS.items() if re.search(rf"\b{re.escape(keyword)}\b", normalized_message)
    ]

    return {
        "cuisine": cuisine,
        "diet": dietary_constraints[0] if dietary_constraints else None,
        "calories": _extract_calories(normalized_message),
        "protein": _extract_protein(normalized_message),
        "allergies": _extract_allergies(normalized_message),
        "health_goals": _dedupe(health_goals),
        "dietary_constraints": _dedupe(dietary_constraints),
    }


async def understand_request(state: ChatGraphState) -> ChatGraphState:
    request = get_latest_user_message(state.get("messages", []))
    attributes = _extract_recipe_attributes(request)

    return {
        "request": request,
        "recipe_attributes": attributes,
        "cuisine": attributes["cuisine"],
        "diet": attributes["diet"],
        "calories": attributes["calories"],
        "protein": attributes["protein"],
        "allergies": attributes["allergies"],
        "health_goals": attributes["health_goals"],
        "dietary_constraints": attributes["dietary_constraints"],
    }
