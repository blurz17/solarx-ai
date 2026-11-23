# SolarX — Solar Power Estimation, Loss Diagnostics & Live Forecasting

End-to-end Machine Learning system for solar photovoltaic (PV) stations. Powered by **4 calibrated regression models** trained on **77,098 daytime inverter readings** (Kaggle Solar Generation + Open-Meteo Weather) and served via a **FastAPI** backend and **React + Vite** dashboard.

---

## Core Capabilities

1. **Performance Estimation (`Simulator`)**
   - Estimates expected `AC_POWER` (`kW` per inverter & total fleet) from solar irradiation, ambient & panel module temperature, cloud cover, humidity, wind speed, and cyclical hour of day.
   - Compares predictions live across **Gradient Boosting**, **XGBoost**, **Random Forest**, and **Linear Regression**.
2. **Loss & Health Diagnostics (`Loss Audit`)**
   - Compares actual measured output against ML-expected weather-adjusted output (`Loss = Expected − Actual`, `Performance Ratio = Actual / Expected`).
   - Flags non-weather underperformance (**dust/soiling**, **partial shading**, **thermal derating**, and **daytime inverter outages**) across uploaded CSV plant logs or single readings.
3. **Next-Day & Multi-Day Forecasting (`Forecast`)**
   - Automatically fetches live hourly weather forecasts from the **Open-Meteo Forecast API** for any GPS location, estimates panel heating via NOCT physics, and predicts 24-hour generation curves.

---

## Model Benchmarks (Chronological Time-Series Split)

Data was split **strictly by date** (Train: May 15 – Jun 7, Validation: Jun 8 – Jun 12, Test: Jun 13 – Jun 17) with zero data leakage and no station/inverter ID memorization:

| Algorithm | Train MAE | Val MAE | **Test MAE** | Train RMSE | Val RMSE | **Test RMSE** | **Test R²** |
|---|---|---|---|---|---|---|---|
| **Gradient Boosting** *(Winner)* | 98.45 | 86.69 | **86.50** | 206.12 | 181.77 | **178.80** | **0.7394** |
| **Random Forest** | 95.62 | 92.44 | 88.77 | 205.45 | 191.38 | 183.37 | 0.7259 |
| **XGBoost** | 94.79 | 87.53 | 90.42 | 203.38 | 182.25 | 181.70 | 0.7309 |
| **Linear Regression** | 138.14 | 115.58 | 122.67 | 240.04 | 202.81 | 193.70 | 0.6942 |

---

## Repository Structure

```text
├── backend/                     # FastAPI REST API (port 8000)
│   ├── app/
│   │   ├── config.py            # Paths, feature list & model registry
│   │   ├── main.py              # REST endpoints (/api/predict, /api/loss-check, /api/forecast, ...)
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   └── service.py           # ML inference, CSV audit & Open-Meteo integration
│   └── requirements.txt
├── frontend/                    # React 18 + Vite web UI (port 5173)
│   ├── src/
│   │   ├── components/          # Header, Icons, SolarVisualTwin
│   │   ├── context/             # ThemeContext (Light / Dark mode)
│   │   ├── pages/               # SimulatorPage, LossAuditPage, ForecastPage, BenchmarksPage, DocsPage
│   │   └── services/solarApi.js
│   ├── package.json
│   └── vite.config.js
├── models/                      # Trained .joblib models (all 4 algorithms)
├── data/
│   ├── raw/                     # Kaggle Plant 1 & 2 CSVs + Open-Meteo historical weather
│   └── processed/               # Merged dataset + chronological Train / Val / Test splits
├── notebooks/                   # Full ML lifecycle
│   ├── 01_eda.ipynb
│   ├── 02_data_splitting_and_preprocessing.ipynb
│   ├── 03_feature_engineering_and_selection.ipynb
│   ├── 04_training_and_evaluation.ipynb
│   └── 05_loss_analysis_and_forecasting.ipynb
├── scripts/
│   └── merge_datasets.py        # Reproducible Kaggle + Open-Meteo data merge script
├── render.yaml                  # Render cloud deployment blueprint (Backend)
└── start_local.ps1              # One-click local Windows launcher
```

---

## Run Locally

### Quick Start (Windows PowerShell)
```powershell
.\start_local.ps1
```

### Manual Start
**1. Backend (`http://127.0.0.1:8000`):**
```bash
pip install -r requirements.txt
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

**2. Frontend (`http://127.0.0.1:5173`):**
```bash
cd frontend
npm install
npm run dev
```
