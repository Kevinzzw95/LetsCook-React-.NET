from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class ScheduledMeal(BaseModel):
    planned_date: date
    meal_type: Literal['breakfast', 'lunch', 'dinner']
    recipe_id: str = Field(pattern=r'^[1-9][0-9]*$')


class SavedMeal(ScheduledMeal):
    id: str
    recipe_title: str
    status: Literal['saved', 'existing']


class UnfilledMeal(BaseModel):
    planned_date: date
    meal_type: str


class MealPlanSaveResult(BaseModel):
    status: Literal['saved', 'unchanged', 'failed', 'not_saved']
    entries: list[SavedMeal] = Field(default_factory=list)
    unfilled_slots: list[UnfilledMeal] = Field(default_factory=list)
    reason: str | None = None
    unverified_requirements: list[str] = Field(default_factory=list)
