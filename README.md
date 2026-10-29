# Gridwise — Smart Grid Energy Intelligence & 3D Blueprint Digital Twin

[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/)
[![React 19](https://img.shields.io/badge/react-19.1.0-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688.svg)](https://fastapi.tiangolo.com/)
[![Three.js](https://img.shields.io/badge/Three.js-0.186.1-black.svg)](https://threejs.org/)
[![Tests](https://img.shields.io/badge/tests-29%20passed-brightgreen.svg)]()

Gridwise is a production-grade, local energy intelligence platform and **3D Blueprint Digital Twin** for microgrid operations. It connects real historical household electricity forecasting, weather-driven renewable generation models, constrained demand-response optimization (SciPy HiGHS LP), unsupervised consumption anomaly detection (Isolation Forest), and an interactive continuous 3D digital twin of a smart city network.

---

## Table of Contents

1. [Executive Summary & Core Philosophy](#1-executive-summary--core-philosophy)
2. [Full Technology Stack & Architecture](#2-full-technology-stack--architecture)
3. [Datasets Used & Data Provenance](#3-datasets-used--data-provenance)
4. [Machine Learning Models & Training Pipeline](#4-machine-learning-models--training-pipeline)
5. [Demand Response: Transport Linear Program](#5-demand-response-transport-linear-program)
6. [3D Blueprint Digital Twin World](#6-3d-blueprint-digital-twin-world)
7. [Step-by-Step Live Workflow & User Guide](#7-step-by-step-live-workflow--user-guide)
8. [Setup, Installation & Running Locally](#8-setup-installation--running-locally)
9. [Automated Verification & Test Suite](#9-automated-verification--test-suite)
10. [Directory Structure](#10-directory-structure)

---

## 1. Executive Summary & Core Philosophy

Energy grid simulations often suffer from two major flaws: they either display flat, static toy charts, or they present flashy 3D game engines powered by completely fabricated random numbers. Gridwise bridges this gap with rigorous engineering:

- **Zero Fabricated Numbers**: Every single number, line thickness, pulse frequency, and blade rotation in the UI and 3D simulation comes directly from the calculated dispatch timeline produced by the backend models.
- **Data Honesty & Provenance Badging**: Every data point is tagged with its origin badge:
  - `[H]` **Real Historical**: Measured meter readings from the UCI dataset (in kW).
  - `[P]` **Predicted**: Neural model forecasts (LSTM / Transformer) driving baseline demand.
  - `[E]` **Estimated**: Engineering conversions from real Open-Meteo weather physics (PV irradiance & wind speed).
  - `[S]` **Simulated**: Synthetic city load profiles and tariffs before optimization.
  - `[O]` **Optimized**: Exact output of the linear program solver.
  - `≈ equal share`: Equipment-level allocations where sub-metered telemetry does not exist.
- **Physical Conservation Laws**: Energy is shifted, never created or deleted. Hospital load is strictly protected and immutable. If supply is insufficient, unserved demand is honestly reported rather than hidden behind inflated savings figures.

---

## 2. Full Technology Stack & Architecture

```mermaid
flowchart TD
  subgraph Data Layer
    UCI["UCI Historical Meter Readings<br/>(35,136 slots @ 15-min)"]
    METEO["Open-Meteo Pune Forecast API<br/>(GHI, Temp, Wind @ 10m)"]
  end

  subgraph Backend (Python 3.12 / FastAPI)
    PYTORCH["PyTorch Sequence Models<br/>(LSTM / Transformer / Baseline)"]
    PHYSICS["Renewable Engineering Physics<br/>(Cell Temp, GHI & 80m Wind Shear)"]
    HIGHS["SciPy HiGHS LP Solver<br/>(Energy-Preserving Transport Matrix)"]
    IFOREST["Scikit-learn Isolation Forest<br/>(160 Trees Contamination 0.025)"]
    SQLITE["SQLite Database (WAL Mode)<br/>(Scenarios & Versioned Runs)"]
  end

  subgraph Frontend (React 19 / Vite 6)
    APP["App.jsx Shell & Hash Navigation"]
    PAGES["6 Domain Pages: Overview, Forecast,<br/>Simulation, Response, Anomalies, Reports"]
    R3F["Three.js / React Three Fiber<br/>(Blueprint 3D Digital Twin Engine)"]
    INVARIANTS["Invariants Verifier<br/>(Live Browser Physical Balance Check)"]
  end

  UCI --> PYTORCH
  METEO --> PHYSICS
  PYTORCH --> HIGHS
  PHYSICS --> HIGHS
  PYTORCH --> IFOREST
  HIGHS --> SQLITE
  IFOREST --> SQLITE
  SQLITE --> APP
  APP --> PAGES
  PAGES --> R3F
  R3F --> INVARIANTS
```

### Backend
- **Python 3.12**: Core runtime.
- **FastAPI 0.115+**: High-performance RESTful API with Pydantic v2 schemas and interactive Swagger docs (`/api/docs`).
- **PyTorch 2.7.1**: Deep learning sequence forecasting (`LSTM`, `TransformerEncoder`).
- **SciPy 1.15+ (HiGHS Solver)**: Solves the large, sparse demand-response transport linear program.
- **Scikit-learn 1.6+**: Unsupervised Isolation Forest for real-time consumption deviation scoring.
- **SQLite 3 (WAL Mode)**: Atomic, zero-dependency persistence for scenario presets and versioned runs.
- **Uvicorn**: Asynchronous ASGI server.

### Frontend
- **React 19.1.0 & Vite 6.3.5**: Fast rendering, strict state management, and optimized Rollup build pipelines.
- **Three.js 0.186.1 & @react-three/fiber 9.8.2**: Hardware-accelerated 3D WebGL rendering engine with custom shaders.
- **Recharts 2.15.3**: Native 15-minute, hourly, and daily aggregated time-series visualizations.
- **Lucide React 0.468.0**: Icon system.
- **Vitest 3.2.7**: In-browser unit testing framework.
- **Local Typography**: Inter Latin variable font bundled locally (`/fonts/inter.woff2`) — 100% offline-ready, no CDN dependencies.

---

## 3. Datasets Used & Data Provenance

### 1. UCI Individual Household Electric Power Consumption
- **Origin**: Georges Hebrail and Alice Berard, Sceaux, France (near Paris), 2009–2010.
- **DOI & License**: [10.24432/C58K54](https://doi.org/10.24432/C58K54), Creative Commons Attribution 4.0 International (**CC BY 4.0**).
- **Archive SHA-256**: `9f84b46ade8a2d8e1286ec4b2b6c2987a45a755c59f263be3b3b3d10dfbda3ff`.
- **Derived Subset**: 35,136 continuous 15-minute intervals spanning **2009-11-25 00:00 to 2010-11-25 23:45**.
- **Preprocessing & Cleaning**:
  - Raw 1-minute measurements aggregated into 15-minute intervals.
  - Bins with fewer than 15 valid readings marked with `incomplete=true` (1,189 incomplete bins).
  - Empty bins filled causally using only preceding values (no future leakage).
  - Any evaluation or training target window intersecting incomplete bins is completely excluded.

### 2. Open-Meteo Pune Weather Forecast & Snapshot
- **Origin**: Open-Meteo API for Pune, India (`18.5204° N, 73.8567° E`).
- **License**: CC BY 4.0.
- **Variables**: Hourly Global Horizontal Irradiance ($GHI$, in $\text{W/m}^2$), 2m Ambient Temperature ($T_{air}$, in °C), and 10m Wind Speed ($v_{10}$, in $\text{m/s}$).
- **Offline Reliability**: Bundled local snapshot (`backend/data/weather_snapshot.json`) ensures zero network requirement during testing. Live API requests fall back gracefully with clear provenance tags.

### 3. Pune Microgrid Synthetic City Loads
City demand is scaled from the household baseline into an 800-household equivalent residential feeder plus 6 explicit aggregate sectors:
- **Residential**: Base profile shaped by neural forecasts.
- **Commercial**: Retail/office profile active 08:00–21:00.
- **Industrial**: Heavy machinery profile active 06:00–23:00.
- **EV Charging**: 3 connection sessions per day (00:00–07:00 overnight, 07:00–17:00 workplace, 17:00–24:00 evening).
- **Water Pumps**: Municipal pumping active 05:00–23:00.
- **HVAC**: Temperature-sensitive cooling load active 07:00–23:00.
- **Hospital**: Essential healthcare facility fixed at **0.85 MW** (strictly immutable, highest supply priority).

---

## 4. Machine Learning Models & Training Pipeline

### Chronological Splitting (No Future Leakage)
Data is split strictly chronologically by calendar day:
- **Training Set (70%)**: 2009-11-25 to 2010-08-07 (used for model weights and z-score normalization mean/std).
- **Validation Set (15%)**: 2010-08-08 to 2010-10-01 (early stopping and model selection).
- **Test Set (15%)**: 2010-10-02 to 2010-11-25 (held-out evaluation across 17 non-overlapping 72-hour windows).

```
[------------- Training 70% -------------][--- Validation 15% ---][------ Test 15% ------]
2009-11-25                             2010-08-07              2010-10-01              2010-11-25
```

### Models Implemented
1. **Seasonal Baseline**:
   - Copies observed power from exactly 1 week (672 fifteen-minute slots) earlier.
2. **LSTM Sequence Forecaster**:
   - Input: Preceding 96 slots (24 hours) of consumption + cyclical sine/cosine features for hour-of-day and day-of-week.
   - Architecture: 32-unit LSTM encoder with calendar-conditioned MLP prediction head outputting the next 96 slots.
   - Recursive Multi-Step: For 48h and 72h horizons, preceding model forecasts are fed recursively into subsequent steps.
3. **Transformer Forecaster**:
   - Input: 32-dimensional linear projection + learned 96-position positional encoding.
   - Architecture: 2 Transformer Encoder layers, 4 multi-head self-attention heads, 64-dimensional feed-forward network, dropout 0.1, and calendar-conditioned projection head.
4. **Isolation Forest Anomaly Detector**:
   - 160 decision trees, contamination 0.025, trained purely on historical training data.
   - Feature Vector: $[\text{load} / \mu_{\text{prior\_day}}, \Delta\text{load} / \mu_{\text{prior\_day}}, \log(1 + \text{kW}), \sin(\text{hour}), \cos(\text{hour})]$.
   - Negative scores indicate consumption deviations; scores below -0.08 represent high severity.

### Verified Holdout Test Results (24h Horizon, Hourly Mean)

| Model | MAE (kW) | RMSE (kW) | MAPE |
|---|---:|---:|---:|
| **Seasonal Baseline** | 0.7431 | 1.0244 | 86.80% |
| **LSTM** | **0.5190** | **0.7239** | **58.17%** |
| **Transformer** | 0.5340 | 0.7218 | 67.35% |

*(Note: Raw household electricity readings are inherently volatile. Errors are reported honestly in original kW without deceptive smoothing).*

---

## 5. Demand Response: Transport Linear Program

Gridwise formulates demand response as a **constrained energy-transport linear program** solved with SciPy HiGHS:

$$\min \sum_{l, s, t} \left( c_{\text{import}}(t) + w_{\text{peak}} \cdot P_{\text{peak}} + w_{\text{shift}} \cdot |s - t| \right) x_{l,s,t} + w_{\text{unmet}} \cdot U(t)$$

### Hard Physical Constraints:
1. **Strict Energy Conservation**:
   $$\sum_{t} x_{l,s,t} = \text{Original Flexible Power}_{l,s} \quad \forall l, s$$
   Energy can never be destroyed or fabricated to make numbers look favorable.
2. **Operating Windows & Maximum Displacement**:
   - Residential: $\pm 1\,\text{h}$, window 00:00–24:00 (16% flexible).
   - Commercial: $\pm 2\,\text{h}$, window 08:00–21:00 (12% flexible).
   - Industrial: $\pm 2\,\text{h}$, window 06:00–23:00 (25% flexible).
   - EV Charging: $\pm 6\,\text{h}$, isolated within each arrival/departure session (90% flexible).
   - Water Pumps: $\pm 8\,\text{h}$, window 05:00–23:00 (85% flexible).
   - HVAC: $\pm 1\,\text{h}$, window 07:00–23:00 (25% flexible).
   - **Hospital**: $0\,\text{h}$, strictly **0% flexible** (0.85 MW immutable).
3. **Feeder Capacity Limits**:
   $$\text{Fixed Load}_{l,t} + \sum_{s} x_{l,s,t} \le \text{Capacity}_{l} \quad \forall l, t$$
4. **Feeder Headroom & Peak Suppression**:
   Optimized peak demand cannot exceed the original unconstrained peak.
5. **Physical Dispatch Accounting**:
   $$\text{Demand} = \text{Renewable Used} + \text{Grid Import} + \text{Unmet Demand}$$
   If grid import ceiling ($\le 7\,\text{MW}$) and renewables are insufficient, hospital is served first, and remaining power is prorated with unserved energy honestly recorded.

---

## 6. 3D Blueprint Digital Twin World

The **Live Grid Simulation** view features a complete, hardware-accelerated 3D Blueprint Digital Twin (`src/world/`):

```
                   [City Level - Depth 2]
                   Camera: 650m - 1300m
                   Pune Microgrid (675m x 435m)
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
[Site Level - Depth 1]           [Equipment Level - Depth 0]
Camera: 70m - 220m               Camera: 8m - 40m
11 Detailed Architectural Sites  Exploded Asset Callouts
Shift Ribbons & Headroom Heat    Power Curves & Share Allocations
```

### Architectural & Drafting Details ("Not-a-Box" Rules)
- **Extruded Polygons**: Buildings are extruded from architectural footprint polygons with 0.25m wall thickness, window sill details, entrance canopies, and rooftop equipment penthouses.
- **Sawtooth Factory Hall**: Industrial site features a 4-bay sawtooth roof profile, loading dock indent, tall chimney, and dedicated transformer yard.
- **Podium + Tower**: Commercial site features a 2-storey retail podium with a setback office tower.
- **Substation Yard**: Central hub features high-voltage busbar gantries, perimeter security fence, control house, and 2 dual transformer bays with radiators and porcelain bushings.
- **Wind Farm**: Ridge line with 80m tapered towers, nacelles, and 3 aerofoil blades rotating according to wind generation (stationary if wind speed $< 3\,\text{m/s}$ cut-in).
- **Solar Field**: Tilted PV racks (22° angle) with instanced 2x6 module tables and central inverter pads.
- **EV Station**: 8 dedicated parking bays with charging pedestals, vehicle silhouettes, step-down transformer, and cantilever canopy.
- **Catenary Power Cables**: True parabolic sagging cables hang between transmission towers and the hub with moving dash pulses representing power flow.
- **Live Integrity Badge**: Continuously checks 8 physical invariants in browser memory (energy conservation, star balance, feeder headroom, hospital protection).
- **HUD Overlays**: Architectural Title Block (with `P E S O` legend), Breadcrumb level navigation, Lenses (Flows, Shifts, Alerts, Compare), and in-canvas interactive Timeline Strip.

---

## 7. Step-by-Step Live Workflow & User Guide

### Step 1: Launch the Application
Run one command from the project root:
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### Step 2: Explore the Live 3D Simulation
1. Click **Live Grid Simulation** in the left sidebar.
2. In the top-right of the panel, use the segmented switch to select **3D World** (or **Diagram** for the 2D SVG view).
3. Press **Play** (or tap `Space`) on the playback bar.
   - Watch the 15-minute simulation clock advance.
   - Observe the catenary lines pulse faster and thicker as megawatts flow.
   - Notice wind turbine blades rotate when wind speed exceeds $3\,\text{m/s}$ and stand stationary when below cut-in.
   - Watch the sun glow brighten and dim based on solar irradiance.

### Step 3: Zoom Through the Semantic Layers
1. **City Level (Depth 2)**: View the entire microgrid layout.
2. **Site Level (Depth 1)**: Click any node (e.g. `EV charging` or `Industry`) or use the Arrow keys. The camera glides down to 130m. Notice neighboring sites fade into ghost blueprint outlines while the focused site linework reveals in full.
3. **Equipment Level (Depth 0)**: Double-click the selected site or press `]`. The camera eases down to 20m. View exploded equipment parts (e.g. wind turbine cutaway, PV table tilt angle, transformer bushings) with honest `≈ equal share` labels.
4. Press `Escape`, `[`, or double-click ground to zoom back out to City level.

### Step 4: Run Demand Response & Load Shifting
1. Click **Apply optimized plan** in the bottom control bar.
2. The simulation instantly updates to the solved LP dispatch:
   - In the in-canvas timeline strip, observe the **hollow dashed bars** (original schedule) alongside **solid green bars** (optimized schedule).
   - In Site view, see curved 3D **shift ribbons** showing energy moving from peak to off-peak hours.
   - Look at the top-right **Integrity Badge**: it reads `Energy conserved · balance OK` (confirming zero energy was lost).

### Step 5: Follow the Shortage Guided Tour
1. In the 3D canvas, click **Follow Shortage Tour** in the top-right corner.
2. The tour guides you step-by-step:
   - **Step 1**: Identifies the evening peak shortage window where demand exceeds grid + renewables.
   - **Step 2**: Zooms to the Central Substation showing the grid import ceiling.
   - **Step 3**: Flies to the load with the largest shift (e.g. EV Charging), showing transfer ribbons.
   - **Step 4**: Enters Equipment level to examine charger shares.
   - **Step 5**: Returns to City view showing how unserved energy was brought to 0.00 MWh.

### Step 6: Test Scenarios & Injected Anomalies
1. Use the **SCENARIO** selector in the context bar:
   - **Balanced city**: Standard default scenario.
   - **Cloud front**: Reduced solar and wind, thicker utility grid import line.
   - **Heatwave**: +10 °C offset, HVAC load surges, triggering supply constraints.
   - **Industrial surge**: Injects a +4.2 MW spike between 17:00 and 18:30.
   - **Renewable surplus**: Oversized solar/wind capacity showing spill/curtailment chevrons.
2. Navigate to **Anomaly Detection** in the sidebar:
   - View the Isolation Forest score curve.
   - Click **Inspect** on any alert: the app automatically navigates to Live Simulation, sets the exact slot, and focuses the affected site (`Industry` for injected surges, `Residential` for baseline anomalies).

### Step 7: Train & Evaluate Forecasting Models
1. Navigate to **AI Forecasting** in the sidebar.
2. Switch between **Seasonal Baseline**, **LSTM**, and **Transformer**.
3. Toggle tabs between **Scenario forecast**, **Holdout comparison** (unseen 72h test window), and **Real historical data**.
4. Click **Train models** to run a live CPU training run (1–50 epochs) with real-time early stopping logs and automated artifact updating.

### Step 8: Export Audit Reports
1. Navigate to **Analytics & Reports**.
2. Click **Export CSV** to download the complete 96/192/288-row dispatch time series with all 55 per-load power columns.
3. Click **Full JSON report** to download inputs, model configurations, solver transfers, and provenance data.

---

## 8. Setup, Installation & Running Locally

### System Prerequisites
- **Python**: Version `3.12.x`
- **Node.js**: Version `20.19+` or `22+`
- **npm**: Version `10+`
- **Disk Space**: ~1 GB for virtual environment and node_modules

### Quick Start (macOS / Linux)
```bash
# 1. Navigate to the project root
cd "smart-grid"

# 2. Run automated setup (creates .venv, installs PyTorch CPU & dependencies)
bash scripts/setup.sh

# 3. Start development servers
npm run dev
```

### Quick Start (Windows PowerShell)
```powershell
# 1. Navigate to the project root
cd "smart-grid"

# 2. Run automated setup
.\scripts\setup.ps1

# 3. Start development servers
npm run dev
```

### Manual Setup (If scripts are restricted)
```bash
# 1. Backend virtual environment
cd "smart-grid"
python3.12 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install torch==2.7.1 --index-url https://download.pytorch.org/whl/cpu
pip install -r backend/requirements.txt

# 2. Frontend dependencies
npm --prefix frontend install

# 3. Launch both servers with supervisor
npm run dev
```

The application will be live at:
- Dashboard: **`http://localhost:5173`**
- FastAPI Documentation: **`http://localhost:8000/api/docs`**

---

## 9. Automated Verification & Test Suite

Gridwise includes a comprehensive automated test suite verifying both Python backend algorithms and Frontend 3D WebGL modules.

To execute the entire suite:
```bash
cd "smart-grid"
npm test
```

### What `npm test` checks:
1. **Python System Tests (11 tests)**:
   - Energy conservation across all flexible loads and all days.
   - Operating windows, maximum shift distances, and EV session boundaries.
   - Star balance: $\text{Solar} + \text{Wind} + \text{Grid Import} = \sum \text{Delivered}$.
   - Hospital load immutability (always 0.85 MW, never shifted).
   - Critical-first supply rationing under shortages.
   - PyTorch model determinism against saved weights.
   - Isolation Forest anomaly detection scoring.
   - API endpoints, SQLite persistence, and CSV/JSON export integrity.
2. **Frontend Vitest Suite (18 tests)**:
   - **Token Synchronization**: Proves all 12 design tokens in `tokens.js` match `styles.css` and `POWER_LINES`.
   - **City Layout Topology**: Validates `city.json` polygons, non-self-intersection, zero site overlaps, and direct hub connectivity.
   - **Physics Invariants & Negative Corruption Tests**: Proves `invariants.js` passes on valid runs and deliberately catches corrupted delivered power, daily conservation violations, and hospital alterations.
   - **Selectors & Star Balance**: Proves derived flows balance to $< 10^{-9}\,\text{MW}$.
   - **Site Part Counts & Tags**: Verifies exactly 8 EV bays, $\lceil \text{capacity} / 2.5 \rceil$ wind turbines, $\lfloor \text{capacity} / 0.75 \rceil$ PV tables, and strict `userData` tagging on all meshes.
3. **World Linter (`lint-world.mjs`)**:
   - Strictly enforces that `BoxGeometry` is never instantiated outside `src/world/parts/primitives/`.
   - Strictly enforces that `Math.random` is never called under `src/world/`.

---

## 10. Directory Structure

```
smart-grid/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entrypoint and routes
│   │   ├── simulation.py      # City load builder and dispatch accounting
│   │   ├── optimization.py    # SciPy HiGHS LP load transport solver
│   │   ├── ml.py              # PyTorch model architectures and inference
│   │   ├── weather.py         # PV & wind engineering generation curves
│   │   ├── database.py        # SQLite database operations
│   │   └── schemas.py         # Pydantic v2 validation models
│   ├── data/
│   │   ├── household_15min.csv.gz # Cleaned 15-minute UCI demand dataset
│   │   ├── weather_snapshot.json  # Cached Open-Meteo Pune forecast snapshot
│   │   ├── provenance.json        # Dataset SHA-256 hashes and metadata
│   │   └── gridwise.sqlite3       # SQLite database file
│   ├── models/
│   │   ├── lstm.pt            # Trained PyTorch LSTM weights
│   │   ├── transformer.pt     # Trained PyTorch Transformer weights
│   │   ├── isolation_forest.joblib # Trained Isolation Forest model
│   │   ├── registry.json      # Machine-readable evaluation metrics
│   │   └── backtest.json      # Unseen 72h test window evaluation data
│   └── tests/
│       └── test_system.py     # 11 comprehensive backend Python tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Pages.jsx      # Domain views (Overview, Simulation, etc.)
│   │   │   ├── UI.jsx         # Extended NodeInspector, Playback, Forms
│   │   │   ├── Charts.jsx     # Recharts time-series and power curves
│   │   │   └── GridScene.jsx  # Accessible 2D SVG city diagram fallback
│   │   ├── world/             # 3D Blueprint Digital Twin Engine
│   │   │   ├── GridWorld3D.jsx # R3F Canvas, camera rig, event loop
│   │   │   ├── tokens.js      # Palette design tokens
│   │   │   ├── selectors.js   # Typed arrays, derived flows & shifts
│   │   │   ├── invariants.js  # Live browser physics verifier (8 laws)
│   │   │   ├── zoom.js        # Continuous depth & camera damping
│   │   │   ├── layout/        # city.json schematic layout & validator
│   │   │   ├── levels/        # City.jsx, Site.jsx, Equipment.jsx
│   │   │   ├── sites/         # 11 modular site builders (solar, wind, etc.)
│   │   │   ├── parts/         # Architecture, energy, grid, site & primitives
│   │   │   ├── materials/     # Custom shaders (grid floor, flow line, hatch)
│   │   │   ├── fx/            # Flows, shift ribbons, anomaly beacons, pulses
│   │   │   ├── hud/           # TitleBlock, Breadcrumb, Lenses, TimelineStrip
│   │   │   ├── tour/          # Guided shortage walk-through generator
│   │   │   ├── world.css      # Blueprint HUD styling
│   │   │   └── __tests__/     # 18 Vitest unit tests & fixtures
│   │   ├── App.jsx            # Top-level application shell & state
│   │   ├── api.js             # API client, number formatters, clock
│   │   └── styles.css         # Gridwise light sage styling
│   ├── scripts/
│   │   └── lint-world.mjs     # Static rule linter (no BoxGeometry, no random)
│   └── vite.config.js         # Manual chunking and dev proxy settings
├── docs/
│   ├── ARCHITECTURE.md        # Mathematical algorithms and equations
│   ├── DATA_AND_MODELS.md     # Data provenance and machine learning specs
│   └── VERIFICATION.md        # Records of verification runs
├── scripts/
│   ├── dev.mjs                # Node supervisor entrypoint
│   ├── dev.py                 # Cross-platform supervisor (FastAPI + Vite)
│   ├── test.py                # Pytest test runner
│   ├── setup.sh               # macOS/Linux setup script
│   └── setup.ps1              # Windows setup script
└── package.json               # Root workspace scripts
```

---

## License

- Source code: MIT License.
- UCI Household Dataset: Creative Commons Attribution 4.0 International (CC BY 4.0).
- Open-Meteo Weather Data: Creative Commons Attribution 4.0 International (CC BY 4.0).
- Inter Font: SIL Open Font License (OFL).
