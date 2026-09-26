import asyncio
import json
from datetime import date, datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage
from pydantic import ValidationError

from app.schemas.chat import ChatRequest
from app.schemas.meal_plan import ScheduledMeal
from app.services.chat_graph.nodes import meal_planning, answer as answer_module
from app.services.chat_graph.nodes.supervisor import _fallback_intent
from app.services.chat_graph.tools.meal_plan import MealPlanRequirements, build_ranked_meal_plan
from app.services.chat_graph.tools.recipe_db import ingredient_matches
from app.services.chat_graph.tools import meal_plan
from app.services.meal_plan_dates import resolve_start_date
from app.services import meal_plan_repository as repository

REQUEST = '根据我的食谱，安排接下来一天的午餐和晚餐并加入我的meal plan，包含鸡肉和猪肉'


def document(id, name='chicken', **extra):
    return Document(page_content='', metadata={
        'id': id, 'title': f'Dish {id}', 'ingredients': [{'name': name}], 'diets': [],
        'servings': 2, 'calories': None, 'protein': None, 'carbohydrate': None, 'fat': None,
        **extra,
    })


def requirements(**extra):
    return MealPlanRequirements(**{
        'save_requested': True, 'day_offset': 1, 'meals': ['lunch', 'dinner'],
        'ingredients': ['chicken', 'pork'], 'ingredient_match_mode': 'any', **extra,
    })


@pytest.mark.parametrize('name,term,expected', [
    ('chicken breast', '鸡肉', True), ('猪肉末', 'pork', True), ('五花肉', '猪肉', True),
    ('雞腿肉', 'chicken', True), ('鸡蛋', 'chicken', False), ('beef', 'pork', False),
    ('licorice', 'rice', False),
])
def test_bilingual_ingredient_matching(name, term, expected):
    assert ingredient_matches([{'name': name}], term) is expected


def test_ranked_or_selection_does_not_require_nutrition_or_both_meats():
    result = build_ranked_meal_plan([document(7), document(8), document(9, 'pork')], requirements())
    assert [m['recipe_id'] for m in result['days'][0]['meals']] == [7, 8]
    assert result['days'][0]['nutrition'] is None
    assert result['status'] == 'complete'
    assert build_ranked_meal_plan([document(7)], requirements())['days'][0]['unfilled_slots'] == ['dinner']
    assert build_ranked_meal_plan([document(7)], requirements(ingredient_match_mode='all'))['days'][0]['meals'] == []


@pytest.mark.parametrize('now,expected', [
    ('2026-09-27T02:00:00+00:00', '2026-09-27'),
    ('2026-01-01T02:00:00+00:00', '2026-01-01'),
    ('2026-03-08T06:30:00+00:00', '2026-03-09'),
    ('2026-11-01T05:30:00+00:00', '2026-11-02'),
    ('2026-05-01T02:00:00+00:00', '2026-05-01'),
])
def test_tomorrow_uses_local_calendar_date(now, expected):
    assert resolve_start_date('America/Toronto', None, 1, datetime.fromisoformat(now)) == date.fromisoformat(expected)


def test_timezone_validation_and_explicit_date():
    with pytest.raises(ValidationError):
        ChatRequest(message='hi', timezone='not/a/timezone')
    assert ChatRequest(message='hi').timezone is None
    assert resolve_start_date('America/Toronto', date(2026, 10, 2), 1) == date(2026, 10, 2)
    assert resolve_start_date('America/Toronto', None, None) is None


@pytest.mark.asyncio
@pytest.mark.parametrize('count', [0, 1, 2])
async def test_chinese_request_searches_and_saves_top_matches(monkeypatch, count):
    model = SimpleNamespace(ainvoke=AsyncMock(return_value=requirements()))
    monkeypatch.setattr(meal_planning, 'ChatOpenAI', lambda **kw: SimpleNamespace(with_structured_output=lambda _: model))
    monkeypatch.setattr(meal_planning, 'get_settings', lambda: SimpleNamespace(openai_model='test', openai_api_key='test'))
    search = AsyncMock(return_value=json.dumps([{'id': i} for i in range(1, count + 1)]))
    monkeypatch.setattr(meal_planning, 'search_internal', SimpleNamespace(ainvoke=search))
    monkeypatch.setattr(meal_plan, 'load_user_recipe_documents', AsyncMock(return_value=[document(1), document(2, 'pork')]))
    monkeypatch.setattr(meal_planning, 'resolve_start_date', lambda *args: date(2026, 9, 27))
    save = AsyncMock(return_value=json.dumps({'status': 'saved', 'entries': []}))
    monkeypatch.setattr(meal_planning, 'save_meal_plan', SimpleNamespace(ainvoke=save))
    result = await meal_planning.meal_planning_agent({'user_id': 'owner', 'request': REQUEST, 'timezone': 'America/Toronto'})
    assert _fallback_intent(REQUEST) == 'meal_plan'
    assert search.call_args.args[0]['query'] == 'chicken pork'
    assert search.call_args.args[0]['ingredient_match_mode'] == 'any'
    assert search.call_args.args[0]['user_id'] == 'owner'
    if count:
        entries = save.call_args.args[0]['entries']
        assert entries == [{'planned_date': '2026-09-27', 'meal_type': slot, 'recipe_id': str(i + 1)}
                           for i, slot in enumerate(['lunch', 'dinner'][:count])]
        assert save.call_args.args[0]['user_id'] == 'owner'
    else:
        save.assert_not_awaited()
        assert result['meal_plan_save_result']['status'] == 'not_saved'
    assert len(result['meal_plan_save_result']['unfilled_slots']) == 2 - count


