import asyncio
import hashlib
import json
from decimal import Decimal
from functools import lru_cache
from typing import Any

import asyncpg
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector

from app.core.config import get_settings


_ALLERGEN_TERMS = {
    "dairy": ("milk", "cream", "butter", "cheese", "yogurt", "whey"),
    "eggs": ("egg",),
    "fish": ("fish", "salmon", "tuna", "cod", "anchovy"),
    "gluten": ("wheat", "flour", "bread", "pasta", "barley", "rye"),
    "peanuts": ("peanut",),
    "sesame": ("sesame", "tahini"),
    "shellfish": ("shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster"),
    "soy": ("soy", "tofu", "tempeh", "edamame"),
    "tree nuts": ("almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut"),
    "wheat": ("wheat", "flour", "bread", "pasta"),
}

_RECIPE_DOCUMENTS_SQL = r"""
SELECT
    r."Id" AS id,
    r."Title" AS title,
    r."Summary" AS summary,
    r."Cuisine" AS cuisine,
    r."Diets" AS diets,
    r."DishType" AS dish_type,
    r."Servings" AS servings,
    r."PreparationMinutes" AS preparation_minutes,
    r."CookingMinutes" AS cooking_minutes,
    r."Calories" AS calories,
    r."Protein" AS protein,
    r."Carbohydrate" AS carbohydrate,
    r."Fat" AS fat,
    r."SourceName" AS source_name,
    r."SourceUrl" AS source_url,
    r."UpdatedAt" AS updated_at,
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', instruction."Name",
                    'steps', COALESCE(
                        (
                            SELECT jsonb_agg(
                                jsonb_build_object(
                                    'step_number', step."StepNumber",
                                    'description', step."Description"
                                ) ORDER BY step."StepNumber"
                            )
                            FROM "Step" step
                            WHERE step."InstructionId" = instruction."Id"
                        ),
                        '[]'::jsonb
                    )
                ) ORDER BY instruction."Id"
            )
            FROM "Instruction" instruction
            WHERE instruction."RecipeId" = r."Id"
        ),
        '[]'::jsonb
    ) AS instructions,
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', recipe_ingredient."DisplayName",
                    'amount', recipe_ingredient."Amount",
                    'unit', recipe_ingredient."Unit",
                    'original', recipe_ingredient."Original"
                ) ORDER BY recipe_ingredient."SortOrder"
            )
            FROM "RecipeIngredients" recipe_ingredient
            WHERE recipe_ingredient."RecipeId" = r."Id"
        ),
        '[]'::jsonb
    ) AS ingredients
FROM "Recipes" r
ORDER BY r."Id"
"""

_CREATE_SYNC_STATE_SQL = r"""
CREATE TABLE IF NOT EXISTS "RecipeEmbeddingSyncState" (
    "CollectionName" text PRIMARY KEY,
    "ContentHashes" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "UpdatedAt" timestamp with time zone NOT NULL DEFAULT NOW()
)
"""

_UPSERT_SYNC_STATE_SQL = r"""
INSERT INTO "RecipeEmbeddingSyncState" ("CollectionName", "ContentHashes", "UpdatedAt")
VALUES ($1, $2::jsonb, NOW())
ON CONFLICT ("CollectionName") DO UPDATE SET
    "ContentHashes" = EXCLUDED."ContentHashes",
    "UpdatedAt" = EXCLUDED."UpdatedAt"
"""

_index_lock = asyncio.Lock()


