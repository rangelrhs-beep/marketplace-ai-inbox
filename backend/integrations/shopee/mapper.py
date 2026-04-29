from integrations.models import NormalizedQuestion
from integrations.utils import parse_datetime, require_fields


def map_question(payload: dict) -> NormalizedQuestion:
    require_fields(payload, ["question_id", "product_name", "message", "status", "created_at"], "Shopee")
    return NormalizedQuestion(
        channel="Shopee",
        external_id=str(payload["question_id"]),
        product_title=payload["product_name"],
        question_text=payload["message"],
        status=payload["status"],
        created_at=parse_datetime(payload["created_at"]),
        raw_payload=payload,
    )
