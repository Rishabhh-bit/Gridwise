from pathlib import Path
import os
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT.parent / '.env')
DATA = ROOT / 'data'
MODELS = ROOT / 'models'
DB_PATH = Path(os.getenv('GRIDWISE_DATABASE', str(DATA / 'gridwise.sqlite3')))
DATA.mkdir(exist_ok=True)
MODELS.mkdir(exist_ok=True)
DT = 0.25  # hours; every simulation is solved at native 15-minute resolution
SEED = 42
