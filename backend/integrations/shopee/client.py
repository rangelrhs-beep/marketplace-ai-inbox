from datetime import datetime


class ShopeeClient:
    id = "shopee"
    channel = "Shopee"

    def fetch_questions(self) -> list[dict]:
        return [
            {
                "question_id": "sp-q-2201",
                "product_name": "Organizador de Cabos Mesa Home Office",
                "message": "Vem com fita dupla face para instalar?",
                "status": "Pendente",
                "created_at": "2026-04-28T15:20:00",
            }
        ]

    def get_health(self) -> dict:
        return {
            "api_status": "degraded",
            "last_sync": "2026-04-28T15:23:00",
            "last_error": "Rate limit warning on questions endpoint.",
            "token_status": "valid",
        }

    def test_connection(self) -> dict:
        return {"ok": True, "message": "Shopee partner token accepted.", "checked_at": datetime.utcnow()}
