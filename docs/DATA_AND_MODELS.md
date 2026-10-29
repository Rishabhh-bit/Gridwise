# Dataset, model training and provenance

## Measured demand data

Source: Georges Hebrail and Alice Berard, **Individual Household Electric Power Consumption**, UCI Machine Learning Repository, DOI [10.24432/C58K54](https://doi.org/10.24432/C58K54), licensed **CC BY 4.0**.

- [Dataset page](https://archive.ics.uci.edu/dataset/235/individualhouseholdelectricpowerconsumption)
- [Original archive](https://archive.ics.uci.edu/static/public/235/individual+household+electric+power+consumption.zip)
- Original archive SHA-256: `9f84b46ade8a2d8e1286ec4b2b6c2987a45a755c59f263be3b3b3d10dfbda3ff`

The original data contains minute-averaged active power in kW for one household near Paris. This project distributes a derived, 15-minute subset from **2009-11-25 00:00 to 2010-11-25 23:45** (35,136 slots). This is explicitly not a Pune smart-meter dataset.

`prepare_data.py` downloads the original archive, selects global active power, parses dates, sorts/deduplicates, averages each 15-minute bin, and marks bins with fewer than 15 valid minute measurements. Empty bins are filled using only preceding values. The included subset contains 1,189 incomplete bins. Leading empty bins would be dropped. Any training/evaluation target window containing incomplete bins is excluded. Historical charts expose incomplete-bin flags through the API.

`backend/data/provenance.json` records the archive hash, processed-file hash, retrieval time, original units, date range, missing-data handling and attribution. The deterministic gzip output hash is checked by the model registry.

## Chronological training

The split is rounded to complete days:

| Partition | Start | End | Use |
|---|---|---|---|
| Training | 2009-11-25 | 2010-08-07 | Fit model parameters and normalization. |
| Validation | 2010-08-08 | 2010-10-01 | Select the best epoch and early stopping. |
| Test | 2010-10-02 | 2010-11-25 | Final unseen forecast evaluation only. |

Normalization mean/std are fitted on the training partition. Inputs contain the preceding 96 consumption values plus hour/day-of-week sine/cosine features. The future head receives only future calendar features, never future measured power. Training windows use stride 8; validation windows use stride 96. Seed is 42. AdamW uses learning rate 0.002, weight decay 0.001, gradient clipping at 1, and early stopping after four non-improving validation epochs.

- **Seasonal baseline:** repeats the observed value from 672 slots (one week) earlier.
- **LSTM:** one 32-unit LSTM encoder with a calendar-conditioned MLP producing a 96-slot forecast.
- **Transformer:** 32-dimensional projection, learned 96-position encoding, two encoder layers, four attention heads, 64-dimensional feed-forward layers and dropout 0.1, followed by the same calendar-conditioned head.

For 48/72h, each neural model recursively consumes its own preceding daily predictions. Forecasts are clipped at zero to maintain nonnegative power.

## Honest accuracy reporting

Test origins are non-overlapping 72-hour windows in the untouched test partition. Windows containing incomplete targets are excluded, leaving 17 origins for the bundled run. Each model is evaluated at 24, 48 and 72h and at all three aggregation intervals. MAE and RMSE are in household kW. MAPE uses `max(abs(actual), 0.05 kW)` in the denominator to avoid unstable division near zero.

The bundled 24h, hourly-mean test results from the 2026-10-28 18:23 UTC training run are:

| Model | MAE (kW) | RMSE (kW) | MAPE |
|---|---:|---:|---:|
| Seasonal baseline | 0.743099 | 1.024376 | 86.7972% |
| LSTM | 0.519026 | 0.723947 | 58.1746% |
| Transformer | 0.533976 | 0.721846 | 67.3491% |

These modest results are not adjusted to look better. A single household is noisy; daily aggregation can reduce apparent error, so every metric is labelled by resolution/horizon. No accuracy claim is made for the synthetic city or for real-time Pune demand.

`backend/models/registry.json` is the authoritative machine-readable result, including learning curves, best epochs, parameter counts, date boundaries, sample counts and runtime. `backtest.json` contains the first clean unseen 72-hour comparison shown in the dashboard. Tests recompute model outputs and metrics from the saved artifacts.

## Anomaly detection

Isolation Forest has 160 trees, contamination 0.025 and seed 42. It is trained solely on the historical training partition, excluding the first 96 feature warmup rows. Features are load / preceding-day mean, change / preceding-day mean, log(1 + household kW), and hour sine/cosine. The model flags negative `decision_function` values; episodes below -0.08 are labelled high severity. These are model-relative severity levels, not externally validated fault categories.

In the city demonstration, injected extra industrial MW is converted into an 800-household-equivalent residual before scoring. No injected test event participates in fitting the detector. Adjacent flagged intervals form one alert. Real city faults have no provided labels, so precision/recall or fault-cause certainty is not invented.

## Weather and fonts

Weather is from [Open-Meteo](https://open-meteo.com/) at Pune coordinates 18.52, 73.85, using the [forecast API](https://open-meteo.com/en/docs). The bundled JSON contains raw hourly values, timezone, API parameters and retrieval metadata. Open-Meteo data is attributed under CC BY 4.0. A live fetch failure uses the same bundled snapshot and explicitly reports the fallback.

The locally bundled Inter Latin variable font comes from Google Fonts / the Inter project and is licensed under the SIL Open Font License. Its full license is included as `frontend/public/fonts/OFL.txt`. The dashboard does not need a font CDN at runtime.

## Artifact trust

Only the included locally produced PyTorch state dictionaries and Isolation Forest file are loaded. PyTorch uses `weights_only=True`. Scikit-learn joblib artifacts should not be replaced with untrusted downloaded pickle files. Retrain with the supplied script to create your own artifacts.
