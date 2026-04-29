from integrations.models import NormalizedQuestion
from integrations.utils import parse_datetime, require_fields


def map_question(payload: dict) -> NormalizedQuestion:
    require_fields(payload, ["uuid", "body", "state", "created"], "Magalu")
    catalog = payload.get("catalog") or {}
    require_fields(catalog, ["name"], "Magalu catalog")

    return NormalizedQuestion(
        channel="Magalu",
        external_id=str(payload["uuid"]),
        product_title=catalog["name"],
        question_text=payload["body"],
        status=payload["state"],
        created_at=parse_datetime(payload["created"]),
        raw_payload=payload,
    )
