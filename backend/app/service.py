"""Core ML inference, loss diagnostics, and live weather forecasting service."""

import io
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

import joblib
import numpy as np
import pandas as pd
import requests

from .config import (
    MODELS_DIR,
    DATA_PROCESSED_DIR,
    MODEL_FILES,
    DEFAULT_ALGORITHM,
    MODEL_FEATURES,
)
from .schemas import PredictionRequest, QuickLossRequest


BENCHMARK_METRICS = [
    {
        "name": "Gradient Boosting",
        "is_winner": True,
        "train_mae": 98.45, "val_mae": 86.69, "test_mae": 86.50,
        "train_rmse": 206.12, "val_rmse": 181.77, "test_rmse": 178.80,
        "train_r2": 0.7410, "val_r2": 0.7402, "test_r2": 0.7394,
        "notes": "Selected Production Winner — lowest MAE/RMSE and zero overfitting.",
    },
    {
        "name": "Random Forest",
        "is_winner": False,
        "train_mae": 95.62, "val_mae": 92.44, "test_mae": 88.77,
        "train_rmse": 205.45, "val_rmse": 191.38, "test_rmse": 183.37,
        "train_r2": 0.7427, "val_r2": 0.7120, "test_r2": 0.7259,
        "notes": "Strong ensemble of 100 decision trees (max_depth=10).",
    },
    {
        "name": "XGBoost",
        "is_winner": False,
        "train_mae": 94.79, "val_mae": 87.53, "test_mae": 90.42,
        "train_rmse": 203.38, "val_rmse": 182.25, "test_rmse": 181.70,
        "train_r2": 0.7478, "val_r2": 0.7388, "test_r2": 0.7309,
        "notes": "Boosted trees (200 estimators, lr=0.05) — close runner-up on validation.",
    },
    {
        "name": "Linear Regression",
        "is_winner": False,
        "train_mae": 138.14, "val_mae": 115.58, "test_mae": 122.67,
        "train_rmse": 240.04, "val_rmse": 202.81, "test_rmse": 193.70,
        "train_r2": 0.6487, "val_r2": 0.6765, "test_r2": 0.6942,
        "notes": "Linear baseline wrapped in a StandardScaler pipeline.",
    },
]

FEATURE_IMPORTANCES = [
    {"feature": "IRRADIATION", "label": "Solar Irradiation", "importance": 0.946},
    {"feature": "wind_speed_10m", "label": "Wind Speed (10m)", "importance": 0.015},
    {"feature": "AMBIENT_TEMPERATURE", "label": "Ambient Air Temp", "importance": 0.011},
    {"feature": "MODULE_TEMPERATURE", "label": "Panel Module Temp", "importance": 0.008},
    {"feature": "TEMP_DIFF", "label": "Thermal Buildup (Module - Air)", "importance": 0.007},
    {"feature": "cloud_cover", "label": "Cloud Cover", "importance": 0.005},
    {"feature": "relative_humidity_2m", "label": "Relative Humidity", "importance": 0.004},
    {"feature": "HOUR_SIN", "label": "Hour Cyclical (Sin)", "importance": 0.002},
    {"feature": "HOUR_COS", "label": "Hour Cyclical (Cos)", "importance": 0.002},
]


