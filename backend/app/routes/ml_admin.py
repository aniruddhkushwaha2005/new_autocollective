from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database.mongodb import get_db
from app.middleware.auth_middleware import require_roles
from app.ml.price_prediction.predict import predict_car_price
from app.ml.price_prediction.train import train_price_model
from app.ml.demand_prediction.predict import forecast_demand
from app.ml.demand_prediction.train import train_demand_model
from app.ml.offer_analysis.analyzer import analyze_offers
from app.schemas.schemas import OfferAnalysisInput, PricePredictionInput
from app.utils.security import serialize_doc

ml_router = APIRouter(prefix="/api/ml", tags=["AI & ML"])
admin_router = APIRouter(prefix="/api/admin", tags=["Admin"])


@ml_router.post("/price-prediction")
def run_price_prediction(payload: PricePredictionInput):
    return predict_car_price(payload.model_dump())


@ml_router.get("/demand-prediction")
def run_demand_prediction(city: str = "All", model: str = "All", horizonMonths: int = 4):
    return forecast_demand(city=city, model=model, horizon_months=horizonMonths)


@ml_router.post("/offer-analysis")
def run_offer_analysis(payload: OfferAnalysisInput):
    db = get_db()
    if payload.offers:
        offers = payload.offers
    elif payload.group_id:
        offers = [serialize_doc(o) for o in db.dealer_offers.find({"group_id": ObjectId(payload.group_id)})]
    else:
        offers = [serialize_doc(o) for o in db.dealer_offers.find({"status": {"$ne": "Withdrawn"}})]
    return analyze_offers(offers)


@ml_router.post("/retrain")
def retrain_models(_admin: dict = Depends(require_roles("admin"))):
    price_meta = train_price_model()
    demand_meta = train_demand_model()
    return {"message": "Models retrained", "priceModel": price_meta, "demandModel": demand_meta}


@admin_router.get("/overview")
def admin_overview(_admin: dict = Depends(require_roles("admin"))):
    db = get_db()
    return {
        "metrics": {
            "totalUsers": db.users.count_documents({}),
            "totalBuyers": db.users.count_documents({"role": "buyer"}),
            "totalDealers": db.dealers.count_documents({}),
            "pendingDealers": db.dealers.count_documents({"approval_status": "Pending"}),
            "activeGroups": db.groups.count_documents({"status": {"$nin": ["Deal Completed", "Expired"]}}),
            "completedGroups": db.groups.count_documents({"status": "Deal Completed"}),
            "totalRequests": db.buyer_requests.count_documents({}),
            "totalOffers": db.dealer_offers.count_documents({}),
            "totalPurchases": db.purchases.count_documents({}),
        },
        "dealers": [serialize_doc(d) for d in db.dealers.find()],
        "groups": [serialize_doc(g) for g in db.groups.find()],
    }


@admin_router.patch("/dealers/{dealer_id}")
def approve_dealer(dealer_id: str, body: dict, _admin: dict = Depends(require_roles("admin"))):
    status = body.get("approval_status")
    if status not in ("Pending", "Approved", "Rejected"):
        raise HTTPException(status_code=400, detail="Invalid approval status.")
    db = get_db()
    db.dealers.update_one({"_id": ObjectId(dealer_id)}, {"$set": {"approval_status": status}})
    return {"dealer": serialize_doc(db.dealers.find_one({"_id": ObjectId(dealer_id)}))}
