from datetime import datetime


class MagaluClient:
    id = "magalu"
    channel = "Magalu"

    def fetch_questions(self) -> list[dict]:
        return [
            {
                "uuid": "mg-q-3301",
                "catalog": {"name": "Cafeteira Espresso Compacta 20 Bar"},
                "body": "Ela aceita capsula ou somente po de cafe?",
                "state": "Pendente",
                "created": "2026-04-28T13:48:00",
            }
        ]

    def get_health(self) -> dict:
        return {
            "api_status": "operational",
            "last_sync": "2026-04-28T19:15:00",
            "last_error": None,
            "token_status": "valid",
        }

    def test_connection(self) -> dict:
        return {"ok": True, "message": "Magalu seller API reachable.", "checked_at": datetime.utcnow()}
