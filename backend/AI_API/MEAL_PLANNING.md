# Chatbot meal planning

Ask the chatbot, for example: “Plan 3 days of vegan meals using my saved recipes, with 1600–2000 calories and at least 90 g protein each day.”

The supervisor routes meal-plan intent to `meal_planning_agent`, which extracts structured requirements, calls `search_internal`, and passes matching recipe IDs to `plan_daily_meals`. The graph supplies the authenticated user ID; recipe ownership is enforced by a parameterized `Recipes.UserId` query. The internal search is scoped to the authenticated user and applies ingredient, diet, and allergy filters. The planner reloads matching IDs from that user’s database and rechecks all requirements, so stale or foreign search results cannot supply meals. No web recipes are used. Plans use the configured internal-search result limit; an empty search result produces no candidates or scheduled meals, and a partial plan does not rule out matches elsewhere in the saved collection. Daily nutrition targets are never passed as per-recipe search bounds.

`ingredients` is a list of ingredient names checked against each selected recipe. `ingredient_match_mode` defaults to `all` and accepts `any` for OR matching, for example `{"ingredients": ["rice", "black beans"]}`. Matching uses case-insensitive whole words/phrases in saved ingredient names or original ingredient text, not recipe titles. Chicken and pork have explicit English/Chinese aliases; other ingredients use literal word/phrase matching. Excluded ingredients remain in `allergies`. Pantry-only restrictions are preserved as unsupported requirements; their recipe-related attributes can guide semantic retrieval. Chicken-or-pork selection across meals uses `any` instead of treating that request as unsupported.

Plans cover 1–14 days with breakfast, lunch, dinner and optional snack slots. Each meal uses one serving of a saved recipe. The planner divides stored whole-recipe calorie and macro totals by `Servings`, checks all requested diet labels and ingredient exclusions, and searches combinations against daily nutrition bounds. Nutrition remains an estimate; saved ingredient and diet metadata cannot certify allergen safety. Nutrition-target planning excludes recipes with missing/invalid nutrition or servings; calendar selection without nutrition targets allows them.

The tool returns recipe IDs, daily totals, and `complete`, `partial`, `no_matches`, or `needs_clarification` status. Bounded search may miss a feasible combination; partial plans explicitly list unmet targets. Recipe-related attributes from unsupported requirements and vague nutrition goals are extracted into `recipe_search_attributes`. Internal RAG queries use only cuisines, ingredients, dish types, diets, cooking methods, equipment, and per-recipe cooking time. Original requests, unsupported-requirement prose, scheduled meal slots, day counts, random selection instructions, and daily nutrition totals are excluded. An attribute-free request uses the neutral query `recipe`; it never falls back to the original request. For example, a request to randomly plan lunch and dinner using Sichuan chicken and pork recipes produces `川菜 鸡肉 猪肉`. The tool returns `candidates_found` with `candidate_recipes`, retrieved recipe context, and `unverified_requirements` (or `no_matches` if no owned candidates survive filtering). Candidates retain search order and are rechecked for all supported ingredient, diet, and allergy filters. They may have missing nutrition because they are suggestions, not a validated schedule. The answer presents grounded suggestions and targeted follow-up questions, without claiming unsupported requirements or daily nutrition targets have been satisfied. Meal labels describe schedule slots, not verified dish categories; recipes can repeat. Suggestions do not save calendar entries; explicit save requests use the calendar flow below.

Run checks from `backend/AI_API`:

```sh
.venv/bin/python -m pytest tests/test_meal_planning.py tests/test_chat_tool_node.py tests/test_internal_recipe_rag.py tests/test_chat_auth.py -q
```

## Saving calendar meals from chat

A current instruction such as `根据我的食谱，安排接下来一天的午餐和晚餐并加入我的meal plan，包含鸡肉和猪肉` explicitly requests saving. It searches `chicken pork` using `ingredient_match_mode: any`, chooses the top two distinct owned matches, and appends lunch and dinner for tomorrow. Both matches may contain the same meat. Existing calendar entries remain; an identical user/date/slot/recipe is returned as already scheduled. One match fills lunch only, and zero matches write nothing.

The request accepts an optional IANA `timezone`, supplied by the browser. `MEAL_PLAN_TIMEZONE` defaults to `America/Toronto` for older clients. Relative dates use the server clock in that zone; calendar dates are stored at UTC midnight to match the existing frontend. An unspecified date requires clarification before saving. The existing suggestion path remains read-only.

The `save_meal_plan` tool rechecks ownership, ingredient/diet/allergy constraints and explicit daily nutrition targets within a PostgreSQL transaction. Transaction-scoped advisory locks serialize chatbot writes per user/date; duplicates are checked before inserts. No migration is required. These locks coordinate chatbot saves; the separate manual calendar endpoint does not acquire them. Missing nutrition is allowed when no numerical targets were requested. Unverified requirements or unsupported calendar slots prevent saving and retain candidate context.

Chat responses include optional `meal_plan_save_result` metadata with status, saved/existing entries, and unfilled slots. Calendar cache invalidation happens on confirmed `saved`/`unchanged` results. Save confirmations are rendered from database results rather than generated by the language model; failure never claims success. If connectivity fails during commit, the response tells the user saving could not be confirmed and to check the calendar before retrying.

Validation:

```sh
# From backend/AI_API
LANGSMITH_TRACING=false LANGCHAIN_TRACING_V2=false .venv/bin/python -m pytest tests/test_meal_plan_saving.py tests/test_meal_planning.py tests/test_internal_recipe_rag.py tests/test_chat_tool_node.py -q
# From frontend
npm run test:chat
```
