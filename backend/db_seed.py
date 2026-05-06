from sqlalchemy.orm import Session

from db_models import Company, CompanySettings, Integration, User


DEFAULT_COMPANY_ID = "cpap_express"
DEFAULT_PROVIDER = "mercado_livre"


def seed_defaults(db: Session) -> None:
    company = db.get(Company, DEFAULT_COMPANY_ID)
    if not company:
        company = Company(id=DEFAULT_COMPANY_ID, name="CPAP Express")
        db.add(company)

    admin = db.get(User, "admin")
    if not admin:
        db.add(
            User(
                id="admin",
                email="admin@cpapexpress.demo",
                name="Admin",
                role="admin",
                company_id=DEFAULT_COMPANY_ID,
            )
        )

    integration = (
        db.query(Integration)
        .filter(
            Integration.company_id == DEFAULT_COMPANY_ID,
            Integration.provider == DEFAULT_PROVIDER,
        )
        .first()
    )
    if not integration:
        db.add(
            Integration(
                company_id=DEFAULT_COMPANY_ID,
                provider=DEFAULT_PROVIDER,
                token_status="missing",
            )
        )

    settings = (
        db.query(CompanySettings)
        .filter(CompanySettings.company_id == DEFAULT_COMPANY_ID)
        .first()
    )
    if not settings:
        db.add(
            CompanySettings(
                company_id=DEFAULT_COMPANY_ID,
                greeting="Olá!",
                closing="Ficamos à disposição.",
                tone="Técnico, claro e confiável",
                custom_prompt="Responda como especialista em CPAP e produtos respiratórios quando fizer sentido.",
            )
        )

    db.commit()
