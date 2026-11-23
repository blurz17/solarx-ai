"""Configuration settings for SolarX AI FastAPI Backend."""

import os
from pathlib import Path

APP_NAME = "SolarX AI — Solar Performance, Loss & Forecasting API"
APP_VERSION = "1.0.0"

# Project root directory (e:\MY-PROJECTS\solar panel)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = PROJECT_ROOT / "models"
DATA_PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*",
]

MODEL_FILES = {
    "Gradient Boosting": "gradient_boosting.joblib",
    "XGBoost": "xgboost.joblib",
    "Random Forest": "random_forest.joblib",
    "Linear Regression": "linear_regression.joblib",
}

DEFAULT_ALGORITHM = "Gradient Boosting"

MODEL_FEATURES = [
    "IRRADIATION",
    "MODULE_TEMPERATURE",
    "AMBIENT_TEMPERATURE",
    "TEMP_DIFF",
    "relative_humidity_2m",
    "cloud_cover",
    "wind_speed_10m",
    "HOUR_SIN",
    "HOUR_COS",
]
