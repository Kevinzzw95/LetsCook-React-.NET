from types import SimpleNamespace

import pytest

from app.services.chat_graph.tools import web_search


def _settings(**overrides: object) -> SimpleNamespace:
    values = {
        "tavily_api_key": "tvly-test-key",
        "openai_api_key": "openai-test-key",
        "openai_model": "test-model",
        "web_recipe_preferred_domains": ["recipes.example"],
        "web_recipe_search_max_results": 2,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


class FakeTavilyClient:
    def __init__(self, search_payload: dict | dict[str, dict] | Exception):
        self.search_payload = search_payload
        self.search_calls: list[dict] = []
        self.closed = False

    async def search(self, **kwargs: object) -> dict:
        self.search_calls.append(kwargs)
        if isinstance(self.search_payload, Exception):
            raise self.search_payload
        if "results" not in self.search_payload:
            return self.search_payload[str(kwargs["query"])]
        return self.search_payload

    async def close(self) -> None:
        self.closed = True


def _install_client(monkeypatch, tavily_client: FakeTavilyClient) -> None:
    monkeypatch.setattr(web_search, "AsyncTavilyClient", lambda **kwargs: tavily_client)


@pytest.mark.asyncio
async def test_web_search_returns_only_ranked_candidate_urls(monkeypatch):
    first = "https://recipes.example/recipe/lemon-salmon"
    second = "https://recipes.example/recipe/pasta"
    tavily_client = FakeTavilyClient({"results": [
        {"url": first, "title": "Lemon Salmon", "content": "Recipe details", "score": 0.92},
        {"url": second, "title": "Pasta", "content": "More details", "score": 0.88},
        {"url": "https://external.example/ignored", "score": 0.99},
    ]})
    _install_client(monkeypatch, tavily_client)
    monkeypatch.setattr(web_search, "get_settings", _settings)

    results = await web_search.search_web_for_recipes("lemon salmon", "recipe_search")

    assert results == [first, second]
    assert tavily_client.search_calls == [{
        "query": "lemon salmon",
        "search_depth": "basic",
        "topic": "general",
        "include_domains": ["recipes.example"],
        "max_results": 2,
        "include_answer": False,
        "include_raw_content": False,
        "include_images": False,
    }]
    assert tavily_client.closed is True


@pytest.mark.asyncio
async def test_web_search_lists_rednote_candidate_without_crawling(monkeypatch):
    candidate = "https://www.rednote.com/explore/recipe-note"
    tavily_client = FakeTavilyClient({"results": [{"url": candidate}]})
    _install_client(monkeypatch, tavily_client)
    monkeypatch.setattr(web_search, "get_settings", lambda: _settings(
        web_recipe_preferred_domains=["rednote.com"],
        web_recipe_search_max_results=1,
    ))

    assert await web_search.search_web_for_recipes("beef recipe", "recipe_search") == [candidate]


@pytest.mark.asyncio
async def test_web_search_omits_domain_filter_when_not_configured(monkeypatch):
    candidate = "https://recipes.example/recipe/pasta"
    tavily_client = FakeTavilyClient({"results": [{"url": candidate}]})
    _install_client(monkeypatch, tavily_client)
    monkeypatch.setattr(web_search, "get_settings", lambda: _settings(
        web_recipe_preferred_domains=[],
        web_recipe_search_max_results=1,
    ))

    assert await web_search.search_web_for_recipes("pasta", "recipe_search") == [candidate]
    assert tavily_client.search_calls[0]["include_domains"] is None


@pytest.mark.asyncio
async def test_web_search_returns_empty_without_tavily_key(monkeypatch, caplog):
    monkeypatch.setattr(web_search, "get_settings", lambda: _settings(tavily_api_key=None))

    assert await web_search.search_web_for_recipes("pasta", "recipe_search") == []
    assert "TAVILY_API_KEY is not configured" in caplog.text


@pytest.mark.asyncio
async def test_web_search_sanitizes_tavily_provider_errors(monkeypatch, caplog):
    tavily_client = FakeTavilyClient(RuntimeError("secret provider response"))
    _install_client(monkeypatch, tavily_client)
    monkeypatch.setattr(web_search, "get_settings", _settings)

    assert await web_search.search_web_for_recipes("pasta", "recipe_search") == []
    assert "RuntimeError" in caplog.text
    assert "secret provider response" not in caplog.text
    assert tavily_client.closed is True


def test_tavily_result_links_keep_ranked_unique_preferred_candidates():
    payload = {"results": [
        {"url": "https://recipes.example/recipe/one#method"},
        {"url": "https://recipes.example/recipe/one"},
        {"url": "https://sub.recipes.example/recipe/two"},
        {"url": "https://external.example/recipe"},
        {"url": "javascript:alert(1)"},
        {"title": "Missing URL"},
    ]}

    assert web_search._tavily_result_links(payload, ["recipes.example"]) == [
        "https://recipes.example/recipe/one",
        "https://sub.recipes.example/recipe/two",
    ]


@pytest.mark.asyncio
async def test_long_query_is_planned_searched_and_reranked(monkeypatch):
    query = "Find a quick spicy beef dinner with vegetables that is dairy free and ready in thirty minutes"
    planned_queries = [
        "quick spicy beef vegetable recipe",
        "dairy free beef dinner recipe",
        "thirty minute spicy beef recipe",
    ]
    repeated = "https://recipes.example/recipe/spicy-beef"
    tavily_client = FakeTavilyClient({
        planned_queries[0]: {"results": [
            {"url": "https://recipes.example/recipe/first", "score": 0.99},
            {"url": repeated, "score": 0.80},
        ]},
        planned_queries[1]: {"results": [
            {"url": repeated, "score": 0.75},
            {"url": "https://recipes.example/recipe/second", "score": 0.90},
        ]},
        planned_queries[2]: {"results": [
            {"url": repeated, "score": 0.70},
        ]},
    })

    async def fake_plan(search_query: str, intent: str, settings: object) -> list[str]:
        assert search_query == query
        assert intent == "recipe_search"
        return planned_queries

    _install_client(monkeypatch, tavily_client)
    monkeypatch.setattr(web_search, "get_settings", lambda: _settings(web_recipe_search_max_results=3))
    monkeypatch.setattr(web_search, "_plan_search_queries", fake_plan)

    results = await web_search.search_web_for_recipes(query, "recipe_search")

    assert results == [
        repeated,
        "https://recipes.example/recipe/first",
        "https://recipes.example/recipe/second",
    ]
    assert {call["query"] for call in tavily_client.search_calls} == set(planned_queries)
    assert tavily_client.closed is True


@pytest.mark.asyncio
async def test_query_planner_returns_structured_variants(monkeypatch):
    class FakePlanner:
        async def ainvoke(self, messages: list[object]) -> web_search.WebSearchQueryPlan:
            assert len(messages) == 2
            return web_search.WebSearchQueryPlan(queries=[
                "quick spicy chicken recipes",
                "dairy free chicken dinner",
                "quick spicy chicken recipes",
            ])

    class FakeChatOpenAI:
        def __init__(self, **kwargs: object):
            assert kwargs == {
                "model": "test-model",
                "api_key": "openai-test-key",
                "temperature": 0,
            }

        def with_structured_output(self, schema: object) -> FakePlanner:
            assert schema is web_search.WebSearchQueryPlan
            return FakePlanner()

    monkeypatch.setattr(web_search, "ChatOpenAI", FakeChatOpenAI)

    planned = await web_search._plan_search_queries(
        "Find a quick spicy chicken recipe for dinner that contains no dairy products",
        "recipe_search",
        _settings(),
    )

    assert planned == [
        "quick spicy chicken recipes",
        "dairy free chicken dinner",
    ]


@pytest.mark.asyncio
async def test_query_planner_failure_falls_back_to_original_query(monkeypatch, caplog):
    class FailingPlanner:
        async def ainvoke(self, messages: list[object]) -> object:
            raise RuntimeError("secret provider response")

    class FakeChatOpenAI:
        def __init__(self, **kwargs: object):
            pass

        def with_structured_output(self, schema: object) -> FailingPlanner:
            return FailingPlanner()

    query = "Find a quick spicy chicken recipe for dinner that contains no dairy products"
    monkeypatch.setattr(web_search, "ChatOpenAI", FakeChatOpenAI)

    assert await web_search._plan_search_queries(query, "recipe_search", _settings()) == [query]
    assert "RuntimeError" in caplog.text
    assert "secret provider response" not in caplog.text
