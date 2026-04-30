from datetime import datetime
from enum import Enum
import logging
import os
from typing import Any, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from integrations.errors import ApiFailureError, ConnectorError, ConnectorErrorCode, serialize_connector_error
from integrations.models import ConnectionTestResult, IntegrationHealth, NormalizedQuestion
from integrations.registry import services as integration_services


load_dotenv()
logger = logging.getLogger(__name__)


def get_cors_origins() -> list[str]:
    raw_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


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

    response = client.responses.create(
        model=model,
        instructions=(
            "You are a professional e-commerce support agent. "
            "Rewrite the response based on the instruction. "
            "Be clear, professional and natural. Answer as a seller. "
            "Respect requests to be more technical, shorter, more persuasive, "
            "or to include warranty information. Return only the rewritten response."
        ),
        input=(
            f"Customer question:\n{question}\n\n"
            f"Original seller response:\n{original_response}\n\n"
            f"Rewrite instruction:\n{instruction}"
        ),
    )
    revised_response = response.output_text.strip()
    if not revised_response:
        raise RuntimeError("OpenAI returned an empty response")
    return revised_response


@app.get("/ai/health")
def ai_health():
    return {
        "openai_key_configured": bool(os.getenv("OPENAI_API_KEY")),
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "status": "ok",
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
            health_items.append(service.get_health())
        except ConnectorError as error:
            health_items.append(
                IntegrationHealth(
                    id=service.client.id,
                    channel=service.client.channel,
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
