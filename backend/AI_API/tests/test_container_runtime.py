"""Core-only startup must not depend on browser or crawler packages."""
import os
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


def test_core_import_does_not_load_crawler_modules():
    code = """
import sys
from app.main import app
assert 'app.services.crawler_manager' not in sys.modules
assert 'app.services.xiaohongshu' not in sys.modules
assert not any(name.startswith('playwright') for name in sys.modules)
paths = {r.path for r in app.routes}
assert '/generateRecipeImages' in paths
assert '/api/env/check' not in paths
assert '/api/health' in paths
"""
    subprocess.run([sys.executable, '-c', code], check=True, cwd=Path(__file__).parents[1],
                   env={**os.environ, 'ENABLE_CRAWLER': 'false'}, timeout=60)


def test_cors_and_disabled_import(monkeypatch):
    monkeypatch.setenv('ENABLE_CRAWLER', 'false')
    monkeypatch.setenv('CORS_ORIGINS', 'https://recipes.example, https://preview.example')
    get_settings.cache_clear()
    try:
        client = TestClient(create_app())
        response = client.options('/generateRecipeImages', headers={
            'Origin': 'https://recipes.example', 'Access-Control-Request-Method': 'POST'})
        assert response.headers['access-control-allow-origin'] == 'https://recipes.example'
        assert client.get('/api/env/check').status_code == 404
        assert client.post('/generateRecipeUrl', json={'url': 'https://www.xiaohongshu.com/note'}).status_code == 503
        assert client.get('/api/health').status_code == 200
    finally:
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_chat_timeout_is_explicit(monkeypatch):
    import asyncio
    from fastapi import HTTPException
    from app.services.chat_graph import graph

    async def slow(_):
        await asyncio.sleep(10)
    monkeypatch.setattr(graph, 'get_settings', lambda: SimpleNamespace(
        openai_api_key='unused', meal_plan_timezone='America/Toronto', request_timeout_seconds=0.01))
    monkeypatch.setattr(graph, 'build_chat_graph', lambda: SimpleNamespace(ainvoke=slow))
    with pytest.raises(HTTPException) as error:
        await graph.run_chat_graph('hello', [], user_id='user')
    assert error.value.status_code == 504
    assert 'check your meal plan' in error.value.detail
