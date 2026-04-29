from datetime import datetime


class MercadoLivreClient:
    id = "mercado-livre"
    channel = "Mercado Livre"

    def fetch_questions(self) -> list[dict]:
        return [
            {
                "id": "ml-q-1001",
                "item": {"title": "Kit 3 Camisetas Premium Algodao"},
                "text": "Boa tarde! Esse kit tem a camiseta preta no tamanho M?",
                "status": "Pendente",
                "date_created": "2026-04-29T08:40:00",
            },
            {
                "id": "ml-q-1002",
                "item": {"title": "Fone Bluetooth Noise Canceling Pro"},
                "text": "O produto e original? Tem garantia?",
                "status": "Pendente",
                "date_created": "2026-04-29T07:18:00",
            },
        ]

    def get_health(self) -> dict:
        return {
            "api_status": "operational",
            "last_sync": "2026-04-29T08:42:00",
            "last_error": None,
            "token_status": "valid",
        }

    def test_connection(self) -> dict:
        return {"ok": True, "message": "Mercado Livre OAuth token accepted.", "checked_at": datetime.utcnow()}
