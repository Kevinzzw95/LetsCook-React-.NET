from app.services.chat_graph.state import ChatGraphState
from app.services.chat_graph.tools.recipe_db import recipe_documents_to_results, retrieve_recipe_documents


async def search_internal(state: ChatGraphState) -> ChatGraphState:
    if "internal" not in state.get("search_sources", []):
        return {"internal_results": []}

    # The original request contains better retrieval terms than the router's
    # explanatory sub-question ("What matching LetsCook recipes...").
    query = state.get("request") or state.get("agent_query", "")
    documents = await retrieve_recipe_documents(query, state.get("recipe_attributes", {}))
    return {"internal_results": recipe_documents_to_results(documents)}
