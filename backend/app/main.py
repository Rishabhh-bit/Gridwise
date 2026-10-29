from contextlib import asynccontextmanager
from io import StringIO
from pathlib import Path
import csv
import json
import subprocess
import sys
import threading
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from . import database as db
from .config import DATA,MODELS
from .ml import registry,read_data
from .schemas import SimulationConfig,ScenarioCreate,DispatchUpdate,TrainingRequest
from .simulation import simulate

@asynccontextmanager
async def lifespan(app):
    db.initialize()
    yield
    proc=training.get('process')
    if proc and proc.poll() is None:
        proc.terminate()
        try:proc.wait(timeout=5)
        except subprocess.TimeoutExpired:proc.kill()

app=FastAPI(title='Gridwise Smart Grid API',version='1.0.0',lifespan=lifespan,docs_url='/api/docs',openapi_url='/api/openapi.json')
app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:5173','http://127.0.0.1:5173'],allow_methods=['*'],allow_headers=['*'])
train_lock=threading.Lock()
training={'process':None,'status':'idle'}

@app.get('/api/health')
def health():
    ready=all((MODELS/f).exists() for f in ['registry.json','lstm.pt','transformer.pt','isolation_forest.joblib']) and (DATA/'weather_snapshot.json').exists()
    return {'status':'ready' if ready else 'setup_required','models_ready':ready,'database':'SQLite','simulation_step_minutes':15}

@app.get('/api/models')
def models():return registry()

@app.get('/api/backtest')
def backtest():return json.loads((MODELS/'backtest.json').read_text())

@app.get('/api/history')
def history(days:int=Query(7,ge=1,le=366),resolution:str=Query('hourly',pattern='^(15min|hourly|daily)$')):
    data=read_data().iloc[-days*96:]
    freq={'15min':'15min','hourly':'h','daily':'D'}[resolution]
    measured=data.kw.resample(freq).mean();missing=data.imputed.resample(freq).max()
    return {'kind':'real historical household measurements (causally imputed where flagged)',
            'provenance':json.loads((DATA/'provenance.json').read_text()),
            'series':[{'timestamp':str(t),'kw':float(v),'incomplete':bool(missing.loc[t])} for t,v in measured.items()]}

@app.get('/api/scenarios')
def scenarios():return db.scenarios()

@app.post('/api/scenarios',status_code=201)
def create_scenario(body:ScenarioCreate):
    config=body.config.model_copy(update={'name':body.name}).model_dump()
    return {'id':db.save_scenario(body.name,config),'name':body.name,'config':config,'preset':False}

@app.delete('/api/scenarios/{scenario_id}')
def delete_scenario(scenario_id:int):
    with db.connection() as conn:
        row=conn.execute('SELECT preset FROM scenarios WHERE id=?',(scenario_id,)).fetchone()
        if row is None:raise HTTPException(404,'Scenario not found')
        if row['preset']:raise HTTPException(400,'Built-in demo scenarios cannot be removed')
        conn.execute('DELETE FROM scenarios WHERE id=?',(scenario_id,))
    return {'deleted':True}

@app.post('/api/simulate')
def run_simulation(config:SimulationConfig):
    try:result=simulate(config)
    except (FileNotFoundError,RuntimeError) as exc:raise HTTPException(503,str(exc)) from exc
    db.save_run(result)
    return result

@app.get('/api/runs')
def runs():return db.list_runs()

def require_run(run_id):
    result=db.get_run(run_id)
    if result is None:raise HTTPException(404,'Simulation run not found')
    return result

@app.get('/api/runs/{run_id}')
def run(run_id:str):return require_run(run_id)

@app.post('/api/runs/{run_id}/dispatch')
def dispatch_update(run_id:str,body:DispatchUpdate):
    result=require_run(run_id);result['dispatch_optimized']=body.optimized;db.save_run(result)
    return {'id':run_id,'dispatch_optimized':body.optimized}

@app.get('/api/runs/{run_id}/export')
def export(run_id:str,format:str=Query('csv',pattern='^(csv|json)$')):
    result=require_run(run_id)
    if format=='json':content=json.dumps(result,indent=2);media='application/json'
    else:
        rows=[]
        for row in result['series']:
            flat={k:v for k,v in row.items() if not isinstance(v,dict)}
            for group in ['loads_before','loads_after','delivered_before','delivered_after']:
                flat.update({f'{group}_{k}_mw':v for k,v in row[group].items()})
            rows.append(flat)
        output=StringIO();writer=csv.DictWriter(output,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
        content=output.getvalue();media='text/csv'
    return Response(content,media_type=media,headers={'Content-Disposition':f'attachment; filename="gridwise-{run_id}.{format}"'})

@app.post('/api/training',status_code=202)
def start_training(body:TrainingRequest):
    with train_lock:
        proc=training['process']
        if proc and proc.poll() is None:raise HTTPException(409,'Training is already running')
        with (DATA/'training.log').open('w') as out:
            proc=subprocess.Popen([sys.executable,'-m','backend.scripts.train_models','--epochs',str(body.epochs)],cwd=Path(__file__).resolve().parents[2],stdout=out,stderr=subprocess.STDOUT)
        training.update(process=proc,status='running')
    return {'status':'running'}

@app.get('/api/training')
def training_status():
    proc=training['process']
    if proc:
        code=proc.poll()
        training['status']='running' if code is None else ('completed' if code==0 else 'failed')
    path=DATA/'training.log'
    return {'status':training['status'],'log':path.read_text()[-7000:] if path.exists() else ''}
