from datetime import datetime
from enum import Enum
import os
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel


load_dotenv()


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


class SuggestionResponse(BaseModel):
    suggestion: str


class ApprovePayload(BaseModel):
    answer: str


app = FastAPI(title="Marketplace AI Inbox API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX") or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
