import os

from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import declarative_base, sessionmaker


DEFAULT_DATABASE_URL = "sqlite:///./marketplace_ai_inbox.db"


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


DATABASE_URL = get_database_url()
is_sqlite = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {"sslmode": "require"}

engine_options = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
}

if not is_sqlite:
    if os.getenv("DB_USE_NULLPOOL", "").lower() in {"1", "true", "yes"}:
        engine_options["poolclass"] = NullPool
    else:
        engine_options.update(
            {
                "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "120")),
                "pool_size": int(os.getenv("DB_POOL_SIZE", "1")),
                "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "0")),
                "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
            }
        )
    engine_options.update(
        {
            "client_encoding": "utf8",
            "use_native_hstore": False,
        }
    )

engine = create_engine(DATABASE_URL, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
