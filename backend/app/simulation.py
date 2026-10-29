from datetime import datetime, timezone
import json
import uuid
import numpy as np
from filelock import FileLock
from .config import DATA, DT, MODELS
from .ml import forecast, registry
from .weather import weather
from .optimization import optimize
from .anomalies import detect

def make_loads(household,index,conditions,config):
    h=index.hour.to_numpy()+index.minute.to_numpy()/60
    daytime=((h>=8)&(h<20)).astype(float)
    working=((h>=7)&(h<22)).astype(float)
    evening=np.exp(-((h-19)/2.3)**2)
    heat=np.maximum(conditions['temperature']-24,0)/12
    factor=config.demand_multiplier
    loads={
        'residential':(.6+.8*household)*factor,
        'commercial':(.38+1.05*daytime)*factor,
        'industrial':(1.1+1.15*working)*factor,
        'ev':(.16+.95*evening+.35*((h>=0)&(h<6)))*factor,
        'water':(.12+.38*((h>=6)&(h<9))+.38*((h>=17)&(h<20)))*factor,
        'hvac':(.3+.5*daytime+.7*heat)*factor,
        'hospital':np.full(len(h),.85),
    }
    shock=np.zeros(len(h))
    if config.inject_anomaly:
        shock[(h>=17)&(h<18.5)]=4.2
        loads['industrial']=loads['industrial']+shock
    return loads,shock

def dispatch(demand,renewable,capacity):
    used=np.minimum(demand,renewable)
    gap=np.maximum(demand-renewable,0)
    imported=np.minimum(gap,capacity)
    unmet=np.maximum(gap-capacity,0)
    return {'demand':demand,'renewable_used':used,'renewable_gap':gap,'grid_import':imported,
            'unmet':unmet,'surplus':np.maximum(renewable-demand,0)}

def statistics(d,renewable,tariff,index):
    energy=float(d['demand'].sum()*DT)
    used=float(d['renewable_used'].sum()*DT)
    return {'energy_mwh':energy,'peak_mw':float(d['demand'].max()),
            'peak_at':index[int(np.argmax(d['demand']))].isoformat()+'+05:30',
            'grid_peak_mw':float(d['grid_import'].max()),
            'import_mwh':float(d['grid_import'].sum()*DT),
            'cost_inr':float(np.dot(d['grid_import'],tariff)*1000*DT),
            'renewable_used_mwh':used, 'renewable_available_mwh':float(renewable.sum()*DT),
            'renewable_utilization_pct':used/float(renewable.sum()*DT)*100 if renewable.sum()>0 else 0.,
            'renewable_share_pct':used/energy*100 if energy>0 else 0.,
            'unserved_mwh':float(d['unmet'].sum()*DT), 'shortage_hours':float(np.count_nonzero(d['unmet']>1e-6)*DT),
            'curtailed_mwh':float(d['surplus'].sum()*DT)}

def aggregate(series,resolution):
    factor={'15min':1,'hourly':4,'daily':96}[resolution]
    if factor==1:return series
    output=[]
    for start in range(0,len(series),factor):
        rows=series[start:start+factor]
        row={'timestamp':rows[0]['timestamp'],'index':start}
        for key,value in rows[0].items():
            if key in row:continue
            if isinstance(value,dict): row[key]={k:float(np.mean([r[key][k] for r in rows])) for k in value}
            elif isinstance(value,(int,float)):row[key]=float(np.mean([r[key] for r in rows]))
        output.append(row)
    return output

