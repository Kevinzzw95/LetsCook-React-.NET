import logging

from fastapi import APIRouter

from app.api.routes.recipes import router as recipes_router


logger = logging.getLogger(__name__)
api_router = APIRouter()
api_router.include_router(recipes_router)

try:
    from app.api.routes.crawler import router as crawler_router
    from app.api.routes.data import router as data_router
    from app.api.routes.websocket import router as websocket_router
except Exception as exc:
    logger.warning(
        "MediaCrawler routes were not included in api_router because their dependencies are unavailable: %s",
        exc,
    )
else:
    api_router.include_router(crawler_router, prefix="/api")
    api_router.include_router(data_router, prefix="/api")
    api_router.include_router(websocket_router, prefix="/api")
