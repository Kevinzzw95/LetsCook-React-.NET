# Chef Bot conversation memory

Chef Bot stores conversations in PostgreSQL and caches the latest messages in Redis. Redis is optional: when it is unavailable, the API loads context directly from PostgreSQL.

## Configuration

Copy the relevant values from `.env.example` into `.env`. `JWT_SECRET` must exactly match the NestJS main API's `JWT_SECRET`; this lets FastAPI validate the access tokens issued by NestJS. Never expose this signing key to the frontend.

Set the same complete `REDIS_URL` in both `MAIN_API/.env` and `AI_API/.env`. For Redis Cloud, use `redis://default:password@host:port/0`, or `rediss://...` if TLS is required. The hostname and port alone are not a valid authenticated Redis Cloud configuration. Do not commit credentials.

The API creates the `chat_conversations` and `chat_messages` tables on first use. The configured PostgreSQL user therefore needs permission to create tables and indexes.

### Web recipe search

Set `OPENAI_API_KEY`, `TAVILY_API_KEY`, and a comma-separated `WEB_RECIPE_PREFERRED_DOMAINS` list. The supervisor can dispatch the Web Search Agent, which invokes the decorated `search_web` tool. For long requests, the tool uses the configured OpenAI model to create two or three focused queries, searches them concurrently with Tavily, deduplicates the candidates, and reranks them using cross-query matches and reciprocal rank. It returns only candidate URLs without crawling or extracting the candidate pages. Short requests use one Tavily search, and planner failures safely fall back to the original query.

```dotenv
TAVILY_API_KEY=tvly-your-api-key
WEB_RECIPE_PREFERRED_DOMAINS=rednote.com,hanwuji.xiachufang.com,allrecipes.com,foodnetwork.com,seriouseats.com
WEB_RECIPE_SEARCH_MAX_RESULTS=3
```

If no preferred domains are configured, Tavily searches the general web. Missing Tavily credentials or provider failures produce no public-web results rather than falling back to Google scraping. Use only targets whose terms permit automated access.

### Chat graph

Chef Bot uses this fixed orchestration pipeline:

1. The Supervisor Agent extracts request constraints and selects the Internal Search, Web Search, and/or Nutrition specialists.
2. Selected specialists run in parallel and invoke `search_internal`, `search_web`, or `nutrition_tool` exactly once.
3. `merge_normalize` combines and deduplicates candidate recipes and web URLs.
4. `nutrition_validation` removes candidates that conflict with known numeric limits and labels unverifiable web candidates.
5. `rank_recipes` orders the validated candidates before the Answer Agent produces the final response.

The supervisor also supports a dependency-aware `web_from_internal` strategy for requests such as
“Based on my saved recipes, find similar recipes on the web.” This route runs sequentially:

```text
internal_search_agent
  -> build_similarity_query
  -> web_search_agent
  -> nutrition_agent (when selected)
  -> merge_normalize
```

The similarity-query stage uses only bounded recipe characteristics from the top internal matches
(titles, cuisine, dish type, diets, and ingredient names). Database identifiers and source URLs are
not added to the public search query. If no internal matches are found or profile generation fails,
the Web Search Agent falls back to the supervisor's original web query.

Authenticated chat requests pass the user's ID into internal retrieval as a metadata filter. The ID
is used only to scope the vector search and is removed before recipe results are sent to later LLM stages.

## API flow

- `POST /conversations` creates a conversation for the authenticated user.
- `GET /conversations/{id}/messages` returns its durable history.
- `POST /conversations/{id}/messages` stores the user message, runs Chef Bot with server-owned recent context, and stores the assistant response.
- `DELETE /conversations/{id}` deletes the owned conversation and its cached context.

Every endpoint derives the user ID from the signed bearer token and returns `404` when the conversation does not belong to that user. Browser-supplied history and system messages are not accepted.

The React client keeps only the active conversation ID in `sessionStorage`, scoped by the logged-in username. Opening the chat modal reloads the messages from the API, so closing the modal or refreshing the page does not erase the current browser-session conversation.
