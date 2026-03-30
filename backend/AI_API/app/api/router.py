from fastapi import APIRouter

from app.api.routes.recipes import router as recipes_router


api_router = APIRouter()
api_router.include_router(recipes_router)
