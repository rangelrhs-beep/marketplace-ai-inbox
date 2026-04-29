from integrations.models import NormalizedQuestion
from integrations.utils import parse_datetime, require_fields


def map_question(payload: dict) -> NormalizedQuestion:
    require_fields(payload, ["id", "text", "status", "date_created"], "Mercado Livre")
    item = payload.get("item") or {}
    require_fields(item, ["title"], "Mercado Livre item")

    return NormalizedQuestion(
        channel="Mercado Livre",
        external_id=str(payload["id"]),
        product_title=item["title"],
        question_text=payload["text"],
        status=payload["status"],
        created_at=parse_datetime(payload["date_created"]),
        raw_payload=payload,
    )
