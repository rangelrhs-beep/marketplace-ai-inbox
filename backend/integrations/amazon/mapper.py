from integrations.models import NormalizedQuestion
from integrations.utils import parse_datetime, require_fields


def map_question(payload: dict) -> NormalizedQuestion:
    require_fields(
        payload,
        ["asin_question_id", "asin_title", "customer_question", "workflow_status", "submitted_at"],
        "Amazon",
    )
    return NormalizedQuestion(
        channel="Amazon",
        external_id=str(payload["asin_question_id"]),
        product_title=payload["asin_title"],
        question_text=payload["customer_question"],
        status=payload["workflow_status"],
        created_at=parse_datetime(payload["submitted_at"]),
        raw_payload=payload,
    )
