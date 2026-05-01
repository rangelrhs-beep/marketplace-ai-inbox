from datetime import datetime
from typing import Any, Literal, Optional

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
    connected: bool = False
    api_status: ApiStatus
    last_sync: Optional[str] = None
    last_error: Optional[str] = None
    token_status: str = "unknown"


class ConnectionTestResult(BaseModel):
    id: str
    channel: str
    ok: bool
    message: str
    checked_at: datetime
