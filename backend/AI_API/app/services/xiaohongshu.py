import base64
import logging
import re
from io import BytesIO
from pathlib import Path
from typing import Optional

import PIL.Image
import requests
from bs4 import BeautifulSoup
from PIL import UnidentifiedImageError
from playwright.sync_api import sync_playwright


logger = logging.getLogger(__name__)
STEALTH_SCRIPT_PATH = Path(__file__).resolve().parents[1] / "assets" / "stealth.min.js"


def extract_first_url(raw_value: Optional[str]):
    if not raw_value:
        return None

    match = re.search(r"https://\S+", raw_value)
    return match.group() if match else raw_value.strip()


def resolve_url_redirects(target_url: str):
    try:
        response = requests.get(
            target_url,
            headers={"User-Agent": browser_user_agent()},
            timeout=10,
            allow_redirects=True,
        )
        if response.url:
            return response.url
    except requests.RequestException as exc:
        logger.info("Skipping URL redirect resolution for %s: %s", target_url, exc)

    return target_url


def is_xiaohongshu_url(target_url: str):
    return "xiaohongshu.com" in target_url or "xhslink.com" in target_url


def normalize_cookie_string(cookie_str: str):
    normalized = (cookie_str or "").strip()
    if not normalized or normalized == "No cookies found":
        return ""

    if normalized.lower().startswith("cookie:"):
        normalized = normalized.split(":", 1)[1].strip()

    if len(normalized) >= 2 and normalized[0] == normalized[-1] and normalized[0] in {"'", '"'}:
        normalized = normalized[1:-1].strip()

    duplicated_prefix = re.match(r'^([A-Za-z0-9_]+)=["\']\1=', normalized)
    if duplicated_prefix:
        cookie_name = duplicated_prefix.group(1)
        normalized = re.sub(
            rf'^{re.escape(cookie_name)}=["\']{re.escape(cookie_name)}=',
            f"{cookie_name}=",
            normalized,
            count=1,
        )
        if normalized.endswith('"') or normalized.endswith("'"):
            normalized = normalized[:-1].rstrip()

    return normalized


def parse_cookies(cookie_str: str):
    cookies = []
    normalized_cookie_str = normalize_cookie_string(cookie_str)

    for pair in normalized_cookie_str.split(";"):
        pair = pair.strip()
        if not pair or "=" not in pair:
            continue

        name, value = pair.split("=", 1)
        cookies.append(
            {
                "name": name,
                "value": value,
                "domain": ".xiaohongshu.com",
                "path": "/",
            }
        )

    return cookies


def crawl_xiaohongshu_note(target_url: str, xhs_cookies: str):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context()
        if STEALTH_SCRIPT_PATH.exists():
            context.add_init_script(path=str(STEALTH_SCRIPT_PATH))

        cookies = parse_cookies(xhs_cookies)
        if cookies:
            context.add_cookies(cookies)

        page = context.new_page()
        page.goto(target_url)
        data = handle_rednote(page)
        browser.close()
        return data


def handle_rednote(page):
    soup = BeautifulSoup(page.content(), "html.parser")
    span_texts = [
        span.get_text(strip=True)
        for parent in soup.find_all("span", class_="note-text")
        for span in parent.find_all("span")
    ]
    image_urls = extract_image_urls(soup)
    return {
        "text": " ".join(span_texts),
        "image_urls": image_urls,
    }


def extract_image_urls(soup):
    seen = set()
    results = []

    for slide in soup.select("div.swiper-slide"):
        classes = slide.get("class", [])
        if "swiper-slide-duplicate" in classes:
            continue

        img = slide.find("img")
        if not img:
            continue

        src = img.get("src")
        if not src or src in seen:
            continue

        seen.add(src)
        results.append(src)

    return results


def browser_user_agent():
    return (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/137.0.0.0 Safari/537.36"
    )


def download_image(url):
    if not url:
        return None

    normalized_url = url if not url.startswith("//") else f"https:{url}"
    headers = {
        "Referer": "https://www.xiaohongshu.com/",
        "User-Agent": browser_user_agent(),
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    }

    try:
        response = requests.get(normalized_url, headers=headers, timeout=15)
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "")
        if "image" not in content_type.lower():
            logger.warning(
                "Skipping non-image Xiaohongshu asset: %s (%s)",
                normalized_url,
                content_type,
            )
            return None

        image = PIL.Image.open(BytesIO(response.content))
        image.load()
        return {
            "url": normalized_url,
            "content_type": content_type,
            "base64": base64.b64encode(response.content).decode("ascii"),
            "image": image,
        }
    except (requests.RequestException, UnidentifiedImageError, OSError) as exc:
        logger.warning("Failed to download Xiaohongshu image %s: %s", normalized_url, exc)
        return None
