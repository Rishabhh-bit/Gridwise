"""Sparse transport LP: move divisible aggregate loads, never delete their energy.

Each flexible origin slot sends its full MW budget to allowed destination slots.
Equal step lengths mean conservation of power sums is also conservation of MWh.
Operating windows, source deadlines, destination capacity and daily boundaries
are hard constraints. Unserved demand is an explicit, costly physical slack.
"""
import time
import numpy as np
from scipy.optimize import linprog
from scipy.sparse import coo_matrix
from .config import DT

SPECS = {
 'residential': {'label':'Residential', 'share':.16, 'shift_hours':1, 'window':[0,24], 'headroom':1.35},
 'commercial': {'label':'Commercial', 'share':.12, 'shift_hours':2, 'window':[8,21], 'headroom':1.25},
 'industrial': {'label':'Industry', 'share':.25, 'shift_hours':2, 'window':[6,23], 'headroom':1.35},
 'ev': {'label':'EV charging', 'share':.90, 'shift_hours':6, 'window':[0,24], 'headroom':1.6},
 'water': {'label':'Water pumps', 'share':.85, 'shift_hours':8, 'window':[5,23], 'headroom':2.},
 'hvac': {'label':'HVAC', 'share':.25, 'shift_hours':1, 'window':[7,23], 'headroom':1.3},
 'hospital': {'label':'Hospital', 'share':0., 'shift_hours':0, 'window':[0,24], 'headroom':1.},
}

def optimize(loads, renewable, tariff, grid_capacity, index, config):
    start=time.perf_counter(); n=len(index)
    before=np.sum(list(loads.values()),axis=0)
    fixed={}; flexible={}; capacities={}; arcs=[]; eq_origin=[]; objective=[]; budgets=[]
    # One equality row for every source's flexible power budget.
    for key, original in loads.items():
        spec=SPECS[key]
        share=spec['share']*config.flexibility if key in config.enabled_loads else 0.
        allowed=(index.hour>=spec['window'][0])&(index.hour<spec['window'][1])
        flex=np.where(allowed,original*share,0.)
        fixed[key]=original-flex; flexible[key]=flex
        capacities[key]=np.full(n,float(original.max()*spec['headroom']))
        if share==0: continue
        radius=int(spec['shift_hours']/DT)
        for source in range(n):
            if flex[source] <= 1e-10: continue
            row=len(budgets); budgets.append(float(flex[source]))
            for target in range(max(0,source-radius),min(n,source+radius+1)):
                if not allowed[target] or index[source].date()!=index[target].date(): continue
                if key=='ev':
                    # Vehicles cannot charge before arriving or after departing.
                    # Aggregate connection sessions: 00–07, 07–17 and 17–24.
                    session=lambda hour:0 if hour<7 else 1 if hour<17 else 2
                    if session(index[source].hour)!=session(index[target].hour):continue
                arcs.append((key,source,target)); eq_origin.append(row)
                # Small per-MWh displacement cost favors minimal disruption.
                objective.append(abs(source-target)*DT*DT*8 + 1e-8*target)
    m=len(arcs); g0=m; u0=m+n; pidx=m+2*n; size=pidx+1
    cost=np.zeros(size); cost[:m]=objective
    cost[g0:g0+n]=tariff*1000*DT
    cost[u0:u0+n]=1000000*DT  # ₹/MWh lost-load penalty (scenario assumption)
    peak_weight={'cost':1000,'balanced':20000,'peak':100000}[config.objective]
    cost[pidx]=peak_weight*(n*DT/24)
    # Sparse equality matrix contains only flexible-source conservation equations.
    eq=coo_matrix((np.ones(m),(eq_origin,np.arange(m))),shape=(len(budgets),size)).tocsr()
    rows=[]; cols=[]; vals=[]; bounds_rhs=[]
    load_keys=list(loads); lmap={k:i for i,k in enumerate(load_keys)}
    fixed_total=np.sum(list(fixed.values()),axis=0)
    # n supply inequalities; n peak inequalities; per-load destination caps.
    for t in range(n):
        rows.extend([t,t]); cols.extend([g0+t,u0+t]); vals.extend([-1.,-1.])
        rows.append(n+t);cols.append(pidx);vals.append(-1.)
    bounds_rhs.extend((renewable-fixed_total).tolist())
    bounds_rhs.extend((-fixed_total).tolist())
    for key in load_keys: bounds_rhs.extend((capacities[key]-fixed[key]).tolist())
    for j,(key,source,target) in enumerate(arcs):
        rows.extend([target,n+target,2*n+lmap[key]*n+target]); cols.extend([j,j,j]); vals.extend([1.,1.,1.])
    ub=coo_matrix((vals,(rows,cols)),shape=(len(bounds_rhs),size)).tocsr()
    bounds=[(0,None)]*m+[(0,grid_capacity)]*n+[(0,None)]*n+[(0,float(before.max())+1e-7)]
    result=linprog(cost,A_ub=ub,b_ub=np.array(bounds_rhs),A_eq=eq if budgets else None,b_eq=np.array(budgets) if budgets else None,
                   bounds=bounds,method='highs',options={'time_limit':30})
    if not result.success:
        raise RuntimeError(f'Optimization failed ({result.status}): {result.message}')
    after={key:v.copy() for key,v in fixed.items()}; transfers=[]
    for j,(key,source,target) in enumerate(arcs):
        amount=max(0.,float(result.x[j])); after[key][target]+=amount
        if source!=target and amount>1e-6:
            transfers.append({'load':key,'from_index':source,'to_index':target,'energy_mwh':amount*DT})
    shifts=[]
    for key in loads:
        delta=after[key]-loads[key]
        moved=float(np.abs(delta).sum()*DT/2)
        differences=float((after[key].sum()-loads[key].sum())*DT)
        if abs(differences)>1e-5: raise RuntimeError(f'Energy conservation failed for {key}')
        spec=SPECS[key]
        shifts.append({'id':key,'name':spec['label'],'critical':key=='hospital',
                       'energy_before_mwh':float(loads[key].sum()*DT),'energy_after_mwh':float(after[key].sum()*DT),
                       'shifted_mwh':moved,'max_shift_hours':spec['shift_hours'],
                       'flexible_share':spec['share']*config.flexibility if key in config.enabled_loads else 0,
                       'operating_window':f'{spec["window"][0]:02d}:00–{spec["window"][1]:02d}:00',
                       'capacity_mw':float(capacities[key][0]),
                       'largest_reduction_at':int(np.argmin(delta)), 'largest_increase_at':int(np.argmax(delta))})
    return after, {'status':'optimal','solver':'SciPy HiGHS (linear programming)',
                   'seconds':round(time.perf_counter()-start,3),'variables':size,
                   'energy_error_mwh':float(sum(v.sum() for v in after.values())*DT-before.sum()*DT),
                   'shifts':shifts,'transfers':transfers,
                   'assumptions':'Divisible aggregate loads. Same-day moves only; HVAC ≤1h, industry ≤2h, EV ≤6h within 00–07 / 07–17 / 17–24 connection sessions, pumps ≤8h. Operating windows and feeder caps enforced. Hospitals fixed. This is not a unit-level machine scheduling or AC power-flow solver.'}
