"""Train with chronological splits and evaluate recursive 24/48/72h forecasts.

Run from repository root: python -m backend.scripts.train_models --epochs 16
Only training data fits normalization. Validation chooses weights. The test set
is never used for either. Metrics exclude windows containing imputed targets.
"""
import argparse
import copy
import hashlib
import json
import os
import random
import time
from datetime import datetime, timezone
import joblib
import numpy as np
import pandas as pd
import torch
from filelock import FileLock
from sklearn.ensemble import IsolationForest
from torch.utils.data import DataLoader, TensorDataset
from backend.app.config import DATA, MODELS, SEED
from backend.app.ml import CONTEXT, BLOCK, Forecaster, calendar, read_data, predict_from_history
from backend.app.anomalies import anomaly_features

def metrics(y, p):
    error = np.asarray(p)-np.asarray(y)
    return {'mae': float(np.abs(error).mean()), 'rmse': float(np.sqrt((error**2).mean())),
            'mape': float((np.abs(error)/np.maximum(np.abs(y), .05)).mean()*100), 'points': len(y)}

def train(epochs=16):
    began = time.perf_counter()
    random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
    torch.use_deterministic_algorithms(True)
    frame = read_data()
    values = frame.kw.to_numpy(dtype='float32')
    n = len(values)
    train_end, val_end = int(n*.70)//96*96, int(n*.85)//96*96
    mean, std = float(values[:train_end].mean()), float(values[:train_end].std())
    cals = calendar(frame.index)
    inputs = np.column_stack([(values-mean)/std, cals]).astype('float32')
    missing = frame.imputed.to_numpy(dtype=bool)
    def dataset(start, end, stride):
        origins = [i for i in range(max(CONTEXT,start), end-BLOCK+1, stride) if not missing[i:i+BLOCK].any()]
        x = np.stack([inputs[i-CONTEXT:i] for i in origins])
        f = np.stack([cals[i:i+BLOCK] for i in origins])
        y = np.stack([(values[i:i+BLOCK]-mean)/std for i in origins])
        return TensorDataset(torch.from_numpy(x), torch.from_numpy(f), torch.from_numpy(y))
    training = dataset(CONTEXT, train_end, 8)
    validation = dataset(train_end, val_end, 96)
    loader = DataLoader(training, batch_size=128, shuffle=True, generator=torch.Generator().manual_seed(SEED))
    valid = DataLoader(validation, batch_size=128)
    reg = {'created_at': datetime.now(timezone.utc).isoformat(), 'seed': SEED,
           'data_sha256': hashlib.sha256((DATA/'household_15min.csv.gz').read_bytes()).hexdigest(),
           'native_resolution': '15min', 'context_steps': CONTEXT, 'output_steps': BLOCK,
           'training_windows': len(training), 'validation_windows': len(validation),
           'split': {'train_start': str(frame.index[0]), 'train_end': str(frame.index[train_end-1]),
                     'validation_start': str(frame.index[train_end]), 'validation_end': str(frame.index[val_end-1]),
                     'test_start': str(frame.index[val_end]), 'test_end': str(frame.index[-1])},
           'evaluation': 'Non-overlapping 72-hour rolling origins in untouched test data; recursive day blocks. Targets with any incomplete 15-minute bin excluded. kW per original household. MAPE denominator floor: 0.05 kW.',
           'models': []}
    staging = MODELS / '.training'
    staging.mkdir(exist_ok=True)
    trained = {}
    for kind in ['lstm', 'transformer']:
        model = Forecaster(kind)
        opt = torch.optim.AdamW(model.parameters(), lr=.002, weight_decay=.001)
        best, stale, curve = float('inf'), 0, []
        for epoch in range(epochs):
            model.train(); loss_sum=0
            for x, future, y in loader:
                opt.zero_grad()
                loss = torch.nn.functional.mse_loss(model(x, future), y)
                loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(), 1.)
                opt.step(); loss_sum += loss.item()*len(x)
            model.eval()
            with torch.inference_mode():
                vl = sum(torch.nn.functional.mse_loss(model(x,f),y).item()*len(x) for x,f,y in valid)/len(validation)
            curve.append({'epoch': epoch+1, 'train_mse_scaled': loss_sum/len(training), 'validation_mse_scaled': vl})
            print(f'{kind:12s} epoch {epoch+1:02d}/{epochs} validation MSE {vl:.5f}', flush=True)
            if vl < best - 1e-5:
                best=vl; best_state=copy.deepcopy(model.state_dict()); best_epoch=epoch+1; stale=0
            else:
                stale+=1
            if stale >= 4: break
        model.load_state_dict(best_state); model.eval()
        torch.save({'state_dict':best_state, 'mean':mean, 'std':std}, staging/f'{kind}.pt')
        trained[kind]=(model, (mean,std), {'epochs_run':len(curve), 'best_epoch':best_epoch,
                                         'parameters':sum(p.numel() for p in model.parameters()), 'learning_curve':curve})
    # Isolation Forest is trained only on historical training data, never injected events.
    features = anomaly_features(values[:train_end], frame.index[:train_end])[96:]
    detector = IsolationForest(n_estimators=160, contamination=.025, random_state=SEED, n_jobs=1)
    detector.fit(features)
    joblib.dump(detector, staging/'isolation_forest.joblib')
    origins = [i for i in range(val_end,n-288+1,288) if not missing[i:i+288].any()]
    if not origins: raise ValueError('No clean 72-hour test windows available.')
    preview = {'timestamp': [str(t) for t in frame.index[origins[0]:origins[0]+288]],
               'actual': values[origins[0]:origins[0]+288].tolist()}
    for kind in ['baseline','lstm','transformer']:
        forecasts=[]; actual=[]
        for origin in origins:
            model, scaler = trained[kind][:2] if kind in trained else (None,None)
            preds = predict_from_history(kind, values[:origin], frame.index[:origin], frame.index[origin:origin+288], model, scaler)
            forecasts.append(preds); actual.append(values[origin:origin+288])
        preview[kind] = forecasts[0].tolist()
        out = {'id':kind, 'name': {'baseline':'Seasonal baseline', 'lstm':'LSTM', 'transformer':'Lightweight Transformer'}[kind],
               'status':'trained' if kind!='baseline' else 'ready', 'test_origins':len(origins), 'metrics':{}}
        for hours in [24,48,72]:
            out['metrics'][str(hours)]={}
            for resolution,factor in [('15min',1),('hourly',4),('daily',96)]:
                yy=np.concatenate([a[:hours*4].reshape(-1,factor).mean(axis=1) for a in actual])
                pp=np.concatenate([p[:hours*4].reshape(-1,factor).mean(axis=1) for p in forecasts])
                out['metrics'][str(hours)][resolution]=metrics(yy,pp)
        out.update(trained[kind][2] if kind in trained else {'parameters':0,'description':'Repeat measurements from the same 15-minute slot one week earlier.'})
        reg['models'].append(out)
        print(kind, out['metrics']['24']['hourly'], flush=True)
    reg['training_seconds']=round(time.perf_counter()-began,2)
    reg['anomaly']={'method':'Isolation Forest', 'training_rows':len(features), 'contamination':.025,
                    'features':['load/prior-day mean','change/prior-day mean','log1p household kW','hour sine','hour cosine'],
                    'evaluation':'Unsupervised; no labelled anomaly accuracy claimed.'}
    (staging/'backtest.json').write_text(json.dumps(preview))
    (staging/'registry.json').write_text(json.dumps(reg,indent=2))
    # Each file is atomic; registry published last. Architecture stays compatible.
    with FileLock(str(MODELS/'.bundle.lock'),timeout=45):
        for name in ['lstm.pt','transformer.pt','isolation_forest.joblib','backtest.json','registry.json']:
            os.replace(staging/name, MODELS/name)
    print(f'Completed in {reg["training_seconds"]}s. Saved models and honest test metrics.',flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser(); p.add_argument('--epochs',type=int,default=16)
    args=p.parse_args()
    if not 1<=args.epochs<=100: p.error('epochs must be 1–100')
    train(args.epochs)
