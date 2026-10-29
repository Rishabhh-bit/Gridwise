import numpy as np
import pytest
from fastapi.testclient import TestClient
from backend.app import database as db
from backend.app.main import app
from backend.app.schemas import SimulationConfig
from backend.app.simulation import simulate
from backend.app.optimization import SPECS
from backend.app.ml import registry

@pytest.fixture(scope='module')
def result():return simulate(SimulationConfig())

@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setattr(db,'DB_PATH',tmp_path/'test.sqlite3')
    with TestClient(app) as c:yield c

def test_energy_and_operating_constraints(result):
    rows=result['series'];opt=result['optimization']
    assert opt['status']=='optimal'
    assert abs(opt['energy_error_mwh'])<1e-6
    for key,spec in SPECS.items():
        before=np.array([r['loads_before'][key] for r in rows]);after=np.array([r['loads_after'][key] for r in rows])
        assert abs(before.sum()-after.sum())<1e-5
        cap=next(s['capacity_mw'] for s in opt['shifts'] if s['id']==key)
        assert np.max(after)<=cap+1e-6
        if key=='hospital':assert np.allclose(before,after)
    for move in opt['transfers']:
        a,b=move['from_index'],move['to_index'];spec=SPECS[move['load']]
        assert abs(a-b)*.25<=spec['shift_hours']
        assert rows[a]['timestamp'][:10]==rows[b]['timestamp'][:10]
        hour=int(rows[b]['timestamp'][11:13]);assert spec['window'][0]<=hour<spec['window'][1]
        if move['load']=='ev':
            session=lambda hour:0 if hour<7 else 1 if hour<17 else 2
            assert session(int(rows[a]['timestamp'][11:13]))==session(hour)

def test_dispatch_conservation_and_import_limits(result):
    for r in result['series']:
        for mode in ['before','after']:
            assert r[f'grid_import_{mode}']<=result['config']['grid_capacity']+1e-6
            assert abs(r[f'demand_{mode}']-r[f'renewable_used_{mode}']-r[f'grid_import_{mode}']-r[f'unmet_{mode}'])<1e-6
            assert abs(sum(r[f'delivered_{mode}'].values())+r[f'unmet_{mode}']-r[f'demand_{mode}'])<1e-6
            assert r[f'delivered_{mode}']['hospital']==pytest.approx(.85)
    assert result['statistics']['after']['peak_mw']<=result['statistics']['before']['peak_mw']+1e-5

def test_resolution_and_model_metrics(result):
    assert len(result['series'])==96 and len(result['chart_series'])==24
    assert sum(r['demand_before'] for r in result['series'])*.25==pytest.approx(sum(r['demand_before'] for r in result['chart_series']))
    reg=registry()
    assert reg['split']['train_end']<reg['split']['validation_start']<reg['split']['test_start']
    for model in reg['models']:
        for h in ['24','48','72']:
            for freq in ['15min','hourly','daily']:
                metric=model['metrics'][h][freq]
                assert metric['points']>0 and metric['rmse']>=0 and np.isfinite(metric['mape'])

def test_disabled_flexibility_and_zero_renewables():
    r=simulate(SimulationConfig(flexibility=0,solar_capacity=0,wind_capacity=0,grid_capacity=1))
    assert r['statistics']['after']['unserved_mwh']>0
    assert r['statistics']['shifted_mwh']==pytest.approx(0,abs=1e-6)
    for row in r['series']:
        assert row['demand_before']==pytest.approx(row['demand_after'])
        assert row['renewable_mw']==0
        assert row['delivered_after']['hospital']==pytest.approx(.85)

def test_stress_scenario_and_anomaly(result):
    r=simulate(SimulationConfig(inject_anomaly=True,grid_capacity=4,irradiance_factor=.2))
    assert any(a['injected'] for a in r['alerts'])
    assert r['statistics']['before']['unserved_mwh']>0
    assert r['statistics']['after']['unserved_mwh']<=r['statistics']['before']['unserved_mwh']+1e-6
    assert r['statistics']['before']['renewable_available_mwh']<result['statistics']['before']['renewable_available_mwh']

