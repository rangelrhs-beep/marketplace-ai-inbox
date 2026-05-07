from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship

from database import Base, engine


JsonType = JSONB if engine.dialect.name == "postgresql" else JSON


class Company(Base):
    __tablename__ = "companies"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="company")
    integrations = relationship("Integration", back_populates="company")
    questions = relationship("QuestionRecord", back_populates="company")
    products = relationship("ProductCache", back_populates="company")
    settings = relationship("CompanySettings", back_populates="company", uselist=False)


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True)
    email = Column(String(255), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="admin")
    company_id = Column(String(64), ForeignKey("companies.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    company = relationship("Company", back_populates="users")


class Integration(Base):
    __tablename__ = "integrations"
    __table_args__ = (UniqueConstraint("company_id", "provider", name="uq_integration_company_provider"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String(64), ForeignKey("companies.id"), nullable=False)
    provider = Column(String(80), nullable=False)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    seller_id = Column(String(120), nullable=True)
    token_status = Column(String(50), nullable=False, default="missing")
    expires_in = Column(Integer, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    last_sync = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = relationship("Company", back_populates="integrations")


class QuestionRecord(Base):
    __tablename__ = "questions"
    __table_args__ = (UniqueConstraint("company_id", "provider", "external_id", name="uq_question_external"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String(64), ForeignKey("companies.id"), nullable=False)
    provider = Column(String(80), nullable=False)
    external_id = Column(String(120), nullable=False)
    product_title = Column(Text, nullable=False, default="")
    question_text = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="Pendente")
    created_at = Column(DateTime, nullable=True)
    answered_at = Column(DateTime, nullable=True)
    answered_source = Column(String(80), nullable=True)
    raw_payload = Column(JsonType, nullable=False, default=dict)
    created_in_app_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = relationship("Company", back_populates="questions")
    ai_suggestion = relationship("AiSuggestion", back_populates="question", uselist=False)


class AiSuggestion(Base):
    __tablename__ = "ai_suggestions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, unique=True)
    original_suggestion = Column(Text, nullable=False, default="")
    suggestion_text = Column(Text, nullable=True)
    edited_text = Column(Text, nullable=True)
    final_response = Column(Text, nullable=True)
    final_answer = Column(Text, nullable=True)
    was_edited = Column(Boolean, nullable=False, default=False)
    instruction_used = Column(Text, nullable=True)
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    question = relationship("QuestionRecord", back_populates="ai_suggestion")


class ProductCache(Base):
    __tablename__ = "products_cache"
    __table_args__ = (UniqueConstraint("company_id", "provider", "external_id", name="uq_product_cache_external"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String(64), ForeignKey("companies.id"), nullable=False)
    provider = Column(String(80), nullable=False)
    external_id = Column(String(120), nullable=False)
    title = Column(Text, nullable=False, default="")
    permalink = Column(Text, nullable=True)
    price = Column(String(80), nullable=True)
    currency_id = Column(String(20), nullable=True)
    status = Column(String(80), nullable=True)
    available_quantity = Column(Integer, nullable=True)
    thumbnail = Column(Text, nullable=True)
    category_id = Column(String(120), nullable=True)
    listing_type_id = Column(String(120), nullable=True)
    condition = Column(String(80), nullable=True)
    seller_custom_field = Column(Text, nullable=True)
    attributes_json = Column(JsonType, nullable=False, default=list)
    variations_json = Column(JsonType, nullable=False, default=list)
    raw_payload = Column(JsonType, nullable=False, default=dict)
    last_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = relationship("Company", back_populates="products")


class CompanySettings(Base):
    __tablename__ = "company_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String(64), ForeignKey("companies.id"), nullable=False, unique=True)
    greeting = Column(Text, nullable=False, default="Olá! Obrigado pela pergunta.")
    closing = Column(Text, nullable=False, default="Ficamos à disposição.")
    tone = Column(String(255), nullable=False, default="Técnico, claro e confiável")
    custom_prompt = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    company = relationship("Company", back_populates="settings")

