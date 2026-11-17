from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database.mongodb import get_db
from app.middleware.auth_middleware import require_roles
from app.schemas.schemas import DealerOfferCreate, PurchaseCreate
from app.utils.security import serialize_doc

dealers_router = APIRouter(prefix="/api/dealers", tags=["Dealers"])
offers_router = APIRouter(prefix="/api/offers", tags=["Offers"])
purchases_router = APIRouter(prefix="/api/purchases", tags=["Purchases"])
notifications_router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@dealers_router.get("/me")
def get_my_dealer_profile(current_user: dict = Depends(require_roles("dealer"))):
    db = get_db()
    dealer = db.dealers.find_one({"user_id": current_user["_id"]})
    if not dealer:
        raise HTTPException(status_code=404, detail="Dealer profile not found.")
    offers = [serialize_doc(o) for o in db.dealer_offers.find({"dealer_id": dealer["_id"]})]
    groups = [serialize_doc(g) for g in db.groups.find({"status": {"$nin": ["Deal Completed", "Expired"]}})]
    return {"dealer": serialize_doc(dealer), "myOffers": offers, "interestedGroups": groups}


@offers_router.get("")
def list_offers(group_id: str = ""):
    db = get_db()
    query: dict = {"status": {"$ne": "Withdrawn"}}
    if group_id:
        query["group_id"] = ObjectId(group_id)
    offers = [serialize_doc(o) for o in db.dealer_offers.find(query).sort("final_on_road_price", 1)]
    return {"offers": offers}


@offers_router.post("", status_code=201)
def create_offer(payload: DealerOfferCreate, current_user: dict = Depends(require_roles("dealer"))):
    db = get_db()
    dealer = db.dealers.find_one({"user_id": current_user["_id"]})
    if not dealer or dealer.get("approval_status") != "Approved":
        raise HTTPException(status_code=403, detail="Dealer account must be approved by Admin before quoting.")

    grp = db.groups.find_one({"_id": ObjectId(payload.group_id)})
    if not grp:
        raise HTTPException(status_code=404, detail="Buyer group not found.")

    final_price = max(
        0.0,
        payload.ex_showroom_price
        + payload.insurance_charges
        + payload.registration_charges
        + payload.accessories_cost
        + payload.extended_warranty
        + payload.additional_charges
        - (payload.group_discount + payload.exchange_bonus + payload.corporate_offer),
    )

    doc = {
        **payload.model_dump(),
        "group_id": grp["_id"],
        "dealer_id": dealer["_id"],
        "dealer_name": dealer["dealership_name"],
        "brand": grp["brand"],
        "model": grp["model"],
        "variant": grp["variant"],
        "city": grp["city"],
        "final_on_road_price": final_price,
        "is_sample": False,
        "status": "Active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = db.dealer_offers.insert_one(doc)
    return {"offer": serialize_doc(db.dealer_offers.find_one({"_id": res.inserted_id}))}


@purchases_router.post("", status_code=201)
def create_purchase_interest(payload: PurchaseCreate, current_user: dict = Depends(require_roles("buyer", "admin"))):
    db = get_db()
    offer = db.dealer_offers.find_one({"_id": ObjectId(payload.offer_id)})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found.")

    doc = {
        "user_id": current_user["_id"],
        "group_id": offer["group_id"],
        "offer_id": offer["_id"],
        "dealer_id": offer["dealer_id"],
        "brand": offer["brand"],
        "model": offer["model"],
        "variant": offer["variant"],
        "city": offer["city"],
        "agreed_price": offer["final_on_road_price"],
        "booking_amount": payload.booking_amount,
        "status": "Interest Expressed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = db.purchases.insert_one(doc)
    return {"purchase": serialize_doc(db.purchases.find_one({"_id": res.inserted_id}))}


@notifications_router.get("")
def list_notifications(current_user: dict = Depends(require_roles("buyer", "dealer", "admin"))):
    db = get_db()
    items = [serialize_doc(n) for n in db.notifications.find({"user_id": current_user["_id"]}).sort("created_at", -1)]
    return {"notifications": items}
