from datetime import datetime
from enum import Enum
import json
import logging
import os
from pathlib import Path
import time
from typing import Any, List
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from integrations.errors import ApiFailureError, ConnectorError, ConnectorErrorCode, serialize_connector_error
from integrations.models import ConnectionTestResult, IntegrationHealth, NormalizedQuestion
from integrations.registry import services as integration_services


load_dotenv()
logger = logging.getLogger(__name__)
ML_TOKEN_PATH = Path(__file__).with_name("mercadolivre_tokens.json")
ML_AUTH_BASE_URL = "https://auth.mercadolivre.com.br/authorization"
ML_API_BASE_URL = "https://api.mercadolibre.com"


def get_cors_origins() -> list[str]:
    raw_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


def get_ml_config() -> dict[str, str]:
    return {
        "client_id": os.getenv("ML_CLIENT_ID") or os.getenv("MERCADO_LIVRE_CLIENT_ID") or "",
        "client_secret": os.getenv("ML_CLIENT_SECRET") or os.getenv("MERCADO_LIVRE_CLIENT_SECRET") or "",
        "redirect_uri": os.getenv("ML_REDIRECT_URI") or os.getenv("MERCADO_LIVRE_REDIRECT_URI") or "",
    }


def ml_is_configured() -> bool:
    config = get_ml_config()
    return all(config.values())


