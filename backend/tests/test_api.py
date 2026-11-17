from fastapi.testclient import TestClient
from app.main import app
from app.ml.offer_analysis.analyzer import analyze_offers

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_offer_analysis_scoring():
    sample_offers = [
        {
            "id": "1",
            "dealer_name": "Transparent Motors",
            "ex_showroom_price": 1800000,
            "insurance_charges": 68000,
            "registration_charges": 320000,
            "accessories_cost": 15000,
            "extended_warranty": 20000,
            "group_discount": 70000,
            "exchange_bonus": 20000,
            "corporate_offer": 15000,
            "additional_charges": 0,
            "final_on_road_price": 2118000,
        },
        {
            "id": "2",
            "dealer_name": "Bundled Motors",
            "ex_showroom_price": 1800000,
            "insurance_charges": 115000,
            "registration_charges": 320000,
            "accessories_cost": 70000,
            "extended_warranty": 20000,
            "group_discount": 40000,
            "exchange_bonus": 10000,
            "corporate_offer": 0,
            "additional_charges": 22000,
            "final_on_road_price": 2297000,
        },
    ]
    result = analyze_offers(sample_offers)
    assert result["summary"]["bestValueDealer"] == "Transparent Motors"
    assert result["analyzedOffers"][0]["offerScore"] > result["analyzedOffers"][1]["offerScore"]
