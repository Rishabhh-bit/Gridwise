"""Small PyTorch sequence models; native 15-minute inference and saved holdout metrics."""
from functools import lru_cache
import json
import numpy as np
import pandas as pd
import torch
from torch import nn
from .config import DATA, MODELS

CONTEXT = 96
BLOCK = 96
torch.set_num_threads(2)

def calendar(index):
    h = index.hour.to_numpy() + index.minute.to_numpy() / 60
    d = index.dayofweek.to_numpy()
    return np.column_stack([np.sin(2*np.pi*h/24), np.cos(2*np.pi*h/24), np.sin(2*np.pi*d/7), np.cos(2*np.pi*d/7)]).astype('float32')

class Forecaster(nn.Module):
    def __init__(self, kind):
        super().__init__()
        self.kind = kind
        width = 32
        if kind == 'lstm':
            self.encoder = nn.LSTM(5, width, batch_first=True)
        else:
            self.project = nn.Linear(5, width)
            self.position = nn.Parameter(torch.randn(1, CONTEXT, width) * 0.02)
            layer = nn.TransformerEncoderLayer(width, 4, dim_feedforward=64, dropout=0.1, batch_first=True)
            self.encoder = nn.TransformerEncoder(layer, num_layers=2)
        self.head = nn.Sequential(nn.Linear(width+4, 48), nn.GELU(), nn.Linear(48, 1))

    def forward(self, x, future):
        if self.kind == 'lstm':
            _, (hidden, _) = self.encoder(x)
            context = hidden[-1]
        else:
            context = self.encoder(self.project(x) + self.position).mean(dim=1)
        context = context[:, None, :].expand(-1, future.shape[1], -1)
        return self.head(torch.cat([context, future], dim=-1)).squeeze(-1)

@lru_cache(maxsize=1)
def read_data():
    frame = pd.read_csv(DATA / 'household_15min.csv.gz', parse_dates=['timestamp']).set_index('timestamp')
    return frame

def registry():
    path = MODELS / 'registry.json'
    if not path.exists():
        raise FileNotFoundError('Models missing. Run python -m backend.scripts.train_models')
    return json.loads(path.read_text())

@lru_cache(maxsize=6)
def _load_model(kind, stamp):
    saved = torch.load(MODELS / f'{kind}.pt', map_location='cpu', weights_only=True)
    model = Forecaster(kind)
    model.load_state_dict(saved['state_dict'])
    model.eval()
    return model, float(saved['mean']), float(saved['std'])

def predict_from_history(kind, history, history_index, future_index, model=None, scaler=None):
    values = list(np.asarray(history, dtype=float))
    indices = list(history_index)
    if kind == 'baseline':
        out = []
        for _ in future_index:
            v = values[-672] if len(values) >= 672 else values[-96]
            values.append(float(v)); out.append(float(v))
        return np.array(out)
    if model is None:
        model, mean, std = _load_model(kind, (MODELS / f'{kind}.pt').stat().st_mtime_ns)
    else:
        mean, std = scaler
    result = []
    with torch.inference_mode():
        for start in range(0, len(future_index), BLOCK):
            target = future_index[start:start+BLOCK]
            past = pd.DatetimeIndex(indices[-CONTEXT:])
            x = np.column_stack([(np.array(values[-CONTEXT:])-mean)/std, calendar(past)]).astype('float32')
            y = model(torch.from_numpy(x)[None], torch.from_numpy(calendar(target))[None])[0].numpy()
            y = np.maximum(0, y*std+mean)
            result.extend(y.tolist()); values.extend(y.tolist()); indices.extend(target)
    return np.array(result)

def forecast(kind, index):
    frame = read_data()
    return predict_from_history(kind, frame.kw.to_numpy(), frame.index, index)
