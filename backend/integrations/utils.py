from datetime import datetime
from typing import Any

from .errors import MissingFieldError


def require_fields(payload: dict[str, Any], fields: list[str], channel: str) -> None:
    missing = [field for field in fields if payload.get(field) in (None, "")]
    if missing:
        raise MissingFieldError(
            f"{channel} response is missing required fields.",
            details={"missing": missing, "payload": payload},
        )


def parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
