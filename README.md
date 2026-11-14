# FLOWTRACE — Flame Survival Investigator

FLOWTRACE is a React interface served by Node/Express for exploring the supplied BASS/BASS-II experimental records. The unchanged Python FastAPI service reads the included CSV and reports recorded measurements and descriptive summaries; it does not predict flame behavior or infer missing outcomes.

For a first installation, follow [START_HERE.md](START_HERE.md). It is written for a fresh extraction on Windows, macOS, or Linux and does not assume an existing virtual environment, installed dependencies, personal path, or private configuration.

## Final download

The complete handoff archive is **`FLOWTRACE_FINAL.zip`**. It extracts to one top-level folder named **`FLOWTRACE`**. Extract it into a new, empty destination and work from that folder. Do not merge it over an older FLOWTRACE installation: this final version includes removals, and merging can leave deleted files behind.

The archive contains source, the included CSV and artwork, lockfiles, tests, and documentation. It does not contain installed Node dependencies, `backend/.venv`, private `.env` files, caches, or generated build output. No published GitHub repository is assumed by this package.

## Requirements

- Node.js **22.12 or newer**
- Python **3.10 or newer**
- pnpm **10.18.0**
- Internet access for the initial dependency installs

## The five tabs

| Tab | Route | Purpose |
| --- | --- | --- |
| Explorer | `/` | Search and filter the supplied experiment records, inspect metrics, plot records, export the current selection, and open a record detail view. |
| Compare | `/compare` | Compare two to four selected records descriptively. The API's first-pair differences are not causal claims. |
| Insights | `/insights` | Show descriptive counts and group means for a selected material, with measurement counts for each mean. |
| Evidence | `/evidence` | Explain the supplied NASA source trail, record provenance, page references, and known data limitations. |
| Simulation | `/simulation` | Run the deterministic browser-only educational reduced-order model and export clearly labelled synthetic case/history data. |

## Architecture and API connection

The application has two local services:

1. **Node/Express frontend server** — serves the React application and exposes the read-only scientific proxy at `/api/flowtrace`.
2. **Python/FastAPI backend** — reads `backend/app/data/bass2_tests.csv` and exposes the experiment API on port `8000`.

The browser normally calls the same-origin Node proxy. The proxy preserves query strings, forwards upstream status and response bodies, and returns an explicit JSON `502` when the Python service is unavailable. It never invents replacement data.

### Node scientific proxy

The default upstream origin is `http://127.0.0.1:8000`. These GET-only browser routes are available under `/api/flowtrace`:

| Browser route | FastAPI route |
| --- | --- |
| `/api/flowtrace/health` | `/api/health` |
| `/api/flowtrace/filters` | `/api/filters` |
| `/api/flowtrace/experiments` | `/api/experiments` |
| `/api/flowtrace/experiments/:id` | `/api/experiments/:id` |
| `/api/flowtrace/compare` | `/api/compare` |
| `/api/flowtrace/insights` | `/api/insights` |

Set `FLOWTRACE_API_URL` to an external **backend origin** when required; do not append `/api`, because the proxy adds the upstream API path. The optional `FLOWTRACE_PROXY_TIMEOUT_MS` defaults to 10,000 milliseconds. See [`.env.example`](.env.example).

### Python FastAPI API

The unchanged backend reads the included `backend/app/data/bass2_tests.csv` at startup. Its direct endpoints are:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health and loaded-row count |
| GET | `/api/filters` | Materials, directions, outcomes, and numeric ranges |
| GET | `/api/experiments` | Search, filter, and paginate experiments |
| GET | `/api/experiments/{test_id}` | One experiment with derived airflow values |
| GET | `/api/compare?test_a=GMT45-T4&test_b=GMT45-T15` | Descriptive comparison |
| GET | `/api/insights?material=SIBAL` | Outcome counts and descriptive group means |

Open `http://127.0.0.1:8000/docs` for FastAPI's interactive documentation. `/docs` is documentation, not the browser API base URL.

## Run after setup

Use two terminals. In the first, create a new `backend/.venv`, install the requirements with that environment's interpreter, and run FastAPI. In the second, from the project root, run the Node server. The complete commands, including Windows PowerShell differences, are in [START_HERE.md](START_HERE.md).

On macOS/Linux:

```bash
# Terminal 1
cd backend
python3 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2, from the project root
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Manual and preset Simulation cases run in the browser; keep FastAPI running for Explorer data, evidence, comparisons, insights, and real-record condition import.

## Scientific interpretation and simulation boundary

Explorer, Compare, Insights, and Evidence describe the supplied records. Unknown outcomes remain unknown, and descriptive differences do not establish causation or universal survival thresholds. The frontend preserves the supplied PMMA pressure range annotation separately when the unchanged API cannot parse a range as one numeric value.

Simulation fields are normalized thermal activity, oxygen availability, and generic fuel-vapor availability. Its clock is dimensionless model time, its constants are developer-selected educational assumptions, and its buoyancy is a prescribed heuristic. The model is **not NASA-validated CFD**, a measured temperature display, a SIBAL/material reproduction, a fire-safety predictor, or a validated lunar/Martian forecast. Read [SIMULATION_PLAN.md](SIMULATION_PLAN.md) and [SIMULATION_GUIDE.md](SIMULATION_GUIDE.md) before interpreting or sharing model exports.

Real-record import copies only selected measured airflow and recorded oxygen when available and in range. The source material, dimensions, pressure, outcome, and NASA page remain observation context; they are not used as calibrated model coefficients. Simulation outputs never replace API records or evidence counts.

## Checks and production build

From the project root:

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

`pnpm start` serves the built frontend on port `3000`. In a non-container process, run the unchanged FastAPI backend separately on `0.0.0.0:8000`, or set `FLOWTRACE_API_URL` to a reachable external backend origin before starting Node.

## Docker

The provided Dockerfile installs Node dependencies and the supplied Python requirements into a dedicated image environment. With no `FLOWTRACE_API_URL`, the production startup script runs the bundled FastAPI service on port `8000` and Node on port `3000`:

```bash
docker build -t flowtrace .
docker run --rm -p 3000:3000 flowtrace
```

To use an external backend instead:

```bash
docker run --rm -p 3000:3000 \
  -e FLOWTRACE_API_URL=https://api.example.test \
  flowtrace
```

## Troubleshooting

- **Connection unavailable or HTTP 502:** confirm `http://127.0.0.1:8000/api/health`, then `http://localhost:3000/api/flowtrace/health`.
- **A webpage appears instead of JSON:** use `/api/flowtrace` in the browser connection setting, not `/docs` or the website root.
- **`pnpm` is not found:** with Node installed, run `corepack enable` and activate pnpm 10.18.0, or install that exact version with npm.
- **Port already in use:** reuse or deliberately reconfigure your own service; do not start a second backend on the same port.
- **A value says “Not recorded”:** the returned experiment field is missing. It is not a measured zero and not a connection error.

## Project layout and provenance

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the source map. `client/src/lib/flowtrace.ts` is the typed client for the Node scientific proxy, `server/flowtraceProxy.ts` forwards read-only requests, and `backend/` is the unchanged supplied FastAPI service. [SOURCES.md](SOURCES.md) records the NASA source links and provenance limitations; [SIMULATION_SOURCES.md](SIMULATION_SOURCES.md) records the simulation context sources.