def test_72_hours_daily_and_daily_energy():
    r=simulate(SimulationConfig(horizon=72,resolution='daily',model='transformer'))
    assert len(r['series'])==288 and len(r['chart_series'])==3
    for offset in [0,96,192]:
        for key in SPECS:
            b=sum(x['loads_before'][key] for x in r['series'][offset:offset+96])
            a=sum(x['loads_after'][key] for x in r['series'][offset:offset+96])
            assert a==pytest.approx(b)

def test_api_persistence_export_and_validation(client):
    assert client.get('/api/health').json()['models_ready']
    assert len(client.get('/api/models').json()['models'])==3
    assert client.get('/api/history?days=2').json()['series']
    config=SimulationConfig(name='API test').model_dump()
    saved=client.post('/api/scenarios',json={'name':'Saved city','config':config})
    assert saved.status_code==201
    assert any(s['name']=='Saved city' for s in client.get('/api/scenarios').json())
    response=client.post('/api/simulate',json=config);assert response.status_code==200
    r=response.json();run_id=r['id']
    assert client.get(f'/api/runs/{run_id}').json()['id']==run_id
    assert client.post(f'/api/runs/{run_id}/dispatch',json={'optimized':True}).json()['dispatch_optimized']
    assert client.get(f'/api/runs/{run_id}').json()['dispatch_optimized']
    assert 'text/csv' in client.get(f'/api/runs/{run_id}/export').headers['content-type']
    assert client.get(f'/api/runs/{run_id}/export?format=json').json()['config']['name']=='API test'
    assert client.post('/api/simulate',json={**config,'horizon':12}).status_code==422
    assert client.post('/api/simulate',json={**config,'grid_capacity':-2}).status_code==422
    assert client.get('/api/runs/missing').status_code==404

def test_offline_weather_fallback(monkeypatch):
    from backend.app import weather as module
    import httpx
    def unavailable():raise httpx.ConnectError('test offline')
    monkeypatch.setattr(module,'fetch_weather',unavailable)
    index,values,meta=module.weather(SimulationConfig(weather_mode='live'))
    assert len(index)==96 and meta['fallback'] and meta['mode']=='cached forecast'

def test_saved_model_predictions_and_reported_metrics_reproduce():
    import json
    from backend.app.config import MODELS
    from backend.app.ml import read_data,predict_from_history
    frame=read_data();reg=registry()
    preview=json.loads((MODELS/'backtest.json').read_text())
    start=frame.index.get_loc(reg['split']['test_start'])
    missing=frame.imputed.to_numpy(dtype=bool)
    origins=[i for i in range(start,len(frame)-288+1,288) if not missing[i:i+288].any()]
    for model in reg['models']:
        errors=[]
        for j,origin in enumerate(origins):
            prediction=predict_from_history(model['id'],frame.kw.iloc[:origin].to_numpy(),frame.index[:origin],frame.index[origin:origin+288])
            if j==0:assert np.allclose(prediction,preview[model['id']],atol=1e-5)
            actual=frame.kw.iloc[origin:origin+96].to_numpy().reshape(-1,4).mean(axis=1)
            errors.extend((prediction[:96].reshape(-1,4).mean(axis=1)-actual).tolist())
        assert np.abs(errors).mean()==pytest.approx(model['metrics']['24']['hourly']['mae'],abs=1e-6)
        assert np.sqrt(np.square(errors).mean())==pytest.approx(model['metrics']['24']['hourly']['rmse'],abs=1e-6)

def test_every_demo_preset_is_solvable(client):
    for scenario in client.get('/api/scenarios').json():
        r=simulate(SimulationConfig(**scenario['config']))
        assert r['optimization']['status']=='optimal'
        assert abs(r['optimization']['energy_error_mwh'])<1e-6

def test_simulation_is_deterministic(result):
    again=simulate(SimulationConfig())
    assert result['series']==again['series']
    assert result['statistics']==again['statistics']
