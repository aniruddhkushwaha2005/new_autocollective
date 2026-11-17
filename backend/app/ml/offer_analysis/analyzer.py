import statistics
from app.ml.offer_analysis.scoring import score_single_offer


def analyze_offers(offers: list[dict]) -> dict:
    if not offers:
        return {"analyzedOffers": [], "summary": None}

    prices = [float(o.get("final_on_road_price", 0)) for o in offers]
    discounts = [
        float(o.get("group_discount", 0))
        + float(o.get("exchange_bonus", 0))
        + float(o.get("corporate_offer", 0))
        for o in offers
    ]
    mean_p = statistics.mean(prices)
    std_p = statistics.pstdev(prices) if len(prices) > 1 else 0.0
    min_p, max_p = min(prices), max(prices)
    max_d = max(discounts)

    scored = [score_single_offer(o, mean_p, std_p, min_p, max_p, max_d) for o in offers]
    scored.sort(key=lambda x: x["offerScore"], reverse=True)

    best = scored[0]
    lowest = min(scored, key=lambda x: x["final_on_road_price"])
    highest_disc = max(scored, key=lambda x: x["totalDiscount"])

    return {
        "analyzedOffers": scored,
        "summary": {
            "totalQuotesAnalyzed": len(scored),
            "bestValueDealer": best.get("dealer_name"),
            "bestValueScore": best["offerScore"],
            "lowestOnRoadPrice": lowest["final_on_road_price"],
            "lowestPriceDealer": lowest.get("dealer_name"),
            "highestDiscount": highest_disc["totalDiscount"],
            "highestDiscountDealer": highest_disc.get("dealer_name"),
        },
    }
