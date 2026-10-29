# Verification record

This file records checks actually completed on the delivered prototype. Full calculated scenario outputs are in [verification.json](verification.json); the model registry contains the evaluation metrics.

## Automated checks

- Python 3.12.3: **11 tests passed**. The only warning is Starlette's deprecated AnyIO alias in its test client.
- `npm run build`: production frontend compilation passed.
- Energy conservation is checked for every flexible load and every simulated day, including a 72-hour run.
- Scheduling checks cover maximum displacement, operating hours, capacity limits, EV connection sessions, disabled flexible loads and the immutable hospital profile.
- Dispatch checks enforce demand = renewable use + grid import + unmet demand, grid capacity and critical-first delivery.
- Saved LSTM and Transformer weights reproduce their recorded backtest predictions. MAE/RMSE are recomputed from all 17 clean test origins.
- Tests cover all five presets, repeated-run determinism, 15-minute/hourly/daily aggregation, live-weather failure fallback, injected anomaly detection, input validation, SQLite persistence and CSV/JSON exports.

Re-run from an activated Python environment:

```bash
python scripts/verify.py
npm run build
```

## Browser checks

The dashboard was exercised through the browser with the real FastAPI backend:

- All six navigation sections render their connected data.
- Play/pause advances and freezes the simulation timeline and power values; building/source inspection reports actual run values.
- Applying optimized dispatch changes building schedules and grid import while hospital demand stays fixed at 0.85 MW.
- Scenario controls change calculated demand: increasing the demand multiplier from 1.00 to 1.05 changed the 09:00 total from 7.52 to 7.85 MW.
- The industrial-surge alert opens its 17:00 interval in the live grid, showing the shortage and critical-load delivery.
- Model selection, the 72-hour horizon and daily aggregation change the displayed predictions/metrics.
- The training button completed a real 16-epoch pipeline run (129.73 seconds) and published new artifacts. The stale-model prompt recalculated the scenario with those models.
- Disabling HVAC participation and recomputing resulted in 0.00 MWh shifted for HVAC, with its total energy unchanged. The hospital participation control remains disabled.
- A custom 72-hour scenario was saved and appeared in the scenario selector.
- Browser CSV download produced 288 rows and 55 columns for the 72-hour run.
- A 390-pixel-wide viewport was visually checked; mobile navigation reaches forecasting and the dashboard panels stack without page overflow.

## Calculated demo outcomes

These are 24-hour, LSTM, hourly-display scenarios using the bundled weather snapshot and current model bundle. MW is peak requested demand; unmet MWh includes available conventional grid supply. Positive cost change below means a saving; negative means higher grid-import expenditure.

| Scenario | Peak MW, before → after | Unmet MWh, before → after | Cost savings (INR) | Alerts |
|---|---:|---:|---:|---:|
| Balanced city | 8.96 → 7.65 | 4.09 → 0.00 | 4,989.62 | 0 |
| Cloud front | 8.96 → 7.17 | 27.85 → 25.50 | -11,769.01 | 0 |
| Heatwave | 11.72 → 11.04 | 37.92 → 35.47 | -19,593.45 | 0 |
| Industrial surge | 13.03 → 9.36 | 21.65 → 14.41 | -50,373.94 | 1 |
| Renewable surplus | 7.34 → 7.34 | 0.19 → 0.00 | 77,615.01 | 0 |

All five LP solves returned `optimal`. The largest absolute energy-conservation residual was below 3 × 10⁻¹⁴ MWh (floating-point tolerance). The balanced scenario retained 153.9671 MWh of requested energy while reducing the peak by 14.62%. The surplus scenario increased renewable utilization from 73.34% to 80.91%.

Some stressed scenarios cost more after optimization because additional demand is served. The cloud-front scenario has lower total unmet energy but more intervals with a small shortage; shortage duration alone is not the optimization objective. The application reports these tradeoffs instead of forcing positive savings.

## Validation limits

Tests establish calculation and integration behavior; they do not certify a physical grid. This is an aggregate energy-balancing simulator without AC power flow, protection systems, battery storage or field measurements of city loads. Forecast accuracy is measured on the real historical household dataset, not on Pune city demand. Anomaly severity is model-relative and has no externally labelled city fault validation. Hardware/library differences can produce small changes on retraining; the included saved artifacts and their registry are the authoritative bundled run.
