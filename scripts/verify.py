"""Run meaningful checks and write an evidence report with freshly calculated values."""
import json
import platform
from pathlib import Path
import subprocess
import sys
from datetime import datetime,timezone

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from backend.app.schemas import SimulationConfig
from backend.app.simulation import simulate
from backend.app.ml import registry

def main():
    checked=subprocess.run([sys.executable,'-m','pytest','backend/tests','-q'],cwd=ROOT,capture_output=True,text=True)
    print(checked.stdout,flush=True)
    if checked.returncode:
        print(checked.stderr);raise SystemExit(checked.returncode)
    scenarios=[('Balanced city',{}),('Cloud front',{'irradiance_factor':.3,'wind_factor':.7,'grid_capacity':5.}),
               ('Heatwave',{'temperature_offset':10.,'demand_multiplier':1.25,'grid_capacity':5.5}),
               ('Industrial surge',{'inject_anomaly':True,'grid_capacity':5.}),
               ('Renewable surplus',{'solar_capacity':18.,'wind_capacity':10.,'demand_multiplier':.8})]
    outcomes=[]
    for name,params in scenarios:
        result=simulate(SimulationConfig(name=name,**params))
        outcomes.append({'scenario':name,'statistics':result['statistics'],'solver':result['optimization']['status'],
                         'energy_error_mwh':result['optimization']['energy_error_mwh'],'alerts':len(result['alerts'])})
    report={'verified_at':datetime.now(timezone.utc).isoformat(),'python':platform.python_version(),
            'test_summary':checked.stdout.strip().splitlines()[-1],'models_created_at':registry()['created_at'],
            'scenarios':outcomes}
    (ROOT/'docs'/'verification.json').write_text(json.dumps(report,indent=2))
    print('Wrote docs/verification.json',flush=True)

if __name__=='__main__':main()
