"""API layer tests — balance endpoints (numbers from tests/test_compute_balance.py)."""


def test_compute_single_member(flask_client):
    resp = flask_client.get("/api/balances/compute?year=2026&name=Alice")
    assert resp.status_code == 200
    b = resp.get_json()
    assert b["carried_over"] == 10.5
    assert b["entitlement"] == 30.0
    assert b["used"] == 4.0
    assert b["remaining"] == 36.5


def test_compute_all_members_for_year(flask_client):
    resp = flask_client.get("/api/balances/compute?year=2025")
    assert resp.status_code == 200
    by_name = {b["name"]: b["remaining"] for b in resp.get_json()}
    assert by_name == {"Alice": 10.5, "Bob": 13.0}


def test_list_balances_filtered(flask_client):
    resp = flask_client.get("/api/balances?year=2026&name=Bob")
    assert resp.status_code == 200
    assert resp.get_json() == [{
        "name": "Bob", "year": 2026, "carried_over": 13.0,
        "accrued": 30.0, "used": 1, "remaining": 42.0,
    }]


def test_list_balances_all_years(flask_client):
    resp = flask_client.get("/api/balances")
    assert resp.status_code == 200
    keys = {(b["name"], b["year"]) for b in resp.get_json()}
    assert {("Alice", 2025), ("Alice", 2026), ("Bob", 2025), ("Bob", 2026)} <= keys


def test_balance_reflects_new_vacation(flask_client):
    flask_client.post("/api/leave/vacation", json={
        "name": "Alice", "year": 2026, "month": 5,
        "days_count": 2, "dates_detail": "11, 12",
    })
    b = flask_client.get("/api/balances/compute?year=2026&name=Alice").get_json()
    assert b["used"] == 6.0
    assert b["remaining"] == 34.5


def test_post_balance_returns_computed_values(flask_client):
    """Balances are derived from the workbook; POSTed numbers are ignored."""
    resp = flask_client.post("/api/balances", json={
        "name": "Alice", "year": 2025, "remaining": 999,
    })
    assert resp.status_code == 201
    assert resp.get_json()["remaining"] == 10.5
