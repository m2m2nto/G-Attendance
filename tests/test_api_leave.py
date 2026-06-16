"""API layer tests — Flask test client against leave endpoints."""

import json
import os


def test_api_team_smoke(flask_client):
    """GET /api/team returns 200 with team list."""
    resp = flask_client.get("/api/team")
    assert resp.status_code == 200
    data = resp.get_json()
    names = [m["name"] for m in data]
    assert "Alice" in names


def test_post_vacation_returns_201(flask_client):
    resp = flask_client.post("/api/leave/vacation", json={
        "name": "Alice",
        "year": 2026,
        "month": 5,
        "days_count": 2,
        "dates_detail": "11, 12",
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["days_count"] == 2
    assert data["dates_detail"] == "11, 12"


def test_get_vacation_returns_posted_entry(flask_client):
    """POST then GET — entry appears in the list."""
    flask_client.post("/api/leave/vacation", json={
        "name": "Bob",
        "year": 2026,
        "month": 6,
        "days_count": 1,
        "dates_detail": "15",
    })
    resp = flask_client.get("/api/leave/vacation?year=2026&name=Bob&month=6")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data) >= 1
    entry = [e for e in data if e["month"] == 6][0]
    assert entry["days_count"] == 1


def test_add_vacation_creates_missing_year_sheet(flask_client):
    """Adding leave for a year with no person sheet auto-creates it and persists.

    Reproduces the 'insert does nothing' bug when planning next-year vacation:
    the fixture only has 2025/2026 sheets, so 2027 has no 'Alice 27' sheet.
    """
    resp = flask_client.post("/api/leave/vacation", json={
        "name": "Alice",
        "year": 2027,
        "month": 7,
        "days_count": 2,
        "dates_detail": "13, 14",
    })
    assert resp.status_code == 201
    listed = flask_client.get("/api/leave/vacation?year=2027&name=Alice").get_json()
    entry = [e for e in listed if e["month"] == 7]
    assert len(entry) == 1
    assert entry[0]["days_count"] == 2
    assert entry[0]["dates_detail"] == "13, 14"


def test_invalid_leave_type_returns_400(flask_client):
    resp = flask_client.get("/api/leave/bogus_type")
    assert resp.status_code == 400
    assert "Invalid leave type" in resp.get_json()["error"]


def test_post_invalid_leave_type_returns_400(flask_client):
    resp = flask_client.post("/api/leave/bogus_type", json={
        "name": "Alice", "year": 2026, "month": 5, "days_count": 1,
    })
    assert resp.status_code == 400


def test_locked_returns_409(flask_client, patch_data_file):
    """Locked workbook → 409 via Flask error handler."""
    dirname = os.path.dirname(patch_data_file)
    basename = os.path.basename(patch_data_file)
    lock_file = os.path.join(dirname, "~$" + basename)

    try:
        with open(lock_file, "w") as f:
            f.write("lock")

        resp = flask_client.post("/api/leave/vacation", json={
            "name": "Alice",
            "year": 2026,
            "month": 5,
            "days_count": 1,
            "dates_detail": "test",
        })
        assert resp.status_code == 409
        assert "open in another application" in resp.get_json()["error"]
    finally:
        if os.path.exists(lock_file):
            os.remove(lock_file)
