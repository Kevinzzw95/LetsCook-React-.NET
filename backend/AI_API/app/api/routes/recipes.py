from io import BytesIO
import json
from typing import List

import PIL.Image
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas import CrawlerStartRequest, CrawlerTypeEnum, LoginTypeEnum, PlatformEnum
from app.schemas.recipes import GenerateRecipeUrlPayload
from app.services.crawler_manager import crawler_manager
from app.services.recipe_ai import generate_recipe_json
from app.services.xiaohongshu import (
    download_image,
    extract_first_url,
    is_xiaohongshu_url,
    resolve_url_redirects,
    upload_images_to_cloudinary,
)


router = APIRouter(tags=["recipes"])


def _normalize_image_urls(image_list) -> List[str]:
    if not image_list:
        return []

    if isinstance(image_list, str):
        try:
            image_list = json.loads(image_list)
        except json.JSONDecodeError:
            image_list = [
                item.strip()
                for item in image_list.split(",")
                if item.strip()
            ]

    normalized_urls: List[str] = []
    for item in image_list:
        if isinstance(item, str):
            normalized_urls.append(item.strip())
            continue

        if isinstance(item, dict):
            for key in ("url_default", "url", "url_pre", "info_list"):
                value = item.get(key)
                if isinstance(value, str):
                    normalized_urls.append(value)
                    break
                if isinstance(value, list):
                    first_url = next((entry.get("url") for entry in value if isinstance(entry, dict) and entry.get("url")), None)
                    if first_url:
                        normalized_urls.append(first_url)
                        break

    return normalized_urls


@router.post("/generateRecipeImages")
def generate_recipe_images(images: List[UploadFile] = File(...)):
    if not images:
        raise HTTPException(status_code=400, detail="No images part in the request")

    pil_images = []
    for image_file in images:
        image_bytes = image_file.file.read()
        if not image_bytes:
            continue
        pil_images.append(PIL.Image.open(BytesIO(image_bytes)))

    if not pil_images:
        raise HTTPException(status_code=400, detail="No valid images were uploaded")

    return generate_recipe_json(["Extract the steps of the recipe in JSON format", *pil_images])


@router.post("/generateRecipeUrl")
async def generate_recipe_url(payload: GenerateRecipeUrlPayload):
    target_url = extract_first_url(payload.url)
    if not target_url:
        raise HTTPException(status_code=400, detail="No valid URL found")

    target_url = resolve_url_redirects(target_url)
    if not is_xiaohongshu_url(target_url):
        raise HTTPException(status_code=400, detail="Unsupported URL domain")

    crawler_request = CrawlerStartRequest(
        platform=PlatformEnum.XHS,
        login_type=LoginTypeEnum.COOKIE,
        crawler_type=CrawlerTypeEnum.DETAIL,
        specified_ids=target_url,
        url_list=[target_url],
    )

    try:
        detail_results = await crawler_manager.start_detail_and_collect(crawler_request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    if not detail_results:
        if crawler_manager.status == "running" or (crawler_manager.process and crawler_manager.process.poll() is None):
            raise HTTPException(status_code=400, detail="Crawler is already running")
        raise HTTPException(status_code=500, detail="Failed to start crawler")

    contents = detail_results.get("contents", [])
    if not contents:
        raise HTTPException(status_code=500, detail="Crawler completed but no note detail was collected")

    note_detail = contents[0]
    image_urls = _normalize_image_urls(note_detail.get("image_list"))
    downloaded_images = [item for url in image_urls if (item := download_image(url))]
    images = [item["image"] for item in downloaded_images]
    note_text = f"{note_detail.get('title', '')} {note_detail.get('desc', '')}".strip()
    query = ["Extract the steps of the recipe from this text:", note_text, "output in English"]

    if images:
        query.extend(
            [
                "Then extract the steps from pictures:",
                *images,
                "Now combine the steps extracted from text and these images, summarize steps and ingredients with quantity(if provided).",
            ]
        )
    else:
        query.append(
            "No valid recipe images could be downloaded, so rely on the text only and summarize steps and ingredients with quantity if provided."
        )

    recipe_payload = generate_recipe_json(query)
    recipe_payload["imageInfo"] = upload_images_to_cloudinary(downloaded_images)
    recipe_payload["note_detail"] = note_detail
    return recipe_payload
