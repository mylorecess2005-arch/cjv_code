"""Simulated camera-based bag/watch detection.

In production this would call a YOLOv8 or ResNet model (e.g. running on a Raspberry Pi
with a Coral TPU). Here we simulate detection by comparing the live camera frame
against the inventory record and introducing a small realistic variance.
"""

import random
from typing import Literal


def run_detection(expected_count: int, products: list[dict]) -> dict:
    """Simulate a detection pass and return results."""
    # Simulate a small variance: sometimes detect 1-2 fewer items (missed detection)
    variance = random.choices([0, -1, -2, 1], weights=[55, 25, 12, 8])[0]
    detected = max(0, expected_count + variance)
    discrepancy = detected - expected_count

    status: Literal["Matched", "Review", "Pending"] = "Matched" if discrepancy == 0 else "Review"

    # Build a "recognized" list by sampling from products
    recognized = []
    remaining = detected
    for p in products:
        if remaining <= 0:
            break
        count = min(remaining, max(1, p["quantity"]))
        recognized.append({
            "product_id": p["id"],
            "name": p["name"],
            "brand": p["brand"],
            "detected": count,
        })
        remaining -= count

    return {
        "detected_count": detected,
        "expected_count": expected_count,
        "discrepancy": discrepancy,
        "status": status,
        "recognized": recognized,
    }
