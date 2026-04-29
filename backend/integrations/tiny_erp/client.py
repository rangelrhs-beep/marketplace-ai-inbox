from datetime import datetime


class TinyErpClient:
    id = "tiny-erp"
    channel = "Tiny ERP"

    def fetch_questions(self) -> list[dict]:
        return []

    def get_health(self) -> dict:
        return {
            "api_status": "degraded",
            "last_sync": None,
            "last_error": "Question sync is not available for Tiny ERP yet.",
            "token_status": "not_required",
        }

    def test_connection(self) -> dict:
        return {"ok": True, "message": "Tiny ERP mock connector is reachable.", "checked_at": datetime.utcnow()}
