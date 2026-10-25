"""Run inside ai-api via stdin; no external AI calls or host Python required."""
import json
import os
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError

BASE = 'http://frontend:8080'
USER = os.environ.get('SMOKE_USER', 'docker-smoke')
PASSWORD = 'DockerSmoke-LocalOnly-123!'

def request(path, method='GET', payload=None, token=None, expected=200):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    body = json.dumps(payload).encode() if payload is not None else None
    try:
        response = urlopen(Request(BASE + path, data=body, headers=headers, method=method), timeout=30)
    except HTTPError as error:
        response = error
    raw = response.read().decode()
    assert response.status == expected, (path, response.status, raw)
    return json.loads(raw) if raw and raw[0] in '[{"0123456789' else raw

for path in ['/api/ready', '/ai/api/ready']:
    assert request(path)['status'] == 'ready'
assert '<html' in request('/recipe-list')
request('/ai/api/env/check', expected=404)
request('/ai/generateRecipeUrl', 'POST', {'url': 'https://www.xiaohongshu.com/note'}, expected=503)

try:
    auth = request('/api/account/login', 'POST', {'username': USER, 'password': PASSWORD})
    existed = True
except AssertionError as error:
    if error.args[0][1] != 401:
        raise
    request('/api/account/register', 'POST', {'username': USER, 'password': PASSWORD, 'email': USER+'@example.invalid'}, expected=201)
    auth = request('/api/account/login', 'POST', {'username': USER, 'password': PASSWORD})
    existed = False

auth = request('/api/account/refresh', 'POST', {'refreshToken': auth['refreshToken']})
token = auth['token']
recipes = request('/api/recipe', token=token)
if existed:
    assert any(r['title'] == 'Docker smoke chicken' for r in recipes), 'Recipe did not persist'
else:
    recipe_id = request('/api/recipe', 'POST', {
        'title': 'Docker smoke chicken', 'servings': 1, 'sourceName': 'manual',
        'ingredients': json.dumps([{'name': 'chicken', 'amount': '100', 'unit': 'g'}]),
        'steps': json.dumps([{'stepNumber': 1, 'description': 'Cook thoroughly.'}]),
    }, token, 201)
    now = datetime.now(timezone.utc)
    request('/api/mealPlan', 'POST', {'recipeId': recipe_id, 'plannedDate': now.strftime('%Y-%m-%d'), 'mealType': 'lunch'}, token)
now = datetime.now(timezone.utc)
assert request(f'/api/mealPlan?year={now.year}&month={now.month}', token=token)
conversation = request('/ai/conversations', 'POST', {}, token, 201)
messages = request('/ai/conversations/'+conversation['id']+'/messages', token=token)
assert messages['messages'] == []
request('/ai/conversations/'+conversation['id']+'/messages', expected=401)
request('/ai/conversations/'+conversation['id'], 'DELETE', token=token, expected=204)
print('PASS: proxy routes, health, login/refresh, recipes, meal plans, conversation auth, and persistence' if existed
      else 'PASS: core API smoke checks; fixtures created for persistence verification')

# Exercise editing and user-scoped list/conversation access with a second account.
recipe_id = next(r['id'] for r in request('/api/recipe', token=token) if r['title'] == 'Docker smoke chicken')
request(f'/api/recipe/{recipe_id}', 'PUT', {
    'title': 'Docker smoke chicken', 'servings': 1, 'sourceName': 'manual',
    'ingredients': json.dumps([{'name': 'chicken', 'amount': '100', 'unit': 'g'}]),
    'steps': json.dumps([{'stepNumber': 1, 'description': 'Cook thoroughly.'}]),
}, token)
other = USER + '-other'
try:
    other_auth = request('/api/account/login', 'POST', {'username': other, 'password': PASSWORD})
except AssertionError as error:
    if error.args[0][1] != 401:
        raise
    request('/api/account/register', 'POST', {'username': other, 'password': PASSWORD, 'email': other+'@example.invalid'}, expected=201)
    other_auth = request('/api/account/login', 'POST', {'username': other, 'password': PASSWORD})
