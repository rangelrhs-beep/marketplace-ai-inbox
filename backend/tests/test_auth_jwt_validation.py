import base64
import hashlib
import hmac
import json
import time

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("sqlalchemy")
pytest.importorskip("dotenv")

from fastapi import HTTPException
from fastapi.testclient import TestClient

import main


def b64url(data):
    return (
        base64.urlsafe_b64encode(json.dumps(data, separators=(",", ":")).encode())
        .rstrip(b"=")
        .decode()
    )


def make_token(secret="test-secret", *, header=None, payload=None):
    token_header = {"alg": "HS256", "typ": "JWT"}
    if header:
        token_header.update(header)
    token_payload = {
        "iss": "https://example.supabase.co/auth/v1",
        "aud": "authenticated",
        "sub": "user-123",
        "email": "user@example.com",
        "exp": int(time.time()) + 3600,
    }
    if payload:
        token_payload.update(payload)
    signing_input = f"{b64url(token_header)}.{b64url(token_payload)}"
    signature = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()
    return f"{signing_input}.{encoded_signature}"


@pytest.fixture(autouse=True)
def supabase_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co/")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-secret")


def test_validate_supabase_jwt_accepts_supabase_access_token():
    claims = main.validate_supabase_jwt(make_token())

    assert claims["aud"] == "authenticated"
    assert claims["sub"] == "user-123"


def test_validate_supabase_jwt_accepts_trailing_slash_issuer():
    claims = main.validate_supabase_jwt(make_token(payload={"iss": "https://example.supabase.co/auth/v1/"}))

    assert claims["iss"].endswith("/auth/v1/")


def test_validate_supabase_jwt_rejects_invalid_signature():
    with pytest.raises(HTTPException) as exc_info:
        main.validate_supabase_jwt(make_token(secret="wrong-secret"))

    assert exc_info.value.status_code == 401


def test_validate_supabase_jwt_rejects_expired_token():
    with pytest.raises(HTTPException) as exc_info:
        main.validate_supabase_jwt(make_token(payload={"exp": int(time.time()) - 1}))

    assert exc_info.value.status_code == 401


def test_debug_auth_token_returns_safe_decoded_diagnostics_only():
    client = TestClient(main.app)
    token = make_token()

    response = client.get("/debug/auth-token", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    response_payload = response.json()
    assert response_payload == {
        "has_authorization": True,
        "header": {"alg": "HS256", "typ": "JWT"},
        "payload": {
            "iss": "https://example.supabase.co/auth/v1",
            "aud": "authenticated",
            "sub_exists": True,
            "email_exists": True,
            "exp": response_payload["payload"]["exp"],
        },
    }
    assert token not in response.text
    assert "test-secret" not in response.text
