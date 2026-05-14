from sqlalchemy.orm import Session

from db_models import Company, CompanySettings, Integration, User


DEFAULT_COMPANY_ID = "cpap_express"
DEFAULT_PROVIDER = "mercado_livre"
MOCK_COMPANIES = [
    (DEFAULT_COMPANY_ID, "CPAP Express"),
    ("atlas_commerce", "Indusat"),
    ("nova_casa_imports", "Nova Casa Imports"),
]


def seed_defaults(db: Session) -> None:
    for company_id, company_name in MOCK_COMPANIES:
        company = db.get(Company, company_id)
        if not company:
            db.add(Company(id=company_id, name=company_name))

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
                greeting="Olá! Obrigado pela pergunta.",
                closing="Ficamos à disposição.",
                tone="Técnico, claro e confiável",
                custom_prompt="",
                ai_general_rules="",
                ai_product_knowledge="",
                ai_allow_web_search=False,
                ai_absolute_restrictions="",
            )
        )

    db.commit()
