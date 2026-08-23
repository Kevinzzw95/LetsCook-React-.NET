import json
from types import SimpleNamespace

import pytest

from app.services.chat_graph.tools import web_search


def _recipe_html() -> str:
    recipe = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": "Lemon Salmon",
        "description": "A quick salmon dinner.",
        "image": ["https://recipes.example/salmon.jpg"],
        "recipeYield": "2 servings",
        "prepTime": "PT10M",
        "cookTime": "PT20M",
        "recipeIngredient": ["2 salmon fillets", "1 lemon"],
        "recipeInstructions": [{"@type": "HowToStep", "text": "Bake the salmon."}],
    }
    return f'<script type="application/ld+json">{json.dumps(recipe)}</script>'


class FakeResponse:
    def __init__(self, url: str, text: str = "", status_code: int = 200):
        self.url = url
        self.text = text
        self.status_code = status_code


class FakeClient:
    def __init__(self, responses: dict[str, FakeResponse], **_: object):
        self.responses = responses
        self.calls: list[str] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_: object):
        return None

    async def get(self, url: str) -> FakeResponse:
        self.calls.append(url)
        return self.responses[url]


@pytest.mark.asyncio
async def test_web_search_fetches_configured_target_and_extracts_recipe_json_ld(monkeypatch):
    target = "https://recipes.example/search?q=lemon+salmon"
    fake_client = FakeClient({target: FakeResponse(target, _recipe_html())})
    monkeypatch.setattr(web_search, "get_settings", lambda: SimpleNamespace(
        web_recipe_search_urls=["https://recipes.example/search?q={query}"],
        web_recipe_search_max_results=1,
    ))
    monkeypatch.setattr(web_search.httpx, "AsyncClient", lambda **kwargs: fake_client)

    results = await web_search.search_web_for_recipes("lemon salmon", "recipe_search")

    assert fake_client.calls == [target]
    assert results[0]["title"] == "Lemon Salmon"
    assert results[0]["source_url"] == target
    assert results[0]["preparation_minutes"] == 10
    assert results[0]["cooking_minutes"] == 20
    assert results[0]["steps"][0]["description"] == "Bake the salmon."


@pytest.mark.asyncio
async def test_web_search_skips_http_error_and_uses_next_target(monkeypatch):
    blocked = "https://blocked.example/search?q=pasta"
    working = "https://recipes.example/search?q=pasta"
    fake_client = FakeClient({
        blocked: FakeResponse(blocked, status_code=403),
        working: FakeResponse(working, _recipe_html()),
    })
    monkeypatch.setattr(web_search, "get_settings", lambda: SimpleNamespace(
        web_recipe_search_urls=[
            "https://blocked.example/search?q={query}",
            "https://recipes.example/search?q={query}",
        ],
        web_recipe_search_max_results=1,
    ))
    monkeypatch.setattr(web_search.httpx, "AsyncClient", lambda **kwargs: fake_client)

    results = await web_search.search_web_for_recipes("pasta", "recipe_search")

    assert fake_client.calls == [blocked, working]
    assert results[0]["title"] == "Lemon Salmon"


@pytest.mark.asyncio
async def test_web_search_skips_http_when_targets_are_not_configured(monkeypatch):
    monkeypatch.setattr(web_search, "get_settings", lambda: SimpleNamespace(
        web_recipe_search_urls=[],
        web_recipe_search_max_results=3,
    ))

    assert await web_search.search_web_for_recipes("pasta", "recipe_search") == []


def test_same_domain_links_excludes_external_urls():
    html = """
    <a href="/recipe/lemon-salmon">Recipe</a>
    <a href="https://external.example/recipe">External</a>
    """

    assert web_search._same_domain_links(html, "https://recipes.example/search") == [
        "https://recipes.example/recipe/lemon-salmon"
    ]
