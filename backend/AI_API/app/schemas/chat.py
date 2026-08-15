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


class ChatResponse(BaseModel):
    reply: str
    user_message: StoredChatMessage
    assistant_message: StoredChatMessage
