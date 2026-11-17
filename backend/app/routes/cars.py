from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database.mongodb import get_db
from app.middleware.auth_middleware import require_roles
from app.utils.security import serialize_doc

router = APIRouter(prefix="/api/cars", tags=["Cars"])


@router.get("")
def list_cars(brand: str = "", fuel_type: str = "", city: str = "", search: str = ""):
    db = get_db()
    query: dict = {}
    if brand and brand != "All":
        query["brand"] = brand
    if fuel_type and fuel_type != "All":
        query["fuel_type"] = fuel_type
    if city and city != "All":
        query["available_cities"] = city
    if search:
        query["$or"] = [
            {"brand": {"$regex": search, "$options": "i"}},
            {"model": {"$regex": search, "$options": "i"}},
            {"variant": {"$regex": search, "$options": "i"}},
        ]
    cars = [serialize_doc(c) for c in db.cars.find(query)]
    return {"cars": cars, "total": len(cars)}


@router.post("", status_code=201)
def create_car(body: dict, _admin: dict = Depends(require_roles("admin"))):
    db = get_db()
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    res = db.cars.insert_one(body)
    return {"car": serialize_doc(db.cars.find_one({"_id": res.inserted_id}))}


@router.delete("/{car_id}")
def delete_car(car_id: str, _admin: dict = Depends(require_roles("admin"))):
    db = get_db()
    res = db.cars.delete_one({"_id": ObjectId(car_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Car not found.")
    return {"deleted": True}
