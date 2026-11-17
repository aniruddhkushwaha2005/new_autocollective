from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List


class DealerRegistrationInfo(BaseModel):
    dealership_name: str
    brand_authorized: str = "Multi-Brand"
    city: str
    address: str = ""
    gst_number: str
    contact_phone: str = ""


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6)
    role: str = Field(default="buyer", pattern="^(buyer|dealer)$")
    phone: str = ""
    city: str = "Bengaluru"
    dealerProfile: Optional[DealerRegistrationInfo] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class BuyerRequestCreate(BaseModel):
    car_id: Optional[str] = None
    brand: str
    model: str
    variant: str
    fuel_type: str
    transmission: str
    city: str
    preferred_budget: float = Field(gt=100000)
    timeline: str = "Within 30 Days"
    quantity: int = Field(default=1, ge=1, le=5)
    additional_requirements: str = ""


class DealerOfferCreate(BaseModel):
    group_id: str
    ex_showroom_price: float = Field(gt=0)
    insurance_charges: float = Field(ge=0)
    registration_charges: float = Field(ge=0)
    accessories_cost: float = Field(default=0, ge=0)
    extended_warranty: float = Field(default=0, ge=0)
    group_discount: float = Field(default=0, ge=0)
    exchange_bonus: float = Field(default=0, ge=0)
    corporate_offer: float = Field(default=0, ge=0)
    additional_charges: float = Field(default=0, ge=0)
    delivery_timeline: str = "21 Days"
    validity_date: str = "2026-12-31"
    notes: str = ""


class PricePredictionInput(BaseModel):
    brand: str
    model: str
    variant: str = ""
    year: int = Field(default=2026, ge=2015, le=2027)
    fuelType: str = "Petrol"
    transmission: str = "AT"
    mileageKmpl: float = Field(default=18.0, gt=5)
    kmDriven: int = Field(default=0, ge=0)
    city: str = "Bengaluru"
    exShowroomLakh: Optional[float] = None
    dealerQuotationLakh: Optional[float] = None


class OfferAnalysisInput(BaseModel):
    group_id: Optional[str] = None
    offers: Optional[List[dict]] = None


class PurchaseCreate(BaseModel):
    offer_id: str
    booking_amount: float = Field(default=25000, ge=0)
