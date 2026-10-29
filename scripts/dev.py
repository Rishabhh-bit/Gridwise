"""Cross-platform supervisor: one command starts FastAPI and Vite."""
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time
import argparse
from dotenv import load_dotenv

ROOT=Path(__file__).resolve().parents[1]
load_dotenv(ROOT/'.env')
venv=ROOT/'.venv'/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
python=str(venv) if venv.exists() else sys.executable
npm=shutil.which('npm')
if not npm:raise SystemExit('Node.js/npm is required. Install Node.js 20.19+ or 22+ first.')
parser=argparse.ArgumentParser()
parser.add_argument('--port',default=os.environ.get('PORT','5173'))
args,_=parser.parse_known_args()
port=str(args.port)
processes=[]
log_path=ROOT/'backend'/'data'/'server.log'
log_path.parent.mkdir(parents=True,exist_ok=True)
def cleanup():
    for proc in processes:
        if proc.poll() is None:proc.terminate()
    for proc in processes:
        try:proc.wait(timeout=5)
        except subprocess.TimeoutExpired:proc.kill()

try:
    with log_path.open('w') as backend_log:
        processes.append(subprocess.Popen([python,'-m','uvicorn','backend.app.main:app','--host',os.getenv('GRIDWISE_HOST','127.0.0.1'),'--port','8000'],cwd=ROOT,stdout=backend_log,stderr=subprocess.STDOUT))
    processes.append(subprocess.Popen([npm,'run','dev','--','--port',port,'--strictPort'],cwd=ROOT/'frontend',shell=os.name=='nt'))
    signal.signal(signal.SIGTERM,lambda *_:sys.exit(0))
    print(f'Gridwise dashboard: http://localhost:{port}  |  API docs: http://localhost:8000/api/docs',flush=True)
    while all(p.poll() is None for p in processes):time.sleep(.5)
    if any(p.returncode for p in processes if p.returncode is not None):
        print(log_path.read_text()[-6000:],flush=True)
        raise SystemExit(1)
except KeyboardInterrupt:pass
finally:cleanup()
