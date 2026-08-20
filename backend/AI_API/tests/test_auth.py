import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi import HTTPException

from app.core.auth import decode_user_id


def _segment(value: dict) -> str:
    encoded = json.dumps(value, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(encoded).rstrip(b"=").decode()


def _token(payload: dict, secret: str = "test-secret") -> str:
    header = _segment({"alg": "HS512", "typ": "JWT"})
    body = _segment(payload)
    signature = hmac.new(secret.encode(), f"{header}.{body}".encode(), hashlib.sha512).digest()
    return f"{header}.{body}.{base64.urlsafe_b64encode(signature).rstrip(b'=').decode()}"


def test_accepts_nestjs_nameid_claim() -> None:
    token = _token({"nameid": "user-123", "iat": int(time.time()), "exp": int(time.time()) + 60})
    assert decode_user_id(token, "test-secret") == "user-123"


@pytest.mark.parametrize("payload", [
    {"sub": "legacy-user"},
    {"http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": "legacy-user"},
])
def test_rejects_legacy_user_id_claims(payload: dict) -> None:
    token = _token({**payload, "exp": int(time.time()) + 60})
    with pytest.raises(HTTPException) as error:
        decode_user_id(token, "test-secret")
    assert error.value.status_code == 401
