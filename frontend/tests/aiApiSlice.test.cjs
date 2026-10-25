const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

// Exercise the endpoint callbacks against a small Redux boundary, without a browser or network.
function chatEndpoint() {
    const source = fs.readFileSync(path.join(__dirname, '../src/redux/api/aiApiSlice.ts'), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    let endpoints;
    const exports = {};
    vm.runInNewContext(compiled, {
        exports, Intl,
        require(name) {
            if (name === '@reduxjs/toolkit/query/react') return {
                createApi(config) {
                    endpoints = config.endpoints({ mutation: value => value, query: value => value });
                    return {};
                }
            };
            if (name === './apiSlice') return { apiSlice: { util: {
                invalidateTags: tags => ({ type: 'invalidateMealPlan', payload: tags })
            } } };
            if (name === '../../config/environment') return { AI_API_BASE_URL: '/ai/' };
            if (name === './baseQueryWithReauth') return { createBaseQueryWithReauth: () => null };
            throw new Error(`Unexpected import: ${name}`);
        }
    });
    return endpoints.chat;
}

test('chat sends browser timezone and honors explicit timezone', () => {
    const endpoint = chatEndpoint();
    const request = endpoint.query({ conversationId: 'one', message: 'save tomorrow' });
    assert.equal(request.body.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone);
    assert.equal(endpoint.query({ conversationId: 'one', message: 'hi', timezone: 'Asia/Shanghai' }).body.timezone, 'Asia/Shanghai');
});

for (const status of ['saved', 'unchanged', 'failed', 'not_saved', undefined]) {
    test(`calendar invalidation for ${status}`, async () => {
        const actions = [];
        await chatEndpoint().onQueryStarted({}, {
            dispatch: action => actions.push(action),
            queryFulfilled: Promise.resolve({ data: { meal_plan_save_result: status ? { status } : null } })
        });
        assert.equal(actions.length, ['saved', 'unchanged'].includes(status) ? 1 : 0);
        if (actions.length) assert.equal(actions[0].payload[0], 'MealPlan');
    });
}

test('failed chat request does not claim successful calendar mutation', async () => {
    const actions = [];
    await chatEndpoint().onQueryStarted({}, {
        dispatch: action => actions.push(action), queryFulfilled: Promise.reject(new Error('network'))
    });
    assert.equal(actions.length, 0);
});
