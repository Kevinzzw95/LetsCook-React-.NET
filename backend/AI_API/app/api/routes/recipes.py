from io import BytesIO
from typing import List

import PIL.Image
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import get_settings
from app.schemas.recipes import GenerateRecipeUrlPayload
from app.services.recipe_ai import generate_recipe_json
from app.services.xiaohongshu import (
    crawl_xiaohongshu_note,
    download_image,
    extract_first_url,
    is_xiaohongshu_url,
    resolve_url_redirects,
)


router = APIRouter(tags=["recipes"])


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
def generate_recipe_url(payload: GenerateRecipeUrlPayload):
    target_url = extract_first_url(payload.url)
    if not target_url:
        raise HTTPException(status_code=400, detail="No valid URL found")

    target_url = resolve_url_redirects(target_url)
    if not is_xiaohongshu_url(target_url):
        raise HTTPException(status_code=400, detail="Unsupported URL domain")

    settings = get_settings()
    data = crawl_xiaohongshu_note(target_url, settings.xhs_cookies or "")
    downloaded_images = [item for url in data["image_urls"] if (item := download_image(url))]
    images = [item["image"] for item in downloaded_images]
    query = ["Extract the steps of the recipe from this text: ", data["text"]]

    """ if images:
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
    recipe_payload["images"] = [
        {
            "url": item["url"],
            "contentType": item["content_type"],
            "base64": item["base64"],
        }
        for item in downloaded_images
    ] 
    return recipe_payload"""
    return query