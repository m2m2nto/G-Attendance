from flask import Blueprint, jsonify, request
from services.excel_service import get_team, add_team_member, update_team_member, delete_team_member

team_bp = Blueprint("team", __name__)


@team_bp.route("", methods=["GET"])
def list_team():
    return jsonify(get_team())


@team_bp.route("", methods=["POST"])
def create_member():
    data = request.get_json()
    try:
        member = add_team_member(data["name"], data.get("start_year"))
        return jsonify(member), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@team_bp.route("/<name>", methods=["PUT"])
def update_member(name):
    data = request.get_json()
    try:
        member = update_team_member(name, data)
        return jsonify(member)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404


@team_bp.route("/<name>", methods=["DELETE"])
def remove_member(name):
    delete_team_member(name)
    return "", 204
