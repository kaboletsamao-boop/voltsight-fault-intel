"""VoltSight - Flask REST API Backend
Energy Grid Monitoring System - Telemetry & Alert Management
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timezone
import uuid
import random

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]}})

# ---------------------------------------------------------------------------
# In-memory data store
# ---------------------------------------------------------------------------

transformers = [
    {
        "id": "t-001",
        "name": "Substation A - Main",
        "location": {"lat": 51.5074, "lng": -0.1278},
        "status": "normal",
        "voltage": 132.0,
        "current": 450,
        "temperature": 42,
        "acoustic_signature": [0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.7, 0.2],
        "last_checked": datetime.now(timezone.utc).isoformat(),
        "health_score": 92,
    },
    {
        "id": "t-002",
        "name": "Substation B - East",
        "location": {"lat": 51.5154, "lng": -0.0858},
        "status": "normal",
        "voltage": 66.0,
        "current": 320,
        "temperature": 38,
        "acoustic_signature": [0.6, 0.7, 0.4, 0.5, 0.8, 0.3, 0.6, 0.5],
        "last_checked": datetime.now(timezone.utc).isoformat(),
        "health_score": 88,
    },
    {
        "id": "t-003",
        "name": "Substation C - West",
        "location": {"lat": 51.4998, "lng": -0.1657},
        "status": "warning",
        "voltage": 33.0,
        "current": 280,
        "temperature": 58,
        "acoustic_signature": [0.7, 0.9, 0.6, 0.8, 0.5, 0.7, 0.9, 0.6],
        "last_checked": datetime.now(timezone.utc).isoformat(),
        "health_score": 65,
    },
    {
        "id": "t-004",
        "name": "Substation D - Industrial",
        "location": {"lat": 51.5238, "lng": -0.1325},
        "status": "normal",
        "voltage": 132.0,
        "current": 510,
        "temperature": 45,
        "acoustic_signature": [0.4, 0.6, 0.5, 0.7, 0.6, 0.5, 0.4, 0.3],
        "last_checked": datetime.now(timezone.utc).isoformat(),
        "health_score": 85,
    },
]

cables = [
    {
        "id": "c-001",
        "name": "Feeder Line A-B",
        "location": {"lat": 51.5114, "lng": -0.1068},
        "status": "normal",
        "vibration": 0.12,
        "tilt": 0.5,
        "current_in": 430,
        "current_out": 428,
        "current_differential": 2,
        "last_checked": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "c-002",
        "name": "Feeder Line B-C",
        "location": {"lat": 51.5076, "lng": -0.1258},
        "status": "normal",
        "vibration": 0.08,
        "tilt": 0.3,
        "current_in": 300,
        "current_out": 298,
        "current_differential": 2,
        "last_checked": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "c-003",
        "name": "Feeder Line A-D",
        "location": {"lat": 51.5156, "lng": -0.1301},
        "status": "alert",
        "vibration": 0.45,
        "tilt": 2.8,
        "current_in": 490,
        "current_out": 412,
        "current_differential": 78,
        "last_checked": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "c-004",
        "name": "Feeder Line D-C",
        "location": {"lat": 51.5118, "lng": -0.1491},
        "status": "normal",
        "vibration": 0.09,
        "tilt": 0.4,
        "current_in": 260,
        "current_out": 258,
        "current_differential": 2,
        "last_checked": datetime.now(timezone.utc).isoformat(),
    },
    {
        "id": "c-005",
        "name": "Feeder Line A-C",
        "location": {"lat": 51.5036, "lng": -0.1468},
        "status": "normal",
        "vibration": 0.11,
        "tilt": 0.6,
        "current_in": 350,
        "current_out": 347,
        "current_differential": 3,
        "last_checked": datetime.now(timezone.utc).isoformat(),
    },
]

alerts = [
    {
        "id": "a-001",
        "type": "Cable",
        "severity": "High",
        "message": "Current differential detected on Feeder Line A-D - possible theft",
        "location": "Feeder Line A-D",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "resolved": False,
    },
    {
        "id": "a-002",
        "type": "Transformer",
        "severity": "Medium",
        "message": "Elevated temperature on Substation C - West (58C)",
        "location": "Substation C - West",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "resolved": False,
    },
    {
        "id": "a-003",
        "type": "Cable",
        "severity": "Low",
        "message": "Minor vibration anomaly on Feeder Line A-B",
        "location": "Feeder Line A-B",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "resolved": True,
    },
]


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _check_thresholds(t_data: dict, device_type: str) -> list:
    """Auto-generate alerts for out-of-bounds telemetry values."""
    new_alerts = []
    if device_type == "Transformer":
        if t_data.get("temperature", 0) > 80:
            new_alerts.append({
                "id": str(uuid.uuid4()),
                "type": "Transformer",
                "severity": "High",
                "message": f"Critical temperature on {t_data.get('name', 'Unknown')} ({t_data['temperature']}C)",
                "location": t_data.get("name", "Unknown"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "resolved": False,
            })
        if t_data.get("voltage", 120) < 108 or t_data.get("voltage", 120) > 132:
            deviation = abs(t_data.get("voltage", 120) - 120) / 120 * 100
            if deviation > 10:
                new_alerts.append({
                    "id": str(uuid.uuid4()),
                    "type": "Transformer",
                    "severity": "High",
                    "message": f"Voltage deviation on {t_data.get('name', 'Unknown')} ({t_data['voltage']}kV, {deviation:.0f}% out)",
                    "location": t_data.get("name", "Unknown"),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "resolved": False,
                })
    elif device_type == "Cable":
        if t_data.get("vibration", 0) > 0.8:
            new_alerts.append({
                "id": str(uuid.uuid4()),
                "type": "Cable",
                "severity": "High",
                "message": f"Critical vibration on {t_data.get('name', 'Unknown')} ({t_data['vibration']}g)",
                "location": t_data.get("name", "Unknown"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "resolved": False,
            })
        if t_data.get("tilt", 0) > 5.0:
            new_alerts.append({
                "id": str(uuid.uuid4()),
                "type": "Cable",
                "severity": "High",
                "message": f"Critical tilt on {t_data.get('name', 'Unknown')} ({t_data['tilt']}deg)",
                "location": t_data.get("name", "Unknown"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "resolved": False,
            })
        diff = t_data.get("current_differential", 0)
        if diff > 5.0:
            new_alerts.append({
                "id": str(uuid.uuid4()),
                "type": "Cable",
                "severity": "High" if diff > 20 else "Medium",
                "message": f"Current differential on {t_data.get('name', 'Unknown')} ({diff}A) - possible theft",
                "location": t_data.get("name", "Unknown"),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "resolved": False,
            })
    return new_alerts


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()})


@app.route("/api/transformers", methods=["GET"])
def get_transformers():
    """GET /api/transformers - Return all transformers."""
    return jsonify({"data": transformers, "count": len(transformers)})


@app.route("/api/cables", methods=["GET"])
def get_cables():
    """GET /api/cables - Return all cables."""
    return jsonify({"data": cables, "count": len(cables)})


@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    """GET /api/alerts - Return all alerts."""
    return jsonify({"data": alerts, "count": len(alerts)})


@app.route("/api/transformer/data", methods=["POST"])
def post_transformer_data():
    """POST /api/transformer/data - Push telemetry for a transformer."""
    data = request.get_json(silent=True)
    if not data or "id" not in data:
        return jsonify({"error": "Missing required field: id"}), 400

    device_id = data["id"]
    existing = next((t for t in transformers if t["id"] == device_id), None)
    if not existing:
        return jsonify({"error": f"Transformer {device_id} not found"}), 404

    # Update allowed fields
    if "temperature" in data:
        existing["temperature"] = float(data["temperature"])
    if "voltage" in data:
        existing["voltage"] = float(data["voltage"])
    if "current" in data:
        existing["current"] = float(data["current"])
    if "health_score" in data:
        existing["health_score"] = float(data["health_score"])
    if "acoustic_signature" in data:
        existing["acoustic_signature"] = data["acoustic_signature"]

    # Recalculate status
    if existing["temperature"] > 65:
        existing["status"] = "alert"
    elif existing["temperature"] > 50:
        existing["status"] = "warning"
    else:
        existing["status"] = "normal"

    existing["last_checked"] = datetime.now(timezone.utc).isoformat()

    # Threshold checks
    new_alerts = _check_thresholds(existing, "Transformer")
    for alert in new_alerts:
        if not any(a["message"] == alert["message"] for a in alerts):
            alerts.insert(0, alert)

    return jsonify({"status": "ok", "transformer": existing, "new_alerts": len(new_alerts)}), 200


@app.route("/api/cable/data", methods=["POST"])
def post_cable_data():
    """POST /api/cable/data - Push telemetry for a cable."""
    data = request.get_json(silent=True)
    if not data or "id" not in data:
        return jsonify({"error": "Missing required field: id"}), 400

    device_id = data["id"]
    existing = next((c for c in cables if c["id"] == device_id), None)
    if not existing:
        return jsonify({"error": f"Cable {device_id} not found"}), 404

    # Update allowed fields
    if "vibration" in data:
        existing["vibration"] = float(data["vibration"])
    if "tilt" in data:
        existing["tilt"] = float(data["tilt"])
    if "current_in" in data:
        existing["current_in"] = float(data["current_in"])
    if "current_out" in data:
        existing["current_out"] = float(data["current_out"])
    if "current_differential" in data:
        existing["current_differential"] = float(data["current_differential"])
    else:
        existing["current_differential"] = existing["current_in"] - existing["current_out"]

    # Recalculate status
    diff = existing["current_differential"]
    if diff > 50:
        existing["status"] = "alert"
    elif diff > 20:
        existing["status"] = "warning"
    else:
        existing["status"] = "normal"

    existing["last_checked"] = datetime.now(timezone.utc).isoformat()

    # Threshold checks
    new_alerts = _check_thresholds(existing, "Cable")
    for alert in new_alerts:
        if not any(a["message"] == alert["message"] for a in alerts):
            alerts.insert(0, alert)

    return jsonify({"status": "ok", "cable": existing, "new_alerts": len(new_alerts)}), 200


@app.route("/api/alerts/resolve", methods=["POST"])
def resolve_alerts():
    """POST /api/alerts/resolve - Resolve one or all alerts.
    Body: {"id": "a-001"} for single, or {"all": true} for all.
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body required"}), 400

    if data.get("all"):
        resolved = 0
        for alert in alerts:
            if not alert["resolved"]:
                alert["resolved"] = True
                resolved += 1
        return jsonify({"status": "ok", "resolved": resolved}), 200

    alert_id = data.get("id")
    if not alert_id:
        return jsonify({"error": "Missing required field: id or all: true"}), 400

    existing = next((a for a in alerts if a["id"] == alert_id), None)
    if not existing:
        return jsonify({"error": f"Alert {alert_id} not found"}), 404

    existing["resolved"] = True
    return jsonify({"status": "ok", "alert": existing}), 200


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("VoltSight Flask API running on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)