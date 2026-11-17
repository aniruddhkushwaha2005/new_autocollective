from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database.mongodb import get_db
from app.middleware.auth_middleware import get_current_user, require_roles
from app.schemas.schemas import BuyerRequestCreate
from app.services.matching_service import find_or_create_group_for_request
from app.utils.security import serialize_doc

router = APIRouter(prefix="/api/requests", tags=["Buyer Requests"])


@router.get("")
def my_requests(current_user: dict = Depends(get_current_user)):
    db = get_db()
    reqs = [serialize_doc(r) for r in db.buyer_requests.find({"user_id": current_user["_id"]}).sort("created_at", -1)]
    return {"requests": reqs}


@router.post("", status_code=201)
def create_request(payload: BuyerRequestCreate, current_user: dict = Depends(require_roles("buyer", "admin"))):
    db = get_db()
    dup = db.buyer_requests.find_one(
        {
            "user_id": current_user["_id"],
            "brand": {"$regex": f"^{payload.brand}$", "$options": "i"},
            "model": {"$regex": f"^{payload.model}$", "$options": "i"},
            "city": {"$regex": f"^{payload.city}$", "$options": "i"},
            "status": {"$in": ["Pending", "Matched", "Offer Received"]},
        }
    )
    if dup:
        raise HTTPException(status_code=409, detail="Duplicate active request for this model and city.")

    group_id, match_reason = find_or_create_group_for_request(db, payload.model_dump(), current_user["_id"])
    now = datetime.now(timezone.utc).isoformat()
    req_doc = {
        **payload.model_dump(),
        "user_id": current_user["_id"],
        "group_id": group_id,
        "status": "Matched",
        "match_reason": match_reason,
        "created_at": now,
    }
    res = db.buyer_requests.insert_one(req_doc)

    if not db.group_members.find_one({"group_id": group_id, "user_id": current_user["_id"]}):
        db.group_members.insert_one(
            {
                "group_id": group_id,
                "user_id": current_user["_id"],
                "request_id": res.inserted_id,
                "joined_at": now,
                "status": "Active",
            }
        )
        grp = db.groups.find_one({"_id": group_id})
        next_count = grp["current_members"] + 1
        next_status = "Ready for Negotiation" if next_count >= grp["target_members"] else grp["status"]
        db.groups.update_one({"_id": group_id}, {"$set": {"current_members": next_count, "status": next_status}})

    return {
        "request": serialize_doc(db.buyer_requests.find_one({"_id": res.inserted_id})),
        "matched_group": serialize_doc(db.groups.find_one({"_id": group_id})),
    }


@router.delete("/{request_id}")
def cancel_request(request_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    req_doc = db.buyer_requests.find_one({"_id": ObjectId(request_id)})
    if not req_doc:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req_doc["user_id"] != current_user["_id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized.")
    db.buyer_requests.update_one({"_id": ObjectId(request_id)}, {"$set": {"status": "Cancelled"}})
    return {"cancelled": True}
