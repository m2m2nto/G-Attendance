"""API layer tests — config endpoints (all stored in app_settings.json)."""

import json


def test_get_config_defaults(flask_client):
    resp = flask_client.get("/api/config")
    assert resp.status_code == 200
    assert resp.get_json() == {
        "base_vacation_days": "26",
        "accrual_per_month": "2.1667",
        "carryover_deadline_month": "3",
    }


def test_put_config_round_trip(flask_client, workbook_dir):
    resp = flask_client.put("/api/config", json={"base_vacation_days": 28})
    assert resp.status_code == 200
    assert resp.get_json()["base_vacation_days"] == "28"
    assert flask_client.get("/api/config").get_json()["base_vacation_days"] == "28"
    with open(workbook_dir / "app_settings.json") as f:
        assert json.load(f)["base_vacation_days"] == "28"


def test_get_data_file(flask_client, patch_data_file):
    resp = flask_client.get("/api/config/file")
    assert resp.status_code == 200
    assert resp.get_json()["path"] == patch_data_file


def test_put_data_file_missing_returns_400(flask_client, workbook_dir):
    resp = flask_client.put("/api/config/file", json={"path": str(workbook_dir / "nope.xlsx")})
    assert resp.status_code == 400


def test_browse_lists_dirs_and_excel_only(flask_client, workbook_dir):
    (workbook_dir / "sub").mkdir()
    (workbook_dir / "notes.txt").write_text("x")
    (workbook_dir / "~$minimal.xlsx").write_text("lock")
    resp = flask_client.get(f"/api/config/browse?path={workbook_dir}")
    assert resp.status_code == 200
    names = [i["name"] for i in resp.get_json()["items"]]
    assert names == ["sub", "minimal.xlsx"]


def test_app_users_flow(flask_client):
    assert flask_client.get("/api/config/users").get_json() == {"users": [], "current_user": None}

    assert flask_client.post("/api/config/users", json={"name": "Ann"}).status_code == 201
    assert flask_client.post("/api/config/users", json={"name": "Ben"}).status_code == 201
    assert flask_client.post("/api/config/users", json={"name": "Ann"}).status_code == 409
    assert flask_client.post("/api/config/users", json={"name": " "}).status_code == 400

    assert flask_client.put("/api/config/users/current", json={"name": "Ann"}).status_code == 200
    assert flask_client.put("/api/config/users/current", json={"name": "Zed"}).status_code == 404
    assert flask_client.get("/api/config/users").get_json() == {
        "users": ["Ann", "Ben"], "current_user": "Ann",
    }
