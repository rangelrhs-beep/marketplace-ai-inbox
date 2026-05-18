import base64
import hashlib
import hmac
import json
import time
from io import BytesIO

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


def b64url_bytes(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


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


def make_es256_token(*, private_key=7, key_id="test-key", payload=None):
    token_header = {"alg": "ES256", "typ": "JWT", "kid": key_id}
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
    digest = hashlib.sha256(signing_input.encode()).digest()
    z = int.from_bytes(digest, "big")
    nonce = 11
    point = main.p256_scalar_mult(nonce, (main.P256_GX, main.P256_GY))
    r = point[0] % main.P256_N
    s = (pow(nonce, -1, main.P256_N) * (z + r * private_key)) % main.P256_N
    signature = r.to_bytes(32, "big") + s.to_bytes(32, "big")
    return f"{signing_input}.{b64url_bytes(signature)}"


def make_jwks(*, private_key=7, key_id="test-key"):
    public_key = main.p256_scalar_mult(private_key, (main.P256_GX, main.P256_GY))
    return {
        "keys": [
            {
                "kty": "EC",
                "crv": "P-256",
                "kid": key_id,
                "alg": "ES256",
                "use": "sig",
                "x": b64url_bytes(public_key[0].to_bytes(32, "big")),
                "y": b64url_bytes(public_key[1].to_bytes(32, "big")),
            }
        ]
    }


class MockUrlopenResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return BytesIO(json.dumps(self.payload).encode())

    def __exit__(self, exc_type, exc, traceback):
        return False


@pytest.fixture(autouse=True)
def supabase_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co/")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "test-secret")
    with main.SUPABASE_JWKS_CACHE_LOCK:
        main.SUPABASE_JWKS_CACHE.update({"url": None, "fetched_at": 0.0, "jwks": None})


def test_validate_supabase_jwt_accepts_supabase_access_token():
    claims = main.validate_supabase_jwt(make_token())

    assert claims["aud"] == "authenticated"
    assert claims["sub"] == "user-123"


def test_validate_supabase_jwt_accepts_trailing_slash_issuer():
    claims = main.validate_supabase_jwt(make_token(payload={"iss": "https://example.supabase.co/auth/v1/"}))

    assert claims["iss"].endswith("/auth/v1/")


def test_validate_supabase_jwt_accepts_es256_with_supabase_jwks(monkeypatch):
    fetched_urls = []

    def mock_urlopen(request, timeout):
        fetched_urls.append(request.full_url)
        return MockUrlopenResponse(make_jwks())

    monkeypatch.setattr(main, "urlopen", mock_urlopen)

    claims = main.validate_supabase_jwt(make_es256_token())
    second_claims = main.validate_supabase_jwt(make_es256_token())

    assert claims["email"] == "user@example.com"
    assert second_claims["sub"] == "user-123"
    assert fetched_urls == ["https://example.supabase.co/auth/v1/.well-known/jwks.json"]


def test_validate_supabase_jwt_rejects_es256_unknown_kid(monkeypatch):
    def mock_urlopen(request, timeout):
        return MockUrlopenResponse(make_jwks(key_id="different-key"))

    monkeypatch.setattr(main, "urlopen", mock_urlopen)

    with pytest.raises(HTTPException) as exc_info:
        main.validate_supabase_jwt(make_es256_token(key_id="missing-key"))

    assert exc_info.value.status_code == 401


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
