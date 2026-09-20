# Chatbot meal planning

Ask the chatbot, for example: “Plan 3 days of vegan meals using my saved recipes, with 1600–2000 calories and at least 90 g protein each day.”

The supervisor routes meal-plan intent to `meal_planning_agent`, which extracts structured requirements and invokes `plan_daily_meals`. The graph supplies the authenticated user ID; recipe ownership is enforced by a parameterized `Recipes.UserId` query. Meal planning does not use web recipes or the similarity-search result limit.

Plans cover 1–14 days with breakfast, lunch, dinner and optional snack slots. Each meal uses one serving of a saved recipe. The planner divides stored whole-recipe calorie and macro totals by `Servings`, checks all requested diet labels and ingredient exclusions, and searches combinations against daily nutrition bounds. Nutrition remains an estimate; saved ingredient and diet metadata cannot certify allergen safety. Recipes with missing/invalid nutrition or servings are excluded.

The tool returns recipe IDs, daily totals, and `complete`, `partial`, `no_matches`, or `needs_clarification` status. Bounded search may miss a feasible combination; partial plans explicitly list unmet targets. Unsupported requirements and vague nutrition goals request clarification instead of inventing targets. Meal labels describe schedule slots, not verified dish categories; recipes can repeat. The chatbot suggests a plan without saving calendar entries.

Run checks from `backend/AI_API`:

```sh
.venv/bin/python -m pytest tests/test_meal_planning.py tests/test_chat_tool_node.py tests/test_internal_recipe_rag.py tests/test_chat_auth.py -q
```