@pytest.mark.asyncio
async def test_past_save_request_cannot_authorize_new_suggestion(monkeypatch):
    model = SimpleNamespace(ainvoke=AsyncMock(return_value=requirements()))
    monkeypatch.setattr(meal_planning, 'ChatOpenAI', lambda **kw: SimpleNamespace(with_structured_output=lambda _: model))
    monkeypatch.setattr(meal_planning, 'get_settings', lambda: SimpleNamespace(openai_model='test', openai_api_key='test'))
    monkeypatch.setattr(meal_planning, 'search_internal', SimpleNamespace(ainvoke=AsyncMock(return_value='[]')))
    save = AsyncMock()
    monkeypatch.setattr(meal_planning, 'save_meal_plan', SimpleNamespace(ainvoke=save))
    result = await meal_planning.meal_planning_agent({'user_id': 'owner', 'request': 'Suggest some meals',
                                                     'messages': [HumanMessage(content=REQUEST)]})
    save.assert_not_awaited()
    assert 'meal_plan_save_result' not in result
    assert not meal_planning.explicit_save_request('不要加入我的 meal plan')


class FakeDatabase:
    def __init__(self, fail_insert=None, owned=True):
        self.entries = []
        self.lock = asyncio.Lock()
        self.fail_insert = fail_insert
        self.inserts = 0
        self.owned = owned
        self.closed = 0

    def connection(self):
        db = self

        class Connection:
            snapshot = None
            locked = False

            def transaction(self):
                return self

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                if exc_type and self.snapshot is not None:
                    db.entries[:] = self.snapshot
                if self.locked:
                    db.lock.release()

            async def execute(self, query, key):
                assert 'pg_advisory_xact_lock' in query
                if not self.locked:
                    await db.lock.acquire()
                    self.locked = True
                    self.snapshot = db.entries.copy()

            async def fetch(self, query, owner, ids):
                assert 'r."UserId" = $1' in query and 'FOR SHARE OF r' in query
                assert owner == 'owner'
                return [document(i).metadata for i in ids] if db.owned else []

            async def fetchval(self, query, owner, stamp, slot, recipe_id):
                assert stamp.tzinfo == timezone.utc and stamp.hour == 0
                key = (owner, stamp, slot, recipe_id)
                if query.startswith('SELECT'):
                    return next((i for i, entry in enumerate(db.entries, 1) if entry == key), None)
                db.inserts += 1
                if db.fail_insert == db.inserts:
                    raise RuntimeError('insert failed')
                db.entries.append(key)
                return len(db.entries)

            async def close(self):
                db.closed += 1

        return Connection()


def patch_database(monkeypatch, db):
    monkeypatch.setattr(repository, 'get_settings', lambda: SimpleNamespace(recipe_database_url='postgresql://test'))
    async def connect(*args, **kwargs):
        return db.connection()
    monkeypatch.setattr(repository.asyncpg, 'connect', connect)


def entries():
    return [ScheduledMeal(planned_date=date(2026, 9, 27), meal_type=slot, recipe_id=str(i))
            for i, slot in enumerate(['lunch', 'dinner'], 1)]


@pytest.mark.asyncio
async def test_repository_appends_atomically_skips_duplicates_and_serializes(monkeypatch):
    db = FakeDatabase()
    stamp = datetime(2026, 9, 27, tzinfo=timezone.utc)
    db.entries = [('owner', stamp, 'lunch', 99)]
    patch_database(monkeypatch, db)
    results = await asyncio.gather(*(repository.append_meals('owner', entries(), requirements()) for _ in range(2)))
    assert len(db.entries) == 3
    assert [e.status for e in results[0]] == ['saved', 'saved']
    assert [e.status for e in results[1]] == ['existing', 'existing']
    assert db.entries[0][-1] == 99
    assert db.closed == 2


@pytest.mark.asyncio
@pytest.mark.parametrize('owned,fail_insert', [(False, None), (True, 2)])
async def test_repository_foreign_recipe_or_failed_insert_rolls_back(monkeypatch, owned, fail_insert):
    db = FakeDatabase(owned=owned, fail_insert=fail_insert)
    patch_database(monkeypatch, db)
    with pytest.raises((ValueError, RuntimeError)):
        await repository.append_meals('owner', entries(), requirements())
    assert db.entries == []
    assert db.closed == 1


