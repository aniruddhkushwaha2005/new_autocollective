from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database.mongodb import get_db
from app.middleware.auth_middleware import get_current_user, require_roles
from app.utils.security import serialize_doc

router = APIRouter(prefix="/api/groups", tags=["Buyer Groups"])


@router.get("")
def list_groups(city: str = "", brand: str = "", status: str = ""):
    db = get_db()
    query: dict = {}
    if city and city != "All":
        query["city"] = city
    if brand and brand != "All":
        query["brand"] = brand
    if status and status != "All":
        query["status"] = status
    groups = [serialize_doc(g) for g in db.groups.find(query).sort("created_at", -1)]
    return {"groups": groups}


@router.get("/{group_id}")
def get_group(group_id: str):
    db = get_db()
    grp = db.groups.find_one({"_id": ObjectId(group_id)})
    if not grp:
        raise HTTPException(status_code=404, detail="Group not found.")
    members = [serialize_doc(m) for m in db.group_members.find({"group_id": grp["_id"]})]
    offers = [serialize_doc(o) for o in db.dealer_offers.find({"group_id": grp["_id"], "status": {"$ne": "Withdrawn"}})]
    return {"group": serialize_doc(grp), "members": members, "offers": offers}


@router.post("/{group_id}/join")
def join_group(group_id: str, current_user: dict = Depends(require_roles("buyer", "admin"))):
    db = get_db()
    grp = db.groups.find_one({"_id": ObjectId(group_id)})
    if not grp:
        raise HTTPException(status_code=404, detail="Group not found.")
    if grp["status"] in ("Deal Completed", "Expired") or grp["current_members"] >= grp["target_members"]:
        raise HTTPException(status_code=400, detail="Group cannot accept additional members.")
    if db.group_members.find_one({"group_id": grp["_id"], "user_id": current_user["_id"]}):
        raise HTTPException(status_code=409, detail="Already a member of this group.")

    db.group_members.insert_one(
        {
            "group_id": grp["_id"],
            "user_id": current_user["_id"],
            "joined_at": datetime.now(timezone.utc).isoformat(),
            "status": "Active",
        }
    )
    next_count = grp["current_members"] + 1
    next_status = "Ready for Negotiation" if next_count >= grp["target_members"] else grp["status"]
    db.groups.update_one({"_id": grp["_id"]}, {"$set": {"current_members": next_count, "status": next_status}})
    return {"group": serialize_doc(db.groups.find_one({"_id": grp["_id"]}))}


@router.post("/{group_id}/leave")
def leave_group(group_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    grp = db.groups.find_one({"_id": ObjectId(group_id)})
    if not grp:
        raise HTTPException(status_code=404, detail="Group not found.")
    res = db.group_members.delete_one({"group_id": grp["_id"], "user_id": current_user["_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Not a member of this group.")
    next_count = max(0, grp["current_members"] - 1)
    db.groups.update_one({"_id": grp["_id"]}, {"$set": {"current_members": next_count}})
    return {"left": True, "current_members": next_count}
