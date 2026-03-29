from flask import Blueprint, jsonify, current_app, request
from google import genai
from pydantic import BaseModel
from google.genai import types
import base64
import PIL.Image
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import time
import re
from io import BytesIO
from playwright.sync_api import sync_playwright
import json
import os
from PIL import UnidentifiedImageError

main = Blueprint('main', __name__)


class Ingredient(BaseModel):
    name: str
    unit: str
    amount: str


class Step(BaseModel):
    stepNumber: int
    description: str


class Recipe(BaseModel):
    title: str
    ingredients: list[Ingredient]
    steps: list[Step]
    servings: int


@main.route('/generateRecipeImages', methods=['POST'])
def generateRecipeImages():
    if 'images' not in request.files:
        return jsonify({'error': 'No images part in the request'}), 400

    files = request.files.getlist('images')
    key = current_app.config.get('API_KEY_GEMINI', 'No key found')
    client = genai.Client(api_key=key)
    name = request.args.get('name', 'Guest')
    age = request.args.get('age')
    image = PIL.Image.open('/Users/kevinz/Downloads/recipe_test.jpg')
    images = []
    for file in files:
        images.append(PIL.Image.open(file.stream))
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=["Extract the steps of the recipe in JSON format", *images],
        config={
            'response_mime_type': 'application/json',
            'response_schema': Recipe,
        },
    )
    return response.text


def parse_cookies(cookie_str):
    cookies = []

    for pair in cookie_str.split(';'):
        pair = pair.strip()
        if not pair:
            continue

        name, value = pair.split('=', 1)  # split only first '='

        cookies.append({
            "name": name,
            "value": value,
            "domain": ".xiaohongshu.com",
            "path": "/"
        })

    return cookies

@main.route('/generateRecipeUrl', methods=['POST'])
def generateRecipeUrl():
    target_url = request.get_json().get('url')
    xhs_cookies = current_app.config.get('XHS_COOKIES', 'No cookies found')

    if not target_url:
        return jsonify({'error': 'Missing URL parameter'}), 400

    match = re.search(r'https://\S+', target_url)
    if match:
        target_url = match.group()
        response = requests.get(match.group())
    else:
        print("No URL found")
        return

    if 'xiaohongshu' in target_url:
        '''
        crawler = RedNoteCrawler
        await crawler.start()
        '''
        with sync_playwright() as p:
            user_data_dir = "./browserData"
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()

            context.add_cookies(parse_cookies(xhs_cookies))

            page = context.new_page()

            BASE_DIR = os.path.dirname(os.path.abspath(__file__))
            stealth_path = os.path.join(BASE_DIR, "libs", "stealth.min.js")
            with open(stealth_path, "r", encoding="utf-8") as f:
                script_content = f.read()
            page.add_init_script(script_content)

            page.goto(target_url)

            data = handle_rednote(page)
            browser.close()

        downloaded_images = [item for url in data['image_urls'] if (item := download_image(url))]
        images = [item['image'] for item in downloaded_images]
        query = ["Extract the steps of the recipe from this text: ", data['text']]
        if images:
            query.extend([
                "Then extract the steps from pictures:",
                *images,
                "Now combine the steps extracted from text and these images, "
                "summarize steps and ingredients with quantity(if provided)."
            ])
        else:
            query.append(
                "No valid recipe images could be downloaded, so rely on the text only and summarize steps and ingredients with quantity if provided."
            )
        generate_recipe_response = generateRecipeHelper(query)
        recipe_payload = json.loads(generate_recipe_response)
        recipe_payload['images'] = [
            {
                'url': item['url'],
                'contentType': item['content_type'],
                'base64': item['base64'],
            }
            for item in downloaded_images
        ]
        return jsonify(recipe_payload)


def extract_image_urls(soup):

    seen = set()
    results = []

    for slide in soup.select("div.swiper-slide"):
        classes = slide.get("class", [])

        # skip duplicate slides
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


def generateRecipeHelper(query):
    key = current_app.config.get('API_KEY_GEMINI', 'No key found')
    client = genai.Client(api_key=key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=query,
        config={
            'response_mime_type': 'application/json',
            'response_schema': Recipe,
        },
    )
    return response.text


def handle_rednote(page):
    soup = BeautifulSoup(page.content(), 'html.parser')
    span_texts = [span.get_text(strip=True)
                  for parent in soup.find_all("span", class_="note-text")
                  for span in parent.find_all("span")]
    image_urls = extract_image_urls(soup)
    return {
        'text': ' '.join(span_texts),
        'image_urls': image_urls
    }


def download_image(url):
    if not url:
        return None

    normalized_url = url if not url.startswith("//") else f"https:{url}"
    headers = {
        "Referer": "https://www.xiaohongshu.com/",
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    }

    try:
        response = requests.get(normalized_url, headers=headers, timeout=15)
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "")
        if "image" not in content_type.lower():
            current_app.logger.warning(
                "Skipping non-image Xiaohongshu asset: %s (%s)",
                normalized_url,
                content_type,
            )
            return None

        image = PIL.Image.open(BytesIO(response.content))
        image.load()
        return {
            'url': normalized_url,
            'content_type': content_type,
            'base64': base64.b64encode(response.content).decode('ascii'),
            'image': image,
        }
    except (requests.RequestException, UnidentifiedImageError, OSError) as exc:
        current_app.logger.warning("Failed to download Xiaohongshu image %s: %s", normalized_url, exc)
        return None
