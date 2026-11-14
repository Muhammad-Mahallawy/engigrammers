# FLOWTRACE project structure

This map describes the final downloadable package. The complete archive is `FLOWTRACE_FINAL.zip`; it extracts to one top-level folder named `FLOWTRACE`. Installed dependencies, private `.env` files, `backend/.venv`, caches, and generated build output are local artifacts and are not part of the archive.

## Top level

```text
FLOWTRACE/
├── client/                 React application, styles, public artwork, and route manifest
├── server/                 Node/Express server and scientific proxy
├── shared/                 Types/constants shared by browser and server code
├── backend/                Unchanged Python/FastAPI API and included CSV
├── scripts/                Operational scripts supplied with the source
├── drizzle/                Existing database schema/migration source
├── public or config files  Vite, TypeScript, Tailwind, Docker, and app configuration
├── README.md               Project overview and API/runtime notes
├── START_HERE.md           Fresh Windows/macOS/Linux installation guide
├── UPDATE_STYLE.md         Final visual/simulation handoff notes
├── plan.md                 Workspace planning note; excluded from final archive
├── PROJECT_STRUCTURE.md    This source map
├── SIMULATION_PLAN.md      Simulation scope, equations, provenance, and limits
├── SIMULATION_GUIDE.md     Simulation controls, imports, exports, and interpretation
├── SIMULATION_SOURCES.md   Simulation research-context sources
└── SOURCES.md              NASA evidence and dataset provenance notes
```

## Browser application: `client/`

```text
client/
├── src/
│   ├── App.tsx                         Route shell
│   ├── main.tsx                        Browser entrypoint
│   ├── pages/
│   │   ├── Home.tsx                    Five-tab layout and shared data state
│   │   ├── Explorer.tsx                 `/` record explorer
│   │   ├── Compare.tsx                  `/compare` descriptive comparison
│   │   ├── Insights.tsx                 `/insights` material-level summaries
│   │   ├── Evidence.tsx                 `/evidence` source and provenance view
│   │   └── Simulation.tsx               `/simulation` educational virtual lab
│   ├── components/                     Reusable detail, chart, search, layout, and simulation UI
│   │   ├── ConnectionSettings.tsx       Browser-local API connection setting
│   │   ├── DashboardLayout.tsx          Shared navigation/layout
│   │   ├── ExperimentDetail.tsx         Record detail and evidence links
│   │   ├── ExperimentSearch.tsx         Exact-ID and browsable record suggestions
│   │   ├── FlowChart.tsx                Experiment plot
│   │   ├── SimulationCanvas.tsx         Calculated-field rendering and text fallback
│   │   ├── SimulationTrace.tsx           Labelled model-history plot
│   │   └── SpaceHero.tsx                 Decorative orbital hero
│   ├── lib/
│   │   ├── flowtrace.ts                 Typed client for `/api/flowtrace`
│   │   ├── simulation.ts                Deterministic normalized model
│   │   ├── experimentSearch.ts          Record search/suggestion logic
│   │   └── *.test.ts                    Frontend behavior and numerical tests
│   ├── index.css                        Shared functional styles
│   ├── orbital.css                      Navigation, backdrop, hero, responsive theme
│   ├── orbital-panels.css               Scientific panel/dialog theme
│   └── simulation.css                   Simulation-specific responsive theme
└── public/
    ├── manus-routes.json                Static route manifest for five tabs
    └── space-orbit.webp                 Decorative local artwork
```

The five user-facing routes are `/`, `/compare`, `/insights`, `/evidence`, and `/simulation`. The browser uses `/api/flowtrace` for scientific data; this is an API prefix, not a page route.

## Node server: `server/`

```text
server/
├── _core/index.ts       Express/Node entrypoint and server startup
├── flowtraceProxy.ts    GET-only `/api/flowtrace` proxy
├── routers.ts           Existing application/server router integration
├── db.ts, storage.ts    Existing server infrastructure
└── *.test.ts            Server and platform tests
```

`flowtraceProxy.ts` defaults to upstream `http://127.0.0.1:8000`, forwards allowlisted health, filter, experiment, comparison, and insights paths, preserves query strings, and returns explicit `502` JSON when upstream is unavailable. Configure the upstream origin with `FLOWTRACE_API_URL`; do not append `/api`.

## Packaging: `scripts/package-project.py`

Run the helper from the project root with Python 3.10+ and Git available:

```bash
python scripts/package-project.py
```

By default it writes `../output/FLOWTRACE_FINAL.zip`; use `--output /path/to/FLOWTRACE_FINAL.zip` to choose another destination. It packages tracked and non-ignored checkout files into exactly one `FLOWTRACE/` root, validates archive integrity, and excludes installed dependencies, private environment files, caches, build output, history files (`TODO.md`, `plan.md`, and `template.json`), backups, logs, and prior ZIPs. The final archive therefore contains the operational README/setup/simulation documentation and `PROJECT_STRUCTURE.md`, but not the workspace-only `plan.md`.

## Python service: `backend/`

```text
backend/
├── app/
│   ├── main.py                    FastAPI app and CSV-backed endpoints
│   └── data/bass2_tests.csv       Included 56-row source dataset
├── requirements.txt               Python runtime dependencies
└── README.md                      Backend endpoint/provenance notes
```

The FastAPI service reads `app/data/bass2_tests.csv` at startup. Direct endpoints include `/api/health`, `/api/filters`, `/api/experiments`, `/api/experiments/{test_id}`, `/api/compare`, and `/api/insights`. Its interactive documentation is `/docs`.

Create a new `backend/.venv` locally and install `requirements.txt` with that environment's interpreter; the environment is intentionally not shipped. See [START_HERE.md](START_HERE.md).

## Scientific documentation

- [README.md](README.md) — overview, routes, architecture, checks, Docker, and troubleshooting.
- [START_HERE.md](START_HERE.md) — clean extraction and two-terminal startup.
- [UPDATE_STYLE.md](UPDATE_STYLE.md) — final visual/simulation handoff.
- `plan.md` — workspace-only interface and simulation design note; it is not included in the final archive.
- [SIMULATION_PLAN.md](SIMULATION_PLAN.md) — model equations, scope, and limits.
- [SIMULATION_GUIDE.md](SIMULATION_GUIDE.md) — controls, imports, exports, and interpretation.
- [SIMULATION_SOURCES.md](SIMULATION_SOURCES.md) — simulation research context.
- [SOURCES.md](SOURCES.md) — supplied dataset and NASA evidence provenance.

All simulation quantities are normalized educational outputs. The simulation is not NASA-validated CFD, measured temperature data, a calibrated material reproduction, or a fire-safety predictor.
