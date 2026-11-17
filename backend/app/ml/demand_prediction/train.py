from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

BASE_DIR = Path(__file__).resolve().parents[3]
DATASET_PATH = BASE_DIR / "datasets" / "historical_demand.csv"
MODEL_DIR = Path(__file__).resolve().parent / "model"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def train_demand_model() -> dict:
    df = pd.read_csv(DATASET_PATH)
    df["cal_month"] = df["month"].str.split("-").str[1].astype(int)

    train_df = df[df["month_index"] <= 15]
    test_df = df[df["month_index"] > 15]

    features = ["city", "model", "cal_month", "month_index"]
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), ["city", "model", "cal_month"]),
            ("num", "passthrough", ["month_index"]),
        ]
    )

    pipe = Pipeline([("prep", preprocessor), ("model", Ridge(alpha=1.0))])
    pipe.fit(train_df[features], train_df["buyer_requests"])
    preds = pipe.predict(test_df[features])

    metrics = {
        "r2": round(float(r2_score(test_df["buyer_requests"], preds)), 4),
        "mae": round(float(mean_absolute_error(test_df["buyer_requests"], preds)), 3),
        "rmse": round(float(np.sqrt(mean_squared_error(test_df["buyer_requests"], preds))), 3),
    }

    # Refit on full 18 months
    pipe.fit(df[features], df["buyer_requests"])
    joblib.dump(pipe, MODEL_DIR / "demand_pipeline.joblib")
    (MODEL_DIR / "demand_metadata.json").write_text(
        json.dumps({"totalRecords": len(df), "evaluationMetrics": metrics}, indent=2)
    )
    return {"totalRecords": len(df), "evaluationMetrics": metrics}


if __name__ == "__main__":
    print(json.dumps(train_demand_model(), indent=2))