def _json_value(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def _json_serializable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _normalize_label(value: str) -> str:
    return "".join(character for character in value.lower() if character.isalnum())


def _allergen_terms(allergies: list[str]) -> list[str]:
    terms: list[str] = []
    for allergy in allergies:
        terms.extend(_ALLERGEN_TERMS.get(allergy.lower(), (allergy.lower(),)))
    return list(dict.fromkeys(terms))


def _row_to_document(row: asyncpg.Record) -> Document:
    metadata = {key: _json_serializable(value) for key, value in dict(row).items()}
    metadata["ingredients"] = _json_value(metadata.get("ingredients", []))
    metadata["instructions"] = _json_value(metadata.get("instructions", []))
    metadata["diets"] = metadata.get("diets") or []
    metadata["cuisine_normalized"] = str(metadata.get("cuisine") or "").lower()
    metadata["source"] = "internal"

    ingredients = ", ".join(
        ingredient.get("original") or ingredient.get("name", "")
        for ingredient in metadata["ingredients"]
    )
    instructions = " ".join(
        step.get("description", "")
        for instruction in metadata["instructions"]
        for step in instruction.get("steps", [])
    )
    diets = ", ".join(metadata["diets"])
    page_content = "\n".join(
        part
        for part in (
            f"Recipe: {metadata.get('title', '')}",
            f"Summary: {metadata.get('summary', '')}" if metadata.get("summary") else "",
            f"Cuisine: {metadata.get('cuisine', '')}" if metadata.get("cuisine") else "",
            f"Diets: {diets}" if diets else "",
            f"Dish type: {metadata.get('dish_type', '')}" if metadata.get("dish_type") else "",
            f"Ingredients: {ingredients}" if ingredients else "",
            f"Instructions: {instructions}" if instructions else "",
            (
                "Nutrition: "
                f"{metadata.get('calories', 0)} calories, "
                f"{metadata.get('protein', 0)}g protein, "
                f"{metadata.get('carbohydrate', 0)}g carbohydrate, "
                f"{metadata.get('fat', 0)}g fat"
            ),
        )
        if part
    )
    return Document(
        id=f"recipe-{metadata['id']}",
        page_content=page_content,
        metadata=metadata,
    )


def _document_hash(document: Document) -> str:
    payload = json.dumps(
        {"content": document.page_content, "metadata": document.metadata},
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _pgvector_connection_string(database_url: str) -> str:
    if database_url.startswith("postgresql+psycopg://"):
        return database_url
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    raise ValueError("RECIPE_DATABASE_URL must be a PostgreSQL connection URL")


def _asyncpg_connection_string(database_url: str) -> str:
    return database_url.replace("postgresql+asyncpg://", "postgresql://", 1).replace(
        "postgresql+psycopg://", "postgresql://", 1
    )


@lru_cache(maxsize=1)
def _build_vector_store() -> PGVector:
    settings = get_settings()
    if not settings.recipe_database_url:
        raise RuntimeError("RECIPE_DATABASE_URL (or DATABASE_URL) is not configured")
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    embeddings = OpenAIEmbeddings(
        model=settings.openai_embedding_model,
        dimensions=settings.openai_embedding_dimensions,
        api_key=settings.openai_api_key,
    )
    return PGVector(
        embeddings=embeddings,
        connection=_pgvector_connection_string(settings.recipe_database_url),
        collection_name=settings.recipe_vector_collection,
        embedding_length=settings.openai_embedding_dimensions,
        use_jsonb=True,
        create_extension=True,
        async_mode=True,
    )


async def _load_recipe_documents(connection: asyncpg.Connection) -> list[Document]:
    rows = await connection.fetch(_RECIPE_DOCUMENTS_SQL)
    return [_row_to_document(row) for row in rows]


async def _read_index_hashes(connection: asyncpg.Connection, collection_name: str) -> dict[str, str]:
    await connection.execute(_CREATE_SYNC_STATE_SQL)
    value = await connection.fetchval(
        'SELECT "ContentHashes" FROM "RecipeEmbeddingSyncState" WHERE "CollectionName" = $1',
        collection_name,
    )
    parsed = _json_value(value) if value else {}
    return parsed if isinstance(parsed, dict) else {}


async def _ensure_pgvector_available(connection: asyncpg.Connection) -> None:
    available = await connection.fetchval(
        "SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector')"
    )
    if not available:
        raise RuntimeError(
            "The PostgreSQL pgvector extension is not available. Install pgvector on the database server "
            "and run CREATE EXTENSION vector before using internal recipe search."
        )


async def sync_recipe_embeddings(vector_store: PGVector) -> None:
    """Embed only new/changed recipes and remove vectors for deleted recipes."""
    settings = get_settings()
    async with _index_lock:
        connection = await asyncpg.connect(
            _asyncpg_connection_string(settings.recipe_database_url),
            timeout=10,
        )
        try:
            await _ensure_pgvector_available(connection)
            documents = await _load_recipe_documents(connection)
            previous_hashes = await _read_index_hashes(connection, settings.recipe_vector_collection)
            current_hashes = {document.id: _document_hash(document) for document in documents if document.id}

            changed_documents = [
                document
                for document in documents
                if document.id and previous_hashes.get(document.id) != current_hashes[document.id]
            ]
            stale_ids = sorted(set(previous_hashes) - set(current_hashes))

            if changed_documents:
                await vector_store.aadd_documents(
                    changed_documents,
                    ids=[document.id for document in changed_documents],
                )
            if stale_ids:
                await vector_store.adelete(ids=stale_ids)

            await connection.execute(
                _UPSERT_SYNC_STATE_SQL,
                settings.recipe_vector_collection,
                json.dumps(current_hashes),
            )
        finally:
            await connection.close()


def _metadata_filter(attributes: dict[str, Any]) -> dict[str, Any] | None:
    filters: list[dict[str, Any]] = []
    if attributes.get("cuisine"):
        filters.append({"cuisine_normalized": {"$eq": str(attributes["cuisine"]).lower()}})
    if attributes.get("calories") is not None:
        filters.append({"calories": {"$lte": attributes["calories"]}})
    if attributes.get("protein") is not None:
        filters.append({"protein": {"$gte": attributes["protein"]}})
    if not filters:
        return None
    return filters[0] if len(filters) == 1 else {"$and": filters}


def _matches_post_filters(document: Document, attributes: dict[str, Any]) -> bool:
    requested_diet = attributes.get("diet")
    if requested_diet:
        recipe_diets = {_normalize_label(str(diet)) for diet in document.metadata.get("diets", [])}
        if _normalize_label(str(requested_diet)) not in recipe_diets:
            return False

    allergen_terms = _allergen_terms(attributes.get("allergies", []))
    ingredient_text = " ".join(
        f"{ingredient.get('name', '')} {ingredient.get('original', '')}".lower()
        for ingredient in document.metadata.get("ingredients", [])
    )
    return not any(term in ingredient_text for term in allergen_terms)


async def retrieve_recipe_documents(
    query: str,
    attributes: dict[str, Any] | None = None,
) -> list[Document]:
    settings = get_settings()
    attributes = attributes or {}
    vector_store = _build_vector_store()
    await sync_recipe_embeddings(vector_store)

    candidate_count = max(settings.recipe_search_limit * 5, 20)
    results = await vector_store.asimilarity_search_with_relevance_scores(
        query,
        k=candidate_count,
        filter=_metadata_filter(attributes),
    )
    documents: list[Document] = []
    for document, relevance in results:
        if not _matches_post_filters(document, attributes):
            continue
        document.metadata["relevance"] = float(relevance)
        documents.append(document)
        if len(documents) >= settings.recipe_search_limit:
            break
    return documents


def recipe_documents_to_results(documents: list[Document]) -> list[dict[str, Any]]:
    return [{**document.metadata, "content": document.page_content} for document in documents]
