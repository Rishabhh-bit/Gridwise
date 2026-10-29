"""Open-Meteo forecast access, explicit cached fallback, and engineering estimates."""
from datetime import datetime, timezone
import json
import httpx
import numpy as np
import pandas as pd
from .config import DATA

URL = 'https://api.open-meteo.com/v1/forecast'
PARAMS = {'latitude':18.52, 'longitude':73.85,
          'hourly':'temperature_2m,shortwave_radiation,wind_speed_10m',
          'wind_speed_unit':'ms','forecast_days':4,'timezone':'Asia/Kolkata'}

def fetch_weather():
    with httpx.Client(timeout=15) as client:
        response = client.get(URL,params=PARAMS)
        response.raise_for_status()
        payload = response.json()
    h=payload['hourly']
    arrays=[np.asarray(h[k],dtype=float) for k in ['temperature_2m','shortwave_radiation','wind_speed_10m']]
    if len(h['time'])<96 or any(len(a)!=len(h['time']) or not np.isfinite(a).all() for a in arrays):
        raise ValueError('Incomplete weather forecast returned by Open-Meteo')
    return {'retrieved_at':datetime.now(timezone.utc).isoformat(), 'source_url':URL,
            'params':PARAMS, 'license':'CC BY 4.0; Open-Meteo', 'payload':payload}

def weather(config):
    fallback=None
    if config.weather_mode == 'live':
        try:
            snapshot=fetch_weather(); mode='live forecast'
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            fallback=f'Live weather unavailable ({type(exc).__name__}); using bundled snapshot.'
            snapshot=json.loads((DATA/'weather_snapshot.json').read_text()); mode='cached forecast'
    else:
        snapshot=json.loads((DATA/'weather_snapshot.json').read_text()); mode='cached forecast'
    h=snapshot['payload']['hourly']
    hourly=pd.DatetimeIndex(h['time'])
    index=pd.date_range(hourly[0],periods=config.horizon*4,freq='15min')
    # Weather hourly means are held across four slots, conserving irradiance energy.
    n=len(index)
    radiation=np.repeat(np.array(h['shortwave_radiation'],float),4)[:n]*config.irradiance_factor
    wind10=np.repeat(np.array(h['wind_speed_10m'],float),4)[:n]*config.wind_factor
    temperature=np.repeat(np.array(h['temperature_2m'],float),4)[:n]+config.temperature_offset
    # Simplified PV model: horizontal GHI, 0.86 system performance ratio and temperature derating.
    cell_temp=temperature+(.03*radiation)
    solar=np.clip(config.solar_capacity* radiation/1000*.86*(1-.004*(cell_temp-25)),0,config.solar_capacity)
    hub_wind=wind10*(80/10)**.14
    # Cubic power curve, cut-in 3 m/s, rated 12 m/s, cut-out 25 m/s.
    capacity_factor=np.where((hub_wind>=3)&(hub_wind<12),(hub_wind**3-3**3)/(12**3-3**3),np.where((hub_wind>=12)&(hub_wind<25),1.,0.))
    wind=config.wind_capacity*capacity_factor
    return index, {'temperature':temperature, 'irradiance':radiation, 'wind_speed':hub_wind, 'solar':solar,'wind':wind}, {
        'mode':mode, 'retrieved_at':snapshot['retrieved_at'], 'forecast_start':str(hourly[0]),
        'timezone':'Asia/Kolkata', 'location':'Pune, India (18.52, 73.85)', 'source':'Open-Meteo',
        'source_url':'https://open-meteo.com/', 'fallback':fallback,
        'generation_kind':'Engineering estimate; no measured generation is available.',
        'temporal_method':'Hourly weather held constant across its four 15-minute slots.',
        'assumptions':'PV: GHI proxy, 0.86 performance ratio, -0.4%/°C cell-temperature coefficient. Wind: 80m hub, 0.14 shear exponent, 3/12/25 m/s cut-in/rated/cut-out.'}
