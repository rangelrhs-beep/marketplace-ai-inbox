import pytest
pytest.importorskip("fastapi")
from fastapi import HTTPException

import main


class FakeRow:
    def __init__(self, company_id):
        self.company_id = company_id


class FakeCompany:
    def __init__(self, cid, name):
        self.id = cid
        self.name = name


class FakeUser:
    def __init__(self, uid, role="platform_admin", access_scope="all", company_id=None):
        self.id = uid
        self.role = role
        self.access_scope = access_scope
        self.company_id = company_id


class FakeQuery:
    def __init__(self, model, session):
        self.model = model
        self.session = session
        self.user_id = None

    def filter(self, *_args, **_kwargs):
        return self

    def order_by(self, *_args, **_kwargs):
        return self

    def all(self):
        if self.model is main.Company:
            return [FakeCompany(cid, cid) for cid in self.session.company_ids]
        return [FakeRow(cid) for cid in self.session.selected_company_ids]


class FakeSession:
    def __init__(self, users, company_ids, selected_company_ids):
        self.users = users
        self.company_ids = company_ids
        self.selected_company_ids = selected_company_ids

    def get(self, model, key):
        if model is main.User:
            return self.users.get(key)
        if model is main.Company:
            return FakeCompany(key, key) if key in self.company_ids else None
        return None

    def query(self, model):
        return FakeQuery(model, self)

    def close(self):
        return None


class FakeRequest:
    def __init__(self, company_id):
        self.headers = {"X-Company-ID": company_id} if company_id is not None else {}
        self.state = type("S", (), {})()


def test_platform_admin_all_has_all_companies_and_zero_selected_rows(monkeypatch):
    session = FakeSession(
        users={"cpap_admin": FakeUser("cpap_admin", access_scope="all")},
        company_ids=["cpap_express", "atlas_commerce", "nova_casa_imports"],
        selected_company_ids=[],
    )
    monkeypatch.setattr(main, "SessionLocal", lambda: session)

    user = main.CurrentUserContext(
        id="cpap_admin", role="platform_admin", company_id="cpap_express", source="auth", email="admin@example.com", name="Admin"
    )
    allowed = main.get_allowed_company_ids_for_user(user)

    assert set(allowed) == {"cpap_express", "atlas_commerce", "nova_casa_imports"}


def test_platform_admin_selected_403_when_no_companies(monkeypatch):
    session = FakeSession(
        users={"cpap_admin": FakeUser("cpap_admin", access_scope="selected")},
        company_ids=["cpap_express", "atlas_commerce", "nova_casa_imports"],
        selected_company_ids=[],
    )
    monkeypatch.setattr(main, "SessionLocal", lambda: session)
    monkeypatch.setattr(
        main,
        "get_current_user",
        lambda _request=None: main.CurrentUserContext(
            id="cpap_admin", role="platform_admin", company_id="cpap_express", source="auth", email="admin@example.com", name="Admin"
        ),
    )

    with pytest.raises(HTTPException) as exc_info:
        main.get_current_company_id(FakeRequest("cpap_express"))

    assert exc_info.value.status_code == 403
    assert "Administrador sem empresas permitidas" in exc_info.value.detail


def test_platform_admin_selected_fallback_instead_of_deny(monkeypatch):
    session = FakeSession(
        users={"cpap_admin": FakeUser("cpap_admin", access_scope="selected")},
        company_ids=["cpap_express", "atlas_commerce", "nova_casa_imports"],
        selected_company_ids=["cpap_express", "nova_casa_imports"],
    )
    monkeypatch.setattr(main, "SessionLocal", lambda: session)
    monkeypatch.setattr(
        main,
        "get_current_user",
        lambda _request=None: main.CurrentUserContext(
            id="cpap_admin", role="platform_admin", company_id="cpap_express", source="auth", email="admin@example.com", name="Admin"
        ),
    )

    company_id = main.get_current_company_id(FakeRequest("atlas_commerce"))
    assert company_id in {"cpap_express", "nova_casa_imports"}
