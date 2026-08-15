# Chef Bot conversation memory

Chef Bot stores conversations in PostgreSQL and caches the latest messages in Redis. Redis is optional: when it is unavailable, the API loads context directly from PostgreSQL.

## Configuration

Copy the relevant values from `.env.example` into `.env`. `JWT_SECRET` must exactly match the .NET API's `JWTSettings:TokenKey`; this lets FastAPI validate the access tokens issued by the .NET API. Never expose this signing key to the frontend.

The API creates the `chat_conversations` and `chat_messages` tables on first use. The configured PostgreSQL user therefore needs permission to create tables and indexes.

## API flow

- `POST /conversations` creates a conversation for the authenticated user.
- `GET /conversations/{id}/messages` returns its durable history.
- `POST /conversations/{id}/messages` stores the user message, runs Chef Bot with server-owned recent context, and stores the assistant response.
- `DELETE /conversations/{id}` deletes the owned conversation and its cached context.

Every endpoint derives the user ID from the signed bearer token and returns `404` when the conversation does not belong to that user. Browser-supplied history and system messages are not accepted.

The React client keeps only the active conversation ID in `sessionStorage`, scoped by the logged-in username. Opening the chat modal reloads the messages from the API, so closing the modal or refreshing the page does not erase the current browser-session conversation.
