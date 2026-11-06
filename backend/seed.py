"""In-memory seed data for the CJV Luxury inventory workspace."""

import uuid
from datetime import datetime, timedelta

SEED_PRODUCTS = [
    {"sku": "CJVB-001", "name": "Classic Flap Medium", "category": "Bags", "brand": "Chanel", "quantity": 12, "price": 8800, "image_tone": "coral"},
    {"sku": "CJVB-002", "name": "Birkin 25 Togo", "category": "Bags", "brand": "Hermès", "quantity": 4, "price": 14500, "image_tone": "camel"},
    {"sku": "CJVB-003", "name": "GG Marmont Small", "category": "Bags", "brand": "Gucci", "quantity": 8, "price": 2300, "image_tone": "olive"},
    {"sku": "CJVB-004", "name": "Lady Dior Small", "category": "Bags", "brand": "Dior", "quantity": 3, "price": 5200, "image_tone": "camel"},
    {"sku": "CJVB-005", "name": "Neverfull MM", "category": "Bags", "brand": "Louis Vuitton", "quantity": 15, "price": 2100, "image_tone": "olive"},
    {"sku": "CJVB-006", "name": "Galleria Saffiano", "category": "Bags", "brand": "Prada", "quantity": 0, "price": 3200, "image_tone": "black"},
    {"sku": "CJWV-001", "name": "Datejust 36", "category": "Watches", "brand": "Rolex", "quantity": 6, "price": 10800, "image_tone": "gold"},
    {"sku": "CJWV-002", "name": "Santos Medium", "category": "Watches", "brand": "Cartier", "quantity": 2, "price": 7400, "image_tone": "steel"},
    {"sku": "CJWV-003", "name": "Royal Oak 37mm", "category": "Watches", "brand": "Audemars Piguet", "quantity": 0, "price": 19600, "image_tone": "steel"},
    {"sku": "CJWV-004", "name": "Tank Solo", "category": "Watches", "brand": "Cartier", "quantity": 9, "price": 3800, "image_tone": "gold"},
]

SEED_USERS = {
    "admin": {"password": "admin123", "role": "manager"},
    "jordan": {"password": "cjv2026", "role": "manager"},
}

_BASE = datetime(2026, 11, 1, 9, 30, 0)


def _iso(days_ago: int, hour: int = 10) -> str:
    return (_BASE - timedelta(days=days_ago)).replace(hour=hour).isoformat()


def seed_movements(product_ids: list[str]) -> list[dict]:
    return [
        {"id": str(uuid.uuid4()), "product_id": product_ids[0], "movement_type": "Stock in", "quantity": 5, "note": "New delivery from Chanel", "created_at": _iso(1, 9)},
        {"id": str(uuid.uuid4()), "product_id": product_ids[1], "movement_type": "Stock out", "quantity": 2, "note": "VIP client sale", "created_at": _iso(2, 14)},
        {"id": str(uuid.uuid4()), "product_id": product_ids[4], "movement_type": "Stock in", "quantity": 10, "note": "Restock", "created_at": _iso(3, 11)},
        {"id": str(uuid.uuid4()), "product_id": product_ids[6], "movement_type": "Stock out", "quantity": 3, "note": "Boutique order", "created_at": _iso(4, 16)},
        {"id": str(uuid.uuid4()), "product_id": product_ids[2], "movement_type": "Stock in", "quantity": 4, "note": "Seasonal delivery", "created_at": _iso(6, 10)},
        {"id": str(uuid.uuid4()), "product_id": product_ids[7], "movement_type": "Stock out", "quantity": 1, "note": "Showroom display", "created_at": _iso(8, 13)},
        {"id": str(uuid.uuid4()), "product_id": product_ids[3], "movement_type": "Stock in", "quantity": 3, "note": "New collection", "created_at": _iso(10, 9)},
        {"id": str(uuid.uuid4()), "product_id": product_ids[1], "movement_type": "Stock in", "quantity": 6, "note": "Hermès allocation", "created_at": _iso(12, 12)},
        {"id": str(uuid.uuid4()), "product_id": product_ids[5], "movement_type": "Stock out", "quantity": 5, "note": "Online orders fulfilled", "created_at": _iso(14, 15)},
        {"id": str(uuid.uuid4()), "product_id": product_ids[0], "movement_type": "Stock out", "quantity": 4, "note": "Holiday sales", "created_at": _iso(16, 11)},
        {"id": str(uuid.uuid4()), "product_id": product_ids[9], "movement_type": "Stock out", "quantity": 2, "note": "Anniversary gift", "created_at": _iso(18, 14)},
        {"id": str(uuid.uuid4()), "product_id": product_ids[4], "movement_type": "Stock out", "quantity": 3, "note": "Client pickup", "created_at": _iso(20, 10)},
    ]


def seed_scans() -> list[dict]:
    return [
        {"id": str(uuid.uuid4()), "name": "Showroom shelf check", "location": "Main showroom", "expected_count": 52, "detected_count": 51, "discrepancy": -1, "status": "Review", "created_at": _iso(1, 16)},
        {"id": str(uuid.uuid4()), "name": "Vitrine audit", "location": "Front vitrine", "expected_count": 52, "detected_count": 52, "discrepancy": 0, "status": "Matched", "created_at": _iso(5, 11)},
        {"id": str(uuid.uuid4()), "name": "Backroom scan", "location": "Storage room A", "expected_count": 52, "detected_count": 50, "discrepancy": -2, "status": "Review", "created_at": _iso(9, 9)},
    ]


def seed_orders() -> list[dict]:
    return [
        {"id": str(uuid.uuid4()), "order_number": "CJV-0001", "customer_name": "Amelia Hart", "items_count": 1, "total": 8800, "status": "Completed", "created_at": _iso(2, 14)},
        {"id": str(uuid.uuid4()), "order_number": "CJV-0002", "customer_name": "Marcus Lee", "items_count": 2, "total": 16800, "status": "Ready", "created_at": _iso(4, 11)},
        {"id": str(uuid.uuid4()), "order_number": "CJV-0003", "customer_name": "Sofia Reyes", "items_count": 1, "total": 14500, "status": "Processing", "created_at": _iso(5, 16)},
        {"id": str(uuid.uuid4()), "order_number": "CJV-0004", "customer_name": "James Chen", "items_count": 1, "total": 2300, "status": "Completed", "created_at": _iso(7, 10)},
        {"id": str(uuid.uuid4()), "order_number": "CJV-0005", "customer_name": "Iris Wang", "items_count": 3, "total": 14900, "status": "Processing", "created_at": _iso(9, 13)},
        {"id": str(uuid.uuid4()), "order_number": "CJV-0006", "customer_name": "David Kim", "items_count": 1, "total": 10800, "status": "Ready", "created_at": _iso(11, 15)},
    ]


def seed_ratings() -> list[dict]:
    return [
        {"id": str(uuid.uuid4()), "product_id": None, "customer_name": "Amelia Hart", "rating": 5, "review": "Exceptional service and a beautiful showroom experience.", "created_at": _iso(2, 15)},
        {"id": str(uuid.uuid4()), "product_id": None, "customer_name": "Marcus Lee", "rating": 4, "review": "Great selection, would love more watch brands.", "created_at": _iso(4, 12)},
        {"id": str(uuid.uuid4()), "product_id": None, "customer_name": "Sofia Reyes", "rating": 5, "review": "The Birkin arrived in perfect condition. Highly recommend.", "created_at": _iso(6, 10)},
    ]
