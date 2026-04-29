from datetime import datetime


class AmazonClient:
    id = "amazon"
    channel = "Amazon"

    def fetch_questions(self) -> list[dict]:
        return [
            {
                "asin_question_id": "az-q-4401",
                "asin_title": "Echo Speaker Smart Home Hub",
                "customer_question": "Consigo controlar lampadas inteligentes de outras marcas?",
                "workflow_status": "Respondida",
                "submitted_at": "2026-04-27T08:25:00",
            }
        ]

    def get_health(self) -> dict:
        return {
            "api_status": "down",
            "last_sync": "2026-04-27T08:30:00",
            "last_error": "Mocked API failure: Amazon SP-API credentials not configured.",
            "token_status": "missing",
        }

    def test_connection(self) -> dict:
        return {"ok": False, "message": "Amazon SP-API credentials are missing.", "checked_at": datetime.utcnow()}
