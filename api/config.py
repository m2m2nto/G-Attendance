import os
from flask import Blueprint, jsonify, request
from services.excel_service import get_config, update_config, get_data_file, set_data_file

config_bp = Blueprint("config", __name__)


@config_bp.route("", methods=["GET"])
def read_config():
    return jsonify(get_config())


@config_bp.route("", methods=["PUT"])
def write_config():
    data = request.get_json()
    result = {}
    for key, value in data.items():
        result = update_config(key, str(value))
    return jsonify(result)


@config_bp.route("/file", methods=["GET"])
def read_file_path():
    return jsonify({"path": get_data_file()})


@config_bp.route("/file", methods=["PUT"])
def write_file_path():
    data = request.get_json()
    path = data.get("path", "")
    try:
        result = set_data_file(path)
        return jsonify({"path": result})
    except (ValueError, FileNotFoundError, IOError) as e:
        return jsonify({"error": str(e)}), 400


@config_bp.route("/browse", methods=["GET"])
def browse_filesystem():
    """List directories and Excel files in a given path for the file browser."""
    path = request.args.get("path", os.path.expanduser("~"))
    if not os.path.isdir(path):
        path = os.path.dirname(path)
    if not os.path.isdir(path):
        path = os.path.expanduser("~")

    items = []
    try:
        for entry in sorted(os.scandir(path), key=lambda e: (not e.is_dir(), e.name.lower())):
            if entry.name.startswith(".") or entry.name.startswith("~$"):
                continue
            if entry.is_dir():
                items.append({"name": entry.name, "path": entry.path, "type": "dir"})
            elif entry.name.lower().endswith((".xlsx", ".xlsm")):
                items.append({"name": entry.name, "path": entry.path, "type": "file"})
    except PermissionError:
        pass

    parent = os.path.dirname(path)
    return jsonify({"current": path, "parent": parent if parent != path else None, "items": items})
