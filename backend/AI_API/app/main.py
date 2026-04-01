import asyncio
import os
import subprocess

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings


WEBUI_DIR = os.path.join(os.path.dirname(__file__), "api", "webui")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="LetsCook AI API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router)
    app.add_api_route("/", serve_frontend, methods=["GET"])
    app.add_api_route("/api/health", health_check, methods=["GET"])
    app.add_api_route("/api/env/check", check_environment, methods=["GET"])
    app.add_api_route("/api/config/platforms", get_platforms, methods=["GET"])
    app.add_api_route("/api/config/options", get_config_options, methods=["GET"])
    _mount_webui_static(app)

    return app


def _mount_webui_static(app: FastAPI) -> None:
    if os.path.exists(WEBUI_DIR):
        assets_dir = os.path.join(WEBUI_DIR, "assets")
        if os.path.exists(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        logos_dir = os.path.join(WEBUI_DIR, "logos")
        if os.path.exists(logos_dir):
            app.mount("/logos", StaticFiles(directory=logos_dir), name="logos")

        app.mount("/static", StaticFiles(directory=WEBUI_DIR), name="webui-static")


async def serve_frontend():
    index_path = os.path.join(WEBUI_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "message": "MediaCrawler WebUI API",
        "version": "1.0.0",
        "docs": "/docs",
        "note": "WebUI not found, please build it first: cd webui && npm run build",
    }


async def health_check():
    return {"status": "ok"}


async def check_environment():
    try:
        process = await asyncio.create_subprocess_exec(
            "uv",
            "run",
            "main.py",
            "--help",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=".",
        )
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=30.0,
        )

        if process.returncode == 0:
            return {
                "success": True,
                "message": "MediaCrawler environment configured correctly",
                "output": stdout.decode("utf-8", errors="ignore")[:500],
            }

        error_msg = stderr.decode("utf-8", errors="ignore") or stdout.decode("utf-8", errors="ignore")
        return {
            "success": False,
            "message": "Environment check failed",
            "error": error_msg[:500],
        }
    except asyncio.TimeoutError:
        return {
            "success": False,
            "message": "Environment check timeout",
            "error": "Command execution exceeded 30 seconds",
        }
    except FileNotFoundError:
        return {
            "success": False,
            "message": "uv command not found",
            "error": "Please ensure uv is installed and configured in system PATH",
        }
    except Exception as exc:
        return {
            "success": False,
            "message": "Environment check error",
            "error": str(exc),
        }


async def get_platforms():
    return {
        "platforms": [
            {"value": "xhs", "label": "Xiaohongshu", "icon": "book-open"},
            {"value": "dy", "label": "Douyin", "icon": "music"},
            {"value": "ks", "label": "Kuaishou", "icon": "video"},
            {"value": "bili", "label": "Bilibili", "icon": "tv"},
            {"value": "wb", "label": "Weibo", "icon": "message-circle"},
            {"value": "tieba", "label": "Baidu Tieba", "icon": "messages-square"},
            {"value": "zhihu", "label": "Zhihu", "icon": "help-circle"},
        ]
    }


async def get_config_options():
    return {
        "login_types": [
            {"value": "qrcode", "label": "QR Code Login"},
            {"value": "phone", "label": "Phone Login"},
            {"value": "cookie", "label": "Cookie Login"},
        ],
        "crawler_types": [
            {"value": "search", "label": "Search Mode"},
            {"value": "detail", "label": "Detail Mode"},
            {"value": "creator", "label": "Creator Mode"},
        ],
        "save_options": [
            {"value": "jsonl", "label": "JSONL File"},
            {"value": "json", "label": "JSON File"},
            {"value": "csv", "label": "CSV File"},
            {"value": "excel", "label": "Excel File"},
            {"value": "sqlite", "label": "SQLite Database"},
            {"value": "db", "label": "MySQL Database"},
            {"value": "mongodb", "label": "MongoDB Database"},
            {"value": "postgres", "label": "PostgreSQL Database"},
        ],
    }


app = create_app()
