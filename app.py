import os
import sys
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from api.team import team_bp
from api.leave import leave_bp
from api.holidays import holidays_bp
from api.balances import balances_bp
from api.config import config_bp


def _resolve_frontend_dist():
    """Resolve path to frontend/dist, handling PyInstaller frozen mode.

    In frozen mode, the executable is at <app>/Contents/Resources/backend/app
    and frontend/dist is at <app>/Contents/Resources/frontend/dist/.
    """
    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(sys.executable)   # .../Resources/backend
        resources_dir = os.path.dirname(exe_dir)      # .../Resources
        return os.path.join(resources_dir, "frontend", "dist")
    return os.path.join(os.path.dirname(__file__), "frontend", "dist")


_DIST_DIR = _resolve_frontend_dist()
app = Flask(__name__, static_folder=_DIST_DIR, static_url_path="")
CORS(app)


@app.errorhandler(IOError)
def handle_file_locked(e):
    return jsonify({"error": str(e)}), 409

# Register API blueprints
app.register_blueprint(team_bp, url_prefix="/api/team")
app.register_blueprint(leave_bp, url_prefix="/api/leave")
app.register_blueprint(holidays_bp, url_prefix="/api/holidays")
app.register_blueprint(balances_bp, url_prefix="/api/balances")
app.register_blueprint(config_bp, url_prefix="/api/config")


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path and os.path.exists(os.path.join(_DIST_DIR, path)):
        return send_from_directory(_DIST_DIR, path)
    return send_from_directory(_DIST_DIR, "index.html")


if __name__ == "__main__":
    import sys
    is_frozen = getattr(sys, "frozen", False)
    port = int(os.environ.get("FLASK_PORT", 5001))
    app.run(debug=not is_frozen, port=port)
