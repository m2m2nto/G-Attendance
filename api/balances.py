from flask import Blueprint, jsonify, request
from services.excel_service import get_balances, set_balance, compute_balance, _get_summary_members

balances_bp = Blueprint("balances", __name__)


@balances_bp.route("", methods=["GET"])
def list_balances():
    year = request.args.get("year", type=int)
    name = request.args.get("name")
    return jsonify(get_balances(year=year, name=name))


@balances_bp.route("/compute", methods=["GET"])
def compute():
    year = request.args.get("year", type=int)
    name = request.args.get("name")
    if name and year:
        return jsonify(compute_balance(name, year))
    # Compute for all members listed in that year's Summary sheet
    members = _get_summary_members(year)
    results = []
    for member_name in members:
        results.append(compute_balance(member_name, year))
    return jsonify(results)


@balances_bp.route("", methods=["POST"])
def upsert_balance():
    data = request.get_json()
    balance = set_balance(
        data["name"],
        data["year"],
        data.get("carried_over", 0),
        data.get("accrued", 0),
        data.get("used", 0),
        data.get("remaining", 0),
    )
    return jsonify(balance), 201
