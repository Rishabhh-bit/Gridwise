from pathlib import Path
import os,subprocess,sys
root=Path(__file__).resolve().parents[1]
venv=root/'.venv'/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
raise SystemExit(subprocess.call([str(venv) if venv.exists() else sys.executable,'-m','pytest','backend/tests','-q'],cwd=root))
