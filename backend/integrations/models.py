from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


QuestionStatus = Literal["Pendente", "Aprovada", "Respondida", "Rejeitada"]
ApiStatus = Literal["operational", "degraded", "down"]
TokenStatus = Literal["valid", "expired", "missing", "not_required"]


class NormalizedQuestion(BaseModel):
    channel: str
    external_id: str
    product_title: str
    question_text: str
    status: QuestionStatus
    created_at: datetime
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class IntegrationHealth(BaseModel):
    id: str
    channel: str
    api_status: ApiStatus
    last_sync: datetime | None = None
    last_error: str | None = None
    token_status: TokenStatus


class ConnectionTestResult(BaseModel):
    id: str
    channel: str
    ok: bool
    message: str
    checked_at: datetime
