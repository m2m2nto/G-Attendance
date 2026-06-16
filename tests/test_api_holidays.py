"""API layer tests — Flask test client against holiday endpoints."""


def _holidays_2026(client):
    resp = client.get("/api/holidays?year=2026")
    assert resp.status_code == 200
    return resp.get_json()


def test_post_holiday_returns_201(flask_client):
    resp = flask_client.post("/api/holidays", json={
        "date": "2026-07-14",
        "name": "Test Holiday",
        "year": 2026,
    })
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["name"] == "Test Holiday"
    assert data["date"] == "2026-07-14"


def test_get_holiday_returns_posted_entry(flask_client):
    """POST then GET — the new holiday appears exactly once, with its weekday."""
    before = len(_holidays_2026(flask_client))
    flask_client.post("/api/holidays", json={
        "date": "2026-07-14",
        "name": "Test Holiday",
        "year": 2026,
    })
    holidays = _holidays_2026(flask_client)
    assert len(holidays) == before + 1
    matches = [h for h in holidays if h["date"] == "2026-07-14"]
    assert len(matches) == 1
    assert matches[0]["name"] == "Test Holiday"
    assert matches[0]["day"] == "Tue"  # 2026-07-14 is a Tuesday — Day column filled in


def test_add_holiday_does_not_leak_footer_row(flask_client):
    """Adding a holiday must not expose the '# holidays in the weekend:' footer."""
    flask_client.post("/api/holidays", json={
        "date": "2026-07-14", "name": "Test Holiday", "year": 2026,
    })
    holidays = _holidays_2026(flask_client)
    for h in holidays:
        assert "#" not in str(h["date"])
        assert "weekend" not in str(h["name"]).lower()


def test_multiple_adds_all_persist(flask_client):
    """Two consecutive adds both survive — insert position stays inside the block."""
    before = len(_holidays_2026(flask_client))
    flask_client.post("/api/holidays", json={
        "date": "2026-07-14", "name": "Holiday A", "year": 2026,
    })
    flask_client.post("/api/holidays", json={
        "date": "2026-07-21", "name": "Holiday B", "year": 2026,
    })
    holidays = _holidays_2026(flask_client)
    names = {h["name"] for h in holidays}
    assert "Holiday A" in names
    assert "Holiday B" in names
    assert len(holidays) == before + 2


def test_add_then_delete_restores_list(flask_client):
    """Add then delete returns to the original count without footer leak."""
    before = _holidays_2026(flask_client)
    flask_client.post("/api/holidays", json={
        "date": "2026-07-14", "name": "Temp Holiday", "year": 2026,
    })
    resp = flask_client.delete("/api/holidays/2026-07-14/2026")
    assert resp.status_code == 204
    after = _holidays_2026(flask_client)
    assert len(after) == len(before)
    assert all(h["name"] != "Temp Holiday" for h in after)
    # Footer label must never appear as a holiday after the round-trip.
    assert all("weekend" not in str(h["name"]).lower() for h in after)
