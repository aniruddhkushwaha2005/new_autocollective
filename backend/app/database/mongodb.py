from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.database import Database
from app.config.settings import get_settings

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    return _client


def get_db() -> Database:
    settings = get_settings()
    return get_client()[settings.mongodb_db_name]


def ensure_indexes() -> None:
    db = get_db()
    db.users.create_index([("email", ASCENDING)], unique=True)
    db.cars.create_index([("brand", ASCENDING), ("model", ASCENDING)])
    db.groups.create_index([("group_code", ASCENDING)], unique=True)
    db.groups.create_index([("city", ASCENDING), ("status", ASCENDING)])
    db.group_members.create_index([("group_id", ASCENDING), ("user_id", ASCENDING)], unique=True)
    db.dealers.create_index([("user_id", ASCENDING)], unique=True)
    db.buyer_requests.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.dealer_offers.create_index([("group_id", ASCENDING), ("final_on_road_price", ASCENDING)])
    db.notifications.create_index([("user_id", ASCENDING), ("is_read", ASCENDING)])
