from datetime import date

from flask import Blueprint, jsonify, request
from services.recap_service import get_settings, get_status, mark_sent, render_recaps, update_settings

recap_bp = Blueprint("recap", __name__)


@recap_bp.route("", methods=["GET"])
def list_recaps():
    today = date.today()
    year = request.args.get("year", default=today.year, type=int)
    return jsonify(render_recaps(year, today))


@recap_bp.route("/settings", methods=["GET"])
def read_settings():
    return jsonify(get_settings())


@recap_bp.route("/settings", methods=["PUT"])
def write_settings():
    data = request.get_json() or {}
    try:
        return jsonify(update_settings(data))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@recap_bp.route("/status", methods=["GET"])
def status():
    return jsonify(get_status(date.today()))


@recap_bp.route("/sent", methods=["POST"])
def sent():
    return jsonify(mark_sent(date.today()))
