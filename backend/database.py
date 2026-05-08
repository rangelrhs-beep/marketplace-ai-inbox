import os
import logging

from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import declarative_base, sessionmaker


DEFAULT_DATABASE_URL = "sqlite:///./marketplace_ai_inbox.db"
logger = logging.getLogger(__name__)


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


DATABASE_URL = get_database_url()
is_sqlite = DATABASE_URL.startswith("sqlite")

if is_sqlite:
    engine_options = {"connect_args": {"check_same_thread": False}}
else:
    engine_options = {
        "connect_args": {"sslmode": "require"},
        "poolclass": NullPool,
    }
    logger.info("Database engine using NullPool for PostgreSQL/Supabase pooler")

engine = create_engine(DATABASE_URL, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
