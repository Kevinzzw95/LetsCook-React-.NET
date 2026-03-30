import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


class Settings(BaseModel):
    api_key_gemini: Optional[str] = None
    xhs_cookies: Optional[str] = None
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])


@lru_cache
def get_settings() -> Settings:
    return Settings(
        api_key_gemini=os.environ.get("API_KEY_GEMINI"),
        xhs_cookies=os.environ.get("XHS_COOKIES"),
    )
