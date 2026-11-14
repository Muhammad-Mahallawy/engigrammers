# FLOWTRACE — current project hierarchy

This package contains the latest complete source project: orbital/meteorite design, dark dropdowns, selectable experiment search, Explorer, Compare, Insights, Evidence, Chatbot and Simulation. It is the full project, not an incremental patch. The archive extracts under one root folder, `FLOWTRACE/`.

## How the layers connect

```text
Web browser — React interface (localhost:3000)
│
├── Explorer / Compare / Insights / Evidence
│   └── Node + Express same-origin proxy (/api/flowtrace/*)
│       └── Python + FastAPI scientific API (localhost:8000)
│           └── backend/app/data/bass2_tests.csv
│
├── Chatbot (/chat)
│   └── Node + Express chat adapter (/api/chat)
│       └── Your externally hosted n8n webhook/workflow
│
└── Simulation (/simulation)
    ├── Browser-local deterministic educational transport model
    ├── Calculated field renderer and time-history plot
    └── Optional measured inputs from the scientific API
```

The simulation does not require Python or n8n for manual/preset cases. The scientific pages and real-condition import require the FastAPI service. Chatbot answers require a configured, registered/active n8n production webhook; the last integration test found the supplied POST webhook unregistered. A server setting alone does not establish that the hosted workflow is working.

## Folder tree — principal files

This is a summarized tree of the current source, not an exhaustive listing of every UI primitive and starter helper.

```text
FLOWTRACE/
├── START_HERE.md                    # Fresh Windows setup and existing-install notes
├── PROJECT_STRUCTURE.md             # This hierarchy and architecture explanation
├── README.md                        # Detailed setup, APIs and troubleshooting
├── package.json                     # Node commands and dependency declarations
├── pnpm-lock.yaml                   # Pinned dependency resolution
├── pnpm-workspace.yaml              # Package-manager configuration
├── .env.example                     # Configuration template; no private .env included
├── app.config.ts                    # Project metadata / brand mark
├── Dockerfile                       # Combined Node + Python production image definition
├── tsconfig.json                    # TypeScript settings
├── vite.config.ts                   # Frontend build/development configuration
├── vitest.config.ts                 # Application test configuration
│
├── client/                          # Frontend — React + TypeScript
│   ├── index.html                   # Browser entry document
│   ├── public/
│   │   ├── space-orbit.webp         # Local space/meteorite artwork
│   │   ├── flowtrace-mark.svg       # FLOWTRACE mark
│   │   └── manus-routes.json        # Six application page routes
│   └── src/
│       ├── main.tsx                 # React entry and providers
│       ├── App.tsx                  # Application routing
│       ├── pages/
│       │   ├── Home.tsx             # Shared navigation/layout and data loading
│       │   ├── Explorer.tsx         # Experiment filters, scatter plot and table
│       │   ├── Compare.tsx          # Side-by-side record comparisons
│       │   ├── Insights.tsx         # Descriptive outcome summaries
│       │   ├── Evidence.tsx         # NASA references and provenance
│       │   ├── Chatbot.tsx          # n8n research chat interface
│       │   └── Simulation.tsx       # Virtual-lab controls and model exports
│       ├── components/
│       │   ├── SpaceHero.tsx        # Cinematic orbital hero
│       │   ├── FlowChart.tsx        # Observed experiment scatter plot
│       │   ├── ExperimentDetail.tsx # Original-record detail drawer
│       │   ├── ExperimentSearch.tsx # Browsable/selectable experiment suggestions
│       │   ├── OrbitalSelect.tsx    # Dark accessible option menus
│       │   ├── PressureValue.tsx    # Explicit pressure-range provenance
│       │   ├── ConnectionSettings.tsx
│       │   ├── ChatMessage.tsx      # Chat response/error presentation
│       │   ├── SimulationCanvas.tsx # Calculated model-field rendering
│       │   ├── SimulationTrace.tsx  # Dimensionless model-history plot
│       │   └── ui/                 # Shared UI primitives
│       ├── lib/
│       │   ├── flowtrace.ts         # Scientific API types/client/formatting
│       │   ├── experimentSearch.ts # Exact-ID and free-text search logic
│       │   ├── chat.ts              # Chat transport, sessions and optional context
│       │   ├── simulation.ts        # Numerical educational model
│       │   └── *.test.ts            # Frontend/model tests
│       ├── index.css                # Base styles
│       ├── orbital.css              # Orbital layout, menus and meteor effects
│       ├── orbital-panels.css       # Scientific panel styling
│       ├── chat.css                 # Chatbot styling
│       └── simulation.css           # Virtual-lab styling
│
├── server/                          # Node + Express website server
│   ├── _core/index.ts               # Entry point and route registration
│   ├── _core/                      # Starter/runtime helpers
│   ├── flowtraceProxy.ts            # Read-only forwarding to FastAPI
│   ├── chatProxy.ts                 # Validated server-only n8n adapter
│   ├── routers.ts                  # Starter RPC routes
│   └── *.test.ts                   # Server tests
│
├── backend/                         # Unchanged uploaded scientific backend
│   ├── README.md                   # Backend-specific setup
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Backend configuration template
│   ├── app/
│   │   ├── main.py                 # FastAPI endpoints
│   │   └── data/bass2_tests.csv     # Supplied experimental records
│   └── tests/test_api.py            # Backend tests
│
├── shared/                          # Shared client/server contracts
│   ├── chat.ts                     # Chat request/response and context types
│   ├── const.ts
│   └── types.ts
├── drizzle/                         # Starter database schema/migrations
│                                   # Not the NASA dataset storage
├── patches/                         # Pinned dependency patch
├── scripts/
│   ├── start-production.sh          # Production service coordination
│   └── package-style-update.py      # Source/update ZIP packaging
│
├── N8N_CHAT_SETUP.md                 # Workflow activation and chat configuration
├── SIMULATION_PLAN.md               # Full sourced simulation implementation plan
├── SIMULATION_GUIDE.md              # Model operation and limitations
├── SIMULATION_SOURCES.md            # Verified NASA context
├── SOURCES.md                       # Scientific dataset/artwork provenance
├── UPDATE_STYLE.md                  # Earlier-install cumulative update guidance
├── plan.md                          # Current combined implementation/design plan
└── docs/CHATBOT_PLAN.md              # Approved chatbot extension plan
```

Other starter components, contexts, hooks and helpers are included in the source archive even where this summarized tree omits their names. The `drizzle/` schema is starter scaffolding; the current experiment dataset lives in CSV, not a newly provisioned SQL database.

## What the all-in-one ZIP includes and excludes

It includes the latest frontend, Node server, unchanged supplied Python backend and CSV, simulation engine, chat adapter, shared types, tests, local artwork, dependency lockfile, deployment files and setup/model plans. There is no need to combine earlier style/search/chatbot/simulation patch ZIPs.

It deliberately excludes `node_modules`, Python virtual environments, build output, Git history, runtime/browser logs and private `.env` values. Those are machine-specific or private; dependencies must be installed on the target device. Keep your existing private `.env` separately if moving a configured installation. The n8n workflow is hosted externally and its workflow export was not supplied, so that hosted service itself is not bundled.

The simulation remains an educational reduced-order model—not NASA-validated CFD or a material/fire-safety predictor. Model outputs are kept separate from NASA observations.