def simulate(config):
    index,conditions,weather_meta=weather(config)
    # Cross-process lock prevents inference reading a half-published training bundle.
    with FileLock(str(MODELS/'.bundle.lock'),timeout=45):
        model_version=registry()['created_at']
        forecasts={kind:forecast(kind,index) for kind in ['baseline','lstm','transformer']}
        household=forecasts[config.model]
        loads,shock=make_loads(household,index,conditions,config)
        alerts,scores=detect(household,shock,index)
    renewable=conditions['solar']+conditions['wind']
    hours=index.hour.to_numpy()
    # Explicit demo tariff, not an asserted utility tariff.
    tariff=np.where((hours>=17)&(hours<22),12.,np.where((hours>=8)&(hours<17),8.,5.))
    adjusted,optimization=optimize(loads,renewable,tariff,config.grid_capacity,index,config)
    before=dispatch(np.sum(list(loads.values()),axis=0),renewable,config.grid_capacity)
    after=dispatch(np.sum(list(adjusted.values()),axis=0),renewable,config.grid_capacity)
    stats_before=statistics(before,renewable,tariff,index); stats_after=statistics(after,renewable,tariff,index)
    series=[]
    for t,stamp in enumerate(index):
        row={'timestamp':stamp.isoformat()+'+05:30','index':t,
             'solar_mw':float(conditions['solar'][t]),'wind_mw':float(conditions['wind'][t]),
             'renewable_mw':float(renewable[t]),'supply_capacity_mw':float(renewable[t]+config.grid_capacity),'tariff_inr_kwh':float(tariff[t]),
             'temperature_c':float(conditions['temperature'][t]),'wind_ms':float(conditions['wind_speed'][t]),
             'irradiance_wm2':float(conditions['irradiance'][t]),'anomaly_score':float(scores[t]),
             'injected_extra_mw':float(shock[t]),
             'loads_before':{k:float(v[t]) for k,v in loads.items()},
             'loads_after':{k:float(v[t]) for k,v in adjusted.items()}}
        for mode,values in [('before',before),('after',after)]:
            for key,value in values.items():row[f'{key}_{mode}']=float(value[t])
            # Critical-first physical allocation; requested energy remains separate.
            collection=loads if mode=='before' else adjusted
            available=float(values['demand'][t]-values['unmet'][t]); critical=float(collection['hospital'][t])
            other=float(values['demand'][t])-critical
            fraction=min(1.,max(0.,available-critical)/other) if other>0 else 1.
            row[f'delivered_{mode}']={k:float(min(v[t],available) if k=='hospital' else v[t]*fraction) for k,v in collection.items()}
        for kind,p in forecasts.items(): row[f'{kind}_kw']=float(p[t])
        series.append(row)
    return {'id':uuid.uuid4().hex[:12], 'created_at':datetime.now(timezone.utc).isoformat(),
            'config':config.model_dump(),'dispatch_optimized':False,'series':series,'chart_series':aggregate(series,config.resolution),
            'statistics':{'before':stats_before,'after':stats_after,
                          'cost_savings_inr':stats_before['cost_inr']-stats_after['cost_inr'],
                          'peak_reduction_pct':(stats_before['peak_mw']-stats_after['peak_mw'])/stats_before['peak_mw']*100,
                          'shifted_mwh':sum(s['shifted_mwh'] for s in optimization['shifts'])},
            'optimization':optimization,'alerts':alerts,'weather':weather_meta,
            'provenance':json.loads((DATA/'provenance.json').read_text()),
            'models_created_at':model_version,
            'assumptions':['City demand is simulated: 800-household equivalent plus modeled commercial/industrial/EV/HVAC/pump/hospital loads.',
                           'UCI source is a single French household from 2009–2010, not live Pune consumption. Forecasts transfer its shape to the scenario timeline.',
                           'Solar/wind are weather-derived estimates. Grid imports are simulated, capped dispatchable supply. No battery is modeled.',
                           'Forecast validation is on original household kW, not city MW. City forecasts have no measured accuracy claim.',
                           'Demo tariff: ₹5/kWh off-peak, ₹8 08–17h, ₹12 17–22h. Savings use served grid-import energy; compare unserved energy too.',
                           'Isolation Forest alerts are household-model demonstrations applied to equivalent loads, not a validated city fault diagnosis.',
                           'No AC/DC network flows, voltage, line losses, contingencies, billing demand charges, or real-time hardware control.']}
