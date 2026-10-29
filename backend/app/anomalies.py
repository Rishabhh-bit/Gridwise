from functools import lru_cache
import joblib
import numpy as np
import pandas as pd
from .config import MODELS
from .ml import read_data, calendar

def anomaly_features(values, index):
    s=pd.Series(np.asarray(values,float))
    mean=s.shift(1).rolling(96,min_periods=24).mean().bfill().clip(lower=.1)
    previous=s.shift(1).fillna(s.iloc[0])
    return np.column_stack([s/mean,(s-previous)/mean,np.log1p(s),calendar(pd.DatetimeIndex(index))[:,:2]])

@lru_cache(maxsize=2)
def detector(stamp):
    return joblib.load(MODELS/'isolation_forest.joblib')

def detect(household, shock_mw, index):
    frame=read_data().iloc[-672:]
    # Express injected industrial residual on an 800-household-equivalent scale.
    # This is a demonstration transfer of a household detector, not a city-calibrated model.
    equivalent=np.asarray(household)+shock_mw/.8
    values=np.concatenate([frame.kw.to_numpy(),equivalent])
    idx=frame.index.append(index)
    f=anomaly_features(values,idx)[-len(index):]
    model=detector((MODELS/'isolation_forest.joblib').stat().st_mtime_ns)
    scores=model.decision_function(f)
    flagged=scores<0
    alerts=[]
    for start in np.flatnonzero(flagged & ~np.r_[False,flagged[:-1]]):
        end=int(start)
        while end+1<len(flagged) and flagged[end+1]: end+=1
        injected=bool(np.max(shock_mw[start:end+1])>0)
        score=float(np.min(scores[start:end+1]))
        alerts.append({'id':f'alert-{start}', 'start_index':int(start),'end_index':end,
                       'timestamp':index[start].isoformat()+'+05:30',
                       'severity':'high' if score<-.08 else 'medium',
                       'score':score,'injected':injected,'duration_minutes':int((end-start+1)*15),
                       'title':'Industrial consumption spike' if injected else 'Unusual demand profile',
                       'explanation':'Injected equipment surge detected by Isolation Forest; check the industrial feeder.' if injected else 'The consumption level or rate of change differs from historical household patterns. Review meter readings and operating schedules.',
                       'peak_extra_mw':float(shock_mw[start:end+1].max())})
    return alerts,scores
