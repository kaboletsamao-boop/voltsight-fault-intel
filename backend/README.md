# VoltSight Flask Backend

Energy Grid Monitoring REST API built with Python Flask.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
python app.py
```

Server starts on `http://localhost:5000`. CORS enabled for `localhost:3000` and `localhost:5173`.

## Endpoints

| Method | Path                    | Description                                  |
|--------|-------------------------|----------------------------------------------|
| GET    | `/api/health`           | Health check                                 |
| GET    | `/api/transformers`     | List all transformers                        |
| GET    | `/api/cables`           | List all cables                              |
| GET    | `/api/alerts`           | List all alerts                              |
| POST   | `/api/transformer/data` | Push transformer telemetry + auto-alert      |
| POST   | `/api/cable/data`       | Push cable telemetry + auto-alert            |
| POST   | `/api/alerts/resolve`   | Resolve single alert (`{"id":"..."}`) or all (`{"all":true}`) |

### POST /api/transformer/data

```json
{
  "id": "t-001",
  "temperature": 72,
  "voltage": 130.0,
  "current": 480,
  "health_score": 75,
  "acoustic_signature": [0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.7, 0.2]
}
```

### POST /api/cable/data

```json
{
  "id": "c-001",
  "vibration": 0.15,
  "tilt": 0.6,
  "current_in": 440,
  "current_out": 420,
  "current_differential": 20
}
```

## Auto-Alert Thresholds

- **Transformer**: Temp > 80C, or Voltage deviation > 10% from 120V
- **Cable**: Vibration > 0.8g, Tilt > 5.0deg, Current Differential > 5.0A