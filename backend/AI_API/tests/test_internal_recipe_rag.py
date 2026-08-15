import json
from decimal import Decimal
from types import SimpleNamespace

import pytest
from langchain_core.documents import Document

from app.services.chat_graph.nodes import search_internal as search_internal_module
from app.services.chat_graph.nodes.answer import _build_context
from app.services.chat_graph.tools import recipe_db


def _settings(**overrides):
    values = {
        "recipe_database_url": "postgresql://example/recipes",
        "recipe_search_limit": 5,
        "recipe_vector_collection": "letscook_recipes",
        "openai_api_key": "test-key",
        "openai_embedding_model": "text-embedding-3-small",
        "openai_embedding_dimensions": 1536,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def _recipe_row(recipe_id=7, title="Chicken Florentine"):
    return {
        "id": recipe_id,
        "title": title,
        "summary": "Chicken and spinach in a light sauce.",
        "cuisine": "Italian",
        "diets": ["high-protein"],
        "dish_type": "dinner",
        "servings": 4,
        "preparation_minutes": 10,
        "cooking_minutes": 25,
        "ingredients": json.dumps(
            [{"name": "spinach", "amount": "2", "unit": "cups", "original": "2 cups spinach"}]
        ),
        "instructions": json.dumps(
            [{"name": "Main", "steps": [{"step_number": 1, "description": "Wilt the spinach."}]}]
        ),
        "calories": Decimal("420.5"),
        "protein": Decimal("38"),
        "carbohydrate": Decimal("12"),
        "fat": Decimal("18"),
        "source_name": "LetsCook",
        "source_url": "https://example.test/recipes/7",
        "updated_at": "2026-07-18T00:00:00+00:00",
    }


class FakeConnection:
    def __init__(self, rows, hashes=None, vector_available=True):
        self.rows = rows
        self.hashes = hashes
        self.vector_available = vector_available
        self.executions = []
        self.closed = False

    async def fetch(self, query, *args):
        return self.rows

    async def fetchval(self, query, *args):
        if "pg_available_extensions" in query:
            return self.vector_available
        return json.dumps(self.hashes) if self.hashes is not None else None

    async def execute(self, query, *args):
        self.executions.append((query, args))

    async def close(self):
        self.closed = True


class FakeVectorStore:
    def __init__(self, results=None):
        self.added = []
        self.deleted = []
        self.results = results or []
        self.search_call = None

    async def aadd_documents(self, documents, ids):
        self.added.append((documents, ids))
        return ids

    async def adelete(self, ids):
        self.deleted.extend(ids)

    async def asimilarity_search_with_relevance_scores(self, query, k, filter):
        self.search_call = (query, k, filter)
        return self.results


def test_recipe_row_becomes_embedding_document():
    document = recipe_db._row_to_document(_recipe_row())

    assert document.id == "recipe-7"
    assert document.metadata["source"] == "internal"
    assert document.metadata["calories"] == 420.5
    assert document.metadata["ingredients"][0]["name"] == "spinach"
    assert "Chicken Florentine" in document.page_content
    assert "2 cups spinach" in document.page_content
    assert "Wilt the spinach." in document.page_content
    assert len(recipe_db._document_hash(document)) == 64


def test_vector_store_uses_openai_embeddings_and_pgvector(monkeypatch):
    captured = {}
    recipe_db._build_vector_store.cache_clear()

    class FakeEmbeddings:
        def __init__(self, **kwargs):
            captured["embeddings"] = kwargs

    class FakePGVector:
        def __init__(self, **kwargs):
            captured["vector_store"] = kwargs

    monkeypatch.setattr(recipe_db, "get_settings", _settings)
    monkeypatch.setattr(recipe_db, "OpenAIEmbeddings", FakeEmbeddings)
    monkeypatch.setattr(recipe_db, "PGVector", FakePGVector)

    recipe_db._build_vector_store()

    assert captured["embeddings"]["model"] == "text-embedding-3-small"
    assert captured["embeddings"]["dimensions"] == 1536
    assert captured["vector_store"]["collection_name"] == "letscook_recipes"
    assert captured["vector_store"]["connection"].startswith("postgresql+psycopg://")
    assert captured["vector_store"]["async_mode"] is True
    recipe_db._build_vector_store.cache_clear()


@pytest.mark.asyncio
async def test_embedding_sync_upserts_changed_and_deletes_stale_recipes(monkeypatch):
    current_document = recipe_db._row_to_document(_recipe_row())
    connection = FakeConnection(
        [_recipe_row()],
        hashes={"recipe-7": "outdated-hash", "recipe-99": "stale-hash"},
    )
    vector_store = FakeVectorStore()

    async def fake_connect(dsn, timeout):
        assert dsn == "postgresql://example/recipes"
        assert timeout == 10
        return connection

    monkeypatch.setattr(recipe_db, "get_settings", _settings)
    monkeypatch.setattr(recipe_db.asyncpg, "connect", fake_connect)

    await recipe_db.sync_recipe_embeddings(vector_store)

    assert connection.closed is True
    assert vector_store.added[0][1] == ["recipe-7"]
    assert vector_store.added[0][0][0].page_content == current_document.page_content
    assert vector_store.deleted == ["recipe-99"]
    assert any("RecipeEmbeddingSyncState" in query for query, _ in connection.executions)


@pytest.mark.asyncio
async def test_embedding_sync_reports_missing_pgvector(monkeypatch):
    connection = FakeConnection([], vector_available=False)

    async def fake_connect(dsn, timeout):
        return connection

    monkeypatch.setattr(recipe_db, "get_settings", _settings)
    monkeypatch.setattr(recipe_db.asyncpg, "connect", fake_connect)

    with pytest.raises(RuntimeError, match="pgvector extension is not available"):
        await recipe_db.sync_recipe_embeddings(FakeVectorStore())


@pytest.mark.asyncio
async def test_semantic_retrieval_uses_vector_scores_and_filters(monkeypatch):
    matching = recipe_db._row_to_document(_recipe_row())
    dairy = recipe_db._row_to_document(_recipe_row(8, "Creamy Chicken"))
    dairy.metadata["ingredients"] = [{"name": "heavy cream", "original": "1 cup heavy cream"}]
    vector_store = FakeVectorStore(results=[(dairy, 0.95), (matching, 0.88)])

    async def fake_sync(store):
        assert store is vector_store

    monkeypatch.setattr(recipe_db, "get_settings", _settings)
    monkeypatch.setattr(recipe_db, "_build_vector_store", lambda: vector_store)
    monkeypatch.setattr(recipe_db, "sync_recipe_embeddings", fake_sync)

    documents = await recipe_db.retrieve_recipe_documents(
        "healthy chicken and leafy greens",
        {"cuisine": "Italian", "calories": 500, "protein": 30, "allergies": ["dairy"]},
    )

    assert documents == [matching]
    assert documents[0].metadata["relevance"] == 0.88
    assert vector_store.search_call == (
        "healthy chicken and leafy greens",
        25,
        {
            "$and": [
                {"cuisine_normalized": {"$eq": "italian"}},
                {"calories": {"$lte": 500}},
                {"protein": {"$gte": 30}},
            ]
        },
    )


@pytest.mark.asyncio
async def test_search_internal_passes_request_and_attributes_to_vector_retrieval(monkeypatch):
    calls = []

    async def fake_retrieve(query, attributes):
        calls.append((query, attributes))
        return [Document(page_content="Retrieved recipe", metadata={"id": 1, "title": "Result"})]

    monkeypatch.setattr(search_internal_module, "retrieve_recipe_documents", fake_retrieve)
    state = {
        "request": "chicken dinner",
        "agent_query": "router-expanded query",
        "intent": "recipe_search",
        "search_sources": ["internal"],
        "recipe_attributes": {"calories": 600},
    }

    result = await search_internal_module.search_internal(state)

    assert calls == [("chicken dinner", {"calories": 600})]
    assert result["internal_results"][0]["title"] == "Result"
    assert result["internal_results"][0]["content"] == "Retrieved recipe"


def test_answer_context_contains_retrieved_recipe_documents():
    context = _build_context(
        {
            "ranked_results": [
                {
                    "source": "internal",
                    "title": "Chicken Florentine",
                    "content": "Chicken, spinach, and garlic",
                }
            ]
        }
    )

    assert "Chicken Florentine" in context
    assert "Chicken, spinach, and garlic" in context
