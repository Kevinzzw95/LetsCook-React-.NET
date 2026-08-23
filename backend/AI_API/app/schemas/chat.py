from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)


class StoredChatMessage(ChatMessage):
    id: UUID
    created_at: datetime


class ConversationResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationMessagesResponse(BaseModel):
    conversation_id: UUID
    messages: list[StoredChatMessage]


class RecipePreviewIngredient(BaseModel):
    id: str | None = None
    name: str
    amount: str = ""
    unit: str = ""
    image: str | None = None


class RecipePreviewStep(BaseModel):
    id: str | None = None
    stepNumber: int
    description: str


class RecipePreviewDraft(BaseModel):
    title: str
    servings: int
    preparationMinutes: int = 0
    type: str = ""
    cuisine: str = ""
    diet: str = ""
    ingredients: list[RecipePreviewIngredient] = Field(default_factory=list)
    ingredientsEn: list[RecipePreviewIngredient] = Field(default_factory=list)
    steps: list[RecipePreviewStep] = Field(default_factory=list)
    images: list[str] = Field(default_factory=list)
    sourceName: str = ""
    sourceUrl: str | None = None


class ChatResponse(BaseModel):
    reply: str
    user_message: StoredChatMessage
    assistant_message: StoredChatMessage
    recipe_preview: RecipePreviewDraft | None = None
