"""Sick leave documents — link-only attachments, any number per entry,
each with its own "sent to fiduciaire" flag."""

import api.leave as leave_api

URL = "/api/leave/sick_leave/Alice/2026/5"


def _add_sick_leave(client, month=5):
    resp = client.post("/api/leave/sick_leave", json={
        "name": "Alice", "year": 2026, "month": month,
        "days_count": 2, "dates_detail": "11, 12",
    })
    assert resp.status_code == 201


def _attachments(client, month=5):
    listed = client.get("/api/leave/sick_leave?year=2026&name=Alice").get_json()
    return [e for e in listed if e["month"] == month][0]["attachments"]


def _make_docs(tmp_path, *names):
    docs = []
    for name in names:
        doc = tmp_path / name
        doc.write_bytes(b"%PDF")
        docs.append(doc)
    return docs


def _link(client, monkeypatch, *paths):
    monkeypatch.setattr(leave_api, "_choose_files", lambda prompt: [str(p) for p in paths])
    return client.post(f"{URL}/attachment/select")


def test_new_sick_leave_has_no_documents(flask_client):
    _add_sick_leave(flask_client)
    assert _attachments(flask_client) == []


def test_vacation_entries_carry_no_document_fields(flask_client):
    flask_client.post("/api/leave/vacation", json={
        "name": "Alice", "year": 2026, "month": 5, "days_count": 1, "dates_detail": "11",
    })
    entry = flask_client.get("/api/leave/vacation?year=2026&name=Alice&month=5").get_json()[0]
    assert "attachments" not in entry


def test_select_links_file_without_copying(flask_client, monkeypatch, tmp_path):
    _add_sick_leave(flask_client)
    (doc,) = _make_docs(tmp_path, "certificate.pdf")

    resp = _link(flask_client, monkeypatch, doc)
    assert resp.status_code == 200
    assert resp.get_json()["added"] == ["certificate.pdf"]
    assert _attachments(flask_client) == [{
        "path": str(doc), "file_name": "certificate.pdf",
        "missing": False, "sent_to_fiduciaire": False,
    }]


def test_entry_accepts_any_number_of_files(flask_client, monkeypatch, tmp_path):
    """Several files in one dialog, then more later — all stay linked."""
    _add_sick_leave(flask_client)
    a, b, c = _make_docs(tmp_path, "a.pdf", "b.pdf", "c.pdf")
    _link(flask_client, monkeypatch, a, b)
    _link(flask_client, monkeypatch, c)
    assert [f["file_name"] for f in _attachments(flask_client)] == ["a.pdf", "b.pdf", "c.pdf"]


def test_linking_same_file_twice_keeps_one_link(flask_client, monkeypatch, tmp_path):
    _add_sick_leave(flask_client)
    (doc,) = _make_docs(tmp_path, "certificate.pdf")
    _link(flask_client, monkeypatch, doc)
    flask_client.put(f"{URL}/fiduciaire", json={"path": str(doc), "sent": True})
    _link(flask_client, monkeypatch, doc)
    files = _attachments(flask_client)
    assert len(files) == 1
    assert files[0]["sent_to_fiduciaire"] is True


def test_cancelled_dialog_links_nothing(flask_client, monkeypatch):
    _add_sick_leave(flask_client)
    resp = _link(flask_client, monkeypatch)
    assert resp.status_code == 200
    assert resp.get_json() == {"added": [], "attachments": []}
    assert _attachments(flask_client) == []


def test_cannot_attach_without_a_sick_leave_entry(flask_client, monkeypatch, tmp_path):
    (doc,) = _make_docs(tmp_path, "certificate.pdf")
    resp = _link(flask_client, monkeypatch, doc)
    assert resp.status_code == 404
    assert "No sick leave entry" in resp.get_json()["error"]


def test_missing_file_is_flagged(flask_client, monkeypatch, tmp_path):
    _add_sick_leave(flask_client)
    (doc,) = _make_docs(tmp_path, "certificate.pdf")
    _link(flask_client, monkeypatch, doc)
    doc.unlink()
    assert _attachments(flask_client)[0]["missing"] is True


def test_unlink_removes_only_that_link_and_keeps_the_file(flask_client, monkeypatch, tmp_path):
    _add_sick_leave(flask_client)
    a, b = _make_docs(tmp_path, "a.pdf", "b.pdf")
    _link(flask_client, monkeypatch, a, b)

    resp = flask_client.delete(f"{URL}/attachment", json={"path": str(a)})
    assert resp.status_code == 200
    assert a.exists()
    assert [f["file_name"] for f in _attachments(flask_client)] == ["b.pdf"]


