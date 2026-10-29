from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

LOAD_IDS = ['residential','commercial','industrial','ev','water','hvac']

class SimulationConfig(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    name: str = Field(default='Balanced city', min_length=1, max_length=80)
    model: Literal['baseline','lstm','transformer'] = 'lstm'
    horizon: Literal[24,48,72] = 24
    resolution: Literal['15min','hourly','daily'] = 'hourly'
    weather_mode: Literal['cached','live'] = 'cached'
    demand_multiplier: float = Field(default=1., ge=.5, le=2.)
    solar_capacity: float = Field(default=9., ge=0, le=25)
    wind_capacity: float = Field(default=5., ge=0, le=20)
    grid_capacity: float = Field(default=7., ge=1, le=20)
    irradiance_factor: float = Field(default=1., ge=0, le=1.5)
    wind_factor: float = Field(default=1., ge=0, le=2.)
    temperature_offset: float = Field(default=0., ge=-10, le=15)
    inject_anomaly: bool = False
    flexibility: float = Field(default=1., ge=0, le=1.)
    enabled_loads: list[Literal['residential','commercial','industrial','ev','water','hvac']] = Field(default_factory=lambda:LOAD_IDS.copy())
    objective: Literal['balanced','cost','peak'] = 'balanced'

class ScenarioCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    config: SimulationConfig

class DispatchUpdate(BaseModel):
    optimized: bool

class TrainingRequest(BaseModel):
    epochs: int = Field(default=16, ge=1, le=50)
