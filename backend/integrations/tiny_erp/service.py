from datetime import datetime

from integrations.models import ConnectionTestResult, IntegrationHealth, NormalizedQuestion

from .client import TinyErpClient
from .mapper import map_question


class TinyErpService:
    def __init__(self):
        self.client = TinyErpClient()

    def list_questions(self) -> list[NormalizedQuestion]:
        return [map_question(payload) for payload in self.client.fetch_questions()]

    def get_health(self) -> IntegrationHealth:
        data = self.client.get_health()
        return IntegrationHealth(id=self.client.id, channel=self.client.channel, **data)

    def test_connection(self) -> ConnectionTestResult:
        data = self.client.test_connection()
        return ConnectionTestResult(
            id=self.client.id,
            channel=self.client.channel,
            ok=data["ok"],
            message=data["message"],
            checked_at=data.get("checked_at") or datetime.utcnow(),
        )
