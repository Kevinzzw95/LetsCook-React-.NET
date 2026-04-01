from fastapi import APIRouter, HTTPException

from app.schemas import CrawlerStartRequest, CrawlerStatusResponse, CrawlerTypeEnum
from app.services.crawler_manager import crawler_manager

router = APIRouter(prefix="/crawler", tags=["crawler"])


@router.post("/start")
async def start_crawler(request: CrawlerStartRequest):
    """Start crawler task"""
    if request.crawler_type == CrawlerTypeEnum.DETAIL:
        try:
            detail_results = await crawler_manager.start_detail_and_collect(request)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc))

        if not detail_results:
            if crawler_manager.status == "running" or (crawler_manager.process and crawler_manager.process.poll() is None):
                raise HTTPException(status_code=400, detail="Crawler is already running")
            raise HTTPException(status_code=500, detail="Failed to start crawler")

        response = {}
        contents = detail_results.get("contents", [])
        if len(contents) == 1:
            response["note_detail"] = contents[0]
        elif contents:
            response["note_details"] = contents

        if detail_results.get("comments"):
            response["comments"] = detail_results["comments"]
        if detail_results.get("creators"):
            response["creators"] = detail_results["creators"]

        return response

    success = await crawler_manager.start(request)
    if not success:
        # Handle concurrent/duplicate requests: if process is already running, return 400 instead of 500
        if crawler_manager.process and crawler_manager.process.poll() is None:
            raise HTTPException(status_code=400, detail="Crawler is already running")
        raise HTTPException(status_code=500, detail="Failed to start crawler")

    return {"status": "ok", "message": "Crawler started successfully"}


@router.post("/stop")
async def stop_crawler():
    """Stop crawler task"""
    success = await crawler_manager.stop()
    if not success:
        # Handle concurrent/duplicate requests: if process already exited/doesn't exist, return 400 instead of 500
        if not crawler_manager.process or crawler_manager.process.poll() is not None:
            raise HTTPException(status_code=400, detail="No crawler is running")
        raise HTTPException(status_code=500, detail="Failed to stop crawler")

    return {"status": "ok", "message": "Crawler stopped successfully"}


@router.get("/status", response_model=CrawlerStatusResponse)
async def get_crawler_status():
    """Get crawler status"""
    return crawler_manager.get_status()


@router.get("/logs")
async def get_logs(limit: int = 100):
    """Get recent logs"""
    logs = crawler_manager.logs[-limit:] if limit > 0 else crawler_manager.logs
    return {"logs": [log.model_dump() for log in logs]}
