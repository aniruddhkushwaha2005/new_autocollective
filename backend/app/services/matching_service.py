from datetime import datetime, timezone
import random
from bson import ObjectId
from pymongo.database import Database


def find_or_create_group_for_request(db: Database, req_data: dict, user_id: ObjectId) -> tuple[ObjectId, str]:
    """
    Deterministic rule-based buyer group matching service.
    Matches on brand, model, city, fuel_type, compatible transmission/variant, and +-15% budget band.
    """
    candidates = list(
        db.groups.find(
            {
                "brand": {"$regex": f"^{req_data['brand']}$", "$options": "i"},
                "model": {"$regex": f"^{req_data['model']}$", "$options": "i"},
                "city": {"$regex": f"^{req_data['city']}$", "$options": "i"},
                "status": {"$in": ["Collecting Buyers", "Ready for Negotiation"]},
                "$expr": {"$lt": ["$current_members", "$target_members"]},
            }
        )
    )

    budget = float(req_data["preferred_budget"])
    best_group = None
    best_score = -1
    best_reason = ""

    for grp in candidates:
        if grp["fuel_type"].lower() != req_data["fuel_type"].lower():
            continue
        if not (grp["min_budget"] * 0.85 <= budget <= grp["max_budget"] * 1.15):
            continue

        score = 0
        reasons = ["Brand", "Model", "City", "Fuel Type", "Budget Band"]
        if grp["transmission"].lower() == req_data["transmission"].lower():
            score += 2
            reasons.append("Transmission")
        if grp["variant"].lower() == req_data["variant"].lower():
            score += 3
            reasons.append("Exact Variant")

        if score > best_score:
            best_score = score
            best_group = grp
            best_reason = f"Rule-Based Match: {' · '.join(reasons)}"

    if best_group is not None:
        return best_group["_id"], best_reason

    city_code = req_data["city"][:3].upper()
    model_code = "".join(ch for ch in req_data["model"] if ch.isalnum())[:5].upper()
    group_code = f"AC-{city_code}-{model_code}-{random.randint(10, 99)}"

    car_doc = db.cars.find_one(
        {
            "brand": {"$regex": f"^{req_data['brand']}$", "$options": "i"},
            "model": {"$regex": f"^{req_data['model']}$", "$options": "i"},
        }
    )

    new_group = {
        "group_code": group_code,
        "car_id": car_doc["_id"] if car_doc else None,
        "brand": req_data["brand"],
        "model": req_data["model"],
        "variant": req_data["variant"],
        "fuel_type": req_data["fuel_type"],
        "transmission": req_data["transmission"],
        "city": req_data["city"],
        "target_members": 5,
        "current_members": 0,
        "min_budget": round(budget * 0.9),
        "max_budget": round(budget * 1.1),
        "timeline": req_data.get("timeline", "Within 30 Days"),
        "status": "Collecting Buyers",
        "negotiation_notes": f"Created automatically for {req_data['city']} buyer collective.",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = db.groups.insert_one(new_group)
    return res.inserted_id, "Rule-Based Match: Initiated new regional buyer collective."
