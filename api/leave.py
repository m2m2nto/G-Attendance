import os
import subprocess
from datetime import date

from flask import Blueprint, jsonify, request
from services.excel_service import (
    get_leave, add_leave, update_leave, delete_leave,
    get_sick_leave_attachments, add_sick_leave_attachments,
    remove_sick_leave_attachment, set_sick_leave_sent, get_fiduciaire_reminder,
)

leave_bp = Blueprint("leave", __name__)


@leave_bp.route("/<leave_type>", methods=["GET"])
def list_leave(leave_type):
    if leave_type not in ("vacation", "sick_leave"):
        return jsonify({"error": "Invalid leave type"}), 400
    year = request.args.get("year", type=int)
    name = request.args.get("name")
    month = request.args.get("month", type=int)
    return jsonify(get_leave(leave_type, year=year, name=name, month=month))


@leave_bp.route("/<leave_type>", methods=["POST"])
def create_leave(leave_type):
    if leave_type not in ("vacation", "sick_leave"):
        return jsonify({"error": "Invalid leave type"}), 400
    data = request.get_json()
    try:
        entry = add_leave(
            leave_type,
            data["name"],
            data["year"],
            data["month"],
            data["days_count"],
            data.get("dates_detail", ""),
        )
        return jsonify(entry), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@leave_bp.route("/<leave_type>/<name>/<int:year>/<int:month>", methods=["PUT"])
def modify_leave(leave_type, name, year, month):
    if leave_type not in ("vacation", "sick_leave"):
        return jsonify({"error": "Invalid leave type"}), 400
    data = request.get_json()
    try:
        entry = update_leave(leave_type, name, year, month, data)
        return jsonify(entry)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@leave_bp.route("/<leave_type>/<name>/<int:year>/<int:month>", methods=["DELETE"])
def remove_leave(leave_type, name, year, month):
    if leave_type not in ("vacation", "sick_leave"):
        return jsonify({"error": "Invalid leave type"}), 400
    delete_leave(leave_type, name, year, month)
    return "", 204


# ---------------------------------------------------------------------------
# Sick leave documents — link-only attachments, any number per entry, each
# with its own "sent to fiduciaire" flag. The file path travels in the body.
# ---------------------------------------------------------------------------

_SICK_DOC_URL = "/sick_leave/<name>/<int:year>/<int:month>"


def _choose_files(prompt):
    """Native macOS file dialog (multi-select). Returns the chosen paths, [] if cancelled."""
    safe = prompt.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ").replace("\r", " ")
    script = (
        'set out to ""\n'
        f'repeat with f in (choose file with prompt "{safe}" with multiple selections allowed)\n'
        "set out to out & POSIX path of f & linefeed\n"
        "end repeat\n"
        "return out"
    )
    # osascript exits non-zero when the user cancels the dialog
    result = subprocess.run(["osascript", "-e", script], capture_output=True, text=True)
    if result.returncode != 0:
        return []
    return [line for line in result.stdout.splitlines() if line.strip()]


def _body_path():
    return (request.get_json(silent=True) or {}).get("path")


@leave_bp.route(f"{_SICK_DOC_URL}/attachment/select", methods=["POST"])
def select_sick_leave_attachments(name, year, month):
    """Open the native file dialog and link the chosen files (cancel -> nothing added)."""
    chosen = _choose_files(f"Select the sick leave documents for {name} ({month}/{year})")
    try:
        attachments = add_sick_leave_attachments(name, year, month, chosen)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    return jsonify({"added": [os.path.basename(p) for p in chosen], "attachments": attachments})


@leave_bp.route(f"{_SICK_DOC_URL}/attachment", methods=["DELETE"])
def unlink_sick_leave_attachment(name, year, month):
    """Unlink one file (never deletes it)."""
    return jsonify({"attachments": remove_sick_leave_attachment(name, year, month, _body_path())})


@leave_bp.route(f"{_SICK_DOC_URL}/attachment/open", methods=["POST"])
def open_sick_leave_attachment(name, year, month):
    """Open one linked file in the default app."""
    path = _body_path()
    if path not in [a["path"] for a in get_sick_leave_attachments(name, year, month)]:
        return jsonify({"error": "This file is not linked to this sick leave"}), 404
    if not os.path.exists(path):
        return jsonify({"error": f"Linked file no longer exists: {path}"}), 404
    subprocess.Popen(["open", path])
    return jsonify({"ok": True})


@leave_bp.route(f"{_SICK_DOC_URL}/fiduciaire", methods=["PUT"])
def mark_sick_leave_sent(name, year, month):
    """Set or clear the "sent to fiduciaire" flag of one linked file."""
    sent = bool((request.get_json(silent=True) or {}).get("sent"))
    try:
        return jsonify({"attachments": set_sick_leave_sent(name, year, month, _body_path(), sent)})
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@leave_bp.route("/sick_leave/fiduciaire-reminder", methods=["GET"])
def fiduciaire_reminder():
    """Sick leave entries of the current and previous month not yet sent to the fiduciaire."""
    return jsonify(get_fiduciaire_reminder(date.today()))
