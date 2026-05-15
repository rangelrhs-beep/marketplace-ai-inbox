from datetime import datetime, timedelta


COMPANIES = ("cpap_express", "atlas_commerce", "nova_casa_imports")


def make_question(company_id, external_id, status="pending", answered_source=None, days_ago=1):
    created_at = datetime.utcnow() - timedelta(days=days_ago)
    return {
        "external_id": external_id,
        "company_id": company_id,
        "product_title": f"{company_id} product {external_id}",
        "status": status,
        "answered_source": answered_source,
        "created_at": created_at,
        "answered_at": created_at if answered_source else None,
    }


def query_questions_for_company(rows, company_id, days=15):
    cutoff = datetime.utcnow() - timedelta(days=days)
    result = []
    for row in rows:
        if row.get("company_id") != company_id:
            continue
        if row.get("status") in {"pending", "closed_unanswerable"}:
            result.append(row)
            continue
        if row.get("answered_source") not in {"app", "portal"}:
            continue
        effective_date = row.get("answered_at") or row.get("created_at")
        if effective_date and effective_date >= cutoff:
            result.append(row)
    return result


def persist_portal_answer(rows, company_id, external_id, answer_text):
    for row in rows:
        if row["company_id"] == company_id and row["external_id"] == external_id:
            row["status"] = "responded"
            row["answered_source"] = "portal"
            row["answered_at"] = datetime.utcnow()
            row["final_answer"] = answer_text
            return "update"
    rows.append(
        {
            "external_id": external_id,
            "company_id": company_id,
            "product_title": f"{company_id} product {external_id}",
            "status": "responded",
            "answered_source": "portal",
            "created_at": datetime.utcnow(),
            "answered_at": datetime.utcnow(),
            "final_answer": answer_text,
        }
    )
    return "insert"


def assert_only_company(rows, company_id):
    assert rows, f"Expected rows for {company_id}"
    for row in rows:
        assert row.get("company_id"), row
        assert row.get("company_id") == company_id, row


def run():
    rows = []
    for company_id in COMPANIES:
        rows.append(make_question(company_id, f"{company_id}-pending-1"))
        rows.append(make_question(company_id, f"{company_id}-pending-2"))
        rows.append(make_question(company_id, f"{company_id}-app-answered", status="responded", answered_source="app"))
        rows.append(make_question(company_id, f"{company_id}-portal-answered", status="responded", answered_source="portal"))

    # Exact production bug: an Indusat portal answered row must never appear in CPAP results.
    cpap_rows = query_questions_for_company(rows, "cpap_express", days=15)
    assert_only_company(cpap_rows, "cpap_express")
    assert "atlas_commerce-portal-answered" not in {row["external_id"] for row in cpap_rows}

    for days in (15, 30):
        for company_id in COMPANIES:
            tenant_rows = query_questions_for_company(rows, company_id, days=days)
            assert_only_company(tenant_rows, company_id)

    atlas_rows = query_questions_for_company(rows, "atlas_commerce", days=15)
    assert "cpap_express-portal-answered" not in {row["external_id"] for row in atlas_rows}

    zasweb_rows = query_questions_for_company(rows, "nova_casa_imports", days=30)
    assert "cpap_express-app-answered" not in {row["external_id"] for row in zasweb_rows}

    assert persist_portal_answer(rows, "nova_casa_imports", "zasweb-portal-webhook", "portal answer") == "insert"
    zasweb_rows = query_questions_for_company(rows, "nova_casa_imports", days=15)
    cpap_rows = query_questions_for_company(rows, "cpap_express", days=15)
    assert "zasweb-portal-webhook" in {row["external_id"] for row in zasweb_rows}
    assert "zasweb-portal-webhook" not in {row["external_id"] for row in cpap_rows}

    for company_id in COMPANIES:
        print(f"TENANT_ISOLATION_TEST_SAFE company_id={company_id}")


def test_tenant_isolation():
    run()


if __name__ == "__main__":
    run()
