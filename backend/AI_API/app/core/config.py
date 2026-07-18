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


class Settings(BaseModel):
    api_key_gemini: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-5.4-mini"
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
        langsmith_tracing=_get_bool_env("LANGSMITH_TRACING"),
        langsmith_api_key=os.environ.get("LANGSMITH_API_KEY"),
        langsmith_project=os.environ.get("LANGSMITH_PROJECT", "letscook-ai-api"),
        langsmith_endpoint=os.environ.get("LANGSMITH_ENDPOINT"),
        xhs_cookies=os.environ.get("XHS_COOKIES"),
        cloudinary_cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
        cloudinary_api_key=os.environ.get("CLOUDINARY_API_KEY"),
        cloudinary_api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    )
