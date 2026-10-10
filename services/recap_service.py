"""Recap email — per-member Italian summary of vacation and sick leave.

Templates and recap state live in app_settings.json; workbook data is read
only through excel_service. Nothing here writes to attendance.xlsx.
"""

import calendar
from datetime import date

from services.excel_service import (
    compute_balance, get_config, get_leave, _get_summary_members,
    _load_settings, _save_settings,
)

MONTHS_IT = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
]

PLACEHOLDERS = [
    "nome", "anno", "data_oggi", "residuo_anno_precedente", "scadenza_residuo",
    "maturate_anno", "totale_disponibile", "ferie_godute", "ferie_residue",
    "dettaglio_ferie", "giorni_malattia", "dettaglio_malattia", "mittente",
]

DEFAULT_SUBJECT = "Riepilogo ferie e malattia {anno} – {nome}"

DEFAULT_BODY = """Ciao {nome},

ti invio il riepilogo delle tue ferie e dei giorni di malattia dal 1° gennaio {anno} al {data_oggi}.

FERIE
- Residuo dall'anno precedente: {residuo_anno_precedente} giorni (da utilizzare entro il {scadenza_residuo})
- Ferie maturate nel {anno}: {maturate_anno} giorni
- Totale disponibile: {totale_disponibile} giorni
- Ferie godute: {ferie_godute} giorni
- Ferie residue: {ferie_residue} giorni

{dettaglio_ferie}

MALATTIA
- Giorni di malattia: {giorni_malattia}
{dettaglio_malattia}

Per qualsiasi domanda resto a disposizione.

Un saluto,
{mittente}
"""

DEFAULT_FREQUENCY_MONTHS = 3

# API field -> app_settings.json key
_SETTING_KEYS = {
    "subject_template": "recap_subject_template",
    "body_template": "recap_body_template",
    "frequency_months": "recap_frequency_months",
    "excluded_members": "recap_excluded_members",
}


def format_it(value):
    """Italian number: comma decimals, no trailing ".0" (2.5 -> "2,5", 26.0 -> "26")."""
    value = round(float(value), 2)
    if value == int(value):
        return str(int(value))
    return str(value).replace(".", ",")


def _format_date(d):
    return d.strftime("%d/%m/%Y")


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

def get_settings():
    settings = _load_settings()
    return {
        "subject_template": settings.get("recap_subject_template", DEFAULT_SUBJECT),
        "body_template": settings.get("recap_body_template", DEFAULT_BODY),
        "frequency_months": int(settings.get("recap_frequency_months", DEFAULT_FREQUENCY_MONTHS)),
        "excluded_members": settings.get("recap_excluded_members", []),
        "placeholders": PLACEHOLDERS,
        "defaults": {"subject": DEFAULT_SUBJECT, "body": DEFAULT_BODY},
    }


def _validate(field, value):
    if field in ("subject_template", "body_template"):
        if not isinstance(value, str):
            raise ValueError(f"{field} must be a string")
    elif field == "frequency_months":
        if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 12:
            raise ValueError("frequency_months must be an integer between 1 and 12")
    elif field == "excluded_members":
        if not isinstance(value, list) or not all(isinstance(n, str) for n in value):
            raise ValueError("excluded_members must be a list of names")


def update_settings(data):
    """Partial update; unknown fields are ignored. Raises ValueError on bad input."""
    updates = {f: v for f, v in data.items() if f in _SETTING_KEYS}
    for field, value in updates.items():
        _validate(field, value)
    settings = _load_settings()
    for field, value in updates.items():
        settings[_SETTING_KEYS[field]] = value
    _save_settings(settings)
    return get_settings()


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

class _KeepUnknown(dict):
    def __missing__(self, key):
        return "{" + key + "}"


def _render(template, values):
    """Return (text, ok). Unknown placeholders stay as-is; a malformed template is returned raw."""
    try:
        return template.format_map(_KeepUnknown(values)), True
    except (ValueError, IndexError, AttributeError, KeyError):
        return template, False


def _detail_lines(entries, empty_text):
    if not entries:
        return empty_text
    lines = []
    for e in sorted(entries, key=lambda e: e["month"]):
        unit = "giorno" if e["days_count"] == 1 else "giorni"
        line = f"- {MONTHS_IT[e['month'] - 1]}: {format_it(e['days_count'])} {unit}"
        if e["dates_detail"]:
            line += f" ({e['dates_detail']})"
        lines.append(line)
    return "\n".join(lines)


def _carryover_deadline(year):
    month = int(get_config().get("carryover_deadline_month", 3))
    return _format_date(date(year, month, calendar.monthrange(year, month)[1]))


def render_recaps(year, today):
    """One recap per member of the year's Summary sheet, minus excluded members."""
    settings = get_settings()
    excluded = set(settings["excluded_members"])
    sender = _load_settings().get("current_user") or ""
    vacation = get_leave("vacation", year=year)
    sick = get_leave("sick_leave", year=year)
    deadline = _carryover_deadline(year)

    recaps = []
    for name in _get_summary_members(year):
        if name in excluded:
            continue
        b = compute_balance(name, year)
        own_vacation = [e for e in vacation if e["name"] == name]
        own_sick = [e for e in sick if e["name"] == name]
        sick_days = sum(e["days_count"] for e in own_sick)
        values = {
            "nome": name,
            "anno": year,
            "data_oggi": _format_date(today),
            "residuo_anno_precedente": format_it(b["carried_over"]),
            "scadenza_residuo": deadline,
            "maturate_anno": format_it(b["entitlement"]),
            "totale_disponibile": format_it(b["total"]),
            "ferie_godute": format_it(b["used"]),
            "ferie_residue": format_it(b["remaining"]),
            "dettaglio_ferie": _detail_lines(own_vacation, "Nessun giorno di ferie registrato."),
            "giorni_malattia": format_it(sick_days),
            "dettaglio_malattia": _detail_lines(own_sick, "Nessun giorno di malattia registrato."),
            "mittente": sender,
        }
        subject, subject_ok = _render(settings["subject_template"], values)
        body, body_ok = _render(settings["body_template"], values)
        recaps.append({
            "name": name,
            "subject": subject,
            "body": body,
            "template_error": not (subject_ok and body_ok),
            "data": {
                "carried_over": b["carried_over"],
                "entitlement": b["entitlement"],
                "total": b["total"],
                "used": b["used"],
                "remaining": b["remaining"],
                "sick_days": sick_days,
            },
        })
    return recaps


# ---------------------------------------------------------------------------
# Reminder schedule — rolling: due N months after the last "Mark as sent"
# ---------------------------------------------------------------------------

def add_months(d, months):
    """Same day N months later, clamped to the month's end (30 Nov + 3 -> 28/29 Feb)."""
    index = d.month - 1 + months
    year, month = d.year + index // 12, index % 12 + 1
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


def get_status(today):
    """Never sent counts as due now."""
    settings = get_settings()
    last_sent = _load_settings().get("recap_last_sent")
    if not last_sent:
        return {"last_sent": None, "frequency_months": settings["frequency_months"],
                "next_due": None, "is_due": True}
    next_due = add_months(date.fromisoformat(last_sent), settings["frequency_months"])
    return {
        "last_sent": last_sent,
        "frequency_months": settings["frequency_months"],
        "next_due": next_due.isoformat(),
        "is_due": today >= next_due,
    }


def mark_sent(today):
    settings = _load_settings()
    settings["recap_last_sent"] = today.isoformat()
    _save_settings(settings)
    return get_status(today)
