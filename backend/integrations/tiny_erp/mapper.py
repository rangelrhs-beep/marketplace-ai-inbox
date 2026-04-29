from integrations.models import NormalizedQuestion
from integrations.utils import require_fields


def map_question(payload: dict) -> NormalizedQuestion:
    require_fields(payload, ["id", "product_title", "question_text", "status", "created_at"], "Tiny ERP")
    return NormalizedQuestion(
        channel="Tiny ERP",
        external_id=str(payload["id"]),
        product_title=payload["product_title"],
        question_text=payload["question_text"],
        status=payload["status"],
        created_at=payload["created_at"],
        raw_payload=payload,
    )
