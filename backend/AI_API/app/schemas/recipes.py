from typing import List

from pydantic import BaseModel


class Ingredient(BaseModel):
    name: str
    unit: str
    amount: str


class Step(BaseModel):
    stepNumber: int
    description: str


class Recipe(BaseModel):
    title: str
    ingredients: List[Ingredient]
    steps: List[Step]
    servings: int


class GenerateRecipeUrlPayload(BaseModel):
    url: str
