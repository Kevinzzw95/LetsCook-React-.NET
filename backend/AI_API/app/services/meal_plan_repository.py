"""Atomic, user-scoped append operations for chatbot calendar entries."""
from datetime import datetime, time, timezone

import asyncpg

from app.core.config import get_settings
from app.schemas.meal_plan import ScheduledMeal, SavedMeal
from app.services.chat_graph.tools.meal_plan import (
    MealPlanRequirements, NUTRIENTS, _violations, matches_requirements, per_serving_nutrition,
)
from app.services.chat_graph.tools.recipe_db import (
    _RECIPE_DOCUMENTS_SQL, _asyncpg_connection_string, _row_to_document,
)


async def append_meals(user_id: str, entries: list[ScheduledMeal], requirements: MealPlanRequirements) -> list[SavedMeal]:
    if not user_id or not user_id.strip():
        raise ValueError('An authenticated user is required')
    if not entries:
        return []
    if not requirements.save_requested or requirements.unsupported_requirements:
        raise ValueError('Saving was not requested or requirements remain unverified')
    connection = await asyncpg.connect(_asyncpg_connection_string(get_settings().recipe_database_url), timeout=10)
    try:
        async with connection.transaction():
            dates = sorted({entry.planned_date for entry in entries})
            for planned_date in dates:
                # Database-scoped lock works across API processes; released on commit/rollback.
                await connection.execute('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
                                         f'meal-plan:{user_id}:{planned_date.isoformat()}')
            ids = sorted({int(entry.recipe_id) for entry in entries})
            query = _RECIPE_DOCUMENTS_SQL.replace(
                'ORDER BY r."Id"',
                'WHERE r."UserId" = $1 AND r."Id" = ANY($2::bigint[]) ORDER BY r."Id" FOR SHARE OF r',
            )
            rows = await connection.fetch(query, user_id, ids)
            documents = {str(row['id']): _row_to_document(row) for row in rows}
            if set(documents) != {str(id) for id in ids}:
                raise ValueError('A selected recipe no longer belongs to this user')
            for document in documents.values():
                if not matches_requirements(document, requirements):
                    raise ValueError('A selected recipe no longer meets the requirements')
            has_targets = any(getattr(requirements, key).minimum is not None or
                              getattr(requirements, key).maximum is not None for key in NUTRIENTS)
            if has_targets:
                for planned_date in dates:
                    daily_entries = [entry for entry in entries if entry.planned_date == planned_date]
                    values = [per_serving_nutrition(documents[entry.recipe_id]) for entry in daily_entries]
                    if any(value is None for value in values) or {e.meal_type for e in daily_entries} != set(requirements.meals):
                        raise ValueError('Cannot validate daily nutrition')
                    totals = {key: sum(value[key] for value in values) for key in NUTRIENTS}
                    if _violations(totals, requirements):
                        raise ValueError('Daily nutrition requirements are not satisfied')
            results = []
            for entry in entries:
                stamp = datetime.combine(entry.planned_date, time.min, tzinfo=timezone.utc)
                existing = await connection.fetchval(
                    'SELECT "Id" FROM "MealPlanEntries" WHERE "UserId" = $1 AND "PlannedDate" = $2 '
                    'AND "MealType" = $3 AND "RecipeId" = $4 ORDER BY "Id" LIMIT 1',
                    user_id, stamp, entry.meal_type, int(entry.recipe_id),
                )
                status = 'existing' if existing is not None else 'saved'
                entry_id = existing
                if entry_id is None:
                    entry_id = await connection.fetchval(
                        'INSERT INTO "MealPlanEntries" ("UserId", "PlannedDate", "MealType", "RecipeId", "CreatedAt", "UpdatedAt") '
                        'VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING "Id"',
                        user_id, stamp, entry.meal_type, int(entry.recipe_id),
                    )
                results.append(SavedMeal(**entry.model_dump(), id=str(entry_id), status=status,
                                         recipe_title=str(documents[entry.recipe_id].metadata.get('title') or '')))
        return results
    finally:
        await connection.close()