def test_sent_flag_is_per_file(flask_client, monkeypatch, tmp_path):
    _add_sick_leave(flask_client)
    a, b = _make_docs(tmp_path, "a.pdf", "b.pdf")
    _link(flask_client, monkeypatch, a, b)

    resp = flask_client.put(f"{URL}/fiduciaire", json={"path": str(b), "sent": True})
    assert resp.status_code == 200
    sent = {f["file_name"]: f["sent_to_fiduciaire"] for f in _attachments(flask_client)}
    assert sent == {"a.pdf": False, "b.pdf": True}

    flask_client.put(f"{URL}/fiduciaire", json={"path": str(b), "sent": False})
    assert not any(f["sent_to_fiduciaire"] for f in _attachments(flask_client))


def test_sent_flag_on_unlinked_file_returns_404(flask_client):
    _add_sick_leave(flask_client)
    resp = flask_client.put(f"{URL}/fiduciaire", json={"path": "/nope.pdf", "sent": True})
    assert resp.status_code == 404


def test_documents_are_per_entry(flask_client, monkeypatch, tmp_path):
    _add_sick_leave(flask_client, month=5)
    _add_sick_leave(flask_client, month=6)
    (doc,) = _make_docs(tmp_path, "certificate.pdf")
    _link(flask_client, monkeypatch, doc)
    assert _attachments(flask_client, month=6) == []


def test_open_launches_linked_file(flask_client, monkeypatch, tmp_path):
    _add_sick_leave(flask_client)
    a, b = _make_docs(tmp_path, "a.pdf", "b.pdf")
    _link(flask_client, monkeypatch, a, b)

    launched = []
    monkeypatch.setattr(leave_api.subprocess, "Popen", launched.append)
    resp = flask_client.post(f"{URL}/attachment/open", json={"path": str(b)})
    assert resp.status_code == 200
    assert launched == [["open", str(b)]]


def test_open_refuses_unlinked_or_missing_files(flask_client, monkeypatch, tmp_path):
    _add_sick_leave(flask_client)
    launched = []
    monkeypatch.setattr(leave_api.subprocess, "Popen", launched.append)
    linked, other = _make_docs(tmp_path, "linked.pdf", "other.pdf")
    _link(flask_client, monkeypatch, linked)

    # A file that exists on disk but is not linked to this entry is never opened.
    assert flask_client.post(f"{URL}/attachment/open", json={"path": str(other)}).status_code == 404

    linked.unlink()
    resp = flask_client.post(f"{URL}/attachment/open", json={"path": str(linked)})
    assert resp.status_code == 404
    assert "no longer exists" in resp.get_json()["error"]
    assert launched == []


def test_deleting_sick_leave_drops_its_documents(flask_client, monkeypatch, tmp_path):
    """A new entry in the same month must not inherit the deleted one's documents."""
    _add_sick_leave(flask_client)
    a, b = _make_docs(tmp_path, "a.pdf", "b.pdf")
    _link(flask_client, monkeypatch, a, b)

    assert flask_client.delete(URL).status_code == 204
    assert a.exists() and b.exists()

    _add_sick_leave(flask_client)
    assert _attachments(flask_client) == []


# ---------------------------------------------------------------------------
# Fiduciaire reminder — current and previous month, pending until every
# linked document is flagged as sent.
# ---------------------------------------------------------------------------

from datetime import date  # noqa: E402

from services.excel_service import get_fiduciaire_reminder  # noqa: E402


def test_reminder_lists_sick_leave_without_documents(flask_client):
    _add_sick_leave(flask_client, month=5)
    assert get_fiduciaire_reminder(date(2026, 5, 20)) == {
        "pending": [{"name": "Alice", "year": 2026, "month": 5, "deadline": "2026-05-26", "overdue": False}],
        "is_due": True,
    }


def test_reminder_flags_previous_month_as_overdue(flask_client):
    _add_sick_leave(flask_client, month=5)
    (entry,) = get_fiduciaire_reminder(date(2026, 6, 3))["pending"]
    assert entry["month"] == 5 and entry["overdue"] is True


def test_reminder_ignores_older_months(flask_client):
    _add_sick_leave(flask_client, month=5)
    assert get_fiduciaire_reminder(date(2026, 7, 1)) == {"pending": [], "is_due": False}


def test_reminder_clears_once_every_document_is_sent(flask_client, monkeypatch, tmp_path):
    _add_sick_leave(flask_client, month=5)
    first, second = _make_docs(tmp_path, "a.pdf", "b.pdf")
    _link(flask_client, monkeypatch, first, second)
    flask_client.put(f"{URL}/fiduciaire", json={"path": str(first), "sent": True})
    assert get_fiduciaire_reminder(date(2026, 5, 20))["is_due"] is True

    flask_client.put(f"{URL}/fiduciaire", json={"path": str(second), "sent": True})
    assert get_fiduciaire_reminder(date(2026, 5, 20))["is_due"] is False


def test_reminder_endpoint(flask_client):
    resp = flask_client.get("/api/leave/sick_leave/fiduciaire-reminder")
    assert resp.status_code == 200
    assert set(resp.get_json()) == {"pending", "is_due"}
