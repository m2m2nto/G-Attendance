from flask import Blueprint, jsonify, request
from services.excel_service import get_holidays, add_holiday, update_holiday, delete_holiday

holidays_bp = Blueprint("holidays", __name__)


@holidays_bp.route("", methods=["GET"])
def list_holidays():
    year = request.args.get("year", type=int)
    return jsonify(get_holidays(year=year))


@holidays_bp.route("", methods=["POST"])
def create_holiday():
    data = request.get_json()
    holiday = add_holiday(data["date"], data["name"], data["year"])
    return jsonify(holiday), 201


@holidays_bp.route("/<date>/<int:year>", methods=["PUT"])
def modify_holiday(date, year):
    data = request.get_json()
    try:
        holiday = update_holiday(date, year, data)
        return jsonify(holiday)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@holidays_bp.route("/<date>/<int:year>", methods=["DELETE"])
def remove_holiday(date, year):
    delete_holiday(date, year)
    return "", 204
