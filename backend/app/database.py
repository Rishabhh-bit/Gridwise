import json
import sqlite3
from datetime import datetime,timezone
from contextlib import contextmanager
from .config import DB_PATH
from .schemas import SimulationConfig

@contextmanager
def connection():
    DB_PATH.parent.mkdir(parents=True,exist_ok=True)
    db=sqlite3.connect(DB_PATH,timeout=30)
    db.row_factory=sqlite3.Row
    try:
        yield db;db.commit()
    finally:db.close()

def initialize():
    with connection() as db:
        db.executescript('''PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS scenarios(id INTEGER PRIMARY KEY,name TEXT NOT NULL,config TEXT NOT NULL,preset INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,name TEXT NOT NULL,result TEXT NOT NULL);
        ''')
        presets=[('Balanced city',{}),('Cloud front',{'irradiance_factor':.3,'wind_factor':.7,'grid_capacity':5.}),
                 ('Heatwave',{'temperature_offset':10.,'demand_multiplier':1.25,'grid_capacity':5.5}),
                 ('Industrial surge',{'inject_anomaly':True,'grid_capacity':5.}),
                 ('Renewable surplus',{'solar_capacity':18.,'wind_capacity':10.,'demand_multiplier':.8})]
        for name,params in presets:
            if db.execute('SELECT id FROM scenarios WHERE name=? AND preset=1',(name,)).fetchone():continue
            cfg=SimulationConfig(name=name,**params).model_dump()
            db.execute('INSERT INTO scenarios(name,config,preset) VALUES(?,?,1)',(name,json.dumps(cfg)))

def scenarios():
    with connection() as db:rows=db.execute('SELECT * FROM scenarios ORDER BY preset DESC,id').fetchall()
    return [{'id':r['id'],'name':r['name'],'preset':bool(r['preset']),'config':json.loads(r['config'])} for r in rows]

def save_scenario(name,config):
    with connection() as db:
        cur=db.execute('INSERT INTO scenarios(name,config,preset) VALUES(?,?,0)',(name,json.dumps(config)))
        return cur.lastrowid

def save_run(result):
    with connection() as db:
        db.execute('INSERT OR REPLACE INTO runs(id,created_at,name,result) VALUES(?,?,?,?)',(result['id'],result['created_at'],result['config']['name'],json.dumps(result)))

def get_run(run_id):
    with connection() as db:r=db.execute('SELECT result FROM runs WHERE id=?',(run_id,)).fetchone()
    return json.loads(r['result']) if r else None

def list_runs():
    with connection() as db:rows=db.execute('SELECT id,created_at,name FROM runs ORDER BY created_at DESC LIMIT 30').fetchall()
    return [dict(r) for r in rows]
