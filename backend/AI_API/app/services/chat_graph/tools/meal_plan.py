"""Daily meal planning using owned recipes and stored whole-recipe nutrition."""
import json
import math
from datetime import date
from collections import Counter
from typing import Literal

from langchain_core.tools import tool
from pydantic import BaseModel, Field, field_validator, model_validator

from app.services.chat_graph.tools.recipe_db import (
    _matches_post_filters,
    load_user_recipe_documents,
    recipe_documents_to_results,
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


class RecipeSearchAttributes(BaseModel):
    cuisines: list[str] = Field(default_factory=list)
    ingredients: list[str] = Field(default_factory=list)
    dish_types: list[str] = Field(default_factory=list)
    cooking_methods: list[str] = Field(default_factory=list)
    dietary_preferences: list[str] = Field(default_factory=list)
    equipment: list[str] = Field(default_factory=list)
    maximum_cooking_minutes: int | None = Field(default=None, gt=0)


class MealPlanRequirements(BaseModel):
    days: int = Field(default=1, ge=1, le=14)
    save_requested: bool = Field(default=False, description="True only when the latest user message explicitly asks to save/add meals.")
    start_date: date | None = None
    day_offset: int | None = Field(default=None, ge=0, le=365, description="Relative calendar days: tomorrow or 接下来一天 = 1; today = 0.")
    ingredient_match_mode: Literal["all", "any"] = "all"
    recipe_search_attributes: RecipeSearchAttributes = Field(default_factory=RecipeSearchAttributes)
    meals: list[Literal["breakfast", "lunch", "dinner", "snack"]] = Field(
        default_factory=lambda: ["breakfast", "lunch", "dinner"], min_length=1, max_length=4,
    )
    diets: list[str] = Field(default_factory=list)
    ingredients: list[str] = Field(
        default_factory=list,
        description="Ingredient names that every selected recipe must contain; not a pantry-only inventory.",
    )
    allergies: list[str] = Field(default_factory=list)
    calories: DailyNutrition = Field(default_factory=DailyNutrition)
    protein: DailyNutrition = Field(default_factory=DailyNutrition)
    carbohydrate: DailyNutrition = Field(default_factory=DailyNutrition)
    fat: DailyNutrition = Field(default_factory=DailyNutrition)
    unsupported_requirements: list[str] = Field(
        default_factory=list,
        description="Unverifiable requirements; never copy this prose into a search query.",
    )

    @field_validator("ingredients")
    @classmethod
    def normalize_ingredients(cls, values: list[str]) -> list[str]:
        normalized = [" ".join(value.casefold().split()) for value in values]
        if any(not value or not any(character.isalnum() for character in value) for value in normalized):
            raise ValueError("Required ingredient names cannot be blank")
        return list(dict.fromkeys(normalized))

    @field_validator("meals")
    @classmethod
    def unique_meals(cls, values):
        return list(dict.fromkeys(values))


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
    candidates = []
    matching_documents = []
    for document in documents:
        metadata = document.metadata
        if not _matches_post_filters(document, {"ingredients": requirements.ingredients, "ingredient_match_mode": requirements.ingredient_match_mode}):
            continue
        if not all(_matches_post_filters(document, {"diet": diet}) for diet in requirements.diets):
            continue
        if requirements.allergies and (not metadata.get("ingredients") or not _matches_post_filters(
            document, {"allergies": requirements.allergies},
        )):
            continue
        matching_documents.append(document)
        if requirements.unsupported_requirements:
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
    if requirements.unsupported_requirements:
        return {
            "status": "candidates_found" if matching_documents else "no_matches",
            "days": [],
            "requirements": requirements.model_dump(),
            "candidate_recipes": recipe_documents_to_results(matching_documents),
            "unverified_requirements": requirements.unsupported_requirements,
            "notes": [
                "These are candidate recipes, not a validated daily meal plan. "
                "Semantic relevance does not prove that unsupported requirements are satisfied.",
                "Daily nutrition targets have not been validated for these candidates. "
                "Use the retrieved recipe facts to explain possible matches and what still needs clarification.",
            ],
        }
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
async def plan_daily_meals(
    requirements: MealPlanRequirements,
    user_id: str,
    candidate_recipe_ids: list[str] | None = None,
) -> str:
    """Plan 1–14 days from the authenticated user's saved recipes with daily nutrition bounds and diets.

    user_id must come from authenticated graph state, never from model-generated arguments.
    Returns meals, recipe IDs, servings, daily nutrition totals and unmet requirements.
    When candidate_recipe_ids is provided, use only those internal search matches.
    An empty list means no matches; omit it to consider all owned recipes.
    Unsupported requirements return recipe context for candidate suggestions, not a validated plan.
    """
    if not user_id or not user_id.strip():
        raise ValueError("An authenticated user is required for meal planning")
    documents = [] if candidate_recipe_ids == [] else await load_user_recipe_documents(user_id)
    if candidate_recipe_ids is not None:
        owned_documents = {str(document.metadata["id"]): document for document in documents}
        documents = [
            owned_documents[recipe_id] for recipe_id in dict.fromkeys(candidate_recipe_ids)
            if recipe_id in owned_documents
        ]
    result = (build_ranked_meal_plan(documents, requirements)
              if requirements.save_requested and not requirements.unsupported_requirements
              else build_meal_plan(documents, requirements))
    if candidate_recipe_ids is not None:
        result.setdefault("notes", []).append(
            "These results use the internal search candidates; other saved recipes may also meet the requirements."
        )
    return json.dumps(result, ensure_ascii=False, default=str)


def matches_requirements(document, requirements: MealPlanRequirements) -> bool:
    if not _matches_post_filters(document, {
        "ingredients": requirements.ingredients,
        "ingredient_match_mode": requirements.ingredient_match_mode,
    }):
        return False
    if not all(_matches_post_filters(document, {"diet": diet}) for diet in requirements.diets):
        return False
    return not requirements.allergies or bool(document.metadata.get("ingredients")) and _matches_post_filters(
        document, {"allergies": requirements.allergies},
    )


def per_serving_nutrition(document) -> dict | None:
    try:
        servings = float(document.metadata.get("servings") or 0)
        values = {key: float(document.metadata[key]) for key in NUTRIENTS}
        if not math.isfinite(servings) or servings <= 0 or values["calories"] <= 0:
            return None
        if any(not math.isfinite(value) or value < 0 for value in values.values()):
            return None
        return {key: value / servings for key, value in values.items()}
    except (KeyError, TypeError, ValueError):
        return None


def build_ranked_meal_plan(documents, requirements: MealPlanRequirements) -> dict:
    """Select distinct recipes in retrieval order, without inventing nutrition."""
    candidates = list({str(doc.metadata["id"]): doc for doc in documents
                       if matches_requirements(doc, requirements)}.values())
    has_targets = any(getattr(requirements, key).minimum is not None or
                      getattr(requirements, key).maximum is not None for key in NUTRIENTS)
    if has_targets:
        candidates = [doc for doc in candidates if per_serving_nutrition(doc) is not None]
    days = []
    for index in range(requirements.days):
        selected = candidates[index * len(requirements.meals):(index + 1) * len(requirements.meals)]
        meals = [{"meal": slot, "recipe_id": doc.metadata["id"], "title": doc.metadata.get("title"),
                  "source": "internal", "servings": 1, "nutrition": per_serving_nutrition(doc)}
                 for slot, doc in zip(requirements.meals, selected)]
        totals = ({key: sum(meal["nutrition"][key] for meal in meals) for key in NUTRIENTS}
                  if meals and all(meal["nutrition"] is not None for meal in meals) else None)
        violations = _violations(totals, requirements) if has_targets and totals is not None else []
        if has_targets and (totals is None or len(meals) != len(requirements.meals)):
            violations.append("Cannot verify daily nutrition for unfilled meal slots")
        days.append({"day": index + 1, "meals": meals, "nutrition": totals,
                     "unmet_requirements": violations,
                     "unfilled_slots": requirements.meals[len(meals):]})
    return {"status": "complete" if all(not day["unfilled_slots"] and not day["unmet_requirements"] for day in days)
            else "partial", "days": days, "requirements": requirements.model_dump(mode="json"),
            "notes": ["Recipes are ranked search matches; nutrition is unknown where saved data is missing."]}
