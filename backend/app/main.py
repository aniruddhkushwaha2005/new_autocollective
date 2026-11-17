from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import get_settings
from app.database.mongodb import ensure_indexes
from app.routes import auth, cars, requests, groups
from app.routes.marketplace import dealers_router, offers_router, purchases_router, notifications_router
from app.routes.ml_admin import ml_router, admin_router

settings = get_settings()

app = FastAPI(
    title="AutoCollective API",
    description="AI-powered group car-buying platform for the Indian automobile market.",
    version="1.0.0",
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    try:
        ensure_indexes()
    except Exception as exc:
        print(f"MongoDB index initialization deferred: {exc}")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": settings.app_name}


app.include_router(auth.router)
app.include_router(cars.router)
app.include_router(requests.router)
app.include_router(groups.router)
app.include_router(dealers_router)
app.include_router(offers_router)
app.include_router(purchases_router)
app.include_router(notifications_router)
app.include_router(ml_router)
app.include_router(admin_router)
