from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
from app.schemas.meal_plan import MealPlanSaveResult
from app.services.meal_plan_dates import validate_timezone


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    timezone: str | None = None

    @field_validator("timezone")
    @classmethod
    def check_timezone(cls, value):
        return validate_timezone(value) if value is not None else None


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


class ChatResponse(BaseModel):
    reply: str
    meal_plan_save_result: MealPlanSaveResult | None = None
    user_message: StoredChatMessage
    assistant_message: StoredChatMessage
