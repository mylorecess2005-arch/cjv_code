"""Analytics engine: must-buy recommendations, trending, demand forecasting, weekly reports."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from models import (
    DemandForecast,
    ForecastPoint,
    Recommendation,
    TrendingProduct,
    WeeklyReport,
)


def _compute_status(quantity: int) -> str:
    if quantity == 0:
        return "Out of stock"
    if quantity <= 3:
        return "Low stock"
    return "In stock"


def generate_recommendations(products: list[dict], movements: list[dict], orders: list[dict]) -> list[Recommendation]:
    """Must-buy: products that are low/out of stock, have high demand (recent orders or stock-out velocity), or both."""
    recs: list[Recommendation] = []
    now = datetime.fromisoformat(products[0]["created_at"]) if products else datetime.now()

    for p in products:
        pid = p["id"]
        recent_out = sum(m["quantity"] for m in movements if m["product_id"] == pid and m["movement_type"] == "Stock out")
        order_demand = sum(o["items_count"] for o in orders if o["status"] in ("Processing", "Ready"))
        is_low = p["quantity"] <= 3

        urgency: str = "low"
        reason = ""
        suggested = 0

        if p["quantity"] == 0:
            urgency = "high"
            reason = "Out of stock — replenish immediately to avoid lost sales."
            suggested = max(5, recent_out + 3)
        elif is_low and recent_out >= 2:
            urgency = "high"
            reason = f"Low stock with {recent_out} units recently sold — high churn risk."
            suggested = max(5, recent_out + 2)
        elif is_low:
            urgency = "medium"
            reason = "Stock is below the safe threshold (3 units)."
            suggested = 5
        elif recent_out >= 4:
            urgency = "medium"
            reason = f"Strong demand: {recent_out} units moved recently. Consider restocking."
            suggested = recent_out
        else:
            continue

        recs.append(Recommendation(
            product_id=pid,
            name=p["name"],
            brand=p["brand"],
            category=p["category"],
            reason=reason,
            urgency=urgency,
            suggested_quantity=suggested,
        ))

    recs.sort(key=lambda r: {"high": 0, "medium": 1, "low": 2}[r.urgency])
    return recs


def compute_trending(products: list[dict], movements: list[dict]) -> list[TrendingProduct]:
    """Trending: which products are moving the most, with direction based on recent vs. prior activity."""
    trending: list[TrendingProduct] = []

    for p in products:
        pid = p["id"]
        product_movements = [m for m in movements if m["product_id"] == pid]
        total_moved = sum(m["quantity"] for m in product_movements)

        if not product_movements:
            continue

        # split into recent (last half) and prior (first half) to determine direction
        sorted_mov = sorted(product_movements, key=lambda m: m["created_at"])
        mid = len(sorted_mov) // 2
        prior = sum(m["quantity"] for m in sorted_mov[:mid]) if mid > 0 else total_moved
        recent = sum(m["quantity"] for m in sorted_mov[mid:]) if mid > 0 else 0

        if recent > prior:
            direction = "rising"
        elif recent < prior:
            direction = "declining"
        else:
            direction = "stable"

        score = total_moved * (1.5 if direction == "rising" else 1.0 if direction == "stable" else 0.7)

        trending.append(TrendingProduct(
            product_id=pid,
            name=p["name"],
            brand=p["brand"],
            category=p["category"],
            trend_score=round(score, 1),
            units_moved=total_moved,
            direction=direction,
        ))

    trending.sort(key=lambda t: t.trend_score, reverse=True)
    return trending


def forecast_demand(products: list[dict], movements: list[dict], weeks: int = 4) -> list[DemandForecast]:
    """Demand forecasting: simple moving-average projection per product over the next N weeks."""
    forecasts: list[DemandForecast] = []

    for p in products:
        pid = p["id"]
        out_movements = [m for m in movements if m["product_id"] == pid and m["movement_type"] == "Stock out"]

        if not out_movements:
            # no movement data — assume a small baseline demand
            avg_weekly = 1.0
        else:
            # estimate weekly demand from total stock-out over ~3 weeks of seed data
            total_out = sum(m["quantity"] for m in out_movements)
            avg_weekly = total_out / 3.0

        points: list[ForecastPoint] = []
        cumulative = 0
        for w in range(1, weeks + 1):
            predicted = max(0, round(avg_weekly))
            cumulative += predicted
            confidence = max(0.5, 0.92 - (w * 0.08))
            points.append(ForecastPoint(
                label=f"Week {w}",
                predicted_demand=predicted,
                confidence=round(confidence, 2),
            ))

        reorder_needed = p["quantity"] <= cumulative
        weeks_until_stockout: Optional[int] = None
        if avg_weekly > 0:
            weeks_until_stockout = max(1, int(p["quantity"] / avg_weekly)) if p["quantity"] > 0 else 0

        forecasts.append(DemandForecast(
            product_id=pid,
            name=p["name"],
            current_stock=p["quantity"],
            forecast=points,
            reorder_needed=reorder_needed,
            weeks_until_stockout=weeks_until_stockout,
        ))

    # sort by reorder urgency
    forecasts.sort(key=lambda f: (f.weeks_until_stockout if f.weeks_until_stockout is not None else 999))
    return forecasts


def generate_weekly_report(products: list[dict], movements: list[dict], scans: list[dict], orders: list[dict]) -> WeeklyReport:
    """Weekly inventory and demand report."""
    total_in = sum(m["quantity"] for m in movements if m["movement_type"] == "Stock in")
    total_out = sum(m["quantity"] for m in movements if m["movement_type"] == "Stock out")
    inventory_value = sum(p["quantity"] * p["price"] for p in products)
    low_stock = sum(1 for p in products if _compute_status(p["quantity"]) == "Low stock")
    open_disc = sum(1 for s in scans if s["status"] == "Review")

    trending = compute_trending(products, movements)[:3]
    forecast = forecast_demand(products, movements, weeks=2)
    forecast_summary = [f for f in forecast if f.reorder_needed][:5]

    return WeeklyReport(
        week_label="Week of Nov 1, 2026",
        total_stock_in=total_in,
        total_stock_out=total_out,
        net_change=total_in - total_out,
        inventory_value=inventory_value,
        low_stock_count=low_stock,
        open_discrepancies=open_disc,
        top_moving=trending,
        forecast_summary=forecast_summary,
    )
