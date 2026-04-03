from flask import Blueprint, jsonify, request
from services.excel_service import get_leave, add_leave, update_leave, delete_leave

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