def read_ml_tokens() -> dict[str, Any]:
    if not ML_TOKEN_PATH.exists():
        return {}
    try:
        return json.loads(ML_TOKEN_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_ml_tokens(token_data: dict[str, Any]) -> dict[str, Any]:
    token_data["expires_at"] = int(time.time()) + int(token_data.get("expires_in", 0))
    token_data["updated_at"] = datetime.utcnow().isoformat()
    token_data.setdefault("connected_at", token_data["updated_at"])
    ML_TOKEN_PATH.write_text(json.dumps(token_data, indent=2), encoding="utf-8")
    return token_data


def update_ml_tokens(updates: dict[str, Any]) -> dict[str, Any]:
    tokens = read_ml_tokens()
    tokens.update(updates)
    ML_TOKEN_PATH.write_text(json.dumps(tokens, indent=2), encoding="utf-8")
    return tokens


def ml_connected_at(tokens: dict[str, Any]) -> datetime | None:
    raw_value = tokens.get("connected_at") or tokens.get("updated_at")
    if not raw_value:
        return None
    try:
        return datetime.fromisoformat(str(raw_value))
    except ValueError:
        return None


def format_optional_datetime(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def ml_request_json(url: str, *, method: str = "GET", data: dict[str, Any] | None = None, access_token: str | None = None) -> dict[str, Any]:
    body = None
    headers = {"Accept": "application/json"}
    if data is not None:
        body = urlencode(data).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    request = Request(url, data=body, method=method, headers=headers)
    try:
        with urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise HTTPException(status_code=error.code, detail=f"Mercado Livre API error: {details}") from error
    except URLError as error:
        raise HTTPException(status_code=502, detail=f"Mercado Livre API unavailable: {error}") from error


def ml_request_json_with_status(
    url: str,
    *,
    method: str = "GET",
    json_data: dict[str, Any] | None = None,
    access_token: str | None = None,
) -> tuple[int, dict[str, Any]]:
    body = None
    headers = {"Accept": "application/json"}
    if json_data is not None:
        body = json.dumps(json_data, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    request = Request(url, data=body, method=method, headers=headers)
    try:
        with urlopen(request, timeout=20) as response:
            response_text = response.read().decode("utf-8", errors="replace")
            response_body = json.loads(response_text) if response_text else {}
            return response.status, response_body
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        logger.error("Mercado Livre API error %s: %s", error.code, details)
        raise HTTPException(status_code=error.code, detail=f"Mercado Livre API error: {details}") from error
    except URLError as error:
        raise HTTPException(status_code=502, detail=f"Mercado Livre API unavailable: {error}") from error


def refresh_ml_token_if_needed(force: bool = False) -> dict[str, Any]:
    tokens = read_ml_tokens()
    if not tokens:
        raise HTTPException(status_code=401, detail="Mercado Livre is not connected")

    should_refresh = force or int(tokens.get("expires_at", 0)) <= int(time.time()) + 120
    if not should_refresh:
        return tokens

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Mercado Livre refresh_token is missing")

    config = get_ml_config()
    refreshed = ml_request_json(
        f"{ML_API_BASE_URL}/oauth/token",
        method="POST",
        data={
            "grant_type": "refresh_token",
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "refresh_token": refresh_token,
        },
    )
    return save_ml_tokens(refreshed)


def get_ml_seller_id(tokens: dict[str, Any]) -> str:
    seller_id = tokens.get("seller_id") or tokens.get("user_id")
    if seller_id:
        return str(seller_id)

    me = ml_request_json(f"{ML_API_BASE_URL}/users/me", access_token=tokens["access_token"])
    seller_id = me.get("id")
    if not seller_id:
        raise HTTPException(status_code=502, detail="Could not resolve Mercado Livre seller_id")
    update_ml_tokens({"seller_id": seller_id})
    return str(seller_id)


def normalize_ml_question_status(raw_status: str | None) -> str:
    status = (raw_status or "").lower()
    if status in {"unanswered", "pending", "opened", "active"}:
        return "Pendente"
    if status in {"answered", "closed"}:
        return "Respondida"
    return "Pendente"


def get_ml_product_title(item_id: str | None, access_token: str) -> str:
    if not item_id:
        return "Produto Mercado Livre"
    try:
        item = ml_request_json(f"{ML_API_BASE_URL}/items/{item_id}", access_token=access_token)
        return item.get("title") or item_id
    except HTTPException:
        return item_id


def normalize_ml_question(payload: dict[str, Any], access_token: str) -> dict[str, Any]:
    item_id = payload.get("item_id") or payload.get("item", {}).get("id")
    text = payload.get("text") or payload.get("question") or payload.get("body") or ""
    created_at = payload.get("date_created") or payload.get("created_at") or datetime.utcnow().isoformat()
    return {
        "channel": "mercado_livre",
        "external_id": str(payload.get("id") or payload.get("question_id") or ""),
        "product_title": get_ml_product_title(item_id, access_token),
        "question_text": text,
        "status": normalize_ml_question_status(payload.get("status")),
        "created_at": created_at,
        "raw_payload": payload,
    }


def extract_ml_questions(raw_response: Any) -> list[dict[str, Any]]:
    if isinstance(raw_response, list):
        return raw_response
    if not isinstance(raw_response, dict):
        return []
    questions_payload = raw_response.get("questions") or raw_response.get("results") or []
    return questions_payload if isinstance(questions_payload, list) else []


def fetch_ml_questions_by_seller(seller_id: str, access_token: str) -> dict[str, Any]:
    query = urlencode(
        {
            "seller_id": seller_id,
            "status": "unanswered",
            "api_version": "4",
        }
    )
    try:
        return ml_request_json(
            f"{ML_API_BASE_URL}/questions/search?{query}",
            access_token=access_token,
        )
    except HTTPException as error:
        if error.status_code in {400, 404}:
            return ml_request_json(
                f"{ML_API_BASE_URL}/marketplace/questions/search?{query}",
                access_token=access_token,
            )
        raise


class Status(str, Enum):
    pending = "Pendente"
    approved = "Aprovada"
    answered = "Respondida"
    rejected = "Rejeitada"


class Priority(str, Enum):
    high = "Alta"
    medium = "Media"
    low = "Baixa"


class Question(BaseModel):
    id: int
    marketplace: str
    product: str
    customer_name: str
    question: str
    created_at: datetime
    status: Status
    priority: Priority
    ai_suggestion: str
    sku: str
    price: str
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class SuggestionResponse(BaseModel):
    suggestion: str


class ApprovePayload(BaseModel):
    answer: str


class AiSuggestionPayload(BaseModel):
    product_title: str = ""
    question_text: str


class MercadoLivreAnswerPayload(BaseModel):
    answer: str


app = FastAPI(title="Marketplace AI Inbox API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def raise_connector_http_error(error: ConnectorError) -> None:
    status_by_code = {
        ConnectorErrorCode.missing_fields: 502,
        ConnectorErrorCode.token_expired: 401,
        ConnectorErrorCode.rate_limited: 429,
        ConnectorErrorCode.api_failure: 502,
    }
    raise HTTPException(
        status_code=status_by_code.get(error.code, 502),
        detail=serialize_connector_error(error),
    )


questions: List[Question] = [
    Question(
        id=1,
        marketplace="Mercado Livre",
        product="Kit 3 Camisetas Premium Algodao",
        customer_name="Mariana",
        question="Boa tarde! Esse kit tem a camiseta preta no tamanho M? Entrega chega antes de sexta?",
        created_at=datetime(2026, 4, 25, 10, 42),
        status=Status.pending,
        priority=Priority.high,
        ai_suggestion="Ola, Mariana! Temos sim a camiseta preta no tamanho M. Para confirmar o prazo de chegada antes de sexta, basta inserir seu CEP no anuncio que o Mercado Livre mostra a estimativa atualizada. Ficamos a disposicao!",
        sku="CAM-KIT-003",
        price="R$ 129,90",
    ),
    Question(
        id=2,
        marketplace="Mercado Livre",
        product="Fone Bluetooth Noise Canceling Pro",
        customer_name="Diego",
        question="O produto e original? Tem garantia?",
        created_at=datetime(2026, 4, 25, 9, 18),
        status=Status.pending,
        priority=Priority.medium,
        ai_suggestion="Ola, Diego! Sim, o produto e original, acompanha nota fiscal e possui garantia de 12 meses contra defeitos de fabricacao. Pode comprar com tranquilidade.",
        sku="FON-BT-PRO",
        price="R$ 249,00",
    ),
    Question(
        id=3,
        marketplace="Mercado Livre",
        product="Suporte Articulado para Monitor",
        customer_name="Carla",
        question="Serve para monitor ultrawide de 34 polegadas?",
        created_at=datetime(2026, 4, 24, 17, 5),
        status=Status.approved,
        priority=Priority.low,
        ai_suggestion="Ola, Carla! Esse suporte e compativel com monitores de ate 32 polegadas. Para ultrawide de 34 polegadas, recomendamos verificar peso e padrao VESA antes da compra.",
        sku="SUP-MON-ARM",
        price="R$ 189,90",
    ),
    Question(
        id=4,
        marketplace="Mercado Livre",
        product="Mochila Executiva Impermeavel USB",
        customer_name="Renato",
        question="Cabe notebook de 15.6 e tem divisoria acolchoada?",
        created_at=datetime(2026, 4, 24, 14, 32),
        status=Status.answered,
        priority=Priority.medium,
        ai_suggestion="Ola, Renato! Cabe notebook de ate 15.6 polegadas e possui divisoria acolchoada para melhor protecao. Tambem conta com tecido resistente a respingos.",
        sku="MOC-EXEC-USB",
        price="R$ 159,90",
    ),
    Question(
        id=5,
        marketplace="Shopee",
        product="Organizador de Cabos Mesa Home Office",
        customer_name="Luciana",
        question="Vem com fita dupla face para instalar?",
        created_at=datetime(2026, 4, 23, 11, 20),
        status=Status.pending,
        priority=Priority.low,
        ai_suggestion="Ola, Luciana! Sim, o organizador acompanha fita dupla face para uma instalacao pratica na mesa. Recomendamos limpar a superficie antes de colar.",
        sku="ORG-CAB-HO",
        price="R$ 39,90",
    ),
    Question(
        id=6,
        marketplace="Shopee",
        product="Luminaria LED Articulada para Mesa",
        customer_name="Paulo",
        question="A luz tem ajuste de intensidade? Funciona ligada no USB do notebook?",
        created_at=datetime(2026, 4, 26, 16, 10),
        status=Status.approved,
        priority=Priority.medium,
        ai_suggestion="Ola, Paulo! Sim, a luminaria possui ajuste de intensidade e funciona via USB, inclusive conectada ao notebook. Recomendamos usar uma porta com boa alimentacao para melhor desempenho.",
        sku="LUM-LED-USB",
        price="R$ 74,90",
    ),
    Question(
        id=7,
        marketplace="Magalu",
        product="Cafeteira Espresso Compacta 20 Bar",
        customer_name="Bianca",
        question="Ela aceita capsula ou somente po de cafe?",
        created_at=datetime(2026, 4, 26, 13, 48),
        status=Status.pending,
        priority=Priority.high,
        ai_suggestion="Ola, Bianca! Esse modelo utiliza po de cafe e acompanha filtro proprio. Ele nao e compativel com capsulas. Ficamos a disposicao para ajudar na compra!",
        sku="CAF-ESP-20B",
        price="R$ 599,00",
    ),
    Question(
        id=8,
        marketplace="Amazon",
        product="Echo Speaker Smart Home Hub",
        customer_name="Andre",
        question="Consigo controlar lampadas inteligentes de outras marcas?",
        created_at=datetime(2026, 4, 26, 8, 25),
        status=Status.answered,
        priority=Priority.low,
        ai_suggestion="Ola, Andre! Sim, voce consegue controlar lampadas inteligentes compativeis com Alexa. Recomendamos verificar na embalagem ou no app do fabricante se ha suporte para Alexa.",
        sku="ECH-HUB-5G",
        price="R$ 429,00",
    ),
    Question(
        id=9,
        marketplace="Magalu",
        product="Aspirador Robo Smart Mapeamento",
        customer_name="Fernanda",
        question="Ele passa pano tambem ou so aspira?",
        created_at=datetime(2026, 4, 25, 19, 4),
        status=Status.pending,
        priority=Priority.medium,
        ai_suggestion="Ola, Fernanda! Esse modelo aspira e tambem passa pano com reservatorio de agua. Para melhor resultado, recomendamos usar em pisos frios ou laminados bem nivelados.",
        sku="ASP-ROB-MAP",
        price="R$ 899,90",
    ),
    Question(
        id=10,
        marketplace="Amazon",
        product="Kindle Paperwhite 16 GB",
        customer_name="Roberto",
        question="O aparelho vem com anuncios na tela de bloqueio?",
        created_at=datetime(2026, 4, 25, 15, 36),
        status=Status.approved,
        priority=Priority.low,
        ai_suggestion="Ola, Roberto! Este anuncio e da versao sem ofertas especiais, portanto nao exibe anuncios na tela de bloqueio. O produto e novo e acompanha cabo USB.",
        sku="KDL-PW-16",
        price="R$ 699,00",
    ),
]


suggestion_variants = [
    "Obrigado pela pergunta! Conferimos as informacoes do produto e podemos te atender com seguranca. ",
    "Ola! Sim, esse item esta pronto para envio e as condicoes atualizadas aparecem no proprio marketplace. ",
    "Oi! Para garantir a melhor compra, recomendamos validar o prazo pelo CEP no anuncio. Sobre o produto: ",
]


def find_question(question_id: int) -> Question:
    for question in questions:
        if question.id == question_id:
            return question
    raise HTTPException(status_code=404, detail="Pergunta nao encontrada")


@app.get("/health")
def health():
    return {"status": "ok"}


def generate_openai_rewrite(question: str, original_response: str, instruction: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    prompt = (
        "You are a professional e-commerce seller answering marketplace customer questions. "
        "Rewrite the response based on the instruction.\n\n"
        "Rules:\n"
        "- Tone must be polite, direct, helpful, and slightly persuasive.\n"
        "- Start with a short direct answer, then add helpful detail.\n"
        "- Prefer confident, actionable information.\n"
        "- Avoid generic phrases like 'recomendamos verificar'.\n"
        "- Keep the answer concise, max 5 lines unless the instruction asks otherwise.\n"
        "- If product information is limited, do not invent details; suggest checking the variation or sending a message.\n"
        "- Output only the final message ready to send. No explanation, no meta text.\n\n"
        f"Customer question:\n{question}\n\n"
        f"Original seller response:\n{original_response}\n\n"
        f"Rewrite instruction:\n{instruction}"
    )
    response = client.responses.create(model=model, input=prompt)
    revised_response = response.output_text.strip()
    if not revised_response:
        raise RuntimeError("OpenAI returned an empty response")
    return revised_response


def generate_openai_initial_suggestion(product_title: str, question_text: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    prompt = (
        "Você é um vendedor profissional de e-commerce respondendo perguntas no Mercado Livre.\n"
        "Crie uma resposta inicial pronta para envio.\n\n"
        "Regras:\n"
        "- Responda em português do Brasil.\n"
        "- Seja educado, direto, útil e levemente persuasivo.\n"
        "- Comece com a resposta curta e depois detalhe somente o necessário.\n"
        "- Não invente informações sobre estoque, prazo, garantia, compatibilidade ou características.\n"
        "- Se os dados forem insuficientes, diga que o cliente pode conferir a variação do anúncio ou enviar nova mensagem.\n"
        "- Não mencione IA, sistema, API ou instruções internas.\n"
        "- Máximo de 5 linhas.\n\n"
        f"Produto: {product_title or 'Produto não informado'}\n"
        f"Pergunta do cliente: {question_text}"
    )
    response = client.responses.create(model=model, input=prompt)
    suggestion = response.output_text.strip()
    if not suggestion:
        raise RuntimeError("OpenAI returned an empty response")
    return suggestion


@app.get("/ai/health")
def ai_health():
    return {
        "openai_key_configured": bool(os.getenv("OPENAI_API_KEY")),
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "status": "ok",
    }


@app.post("/ai/suggest")
def suggest_ai_response(payload: AiSuggestionPayload):
    question_text = payload.question_text.strip()
    if not question_text:
        raise HTTPException(status_code=400, detail="Missing required field: question_text")

    try:
        suggestion = generate_openai_initial_suggestion(
            product_title=payload.product_title.strip(),
            question_text=question_text,
        )
        return {"suggestion": suggestion}
    except Exception as error:
        logger.exception("OpenAI initial suggestion failed")
        print(f"OpenAI initial suggestion failed: {error}")
        return {
            "error": True,
            "message": f"OpenAI initial suggestion failed: {error}",
            "fallback_available": False,
        }


@app.get("/integrations/mercadolivre/auth-url")
def mercadolivre_auth_url():
    config = get_ml_config()
    if not ml_is_configured():
        return {
            "configured": False,
            "auth_url": None,
            "fallback_available": True,
            "message": "Mercado Livre OAuth is not configured. Set ML_CLIENT_ID, ML_CLIENT_SECRET and ML_REDIRECT_URI.",
        }

    query = urlencode(
        {
            "response_type": "code",
            "client_id": config["client_id"],
            "redirect_uri": config["redirect_uri"],
            "state": "marketplace-ai-inbox",
        }
    )
    return {"configured": True, "auth_url": f"{ML_AUTH_BASE_URL}?{query}"}


@app.get("/integrations/mercadolivre/callback")
def mercadolivre_callback(code: str = Query(...)):
    config = get_ml_config()
    if not ml_is_configured():
        raise HTTPException(status_code=400, detail="Mercado Livre OAuth is not configured")

    token_data = ml_request_json(
        f"{ML_API_BASE_URL}/oauth/token",
        method="POST",
        data={
            "grant_type": "authorization_code",
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "code": code,
            "redirect_uri": config["redirect_uri"],
        },
    )
    tokens = save_ml_tokens(token_data)
    try:
        seller_id = get_ml_seller_id(tokens)
        tokens = update_ml_tokens({"seller_id": seller_id})
    except HTTPException as error:
        logger.warning("Could not resolve Mercado Livre seller_id after OAuth: %s", error.detail)
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url:
        return RedirectResponse(f"{frontend_url.rstrip('/')}/?ml_connected=true")
    return {
        "connected": True,
        "message": "Mercado Livre connected. You can close this tab and return to the app.",
    }


@app.get("/integrations/mercadolivre/questions")
def mercadolivre_questions():
    saved_tokens = read_ml_tokens()
    if not saved_tokens.get("access_token"):
        raise HTTPException(status_code=401, detail="Mercado Livre não conectado.")

    tokens = refresh_ml_token_if_needed()
    try:
        seller_id = get_ml_seller_id(tokens)
        raw_response = fetch_ml_questions_by_seller(
            seller_id=seller_id,
            access_token=tokens["access_token"],
        )
        logger.info("Mercado Livre questions raw response: %s", raw_response)
        print(f"Mercado Livre questions raw response: {raw_response}")
        return [
            normalize_ml_question(question_payload, tokens["access_token"])
            for question_payload in extract_ml_questions(raw_response)
        ]
    except HTTPException as error:
        if error.status_code == 401:
            tokens = refresh_ml_token_if_needed(force=True)
            seller_id = get_ml_seller_id(tokens)
            raw_response = fetch_ml_questions_by_seller(
                seller_id=seller_id,
                access_token=tokens["access_token"],
            )
            logger.info("Mercado Livre questions raw response after token refresh: %s", raw_response)
            print(f"Mercado Livre questions raw response after token refresh: {raw_response}")
            return [
                normalize_ml_question(question_payload, tokens["access_token"])
                for question_payload in extract_ml_questions(raw_response)
            ]
        if error.status_code == 403:
            raise HTTPException(
                status_code=403,
                detail="Permissão insuficiente para acessar perguntas.",
            ) from error
        raise


def send_ml_answer(question_id: str, answer: str, access_token: str) -> dict[str, Any]:
    question_identifier: int | str = int(question_id) if str(question_id).isdigit() else question_id
    response_status, response_body = ml_request_json_with_status(
        f"{ML_API_BASE_URL}/answers",
        method="POST",
        json_data={
            "question_id": question_identifier,
            "text": answer,
        },
        access_token=access_token,
    )
    logger.info("Mercado Livre answer response status=%s body=%s", response_status, response_body)
    print(f"Mercado Livre answer response status={response_status} body={response_body}")
    return {"status": response_status, "body": response_body}


@app.post("/integrations/mercadolivre/questions/{question_id}/answer")
def answer_mercadolivre_question(question_id: str, payload: MercadoLivreAnswerPayload):
    answer = payload.answer.strip()
    if not answer:
        raise HTTPException(status_code=400, detail="Missing required field: answer")

    saved_tokens = read_ml_tokens()
    if not saved_tokens.get("access_token"):
        raise HTTPException(status_code=401, detail="Mercado Livre não conectado.")

    try:
        tokens = refresh_ml_token_if_needed()
        result = send_ml_answer(question_id, answer, tokens["access_token"])
    except HTTPException as error:
        if error.status_code == 401:
            tokens = refresh_ml_token_if_needed(force=True)
            result = send_ml_answer(question_id, answer, tokens["access_token"])
        elif error.status_code == 403:
            raise HTTPException(
                status_code=403,
                detail="Permissão insuficiente para enviar respostas ao Mercado Livre.",
            ) from error
        else:
            raise

    return {
        "sent": True,
        "message": "Resposta enviada ao Mercado Livre",
        "raw_response": result["body"],
    }


@app.post("/ai/rewrite")
def rewrite_ai_response(payload: dict[str, Any]):
    original_response = (payload.get("text") or payload.get("original_response") or "").strip()
    instruction = (payload.get("instruction") or "").strip()
    question = (payload.get("question") or "").strip()

    if not original_response:
        return {
            "error": True,
            "message": "Missing required field: text or original_response",
            "fallback_available": True,
        }

    if not instruction:
        raise HTTPException(status_code=400, detail="Missing required field: instruction")

    try:
        rewritten_text = generate_openai_rewrite(question, original_response, instruction)
        return {"rewritten_text": rewritten_text}
    except Exception as error:
        logger.exception("OpenAI rewrite failed")
        print(f"OpenAI rewrite failed: {error}")
        return {
            "error": True,
            "message": f"OpenAI rewrite failed: {error}",
            "fallback_available": True,
        }


@app.get("/integrations/health", response_model=List[IntegrationHealth])
def list_integrations_health():
    health_items = []
    for service in integration_services.values():
        try:
            if service.client.id == "mercado-livre":
                tokens = read_ml_tokens()
                has_access_token = bool(tokens.get("access_token"))
                expires_at = int(tokens.get("expires_at", 0) or 0)
                token_status = "missing"
                if has_access_token:
                    token_status = "expired" if expires_at <= int(time.time()) else "valid"
                health_items.append(
                    IntegrationHealth(
                        id=service.client.id,
                        channel=service.client.channel,
                        connected=has_access_token,
                        api_status="operational" if has_access_token else "down",
                        last_sync=format_optional_datetime(ml_connected_at(tokens)),
                        last_error=None if has_access_token else "Mercado Livre não conectado.",
                        token_status=token_status,
                    )
                )
                continue
            health = service.get_health()
            health_items.append(
                IntegrationHealth(
                    id=health.id,
                    channel=health.channel,
                    connected=health.token_status in {"valid", "not_required"},
                    api_status=health.api_status,
                    last_sync=format_optional_datetime(health.last_sync)
                    if isinstance(health.last_sync, datetime)
                    else health.last_sync,
                    last_error=health.last_error,
                    token_status=health.token_status,
                )
            )
        except ConnectorError as error:
            health_items.append(
                IntegrationHealth(
                    id=service.client.id,
                    channel=service.client.channel,
                    connected=False,
                    api_status="down",
                    last_sync=None,
                    last_error=error.message,
                    token_status="missing",
                )
            )
    return health_items


@app.post("/integrations/{integration_id}/test", response_model=ConnectionTestResult)
def test_integration_connection(integration_id: str):
    service = integration_services.get(integration_id)
    if not service:
        raise HTTPException(status_code=404, detail="Integracao nao encontrada")

    try:
        return service.test_connection()
    except ConnectorError as error:
        raise_connector_http_error(error)
    except Exception as error:
        raise_connector_http_error(ApiFailureError("Unexpected connector failure.", details={"error": str(error)}))


@app.get("/integrations/{integration_id}/questions", response_model=List[NormalizedQuestion])
def list_integration_questions(integration_id: str):
    service = integration_services.get(integration_id)
    if not service:
        raise HTTPException(status_code=404, detail="Integracao nao encontrada")

    try:
        return service.list_questions()
    except ConnectorError as error:
        raise_connector_http_error(error)
    except Exception as error:
        raise_connector_http_error(ApiFailureError("Unexpected connector failure.", details={"error": str(error)}))


@app.get("/questions", response_model=List[Question])
def list_questions():
    return sorted(questions, key=lambda item: item.created_at, reverse=True)


@app.get("/questions/{question_id}", response_model=Question)
def get_question(question_id: int):
    return find_question(question_id)


@app.post("/questions/{question_id}/suggest", response_model=SuggestionResponse)
def suggest_answer(question_id: int):
    question = find_question(question_id)
    variant = suggestion_variants[question_id % len(suggestion_variants)]
    question.ai_suggestion = f"{variant}{question.ai_suggestion}"
    return SuggestionResponse(suggestion=question.ai_suggestion)


@app.post("/questions/{question_id}/approve", response_model=Question)
def approve_question(question_id: int, payload: ApprovePayload):
    question = find_question(question_id)
    question.ai_suggestion = payload.answer
    question.status = Status.answered
    return question

