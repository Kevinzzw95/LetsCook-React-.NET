import os
from dotenv import load_dotenv

load_dotenv()  # Load variables from .env

class Config:
    API_KEY_GEMINI = os.getenv('API_KEY_GEMINI')
    XHS_COOKIES = os.getenv('XHS_COOKIES')