assert not any(str(r['id']) == str(recipe_id) for r in request('/api/recipe', token=other_auth['token']))
conversation = request('/ai/conversations', 'POST', {}, token, 201)
request('/ai/conversations/'+conversation['id']+'/messages', token=other_auth['token'], expected=404)
if not os.environ.get('OPENAI_API_KEY'):
    request('/ai/conversations/'+conversation['id']+'/messages', 'POST', {'message': 'hello'}, token, 500)
    assert request('/ai/api/health')['status'] == 'ok'
request('/ai/conversations/'+conversation['id'], 'DELETE', token=token, expected=204)

# Verify real transaction locking and atomic rollback without an LLM call.
import asyncio
import base64
from datetime import timedelta
import asyncpg
from app.core.config import get_settings
from app.schemas.meal_plan import ScheduledMeal
from app.services.chat_graph.tools.meal_plan import MealPlanRequirements
from app.services.meal_plan_repository import append_meals

payload = token.split('.')[1]
user_id = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))['nameid']

async def verify_transactions():
    day = (datetime.now(timezone.utc) + timedelta(days=1)).date()
    selection = ScheduledMeal(planned_date=day, meal_type='dinner', recipe_id=str(recipe_id))
    requirements = MealPlanRequirements(save_requested=True, meals=['dinner'], ingredients=['chicken'])
    results = await asyncio.gather(*(append_meals(user_id, [selection], requirements) for _ in range(3)))
    assert sum(r[0].status == 'saved' for r in results) <= 1
    assert len({r[0].id for r in results}) == 1
    conn = await asyncpg.connect(get_settings().recipe_database_url)
    try:
        before = await conn.fetchval('SELECT count(*) FROM "MealPlanEntries" WHERE "UserId"=$1', user_id)
        invalid = ScheduledMeal(planned_date=day, meal_type='lunch', recipe_id='9223372036854775806')
        try:
            await append_meals(user_id, [selection, invalid], requirements)
        except ValueError:
            pass
        else:
            raise AssertionError('Invalid recipe was accepted')
        after = await conn.fetchval('SELECT count(*) FROM "MealPlanEntries" WHERE "UserId"=$1', user_id)
        assert before == after
    finally:
        await conn.close()

asyncio.run(verify_transactions())
print('PASS: recipe editing, ownership filtering, missing-key handling, concurrent saves, and rollback')

async def verify_vector_storage():
    from uuid import uuid4
    from langchain_core.embeddings import Embeddings
    from app.services.chat_graph.tools.recipe_db import PreparedPGVector, _pgvector_connection_string, load_user_recipe_documents
    settings = get_settings()
    name = 'docker-smoke-' + uuid4().hex
    conn = await asyncpg.connect(settings.recipe_database_url)
    try:
        await conn.execute('INSERT INTO langchain_pg_collection(uuid,name) VALUES($1,$2)', uuid4(), name)
    finally:
        await conn.close()
    class LocalEmbeddings(Embeddings):
        def embed_documents(self, texts):
            return [self.embed_query(text) for text in texts]
        def embed_query(self, text):
            return [1.0] + [0.0] * (settings.openai_embedding_dimensions - 1)
    store = PreparedPGVector(embeddings=LocalEmbeddings(), connection=_pgvector_connection_string(settings.recipe_database_url),
        collection_name=name, embedding_length=settings.openai_embedding_dimensions, create_extension=False, async_mode=True)
    try:
        docs = await load_user_recipe_documents(user_id)
        doc = next(d for d in docs if str(d.metadata['id']) == str(recipe_id))
        await store.aadd_documents([doc], ids=['docker-smoke-' + uuid4().hex])
        assert len(await store.asimilarity_search('chicken', k=2, filter={'user_id': {'$eq': user_id}})) == 1
        assert await store.asimilarity_search('chicken', k=2, filter={'user_id': {'$eq': 'not-the-owner'}}) == []
    finally:
        await store.adelete_collection()
        await store._async_engine.dispose()

asyncio.run(verify_vector_storage())
print('PASS: pgvector storage and ownership filtering using local test embeddings; no provider calls')
