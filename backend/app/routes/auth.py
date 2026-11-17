from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.database.mongodb import get_db
from app.middleware.auth_middleware import get_current_user
from app.schemas.schemas import LoginRequest, RegisterRequest
from app.utils.security import create_access_token, hash_password, serialize_doc, verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    db = get_db()
    if db.users.find_one({"email": payload.email.lower()}):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "name": payload.name.strip(),
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "phone": payload.phone,
        "city": payload.city,
        "is_active": True,
        "saved_cars": [],
        "created_at": now,
    }
    res = db.users.insert_one(user_doc)
    user_id = res.inserted_id

    if payload.role == "dealer":
        dp = payload.dealerProfile
        db.dealers.insert_one(
            {
                "user_id": user_id,
                "dealership_name": dp.dealership_name if dp else f"{payload.name} Motors",
                "brand_authorized": dp.brand_authorized if dp else "Multi-Brand",
                "city": dp.city if dp else payload.city,
                "address": dp.address if dp else payload.city,
                "gst_number": dp.gst_number if dp else "PENDING",
                "contact_phone": dp.contact_phone if dp else payload.phone,
                "approval_status": "Pending",
                "managed_car_ids": [],
                "created_at": now,
            }
        )

    token = create_access_token(str(user_id), payload.role)
    created = serialize_doc(db.users.find_one({"_id": user_id}))
    created.pop("password_hash", None)
    return {"access_token": token, "token_type": "bearer", "user": created}


@router.post("/login")
def login(payload: LoginRequest):
    db = get_db()
    user = db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is suspended.")

    token = create_access_token(str(user["_id"]), user["role"])
    out = serialize_doc(user)
    out.pop("password_hash", None)
    return {"access_token": token, "token_type": "bearer", "user": out}


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    db = get_db()
    out = serialize_doc(current_user)
    out.pop("password_hash", None)
    dealer = None
    if current_user.get("role") == "dealer":
        dealer = serialize_doc(db.dealers.find_one({"user_id": current_user["_id"]}))
    return {"user": out, "dealer": dealer}
