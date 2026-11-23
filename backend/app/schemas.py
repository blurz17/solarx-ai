"""Pydantic schemas for SolarX AI API requests and responses."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class WeatherFeatures(BaseModel):
    """User-friendly weather and time inputs (no raw sin/cos needed from user)."""
    irradiation: float = Field(0.75, ge=0.0, le=1.5, description="Solar irradiation (0.0 to 1.3 kW/m²)")
    ambient_temperature: float = Field(31.0, ge=-10.0, le=55.0, description="Ambient air temperature (°C)")
    module_temperature: Optional[float] = Field(48.0, ge=-10.0, le=85.0, description="Solar panel temperature (°C). Auto-estimated if omitted.")
    relative_humidity: float = Field(40.0, ge=0.0, le=100.0, description="Relative humidity (%)")
    cloud_cover: float = Field(25.0, ge=0.0, le=100.0, description="Cloud cover (%)")
    wind_speed: float = Field(10.0, ge=0.0, le=60.0, description="Wind speed at 10m (km/h or m/s)")
    hour: int = Field(12, ge=0, le=23, description="Hour of day (0 - 23)")


class PredictionRequest(BaseModel):
    features: WeatherFeatures
    algorithm: str = Field("Gradient Boosting", description="ML algorithm name")
    inverter_count: int = Field(1, ge=1, le=500, description="Number of inverters in the station")


class PredictionResponse(BaseModel):
    success: bool = True
    algorithm_used: str
    expected_ac_power_per_inverter: float
    total_station_ac_power: float
    inverter_count: int
    all_algorithms: Dict[str, float]
    engineered_features: Dict[str, float]


class QuickLossRequest(BaseModel):
    actual_ac_power: float = Field(..., ge=0.0, description="Measured AC power output from inverter")
    features: WeatherFeatures
    algorithm: str = Field("Gradient Boosting", description="ML algorithm name")


class QuickLossResponse(BaseModel):
    success: bool = True
    algorithm_used: str
    actual_ac_power: float
    expected_ac_power: float
    power_loss: float
    loss_percentage: float
    performance_ratio: float
    status: str
    diagnosis: str
    recommendation: str


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    models_loaded: bool
    default_algorithm: str
    algorithms_available: List[str]