class SolarMLService:
    def __init__(self) -> None:
        self.models: Dict[str, Any] = {}
        self._load_models()

    def _load_models(self) -> None:
        for algo_name, filename in MODEL_FILES.items():
            path = MODELS_DIR / filename
            if path.exists():
                self.models[algo_name] = joblib.load(path)

    @property
    def is_loaded(self) -> bool:
        return len(self.models) > 0

    @property
    def available_algorithms(self):
        return list(self.models.keys())

    def _get_model(self, algorithm: str):
        if algorithm in self.models:
            return algorithm, self.models[algorithm]
        if DEFAULT_ALGORITHM in self.models:
            return DEFAULT_ALGORITHM, self.models[DEFAULT_ALGORITHM]
        first = next(iter(self.models.items()))
        return first[0], first[1]

    @staticmethod
    def _build_feature_frame(
        irradiation: np.ndarray,
        ambient_temp: np.ndarray,
        module_temp: np.ndarray,
        humidity: np.ndarray,
        cloud_cover: np.ndarray,
        wind_speed: np.ndarray,
        hour: np.ndarray,
    ) -> pd.DataFrame:
        temp_diff = module_temp - ambient_temp
        hour_sin = np.sin(2.0 * np.pi * hour / 24.0)
        hour_cos = np.cos(2.0 * np.pi * hour / 24.0)

        df = pd.DataFrame(
            {
                "IRRADIATION": irradiation,
                "MODULE_TEMPERATURE": module_temp,
                "AMBIENT_TEMPERATURE": ambient_temp,
                "TEMP_DIFF": temp_diff,
                "relative_humidity_2m": humidity,
                "cloud_cover": cloud_cover,
                "wind_speed_10m": wind_speed,
                "HOUR_SIN": hour_sin,
                "HOUR_COS": hour_cos,
            },
            columns=MODEL_FEATURES,
        )
        return df.astype(np.float32)

    def predict_single(self, req: PredictionRequest) -> Dict[str, Any]:
        f = req.features
        mod_temp = (
            f.module_temperature
            if f.module_temperature is not None
            else f.ambient_temperature + 25.0 * f.irradiation
        )

        X = self._build_feature_frame(
            irradiation=np.array([f.irradiation]),
            ambient_temp=np.array([f.ambient_temperature]),
            module_temp=np.array([mod_temp]),
            humidity=np.array([f.relative_humidity]),
            cloud_cover=np.array([f.cloud_cover]),
            wind_speed=np.array([f.wind_speed]),
            hour=np.array([f.hour]),
        )

        algo_used, _ = self._get_model(req.algorithm)

        all_preds: Dict[str, float] = {}
        for name, mdl in self.models.items():
            if f.irradiation <= 0.0:
                val = 0.0
            else:
                val = float(np.clip(mdl.predict(X)[0], 0.0, None))
            all_preds[name] = round(val, 2)

        chosen_val = all_preds[algo_used]

        return {
            "success": True,
            "algorithm_used": algo_used,
            "expected_ac_power_per_inverter": chosen_val,
            "total_station_ac_power": round(chosen_val * req.inverter_count, 2),
            "inverter_count": req.inverter_count,
            "all_algorithms": all_preds,
            "engineered_features": {
                "MODULE_TEMPERATURE": round(float(mod_temp), 2),
                "TEMP_DIFF": round(float(X["TEMP_DIFF"].iloc[0]), 2),
                "HOUR_SIN": round(float(X["HOUR_SIN"].iloc[0]), 4),
                "HOUR_COS": round(float(X["HOUR_COS"].iloc[0]), 4),
            },
        }

    def analyze_single_loss(self, req: QuickLossRequest) -> Dict[str, Any]:
        pred_res = self.predict_single(
            PredictionRequest(features=req.features, algorithm=req.algorithm, inverter_count=1)
        )
        expected = pred_res["expected_ac_power_per_inverter"]
        actual = float(req.actual_ac_power)
        irr = float(req.features.irradiation)
        temp_diff = pred_res["engineered_features"]["TEMP_DIFF"]

        if irr < 0.05 or expected < 15.0:
            return {
                "success": True,
                "algorithm_used": pred_res["algorithm_used"],
                "actual_ac_power": round(actual, 2),
                "expected_ac_power": round(expected, 2),
                "power_loss": round(max(0.0, expected - actual), 2),
                "loss_percentage": 0.0,
                "performance_ratio": 1.0,
                "status": "STANDBY (LOW SUN)",
                "diagnosis": "Sunlight is below inverter startup threshold (< 0.05 kW/m²).",
                "recommendation": "No action needed — run diagnostics during active daylight hours.",
            }

        loss = expected - actual
        pr = actual / expected
        loss_pct = max(0.0, (loss / expected) * 100.0)

        if actual <= 1.0:
            status = "CRITICAL OUTAGE"
            diagnosis = "Inverter is producing ~0 AC power during active sunlight."
            recommendation = "Inspect inverter fault codes, AC/DC breakers, and grid connection immediately."
        elif pr >= 0.90:
            status = "HEALTHY"
            diagnosis = "Inverter output closely matches weather-adjusted expected performance."
            recommendation = "Continue routine monitoring — no maintenance required."
        elif pr >= 0.78:
            status = "WARNING (SOILING / THERMAL)"
            if temp_diff > 24.0:
                diagnosis = f"Moderate underperformance ({loss_pct:.1f}% gap) with elevated panel heat buildup (+{temp_diff:.1f} °C)."
                recommendation = "Check panel airflow/mounting clearance and schedule routine dust cleaning."
            else:
                diagnosis = f"Moderate underperformance ({loss_pct:.1f}% gap) not explained by weather — typical of dust/soiling or partial shading."
                recommendation = "Schedule panel washing/cleaning and inspect nearby shading obstacles."
        else:
            status = "CRITICAL UNDERPERFORMANCE"
            diagnosis = f"Severe production gap ({loss_pct:.1f}% below expected output under current sunlight)."
            recommendation = "Inspect DC string fuses, MPPT tracker, heavy soiling, or degraded PV modules."

        return {
            "success": True,
            "algorithm_used": pred_res["algorithm_used"],
            "actual_ac_power": round(actual, 2),
            "expected_ac_power": round(expected, 2),
            "power_loss": round(loss, 2),
            "loss_percentage": round(loss_pct, 1),
            "performance_ratio": round(pr, 3),
            "status": status,
            "diagnosis": diagnosis,
            "recommendation": recommendation,
        }

    def audit_dataframe(
        self,
        df: pd.DataFrame,
        algorithm: str = DEFAULT_ALGORITHM,
        plant_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        # Normalize column names case-insensitively
        col_map = {c.lower(): c for c in df.columns}

        def get_col(candidates, default_val=None):
            for cand in candidates:
                if cand.lower() in col_map:
                    return df[col_map[cand.lower()]]
            if default_val is not None:
                return pd.Series([default_val] * len(df), index=df.index)
            raise ValueError(f"Required column missing. Expected one of: {candidates}")

        work = pd.DataFrame()
        if "date_time" in col_map:
            work["DATE_TIME"] = pd.to_datetime(df[col_map["date_time"]], errors="coerce")
        elif "time" in col_map:
            work["DATE_TIME"] = pd.to_datetime(df[col_map["time"]], errors="coerce")
        else:
            work["DATE_TIME"] = pd.date_range("2020-06-15 08:00", periods=len(df), freq="15min")

        work["PLANT_ID"] = get_col(["PLANT_ID", "plant"], default_val=1)
        work["SOURCE_KEY"] = get_col(["SOURCE_KEY", "inverter_id", "inverter"], default_val="INV-01").astype(str)
        work["AC_POWER"] = pd.to_numeric(get_col(["AC_POWER", "power", "actual_ac_power"]), errors="coerce")
        work["IRRADIATION"] = pd.to_numeric(get_col(["IRRADIATION", "irradiance"]), errors="coerce")
        work["AMBIENT_TEMPERATURE"] = pd.to_numeric(
            get_col(["AMBIENT_TEMPERATURE", "temperature_2m", "ambient_temp"], default_val=30.0),
            errors="coerce",
        )
        default_mod = work["AMBIENT_TEMPERATURE"] + 25.0 * work["IRRADIATION"]
        if "module_temperature" in col_map:
            work["MODULE_TEMPERATURE"] = pd.to_numeric(df[col_map["module_temperature"]], errors="coerce").fillna(default_mod)
        else:
            work["MODULE_TEMPERATURE"] = default_mod

        work["relative_humidity_2m"] = pd.to_numeric(
            get_col(["relative_humidity_2m", "relative_humidity", "humidity"], default_val=50.0),
            errors="coerce",
        )
        work["cloud_cover"] = pd.to_numeric(
            get_col(["cloud_cover", "clouds"], default_val=35.0),
            errors="coerce",
        )
        work["wind_speed_10m"] = pd.to_numeric(
            get_col(["wind_speed_10m", "wind_speed", "wind"], default_val=10.0),
            errors="coerce",
        )

        work = work.dropna(subset=["AC_POWER", "IRRADIATION", "DATE_TIME"]).copy()

        if plant_id is not None:
            work = work[work["PLANT_ID"] == plant_id].copy()

        # Filter active sunlight (>= 0.05) just like Notebook 05
        active = work[work["IRRADIATION"] >= 0.05].copy().reset_index(drop=True)
        if len(active) == 0:
            raise ValueError("No active daylight rows (IRRADIATION >= 0.05) found in dataset.")

        algo_used, model = self._get_model(algorithm)
        X = self._build_feature_frame(
            irradiation=active["IRRADIATION"].to_numpy(),
            ambient_temp=active["AMBIENT_TEMPERATURE"].to_numpy(),
            module_temp=active["MODULE_TEMPERATURE"].to_numpy(),
            humidity=active["relative_humidity_2m"].to_numpy(),
            cloud_cover=active["cloud_cover"].to_numpy(),
            wind_speed=active["wind_speed_10m"].to_numpy(),
            hour=active["DATE_TIME"].dt.hour.to_numpy(),
        )

        active["EXPECTED_AC_POWER"] = np.clip(model.predict(X), 1.0, None)
        active["LOSS"] = active["EXPECTED_AC_POWER"] - active["AC_POWER"]
        active["PERF_RATIO"] = active["AC_POWER"] / active["EXPECTED_AC_POWER"]
        active["IS_OUTAGE"] = (active["AC_POWER"] <= 1.0).astype(int)

        # Group by inverter
        inv_grp = (
            active.groupby(["PLANT_ID", "SOURCE_KEY"], as_index=False)
            .agg(
                readings=("AC_POWER", "count"),
                actual_power=("AC_POWER", "mean"),
                expected_power=("EXPECTED_AC_POWER", "mean"),
                loss=("LOSS", "mean"),
                performance_ratio=("PERF_RATIO", "mean"),
                outage_count=("IS_OUTAGE", "sum"),
            )
            .sort_values("loss", ascending=False)
            .reset_index(drop=True)
        )

        inverters_list = []
        healthy_cnt = warning_cnt = critical_cnt = 0

        for _, row in inv_grp.iterrows():
            pr = float(row["performance_ratio"])
            outages = int(row["outage_count"])
            loss_val = float(row["loss"])

            if pr < 0.80 or outages >= 15:
                status = "CRITICAL"
                critical_cnt += 1
                action = "Inspect inverter fault logs, string fuses & heavy soiling"
            elif pr < 0.90 or outages >= 5:
                status = "WARNING"
                warning_cnt += 1
                action = "Schedule panel cleaning (dust/soiling) & check shading"
            else:
                status = "HEALTHY"
                healthy_cnt += 1
                action = "Operating normally"

            inverters_list.append(
                {
                    "plant_id": int(row["PLANT_ID"]) if str(row["PLANT_ID"]).isdigit() else str(row["PLANT_ID"]),
                    "source_key": str(row["SOURCE_KEY"]),
                    "readings": int(row["readings"]),
                    "actual_power": round(float(row["actual_power"]), 2),
                    "expected_power": round(float(row["expected_power"]), 2),
                    "loss": round(loss_val, 2),
                    "performance_ratio": round(pr, 3),
                    "outage_count": outages,
                    "status": status,
                    "recommendation": action,
                }
            )

        # Daily trend
        active["DATE"] = active["DATE_TIME"].dt.strftime("%Y-%m-%d")
        daily_grp = (
            active.groupby("DATE", as_index=False)
            .agg(
                actual_power=("AC_POWER", "mean"),
                expected_power=("EXPECTED_AC_POWER", "mean"),
                loss=("LOSS", "mean"),
                performance_ratio=("PERF_RATIO", "mean"),
            )
            .sort_values("DATE")
        )
        daily_trend = [
            {
                "date": r["DATE"],
                "actual_power": round(float(r["actual_power"]), 1),
                "expected_power": round(float(r["expected_power"]), 1),
                "loss": round(float(r["loss"]), 1),
                "performance_ratio": round(float(r["performance_ratio"]), 3),
            }
            for _, r in daily_grp.iterrows()
        ]

        available_plants = sorted(
            [int(p) if str(p).isdigit() else str(p) for p in work["PLANT_ID"].unique()]
        )

        return {
            "success": True,
            "algorithm_used": algo_used,
            "available_plants": available_plants,
            "summary": {
                "total_active_readings": int(len(active)),
                "total_inverters": int(len(inverters_list)),
                "avg_actual_power": round(float(active["AC_POWER"].mean()), 2),
                "avg_expected_power": round(float(active["EXPECTED_AC_POWER"].mean()), 2),
                "avg_loss": round(float(active["LOSS"].mean()), 2),
                "fleet_performance_ratio": round(float(active["PERF_RATIO"].mean()), 3),
                "daytime_outage_readings": int(active["IS_OUTAGE"].sum()),
                "healthy_inverters": healthy_cnt,
                "warning_inverters": warning_cnt,
                "critical_inverters": critical_cnt,
            },
            "inverters": inverters_list,
            "daily_trend": daily_trend,
        }

    def run_demo_audit(self, algorithm: str = DEFAULT_ALGORITHM, plant_id: Optional[int] = None) -> Dict[str, Any]:
        test_path = DATA_PROCESSED_DIR / "test.csv"
        if not test_path.exists():
            raise FileNotFoundError(f"Demo test dataset not found at {test_path}")
        df = pd.read_csv(test_path)
        return self.audit_dataframe(df, algorithm=algorithm, plant_id=plant_id)

    def run_csv_audit(self, csv_bytes: bytes, algorithm: str = DEFAULT_ALGORITHM) -> Dict[str, Any]:
        df = pd.read_csv(io.BytesIO(csv_bytes))
        return self.audit_dataframe(df, algorithm=algorithm, plant_id=None)

    def get_live_forecast(
        self,
        latitude: float = 12.97,
        longitude: float = 77.59,
        days: int = 3,
        inverter_count: int = 1,
        algorithm: str = DEFAULT_ALGORITHM,
    ) -> Dict[str, Any]:
        days = max(1, min(days, 7))
        algo_used, model = self._get_model(algorithm)
        source = "Open-Meteo Live Weather Forecast API"

        try:
            url = (
                "https://api.open-meteo.com/v1/forecast"
                f"?latitude={latitude}&longitude={longitude}"
                "&hourly=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,shortwave_radiation"
                f"&forecast_days={days + 1}&timezone=auto"
            )
            resp = requests.get(url, timeout=12)
            resp.raise_for_status()
            payload = resp.json()
            timezone_name = payload.get("timezone", "Local")
            fc = pd.DataFrame(payload["hourly"])
            fc["DATE_TIME"] = pd.to_datetime(fc["time"])

            # Start from tomorrow (full 24h days)
            unique_dates = sorted(fc["DATE_TIME"].dt.date.unique())
            selected_dates = unique_dates[1 : 1 + days] if len(unique_dates) > 1 else unique_dates[:days]
            fc = fc[fc["DATE_TIME"].dt.date.isin(selected_dates)].copy().reset_index(drop=True)
        except Exception:
            # Offline synthetic fallback so local testing never breaks without internet
            source = "Offline Clear-Sky Fallback Forecast"
            timezone_name = "Local"
            start_tmr = (datetime.now() + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            times = [start_tmr + timedelta(hours=h) for h in range(24 * days)]
            hrs = np.array([t.hour for t in times])
            rad = np.where((hrs >= 6) & (hrs <= 18), 850.0 * np.sin(np.pi * (hrs - 6) / 12.0), 0.0)
            fc = pd.DataFrame(
                {
                    "DATE_TIME": times,
                    "shortwave_radiation": np.clip(rad, 0.0, None),
                    "temperature_2m": 24.0 + 9.0 * np.sin(np.pi * (hrs - 5) / 14.0),
                    "relative_humidity_2m": np.clip(75.0 - 35.0 * np.sin(np.pi * (hrs - 5) / 14.0), 25.0, 95.0),
                    "cloud_cover": 20.0,
                    "wind_speed_10m": 11.0,
                }
            )

        irr = fc["shortwave_radiation"].to_numpy(dtype=np.float32) / 1000.0
        amb = fc["temperature_2m"].to_numpy(dtype=np.float32)
        mod = amb + 0.025 * fc["shortwave_radiation"].to_numpy(dtype=np.float32)
        hum = fc["relative_humidity_2m"].to_numpy(dtype=np.float32)
        cld = fc["cloud_cover"].to_numpy(dtype=np.float32)
        wnd = fc["wind_speed_10m"].to_numpy(dtype=np.float32)
        hrs = fc["DATE_TIME"].dt.hour.to_numpy(dtype=np.float32)

        X = self._build_feature_frame(irr, amb, mod, hum, cld, wnd, hrs)
        raw_preds = np.clip(model.predict(X), 0.0, None)
        per_inv = np.where(irr >= 0.05, raw_preds, 0.0)
        total_station = per_inv * inverter_count

        fc["PRED_PER_INVERTER"] = per_inv
        fc["PRED_TOTAL"] = total_station
        fc["IRRADIATION"] = irr
        fc["DATE_STR"] = fc["DATE_TIME"].dt.strftime("%Y-%m-%d")

        hourly_records = []
        for _, r in fc.iterrows():
            hourly_records.append(
                {
                    "time": r["DATE_TIME"].strftime("%Y-%m-%d %H:%M"),
                    "date": r["DATE_STR"],
                    "hour": int(r["DATE_TIME"].hour),
                    "irradiation": round(float(r["IRRADIATION"]), 3),
                    "shortwave_radiation": round(float(r["shortwave_radiation"]), 1),
                    "ambient_temp": round(float(r["temperature_2m"]), 1),
                    "cloud_cover": round(float(r["cloud_cover"]), 0),
                    "humidity": round(float(r["relative_humidity_2m"]), 0),
                    "wind_speed": round(float(r["wind_speed_10m"]), 1),
                    "predicted_per_inverter": round(float(r["PRED_PER_INVERTER"]), 2),
                    "predicted_station_total": round(float(r["PRED_TOTAL"]), 2),
                }
            )

        daily_summaries = []
        for date_str, grp in fc.groupby("DATE_STR"):
            peak_idx = grp["PRED_TOTAL"].idxmax()
            peak_hour = int(grp.loc[peak_idx, "DATE_TIME"].hour)
            daily_summaries.append(
                {
                    "date": date_str,
                    "peak_station_power": round(float(grp["PRED_TOTAL"].max()), 1),
                    "total_daily_energy": round(float(grp["PRED_TOTAL"].sum()), 1),
                    "peak_hour": f"{peak_hour:02d}:00",
                    "avg_cloud_cover": round(float(grp["cloud_cover"].mean()), 0),
                    "max_temp": round(float(grp["temperature_2m"].max()), 1),
                }
            )

        return {
            "success": True,
            "weather_source": source,
            "timezone": timezone_name,
            "latitude": latitude,
            "longitude": longitude,
            "inverter_count": inverter_count,
            "algorithm_used": algo_used,
            "daily_summaries": daily_summaries,
            "hourly": hourly_records,
        }

    def get_models_metadata(self) -> Dict[str, Any]:
        return {
            "total_models": len(self.models),
            "default_algorithm": DEFAULT_ALGORITHM,
            "algorithms": self.available_algorithms,
            "target": "AC_POWER",
            "features": MODEL_FEATURES,
            "benchmarks": BENCHMARK_METRICS,
            "feature_importances": FEATURE_IMPORTANCES,
        }


service = SolarMLService()
