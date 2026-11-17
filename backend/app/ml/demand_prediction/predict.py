from pathlib import Path
import json
import joblib
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[3]
DATASET_PATH = BASE_DIR / "datasets" / "historical_demand.csv"
MODEL_DIR = Path(__file__).resolve().parent / "model"


def forecast_demand(city: str = "All", model: str = "All", horizon_months: int = 4) -> dict:
    pipe_path = MODEL_DIR / "demand_pipeline.joblib"
    meta_path = MODEL_DIR / "demand_metadata.json"
    if not pipe_path.exists() or not meta_path.exists():
        return {"modelReady": False, "message": "Demand model not trained yet."}

    pipe = joblib.load(pipe_path)
    meta = json.loads(meta_path.read_text())
    df = pd.read_csv(DATASET_PATH)

    filtered = df.copy()
    if city != "All":
        filtered = filtered[filtered["city"] == city]
    if model != "All":
        filtered = filtered[filtered["model"] == model]

    hist = (
        filtered.groupby(["month", "month_index"], as_index=False)["buyer_requests"]
        .sum()
        .sort_values("month_index")
    )
    timeline = [
        {"month": row["month"], "actualDemand": int(row["buyer_requests"]), "forecastDemand": None, "type": "historical"}
        for _, row in hist.iterrows()
    ]

    cities = [city] if city != "All" else sorted(df["city"].unique())
    models = [model] if model != "All" else sorted(df["model"].unique())
    last_idx = int(df["month_index"].max())
    last_year, last_mon = map(int, str(df["month"].max()).split("-"))

    for h in range(1, horizon_months + 1):
        total_m = last_year * 12 + (last_mon - 1) + h
        fy, fm = divmod(total_m, 12)
        fm += 1
        label = f"{fy}-{fm:02d}"
        grid = pd.DataFrame(
            [{"city": c, "model": m, "cal_month": fm, "month_index": last_idx + h} for c in cities for m in models]
        )
        pred_sum = int(max(1, round(pipe.predict(grid).sum())))
        timeline.append({"month": label, "actualDemand": None, "forecastDemand": pred_sum, "type": "forecast"})

    return {
        "modelReady": True,
        "timeline": timeline,
        "evaluationMetrics": meta["evaluationMetrics"],
        "datasetNotice": "Forecasts are generated from historical synthetic development records.",
    }
