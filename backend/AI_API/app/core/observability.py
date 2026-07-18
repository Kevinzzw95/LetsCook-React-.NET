import os
from contextlib import contextmanager
from typing import Any, Iterator

import langsmith as ls

from app.core.config import Settings


def configure_langsmith(settings: Settings) -> bool:
    if settings.langsmith_project:
        os.environ.setdefault("LANGSMITH_PROJECT", settings.langsmith_project)

    if settings.langsmith_api_key:
        os.environ.setdefault("LANGSMITH_API_KEY", settings.langsmith_api_key)

    if settings.langsmith_endpoint:
        os.environ.setdefault("LANGSMITH_ENDPOINT", settings.langsmith_endpoint)

    os.environ["LANGSMITH_TRACING"] = "true" if settings.langsmith_tracing else "false"
    return settings.langsmith_tracing and bool(settings.langsmith_api_key)


def chat_graph_trace_config(settings: Settings) -> dict[str, Any]:
    return {
        "run_name": "letscook_chat_graph",
        "tags": ["letscook", "chat", "langgraph"],
        "metadata": {
            "service": "AI_API",
            "graph": "chat_graph",
            "model": settings.openai_model,
            "langsmith_project": settings.langsmith_project,
        },
    }


@contextmanager
def langsmith_trace_context(settings: Settings, *, enabled: bool | None = None) -> Iterator[None]:
    tracing_enabled = configure_langsmith(settings) if enabled is None else enabled

    with ls.tracing_context(
        enabled=tracing_enabled,
        project_name=settings.langsmith_project,
    ):
        yield
