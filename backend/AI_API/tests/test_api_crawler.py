# -*- coding: utf-8 -*-

from fastapi.testclient import TestClient

from api.main import app
from api.routers import crawler as crawler_router
from api.schemas.crawler import CrawlerStartRequest
from api.services.crawler_manager import CrawlerManager
from store.xhs._store_impl import XhsMemoryStoreImplement


client = TestClient(app)


def test_detail_mode_requires_specified_ids():
    response = client.post(
        "/api/crawler/start",
        json={
            "platform": "xhs",
            "login_type": "qrcode",
            "crawler_type": "detail",
        },
    )

    assert response.status_code == 422
    assert "specified_ids is required" in response.text


def test_search_mode_requires_keywords():
    response = client.post(
        "/api/crawler/start",
        json={
            "platform": "xhs",
            "login_type": "qrcode",
            "crawler_type": "search",
        },
    )

    assert response.status_code == 422
    assert "keywords is required" in response.text


def test_creator_mode_requires_creator_ids():
    response = client.post(
        "/api/crawler/start",
        json={
            "platform": "xhs",
            "login_type": "qrcode",
            "crawler_type": "creator",
        },
    )

    assert response.status_code == 422
    assert "creator_ids is required" in response.text


def test_cookie_login_requires_cookies():
    response = client.post(
        "/api/crawler/start",
        json={
            "platform": "xhs",
            "login_type": "cookie",
            "crawler_type": "detail",
            "specified_ids": "https://www.xiaohongshu.com/explore/test?xsec_token=abc&xsec_source=pc_search",
        },
    )

    assert response.status_code == 422
    assert "cookies is required" in response.text


def test_build_command_matches_cli_contract_for_xhs_detail():
    manager = CrawlerManager()
    request = CrawlerStartRequest(
        platform="xhs",
        login_type="qrcode",
        crawler_type="detail",
        specified_ids="https://www.xiaohongshu.com/explore/test?xsec_token=abc&xsec_source=pc_search",
        save_option="postgres",
        enable_comments=True,
        enable_sub_comments=False,
        headless=False,
    )

    command = manager._build_command(request)

    assert command[:3] == ["uv", "run", "main.py"]
    assert "--platform" in command
    assert "xhs" in command
    assert "--lt" in command
    assert "qrcode" in command
    assert "--type" in command
    assert "detail" in command
    assert "--specified_id" in command
    assert "--save_data_option" in command
    assert "postgres" in command


def test_start_api_returns_note_detail_for_detail_mode(monkeypatch):
    expected_detail = {"note_id": "test-note-id", "title": "Scraped note"}
    expected_comment = {"comment_id": "comment-1", "content": "hello"}

    async def fake_start_detail_and_collect(request):
        return {
            "contents": [expected_detail],
            "comments": [expected_comment],
            "creators": [],
        }

    monkeypatch.setattr(crawler_router.crawler_manager, "start_detail_and_collect", fake_start_detail_and_collect)

    response = client.post(
        "/api/crawler/start",
        json={
            "platform": "xhs",
            "login_type": "qrcode",
            "crawler_type": "detail",
            "specified_ids": "https://www.xiaohongshu.com/explore/test-note-id?xsec_token=abc&xsec_source=pc_search",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "note_detail": expected_detail,
        "comments": [expected_comment],
    }


def test_xhs_memory_store_captures_content_without_files():
    XhsMemoryStoreImplement.reset()
    store = XhsMemoryStoreImplement()
    content_item = {"note_id": "match-note-id", "title": "Matched note"}

    import asyncio
    asyncio.run(store.store_content(content_item))

    snapshot = XhsMemoryStoreImplement.snapshot()

    assert snapshot["contents"] == [content_item]
    assert snapshot["comments"] == []
    assert snapshot["creators"] == []


def test_command_log_redacts_cookies():
    manager = CrawlerManager()
    command = [
        "uv",
        "run",
        "main.py",
        "--platform",
        "xhs",
        "--cookies",
        "web_session=secret_cookie_value",
    ]

    redacted = manager._redact_command_for_log(command)

    assert redacted[-1] == "<redacted>"
    assert "secret_cookie_value" not in " ".join(redacted)


def test_config_options_exposes_phone_and_postgres():
    response = client.get("/api/config/options")

    assert response.status_code == 200
    payload = response.json()

    login_values = {item["value"] for item in payload["login_types"]}
    save_values = {item["value"] for item in payload["save_options"]}

    assert "phone" in login_values
    assert "postgres" in save_values
