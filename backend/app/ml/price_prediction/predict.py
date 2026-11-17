from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd

MODEL_DIR = Path(__file__).resolve().parent / "model"
PIPELINE_PATH = MODEL_DIR / "price_pipeline.joblib"
RF_PATH = MODEL_DIR / "rf_pipeline.joblib"
META_PATH = MODEL_DIR / "price_metadata.json"


def predict_car_price(payload: dict) -> dict:
    if not PIPELINE_PATH.exists() or not META_PATH.exists():
        return {
            "modelReady": False,
            "message": "Price prediction model is not trained yet. Run python -m app.ml.price_prediction.train first.",
        }

    pipe = joblib.load(PIPELINE_PATH)
    rf_pipe = joblib.load(RF_PATH)
    meta = json.loads(META_PATH.read_text())

    row = pd.DataFrame(
        [
            {
                "brand": payload["brand"],
                "model": payload["model"],
                "fuel_type": payload.get("fuelType", "Petrol"),
                "transmission": payload.get("transmission", "AT"),
                "city": payload.get("city", "Bengaluru"),
                "vehicle_age": max(0, 2026 - int(payload.get("year", 2026))),
                "mileage_kmpl": float(payload.get("mileageKmpl", 18.0)),
                "km_driven": int(payload.get("kmDriven", 0)),
                "ex_showroom_lakh": float(payload.get("exShowroomLakh") or 14.5),
            }
        ]
    )

    predicted = float(pipe.predict(row)[0])

    # Derive P10-P90 prediction interval from Random Forest tree ensemble
    transformed = rf_pipe.named_steps["prep"].transform(row)
    tree_preds = np.array([est.predict(transformed)[0] for est in rf_pipe.named_steps["model"].estimators_])
    lower = float(np.percentile(tree_preds, 10))
    upper = float(np.percentile(tree_preds, 90))

    dealer_quote = payload.get("dealerQuotationLakh")
    diff = round(float(dealer_quote) - predicted, 2) if dealer_quote is not None else None

    return {
        "modelReady": True,
        "selectedModel": meta["selectedModel"],
        "predictedPriceLakh": round(predicted, 2),
        "lowerRangeLakh": round(min(lower, predicted * 0.96), 2),
        "upperRangeLakh": round(max(upper, predicted * 1.04), 2),
        "dealerQuotationLakh": dealer_quote,
        "priceDifferenceLakh": diff,
        "evaluation": meta["modelComparison"],
        "limitations": "Estimates are computed from a development dataset and do not guarantee showroom quotes.",
    }
