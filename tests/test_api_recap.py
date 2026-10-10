"""Recap email endpoints — /api/recap."""

import json


def test_settings_round_trip(flask_client, patch_data_file, workbook_dir):
    resp = flask_client.put("/api/recap/settings", json={
        "subject_template": "Ferie {anno}", "frequency_months": 4, "excluded_members": ["Bob"],
    })
    assert resp.status_code == 200

    got = flask_client.get("/api/recap/settings").get_json()
    assert got["subject_template"] == "Ferie {anno}"
    assert got["frequency_months"] == 4
    assert got["excluded_members"] == ["Bob"]
    assert "nome" in got["placeholders"]
    assert set(got["defaults"]) == {"subject", "body"}

    raw = json.loads((workbook_dir / "app_settings.json").read_text())
    assert raw["recap_frequency_months"] == 4


def test_settings_validation_400(flask_client):
    assert flask_client.put("/api/recap/settings", json={"frequency_months": 0}).status_code == 400
    assert flask_client.put("/api/recap/settings", json={"excluded_members": "Alice"}).status_code == 400


def test_list_recaps_shape_and_exclusion(flask_client):
    recaps = flask_client.get("/api/recap?year=2026").get_json()
    assert [r["name"] for r in recaps] == ["Alice", "Bob"]
    alice = recaps[0]
    assert set(alice) == {"name", "subject", "body", "template_error", "data"}
    assert alice["data"]["remaining"] == 36.5
    assert "Ciao Alice," in alice["body"]

    flask_client.put("/api/recap/settings", json={"excluded_members": ["Alice"]})
    recaps = flask_client.get("/api/recap?year=2026").get_json()
    assert [r["name"] for r in recaps] == ["Bob"]


def test_status_and_mark_sent(flask_client):
    s = flask_client.get("/api/recap/status").get_json()
    assert s["is_due"] is True and s["last_sent"] is None

    resp = flask_client.post("/api/recap/sent")
    assert resp.status_code == 200
    s = resp.get_json()
    assert s["is_due"] is False and s["last_sent"] is not None
    assert flask_client.get("/api/recap/status").get_json() == s
