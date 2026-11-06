from __future__ import annotations

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal, Optional


# ---- Auth ----
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


# ---- Product ----
class ProductBase(BaseModel):
    sku: str
    name: str
    category: Literal["Bags", "Watches"]
    brand: str
    quantity: int = 0
    price: float = 0
    image_tone: str = "camel"


class ProductCreate(ProductBase):
    pass


class Product(ProductBase):
    id: str
    status: Literal["In stock", "Low stock", "Out of stock"]
    last_verified_at: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


# ---- Movement ----
class MovementCreate(BaseModel):
    product_id: str
    movement_type: Literal["Stock in", "Stock out"]
    quantity: int = Field(ge=1)
    note: Optional[str] = None


class Movement(MovementCreate):
    id: str
    created_at: str


# ---- Scan ----
class ScanBase(BaseModel):
    name: str
    location: str
    expected_count: int
    detected_count: int
    discrepancy: int
    status: Literal["Matched", "Review", "Pending"]


class ScanCreate(ScanBase):
    pass


class Scan(ScanCreate):
    id: str
    created_at: str


# ---- Order ----
class OrderBase(BaseModel):
    order_number: str
    customer_name: str
    items_count: int = 1
    total: float = 0
    status: Literal["Processing", "Ready", "Completed", "Cancelled"] = "Processing"


class OrderCreate(OrderBase):
    pass


class Order(OrderBase):
    id: str
    created_at: str


# ---- Rating ----
class RatingBase(BaseModel):
    product_id: Optional[str] = None
    customer_name: str
    rating: int = 5
    review: str = ""


class RatingCreate(RatingBase):
    pass


class Rating(RatingBase):
    id: str
    created_at: str


# ---- Analytics ----
class Recommendation(BaseModel):
    product_id: str
    name: str
    brand: str
    category: str
    reason: str
    urgency: Literal["high", "medium", "low"]
    suggested_quantity: int


class TrendingProduct(BaseModel):
    product_id: str
    name: str
    brand: str
    category: str
    trend_score: float
    units_moved: int
    direction: Literal["rising", "stable", "declining"]


class ForecastPoint(BaseModel):
    label: str
    predicted_demand: int
    confidence: float


class DemandForecast(BaseModel):
    product_id: str
    name: str
    current_stock: int
    forecast: list[ForecastPoint]
    reorder_needed: bool
    weeks_until_stockout: Optional[int]


class WeeklyReport(BaseModel):
    week_label: str
    total_stock_in: int
    total_stock_out: int
    net_change: int
    inventory_value: float
    low_stock_count: int
    open_discrepancies: int
    top_moving: list[TrendingProduct]
    forecast_summary: list[DemandForecast]


# ---- Camera detection ----
class DetectionResult(BaseModel):
    detected_count: int
    expected_count: int
    discrepancy: int
    status: Literal["Matched", "Review", "Pending"]
    recognized: list[dict]
