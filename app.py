import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from api.team import team_bp
from api.leave import leave_bp
from api.holidays import holidays_bp
from api.balances import balances_bp
from api.config import config_bp

app = Flask(__name__, static_folder="frontend/dist", static_url_path="")
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
    dist_dir = os.path.join(app.root_path, "frontend", "dist")
    if path and os.path.exists(os.path.join(dist_dir, path)):
        return send_from_directory(dist_dir, path)
    return send_from_directory(dist_dir, "index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5001)
