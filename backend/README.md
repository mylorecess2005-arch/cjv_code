# CJV Luxury Inventory — FastAPI Backend

## Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

Interactive API docs: `http://localhost:8000/docs`

## Connecting the frontend

Set this environment variable in the project root `.env`:

```
VITE_API_URL=http://localhost:8000
```

When `VITE_API_URL` is set, the frontend calls this API.
When it is not set, the frontend uses a built-in localStorage mock so you can preview the UI without a server.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user |
| GET | `/api/products` | List all products |
| POST | `/api/products` | Create a product |
| GET | `/api/movements` | List stock movements |
| POST | `/api/movements` | Record a stock movement |
| GET | `/api/scans` | List camera scans |
| POST | `/api/scans` | Create a scan record |
| POST | `/api/detection/scan` | Run camera detection |
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create an order |
| GET | `/api/ratings` | List ratings |
| POST | `/api/ratings` | Create a rating |
| GET | `/api/analytics/recommendations` | Must-buy recommendations |
| GET | `/api/analytics/trending` | Trending product analysis |
| GET | `/api/analytics/forecast` | Demand forecasting (query: `?weeks=4`) |
| GET | `/api/analytics/weekly-report` | Weekly inventory & demand report |

## Demo credentials

- Username: `admin` / Password: `admin123`
- Username: `jordan` / Password: `cjv2026`

## Features

- **Camera-Based Bag Detection**: simulated YOLO-style detection endpoint (`/api/detection/scan`) that recognizes bags/watches and compares against inventory records
- **Automated Real-Time Stock IN / Stock OUT**: movements API auto-updates product quantities and status
- **Inventory Management & Notifications**: products, categories, low-stock alerts, CSV exports
- **Must-Buy Product Recommendations**: analytics engine flags low-stock + high-demand items
- **Trending Product Analysis**: movement velocity with rising/stable/declining direction
- **Demand Forecasting**: moving-average weekly demand projection with stockout estimates
- **Weekly Inventory & Demand Reports**: consolidated report endpoint
