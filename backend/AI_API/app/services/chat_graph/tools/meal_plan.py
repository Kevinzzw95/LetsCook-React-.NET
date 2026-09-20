"""Daily meal planning using owned recipes and stored whole-recipe nutrition."""
import json
import math
from collections import Counter
from typing import Literal

from langchain_core.tools import tool
from pydantic import BaseModel, Field, model_validator

from app.services.chat_graph.tools.recipe_db import (
    _matches_post_filters,
    load_user_recipe_documents,
)

NUTRIENTS = ("calories", "protein", "carbohydrate", "fat")


class DailyNutrition(BaseModel):
    minimum: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    maximum: float | None = Field(default=None, ge=0, allow_inf_nan=False)

    @model_validator(mode="after")
    def validate_range(self):
        if self.minimum is not None and self.maximum is not None and self.minimum > self.maximum:
            raise ValueError("Nutrition minimum cannot exceed maximum")
        return self


class MealPlanRequirements(BaseModel):
    days: int = Field(default=1, ge=1, le=14)
    meals: list[Literal["breakfast", "lunch", "dinner", "snack"]] = Field(
        default_factory=lambda: ["breakfast", "lunch", "dinner"], min_length=1, max_length=4,
    )
    diets: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    calories: DailyNutrition = Field(default_factory=DailyNutrition)
    protein: DailyNutrition = Field(default_factory=DailyNutrition)
    carbohydrate: DailyNutrition = Field(default_factory=DailyNutrition)
    fat: DailyNutrition = Field(default_factory=DailyNutrition)
    unsupported_requirements: list[str] = Field(default_factory=list)


def _violations(totals: dict, requirements: MealPlanRequirements) -> list[str]:
    violations = []
    for nutrient in NUTRIENTS:
        bounds = getattr(requirements, nutrient)
        value = totals[nutrient]
        if bounds.minimum is not None and value < bounds.minimum:
            violations.append(f"{nutrient} below daily minimum {bounds.minimum}")
        if bounds.maximum is not None and value > bounds.maximum:
            violations.append(f"{nutrient} above daily maximum {bounds.maximum}")
    return violations


def build_meal_plan(documents, requirements: MealPlanRequirements) -> dict:
    if requirements.unsupported_requirements:
        return {"status": "needs_clarification", "days": [], "notes": requirements.unsupported_requirements}
    candidates = []
    for document in documents:
        metadata = document.metadata
        if not all(_matches_post_filters(document, {"diet": diet}) for diet in requirements.diets):
            continue
        if requirements.allergies and (not metadata.get("ingredients") or not _matches_post_filters(
            document, {"allergies": requirements.allergies},
        )):
            continue
        try:
            servings = float(metadata.get("servings") or 0)
            totals = {key: float(metadata[key]) for key in NUTRIENTS}
            if not math.isfinite(servings) or servings <= 0 or totals["calories"] <= 0:
                continue
            if any(not math.isfinite(value) or value < 0 for value in totals.values()):
                continue
        except (KeyError, TypeError, ValueError):
            continue
        candidates.append({
            "recipe_id": metadata["id"], "title": metadata.get("title"),
            "source": "internal", "servings": 1,
            "nutrition": {key: value / servings for key, value in totals.items()},
        })
    if not candidates:
        return {"status": "no_matches", "days": [], "notes": [
            "No saved recipes have matching diet/ingredient data and usable nutrition."
        ]}

    usage = Counter()
    days = []
    # Bounded beam search considers daily totals, not per-recipe daily limits.
    for day in range(1, requirements.days + 1):
        beam = [([], dict.fromkeys(NUTRIENTS, 0.0))]
        for index, meal in enumerate(requirements.meals):
            expanded = []
            fraction = (index + 1) / len(requirements.meals)
            for entries, totals in beam:
                for candidate in candidates:
                    combined = {key: totals[key] + candidate["nutrition"][key] for key in NUTRIENTS}
                    score = 0.0
                    for key in NUTRIENTS:
                        bounds = getattr(requirements, key)
                        if bounds.minimum is not None:
                            score += max(0, bounds.minimum * fraction - combined[key]) / max(bounds.minimum, 1)
                        if bounds.maximum is not None:
                            score += max(0, combined[key] - bounds.maximum * fraction) / max(bounds.maximum, 1)
                    repetition = usage[candidate["recipe_id"]] + sum(
                        entry["recipe_id"] == candidate["recipe_id"] for entry in entries
                    )
                    expanded.append((score, repetition, [*entries, {"meal": meal, **candidate}], combined))
            expanded.sort(key=lambda item: (item[0], item[1]))
            beam = [(entries, totals) for _, _, entries, totals in expanded[:64]]
        entries, totals = min(beam, key=lambda item: len(_violations(item[1], requirements)))
        violations = _violations(totals, requirements)
        usage.update(entry["recipe_id"] for entry in entries)
        days.append({"day": day, "meals": entries, "nutrition": totals, "unmet_requirements": violations})
    return {
        "status": "complete" if all(not day["unmet_requirements"] for day in days) else "partial",
        "requirements": requirements.model_dump(), "days": days,
        "notes": [
            "Nutrition is estimated from stored recipe totals divided by recipe servings; each meal is one serving.",
            "Diet and allergy checks use saved labels and ingredients; incomplete records cannot certify allergen safety.",
            "Meal labels are schedule slots; recipes may repeat when the saved collection is small.",
            "A partial plan is the closest result found by bounded search, not proof that the requirements are impossible.",
        ],
    }


@tool
async def plan_daily_meals(requirements: MealPlanRequirements, user_id: str) -> str:
    """Plan 1–14 days from the authenticated user's saved recipes with daily nutrition bounds and diets.

    user_id must come from authenticated graph state, never from model-generated arguments.
    Returns meals, recipe IDs, servings, daily nutrition totals and unmet requirements.
    """
    if not user_id or not user_id.strip():
        raise ValueError("An authenticated user is required for meal planning")
    documents = await load_user_recipe_documents(user_id)
    return json.dumps(build_meal_plan(documents, requirements), ensure_ascii=False, default=str)
