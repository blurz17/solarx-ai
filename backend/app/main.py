"""FastAPI main application entrypoint for SolarX AI."""

from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import APP_NAME, APP_VERSION, ALLOWED_ORIGINS, DEFAULT_ALGORITHM, PROJECT_ROOT
from .schemas import (
    PredictionRequest,
    PredictionResponse,
    QuickLossRequest,
    QuickLossResponse,
    HealthResponse,
)
from .service import service

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=(
        "Production ML API for Solar Panel Performance Estimation, "
        "Underperformance / Loss Analysis, and Live Next-Day Solar Forecasting."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
if (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")


@app.api_route("/", methods=["GET", "HEAD"], tags=["General"])
def root():
    index_file = FRONTEND_DIST / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "status": "online",
        "documentation": "/docs",
        "health": "/api/health",
    }


@app.get("/api", tags=["General"])
def api_info():
    return {
        "app": APP_NAME,
        "version": APP_VERSION,
        "status": "online",
        "documentation": "/docs",
        "health": "/api/health",
    }


@app.api_route("/api/health", methods=["GET", "HEAD"], response_model=HealthResponse, tags=["General"])
@app.api_route("/health", methods=["GET", "HEAD"], response_model=HealthResponse, tags=["General"])
def health_check():
    return HealthResponse(
        status="ok",
        version=APP_VERSION,
        models_loaded=service.is_loaded,
        default_algorithm=DEFAULT_ALGORITHM,
        algorithms_available=service.available_algorithms,
    )


@app.post("/api/predict", response_model=PredictionResponse, tags=["Stage 1: Performance Estimation"])
def predict_power(request: PredictionRequest):
    try:
        return service.predict_single(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")


@app.post("/api/loss-check", response_model=QuickLossResponse, tags=["Stage 2: Loss Analysis"])
def quick_loss_check(request: QuickLossRequest):
    try:
        return service.analyze_single_loss(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Loss analysis error: {exc}")


@app.get("/api/demo-audit", tags=["Stage 2: Loss Analysis"])
def demo_plant_audit(
    algorithm: str = Query(DEFAULT_ALGORITHM, description="ML algorithm name"),
    plant_id: Optional[int] = Query(None, description="Optional Plant ID filter (e.g., 4135001 or 4136001)"),
):
    try:
        return service.run_demo_audit(algorithm=algorithm, plant_id=plant_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Demo audit error: {exc}")


@app.post("/api/loss-audit-csv", tags=["Stage 2: Loss Analysis"])
async def upload_csv_audit(
    file: UploadFile = File(...),
    algorithm: str = Form(DEFAULT_ALGORITHM),
):
    try:
        contents = await file.read()
        return service.run_csv_audit(contents, algorithm=algorithm)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"CSV audit error: {exc}")


@app.get("/api/forecast", tags=["Stage 3: Future Prediction"])
def forecast_next_days(
    latitude: float = Query(12.97, ge=-90.0, le=90.0),
    longitude: float = Query(77.59, ge=-180.0, le=180.0),
    days: int = Query(3, ge=1, le=7),
    inverter_count: int = Query(1, ge=1, le=500),
    algorithm: str = Query(DEFAULT_ALGORITHM),
):
    try:
        return service.get_live_forecast(
            latitude=latitude,
            longitude=longitude,
            days=days,
            inverter_count=inverter_count,
            algorithm=algorithm,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Forecast error: {exc}")


@app.get("/api/models", tags=["Model Registry"])
def list_models():
    return service.get_models_metadata()
