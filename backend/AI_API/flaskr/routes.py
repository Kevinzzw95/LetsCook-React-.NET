from flask import Blueprint, jsonify, current_app, request
from google import genai
from pydantic import BaseModel
from google.genai import types
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

main = Blueprint('main', __name__)


class Ingredient(BaseModel):
    name: str
    original: str
    amount: str


class Recipe(BaseModel):
    title: str
    ingredients: list[Ingredient]
    steps: list[str]
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
        model="gemini-2.0-flash",
        contents=["Extract the steps of the recipe in JSON format", *images],
        config={
            'response_mime_type': 'application/json',
            'response_schema': Recipe,
        },
    )
    return response.text


@main.route('/generateRecipeUrl', methods=['POST'])
def generateRecipeUrl():
    target_url = request.get_json().get('url')
    if not target_url:
        return jsonify({'error': 'Missing URL parameter'}), 400

    match = re.search(r'https://\S+', target_url)
    if match:
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

            context.add_cookies([
                {
                    "name": "a1",
                    "value": "1960ba1892bqvusbc3wtkwy22pc2ah47svvr82tkz30000372876",
                    "domain": ".xiaohongshu.com",
                    "path": "/",
                },
                {
                    "name": "abRequestId",
                    "value": "ec964229-62a6-5e01-8890-2c0f603e1643",
                    "domain": ".xiaohongshu.com",
                    "path": "/",
                },
                {
                    "name": "acw_tc",
                    "value": "0a0bb41a17547983492431910efb290c42ce0b0a18080aee0a860e300542ed",
                    "domain": "edith.xiaohongshu.com",
                    "path": "/",
                },
                {
                    "name": "acw_tc",
                    "value": "0a00d2d717547973772036854e2477a1ca2a56e2e968e519ea29a7465bd8dc",
                    "domain": "www.xiaohongshu.com",
                    "path": "/",
                },
                {
                    "name": "gid",
                    "value": "yjK8D0y0W4MKyjK8D0yYjhJ9JDAh7MDSqE9ThTuEvJJUSFq8J0x4WY888qWJYWK8JDjDYdYW",
                    "domain": ".xiaohongshu.com",
                    "path": "/",
                },
                {
                    "name": "loadts",
                    "value": "1754797378668",
                    "domain": ".xiaohongshu.com",
                    "path": "/",
                },
                {
                    "name": "sec_poison_id",
                    "value": "bd90f0e8-fcdc-41bc-a885-68ec5c269fee",
                    "domain": ".xiaohongshu.com",
                    "path": "/",
                },
                {
                    "name": "unread",
                    "value": "{%22ub%22:%2267ea17650000000009038819%22%2C%22ue%22:%2267ed8c8f000000000f039d98%22%2C%22uc%22:22}",
                    "domain": ".xiaohongshu.com",
                    "path": "/",
                },
                {
                    "name": "web_session",
                    "value": "040069b1075263566808ee10a43a4bae2bc9f0",
                    "domain": ".xiaohongshu.com",
                    "path": "/",
                },
                {
                    "name": "webBuild",
                    "value": "4.75.3",
                    "domain": ".xiaohongshu.com",
                    "path": "/",
                },
                {
                    "name": "webId",
                    "value": "878c249ff256e8466cf15035605675e7",
                    "domain": ".xiaohongshu.com",
                    "path": "/",
                },
                {
                    "name": "websectiga",
                    "value": "10f9a40ba454a07755a08f27ef8194c53637eba4551cf9751c009d9afb564467",
                    "domain": ".xiaohongshu.com",
                    "path": "/",
                },
                {
                    "name": "xsecappid",
                    "value": "xhs-pc-web",
                    "domain": ".xiaohongshu.com",
                    "path": "/",
                }
            ])

            page = context.new_page()

            BASE_DIR = os.path.dirname(os.path.abspath(__file__))
            stealth_path = os.path.join(BASE_DIR, "libs", "stealth.min.js")
            with open(stealth_path, "r", encoding="utf-8") as f:
                script_content = f.read()
            page.add_init_script(script_content)

            page.goto(target_url)

            data = handle_rednote(page)
            browser.close()

        images = [download_image(url) for url in data['image_urls']]
        query = [
            "Extract the steps of the recipe from this text: ",
            data['text'],
            "Then extract the steps from pictures:",
            *images,
            "Now combine the steps extracted from text and these images, "
            "summarize steps and ingredients with quantity(if provided)."
        ]
        return generateRecipeHelper(query)


def generateRecipeHelper(query):
    key = current_app.config.get('API_KEY_GEMINI', 'No key found')
    client = genai.Client(api_key=key)
    response = client.models.generate_content(
        model="gemini-2.0-flash",
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
    image_urls = [img['src'] for img in soup.find_all('img', class_="note-slider-img") if img.get('src')]
    return {
        'text': ' '.join(span_texts),
        'image_urls': image_urls
    }

def download_image(url):
    response = requests.get(url)
    return PIL.Image.open(BytesIO(response.content))

