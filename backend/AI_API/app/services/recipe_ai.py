import json

from fastapi import HTTPException
from google import genai

from app.core.config import get_settings
from app.schemas.recipes import Recipe


def generate_recipe_json(query):
    settings = get_settings()
    if not settings.api_key_gemini:
        raise HTTPException(status_code=500, detail="API_KEY_GEMINI is not configured")

    client = genai.Client(api_key=settings.api_key_gemini)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=query,
        config={
            "response_mime_type": "application/json",
            "response_schema": Recipe,
        },
    )

    try:
        return json.loads(response.text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Invalid Gemini JSON response: {exc}") from exc
