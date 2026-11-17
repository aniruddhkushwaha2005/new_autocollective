from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

try:
    from xgboost import XGBRegressor
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False

BASE_DIR = Path(__file__).resolve().parents[3]
DATASET_PATH = BASE_DIR / "datasets" / "indian_cars_dataset.csv"
MODEL_DIR = Path(__file__).resolve().parent / "model"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def train_price_model() -> dict:
    df = pd.read_csv(DATASET_PATH)
    df["vehicle_age"] = np.maximum(0, 2026 - df["year"])

    feature_cols = [
        "brand",
        "model",
        "fuel_type",
        "transmission",
        "city",
        "vehicle_age",
        "mileage_kmpl",
        "km_driven",
        "ex_showroom_lakh",
    ]
    X = df[feature_cols]
    y = df["market_price_lakh"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    categorical = ["brand", "model", "fuel_type", "transmission", "city"]
    numeric = ["vehicle_age", "mileage_kmpl", "km_driven", "ex_showroom_lakh"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
            ("num", StandardScaler(), numeric),
        ]
    )

    candidates = {
        "Random Forest Regressor": RandomForestRegressor(n_estimators=180, max_depth=12, random_state=42),
        "Ridge Linear Regression": Ridge(alpha=1.5),
        "Gradient Boosting Regressor": GradientBoostingRegressor(n_estimators=180, learning_rate=0.08, random_state=42),
    }
    if HAS_XGBOOST:
        candidates["XGBoost Regressor"] = XGBRegressor(
            n_estimators=200, learning_rate=0.08, max_depth=5, random_state=42
        )

    results = []
    fitted_pipelines = {}

    for name, estimator in candidates.items():
        pipe = Pipeline([("prep", preprocessor), ("model", estimator)])
        pipe.fit(X_train, y_train)
        preds = pipe.predict(X_test)
        rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
        mae = float(mean_absolute_error(y_test, preds))
        r2 = float(r2_score(y_test, preds))
        results.append({"name": name, "r2": round(r2, 4), "mae": round(mae, 3), "rmse": round(rmse, 3)})
        fitted_pipelines[name] = pipe

    results.sort(key=lambda item: item["rmse"])
    selected_name = results[0]["name"]
    best_pipe = fitted_pipelines[selected_name]

    joblib.dump(best_pipe, MODEL_DIR / "price_pipeline.joblib")
    joblib.dump(fitted_pipelines["Random Forest Regressor"], MODEL_DIR / "rf_pipeline.joblib")

    metadata = {
        "selectedModel": selected_name,
        "modelComparison": results,
        "trainSize": len(X_train),
        "testSize": len(X_test),
        "dataset": "indian_cars_dataset.csv",
    }
    (MODEL_DIR / "price_metadata.json").write_text(json.dumps(metadata, indent=2))
    return metadata


if __name__ == "__main__":
    print(json.dumps(train_price_model(), indent=2))