@pytest.mark.asyncio
async def test_save_confirmation_is_based_only_on_persistence_result(monkeypatch):
    monkeypatch.setattr(answer_module, 'ChatOpenAI', lambda **kw: pytest.fail('Must not invent a save confirmation'))
    result = await answer_module.answer({
        'messages': [HumanMessage(content=REQUEST)],
        'meal_plan_save_result': {'status': 'saved', 'entries': [
            {'planned_date': '2026-09-27', 'meal_type': 'lunch', 'recipe_id': '1', 'recipe_title': '宫保鸡丁', 'status': 'saved'},
            {'planned_date': '2026-09-27', 'meal_type': 'dinner', 'recipe_id': '2', 'recipe_title': '红烧肉', 'status': 'existing'},
        ]},
    })
    text = result['messages'][0].content
    assert '2026-09-27 午餐' in text and '宫保鸡丁' in text
    assert '未重复添加' in text and '红烧肉' in text
    assert '已加入' not in answer_module.format_save_confirmation({'status': 'failed'}, True)


@pytest.mark.asyncio
@pytest.mark.parametrize('extra', [
    {'unsupported_requirements': ['low sodium']},
    {'protein': {'minimum': 300}},
    {'day_offset': None},
    {'meals': ['snack']},
])
async def test_unverified_or_incomplete_requirements_do_not_write(monkeypatch, extra):
    model = SimpleNamespace(ainvoke=AsyncMock(return_value=requirements(**extra)))
    monkeypatch.setattr(meal_planning, 'ChatOpenAI', lambda **kw: SimpleNamespace(with_structured_output=lambda _: model))
    monkeypatch.setattr(meal_planning, 'get_settings', lambda: SimpleNamespace(openai_model='test', openai_api_key='test'))
    monkeypatch.setattr(meal_planning, 'search_internal', SimpleNamespace(ainvoke=AsyncMock(return_value='[{"id": 1}]')))
    monkeypatch.setattr(meal_plan, 'load_user_recipe_documents', AsyncMock(return_value=[document(1)]))
    save = AsyncMock()
    monkeypatch.setattr(meal_planning, 'save_meal_plan', SimpleNamespace(ainvoke=save))
    result = await meal_planning.meal_planning_agent({'user_id': 'owner', 'request': REQUEST})
    save.assert_not_awaited()
    assert result['meal_plan_save_result']['status'] == 'not_saved'
    if extra.get('unsupported_requirements'):
        assert result['meal_plan']['candidate_recipes'][0]['id'] == 1


@pytest.mark.asyncio
async def test_tool_reports_rollback_failure_without_success_claim(monkeypatch):
    from app.services.chat_graph.tools import save_meal_plan as tool_module
    monkeypatch.setattr(tool_module, 'append_meals', AsyncMock(side_effect=RuntimeError('database down')))
    result = json.loads(await tool_module.save_meal_plan.ainvoke({
        'user_id': 'owner', 'entries': [entry.model_dump(mode='json') for entry in entries()],
        'requirements': requirements().model_dump(mode='json'),
    }))
    assert result['status'] == 'failed' and result['entries'] == []


def test_chat_response_exposes_save_results_and_passes_timezone(monkeypatch):
    from uuid import uuid4
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.auth import get_current_user, AuthenticatedUser
    from app.api.routes import chat as route
    from app.services.chat_graph.graph import ChatGraphResult

    conversation_id = uuid4()
    stamp = datetime.now(timezone.utc)
    user_message = {'id': uuid4(), 'role': 'user', 'content': REQUEST, 'created_at': stamp}
    assistant_message = {'id': uuid4(), 'role': 'assistant', 'content': '已加入', 'created_at': stamp}
    save_result = {'status': 'saved', 'entries': [{
        'id': '10', 'planned_date': '2026-09-27', 'meal_type': 'lunch', 'recipe_id': '1',
        'recipe_title': '宫保鸡丁', 'status': 'saved',
    }], 'unfilled_slots': []}
    run = AsyncMock(return_value=ChatGraphResult(reply='已加入', meal_plan_save_result=save_result))
    monkeypatch.setattr(route, 'run_chat_graph', run)
    monkeypatch.setattr(route.repository, 'owns_conversation', AsyncMock(return_value=True))
    monkeypatch.setattr(route.repository, 'append_message', AsyncMock(side_effect=[user_message, assistant_message]))
    monkeypatch.setattr(route.recent_cache, 'get', AsyncMock(return_value=[]))
    monkeypatch.setattr(route.recent_cache, 'append', AsyncMock())
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(id='owner')
    try:
        response = TestClient(app).post(f'/conversations/{conversation_id}/messages', json={
            'message': REQUEST, 'timezone': 'Asia/Shanghai',
        })
        assert response.status_code == 200, response.text
        assert response.json()['meal_plan_save_result']['entries'][0]['id'] == '10'
        assert run.call_args.kwargs == {'user_id': 'owner', 'timezone': 'Asia/Shanghai'}
        invalid = TestClient(app).post(f'/conversations/{conversation_id}/messages', json={
            'message': REQUEST, 'timezone': 'invalid/zone',
        })
        assert invalid.status_code == 422
        assert run.await_count == 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)
