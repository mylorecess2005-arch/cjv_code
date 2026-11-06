"""CJV Luxury Inventory — FastAPI backend.

Run locally:
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

The frontend talks to this API when VITE_API_URL is set (e.g. http://localhost:8000).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from models import (
    LoginRequest, TokenResponse,
    ProductCreate, Product,
    MovementCreate, Movement,
    ScanCreate, Scan,
    OrderCreate, Order,
    RatingCreate, Rating,
    Recommendation, TrendingProduct, DemandForecast, WeeklyReport,
    DetectionResult,
)
from auth import create_access_token, decode_access_token, verify_password, get_password_hash
from seed import SEED_PRODUCTS, SEED_USERS, seed_movements, seed_scans, seed_orders, seed_ratings
from analytics import (
    generate_recommendations, compute_trending, forecast_demand, generate_weekly_report,
    _compute_status,
)
from detection import run_detection

app = FastAPI(title="CJV Luxury Inventory API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

# ---- In-memory store ----
_db: dict[str, list[dict]] = {
    "products": [],
    "movements": [],
    "scans": [],
    "orders": [],
    "ratings": [],
}
_users_db: dict[str, dict] = {}


def _init_db():
    """Seed the in-memory store on startup."""
    if _db["products"]:
        return

    now = datetime.now().isoformat()
    product_ids = []
    for p in SEED_PRODUCTS:
        pid = str(uuid.uuid4())
        product_ids.append(pid)
        _db["products"].append({
            "id": pid,
            **p,
            "status": _compute_status(p["quantity"]),
            "last_verified_at": now,
            "created_at": now,
        })

    _db["movements"] = seed_movements(product_ids)
    _db["scans"] = seed_scans()
    _db["orders"] = seed_orders()
    _db["ratings"] = seed_ratings()

    for username, info in SEED_USERS.items():
        _users_db[username] = {
            "username": username,
            "password": info["password"],
            "role": info["role"],
        }


@app.on_event("startup")
def _startup():
    _init_db()


# ---- Auth dependency ----
def require_auth(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return payload


# ---- Auth routes ----
@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: LoginRequest):
    user = _users_db.get(req.username)
    if not user or not verify_password(req.password, get_password_hash(user["password"])):
        # simple check since seed uses plain passwords
        if not user or user["password"] != req.password:
            raise HTTPException(status_code=401, detail="Username or password is incorrect")
    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return TokenResponse(access_token=token, username=user["username"], role=user["role"])


@app.get("/api/auth/me")
def me(payload: dict = Depends(require_auth)):
    return {"username": payload.get("sub"), "role": payload.get("role")}


# ---- Product routes ----
@app.get("/api/products", response_model=list[Product])
def list_products():
    return _db["products"]


@app.post("/api/products", response_model=Product)
def create_product(req: ProductCreate, payload: dict = Depends(require_auth)):
    pid = str(uuid.uuid4())
    now = datetime.now().isoformat()
    product = {
        "id": pid,
        **req.model_dump(),
        "status": _compute_status(req.quantity),
        "last_verified_at": now,
        "created_at": now,
    }
    _db["products"].append(product)
    return product


# ---- Movement routes ----
@app.get("/api/movements", response_model=list[Movement])
def list_movements(limit: int = 50):
    return sorted(_db["movements"], key=lambda m: m["created_at"], reverse=True)[:limit]


@app.post("/api/movements", response_model=Movement)
def create_movement(req: MovementCreate, payload: dict = Depends(require_auth)):
    product = next((p for p in _db["products"] if p["id"] == req.product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if req.movement_type == "Stock out" and req.quantity > product["quantity"]:
        raise HTTPException(status_code=400, detail="Insufficient stock for this movement")

    next_qty = product["quantity"] + req.quantity if req.movement_type == "Stock in" else product["quantity"] - req.quantity
    product["quantity"] = next_qty
    product["status"] = _compute_status(next_qty)
    product["last_verified_at"] = datetime.now().isoformat()

    movement = {
        "id": str(uuid.uuid4()),
        **req.model_dump(),
        "created_at": datetime.now().isoformat(),
    }
    _db["movements"].append(movement)
    return movement


# ---- Scan routes ----
@app.get("/api/scans", response_model=list[Scan])
def list_scans(limit: int = 20):
    return sorted(_db["scans"], key=lambda s: s["created_at"], reverse=True)[:limit]


@app.post("/api/scans", response_model=Scan)
def create_scan(req: ScanCreate, payload: dict = Depends(require_auth)):
    scan = {
        "id": str(uuid.uuid4()),
        **req.model_dump(),
        "created_at": datetime.now().isoformat(),
    }
    _db["scans"].append(scan)
    return scan


# ---- Camera detection ----
@app.post("/api/detection/scan", response_model=DetectionResult)
def run_camera_scan(payload: dict = Depends(require_auth)):
    expected = sum(p["quantity"] for p in _db["products"])
    result = run_detection(expected, _db["products"])
    # auto-save scan
    scan = {
        "id": str(uuid.uuid4()),
        "name": "Camera detection scan",
        "location": "Live camera",
        **result,
        "created_at": datetime.now().isoformat(),
    }
    _db["scans"].append(scan)
    return result


# ---- Order routes ----
@app.get("/api/orders", response_model=list[Order])
def list_orders(limit: int = 50):
    return sorted(_db["orders"], key=lambda o: o["created_at"], reverse=True)[:limit]


@app.post("/api/orders", response_model=Order)
def create_order(req: OrderCreate, payload: dict = Depends(require_auth)):
    order = {
        "id": str(uuid.uuid4()),
        **req.model_dump(),
        "created_at": datetime.now().isoformat(),
    }
    _db["orders"].append(order)
    return order


# ---- Rating routes ----
@app.get("/api/ratings", response_model=list[Rating])
def list_ratings(limit: int = 50):
    return sorted(_db["ratings"], key=lambda r: r["created_at"], reverse=True)[:limit]


@app.post("/api/ratings", response_model=Rating)
def create_rating(req: RatingCreate, payload: dict = Depends(require_auth)):
    rating = {
        "id": str(uuid.uuid4()),
        **req.model_dump(),
        "created_at": datetime.now().isoformat(),
    }
    _db["ratings"].append(rating)
    return rating


# ---- Analytics routes ----
@app.get("/api/analytics/recommendations", response_model=list[Recommendation])
def recommendations():
    return generate_recommendations(_db["products"], _db["movements"], _db["orders"])


@app.get("/api/analytics/trending", response_model=list[TrendingProduct])
def trending():
    return compute_trending(_db["products"], _db["movements"])


@app.get("/api/analytics/forecast", response_model=list[DemandForecast])
def forecast(weeks: int = 4):
    return forecast_demand(_db["products"], _db["movements"], weeks)


@app.get("/api/analytics/weekly-report", response_model=WeeklyReport)
def weekly_report():
    return generate_weekly_report(_db["products"], _db["movements"], _db["scans"], _db["orders"])


@app.get("/api/health")
def health():
    return {"status": "ok", "products": len(_db["products"]), "movements": len(_db["movements"])}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
