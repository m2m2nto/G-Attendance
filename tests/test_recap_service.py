"""Recap email — Italian formatting, template rendering, settings, exclusions.

Fixture data for 2026 (see tests/create_fixture.py and test_compute_balance.py):
Alice: carried 10.5, entitlement 30, used 4 (Jan 1.5 "2, 23(1/2)", Apr 2.5), remaining 36.5
Bob:   carried 13,   entitlement 30, used 1 (Mar 1 "5"),               remaining 42
No sick leave recorded in 2026.
"""

from datetime import date

import pytest

from services.excel_service import add_leave, compute_balance, delete_leave, _load_settings
from services.recap_service import (
    DEFAULT_BODY, DEFAULT_SUBJECT, PLACEHOLDERS,
    format_it, get_settings, render_recaps, update_settings,
)

TODAY = date(2026, 10, 10)


def _by_name(recaps):
    return {r["name"]: r for r in recaps}


@pytest.mark.parametrize("value, expected", [
    (2.5, "2,5"), (26.0, "26"), (0, "0"), (36.5, "36,5"), (10.25, "10,25"), (-1.5, "-1,5"),
])
def test_format_it(value, expected):
    assert format_it(value) == expected


def test_default_template_renders_every_placeholder(patch_data_file):
    recaps = _by_name(render_recaps(2026, TODAY))
    alice = recaps["Alice"]
    assert alice["subject"] == "Riepilogo ferie e malattia 2026 – Alice"
    for placeholder in PLACEHOLDERS:
        assert "{" + placeholder + "}" not in alice["body"]
    body = alice["body"]
    assert "Ciao Alice," in body
    assert "al 10/10/2026" in body
    assert "Residuo dall'anno precedente: 10,5 giorni (da utilizzare entro il 31/03/2026)" in body
    assert "Ferie maturate nel 2026: 30 giorni" in body
    assert "Totale disponibile: 40,5 giorni" in body
    assert "Ferie godute: 4 giorni" in body
    assert "Ferie residue: 36,5 giorni" in body
    assert "- Gennaio: 1,5 giorni (2, 23(1/2))" in body
    assert "- Aprile: 2,5 giorni (10(1/2), 16, 17)" in body
    assert "Giorni di malattia: 0" in body
    assert "Nessun giorno di malattia registrato." in body
    assert alice["template_error"] is False


def test_data_matches_compute_balance(patch_data_file):
    for recap in render_recaps(2026, TODAY):
        b = compute_balance(recap["name"], 2026)
        assert recap["data"]["carried_over"] == b["carried_over"]
        assert recap["data"]["entitlement"] == b["entitlement"]
        assert recap["data"]["total"] == b["total"]
        assert recap["data"]["used"] == b["used"]
        assert recap["data"]["remaining"] == b["remaining"]


def test_sick_leave_lines_and_singular(patch_data_file):
    add_leave("sick_leave", "Bob", 2026, 2, 1, "9")
    add_leave("sick_leave", "Bob", 2026, 9, 2, "14, 15")
    body = _by_name(render_recaps(2026, TODAY))["Bob"]["body"]
    assert "Giorni di malattia: 3" in body
    assert "- Febbraio: 1 giorno (9)\n- Settembre: 2 giorni (14, 15)" in body
    assert "- Marzo: 1 giorno (5)" in body  # Bob's vacation, singular


def test_empty_detail_lines(patch_data_file):
    delete_leave("vacation", "Bob", 2026, 3)  # Bob's only 2026 vacation entry
    update_settings({"body_template": "{dettaglio_ferie}|{dettaglio_malattia}"})
    body = _by_name(render_recaps(2026, TODAY))["Bob"]["body"]
    assert body == "Nessun giorno di ferie registrato.|Nessun giorno di malattia registrato."


def test_unknown_placeholder_kept_and_bad_template_does_not_crash(patch_data_file):
    update_settings({"subject_template": "Ciao {nome} {foo}", "body_template": "Prezzo { rotto"})
    alice = _by_name(render_recaps(2026, TODAY))["Alice"]
    assert alice["subject"] == "Ciao Alice {foo}"
    assert alice["body"] == "Prezzo { rotto"
    assert alice["template_error"] is True


def test_sender_is_current_user(patch_data_file):
    import services.excel_service as svc
    settings = svc._load_settings()
    settings["current_user"] = "Danilo"
    svc._save_settings(settings)
    body = _by_name(render_recaps(2026, TODAY))["Alice"]["body"]
    assert body.rstrip().endswith("Un saluto,\nDanilo")


def test_settings_defaults(patch_data_file):
    s = get_settings()
    assert s["subject_template"] == DEFAULT_SUBJECT
    assert s["body_template"] == DEFAULT_BODY
    assert s["frequency_months"] == 3
    assert s["excluded_members"] == []
    assert s["placeholders"] == PLACEHOLDERS
    assert s["defaults"] == {"subject": DEFAULT_SUBJECT, "body": DEFAULT_BODY}


def test_settings_partial_update_persists(patch_data_file):
    update_settings({"frequency_months": 6})
    update_settings({"excluded_members": ["Bob"]})
    raw = _load_settings()
    assert raw["recap_frequency_months"] == 6
    assert raw["recap_excluded_members"] == ["Bob"]
    s = get_settings()
    assert s["frequency_months"] == 6
    assert s["subject_template"] == DEFAULT_SUBJECT


@pytest.mark.parametrize("data", [
    {"frequency_months": 0}, {"frequency_months": 13}, {"frequency_months": "3"},
    {"frequency_months": True}, {"excluded_members": "Bob"}, {"excluded_members": [1]},
    {"subject_template": None},
])
def test_settings_validation(patch_data_file, data):
    with pytest.raises(ValueError):
        update_settings(data)


def test_excluded_member_missing_and_stale_name_ignored(patch_data_file):
    update_settings({"excluded_members": ["Bob", "Someone Who Left"]})
    names = [r["name"] for r in render_recaps(2026, TODAY)]
    assert names == ["Alice"]
