import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


def _get_bool_env(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_list_env(name: str) -> list[str]:
    value = os.environ.get(name, "")
    return [item.strip() for item in value.replace("\n", ",").split(",") if item.strip()]


class Settings(BaseModel):
    api_key_gemini: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-5.4-mini"
    openai_embedding_model: str = "text-embedding-3-small"
    openai_embedding_dimensions: int = 1536
    recipe_database_url: Optional[str] = None
    recipe_search_limit: int = 5
    recipe_vector_collection: str = "letscook_recipes"
    web_recipe_search_urls: list[str] = Field(default_factory=list)
    web_recipe_search_max_results: int = 3
    jwt_secret: Optional[str] = None
    redis_url: Optional[str] = None
    chat_history_limit: int = 40
    chat_history_ttl_seconds: int = 604800
    langsmith_tracing: bool = False
    langsmith_api_key: Optional[str] = None
    langsmith_project: str = "letscook-ai-api"
    langsmith_endpoint: Optional[str] = None
    xhs_cookies: Optional[str] = None
    cloudinary_cloud_name: Optional[str] = None
    cloudinary_api_key: Optional[str] = None
    cloudinary_api_secret: Optional[str] = None
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])


@lru_cache
def get_settings() -> Settings:
    return Settings(
        api_key_gemini=os.environ.get("API_KEY_GEMINI"),
        openai_api_key=os.environ.get("OPENAI_API_KEY"),
        openai_model=os.environ.get("OPENAI_MODEL", "gpt-4.1-mini"),
        openai_embedding_model=os.environ.get("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
        openai_embedding_dimensions=int(os.environ.get("OPENAI_EMBEDDING_DIMENSIONS", "1536")),
        recipe_database_url=os.environ.get("RECIPE_DATABASE_URL") or os.environ.get("DATABASE_URL"),
        recipe_search_limit=int(os.environ.get("RECIPE_SEARCH_LIMIT", "5")),
        recipe_vector_collection=os.environ.get("RECIPE_VECTOR_COLLECTION", "letscook_recipes"),
        web_recipe_search_urls=_get_list_env("WEB_RECIPE_SEARCH_URLS"),
        web_recipe_search_max_results=max(1, min(int(os.environ.get("WEB_RECIPE_SEARCH_MAX_RESULTS", "3")), 10)),
        jwt_secret=os.environ.get("JWT_SECRET"),
        redis_url=os.environ.get("REDIS_URL"),
        chat_history_limit=int(os.environ.get("CHAT_HISTORY_LIMIT", "40")),
        chat_history_ttl_seconds=int(os.environ.get("CHAT_HISTORY_TTL_SECONDS", "604800")),
        langsmith_tracing=_get_bool_env("LANGSMITH_TRACING"),
        langsmith_api_key=os.environ.get("LANGSMITH_API_KEY"),
        langsmith_project=os.environ.get("LANGSMITH_PROJECT", "letscook-ai-api"),
        langsmith_endpoint=os.environ.get("LANGSMITH_ENDPOINT"),
        xhs_cookies=os.environ.get("XHS_COOKIES"),
        cloudinary_cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
        cloudinary_api_key=os.environ.get("CLOUDINARY_API_KEY"),
        cloudinary_api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    )
