from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_graph import run_chat_graph


router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    reply = await run_chat_graph(payload.message, payload.history)
    return ChatResponse(reply=reply)
