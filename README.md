# FLOWTRACE — Flame Survival Investigator

FLOWTRACE is a React frontend served by Express for the supplied FastAPI backend. The backend reports recorded BASS/BASS-II measurements and descriptive summaries; it does not predict flame behavior or infer missing outcomes.

**First installation or fresh GitHub clone:** follow [START_HERE.md](START_HERE.md). It covers tool installation, creating a new project-local Python virtual environment, installing dependencies, configuration and startup on Windows/macOS/Linux without relying on any prior setup.

## Requirements

- Python 3.10+ (Python 3.10 or newer recommended)
- Node.js 22.12+ (a supported LTS release)
- pnpm 10.18 (Corepack can activate the pinned version)

## Run the unchanged backend locally

The uploaded backend is copied under [`backend/`](backend/) without application changes. From the frontend project directory, run it in one terminal:

If your existing backend is already running at `http://127.0.0.1:8000`, skip this step and reuse it. Do not start a second server on the same port.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

On Windows PowerShell use `python -m venv .venv` and `.\.venv\Scripts\Activate.ps1` instead of the first two environment commands. If PowerShell blocks activation, run `.\.venv\Scripts\python.exe -m pip install -r requirements.txt` and `.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000` directly.

Verify it directly at `http://127.0.0.1:8000/api/health`. The interactive documentation is at `http://127.0.0.1:8000/docs`; `/docs` is documentation, not the API base URL.

In a second terminal, from the frontend directory:

```bash
pnpm install
pnpm dev
```

The frontend listens on `http://127.0.0.1:3000` by default. Development expects the separately running backend on port 8000. The browser calls the same-origin paths under `/api/flowtrace/*`, so local frontend development does not require browser CORS configuration.

## Same-origin proxy

The Express server exposes these GET-only proxy routes:

- `/api/flowtrace/health` → upstream `/api/health`
- `/api/flowtrace/filters` → upstream `/api/filters`
- `/api/flowtrace/experiments` → upstream `/api/experiments`
- `/api/flowtrace/experiments/:id` → upstream `/api/experiments/:id`
- `/api/flowtrace/compare` → upstream `/api/compare`
- `/api/flowtrace/insights` → upstream `/api/insights`

Query strings are preserved. Upstream response status codes and response bodies (including JSON errors) are passed through. If the upstream cannot be reached or times out, the proxy returns an explicit HTTP 502 JSON error; it never invents or silently substitutes data. Other existing server APIs, including `/api/health` and `/api/trpc`, remain unchanged.

By default, the proxy uses `http://127.0.0.1:8000`. Set `FLOWTRACE_API_URL` to an external **backend origin** when needed; do not append `/api`, because the proxy adds that path:

```bash
FLOWTRACE_API_URL=https://api.example.test pnpm dev
```

The optional `FLOWTRACE_PROXY_TIMEOUT_MS` setting defaults to 10,000 milliseconds. See [`.env.example`](.env.example). In the client, the runtime connection setting defaults to `/api/flowtrace`; the client may also store a browser-local override in localStorage. A direct browser base such as `http://127.0.0.1:8000/api` is only appropriate when the backend's CORS policy allows the frontend origin. HTTPS pages cannot call an HTTP backend because of mixed-content restrictions, and browser private-network access rules may also apply. Prefer the same-origin proxy for deployed or HTTPS use.

## Backend API

The copied backend supports:

| Method | Endpoint                                        | Purpose                                     |
| ------ | ----------------------------------------------- | ------------------------------------------- |
| GET    | `/api/health`                                   | Health and loaded-row count                 |
| GET    | `/api/filters`                                  | Materials, directions, outcomes, and ranges |
| GET    | `/api/experiments`                              | Search, filter, and paginate experiments    |
| GET    | `/api/experiments/{test_id}`                    | One experiment with derived airflow values  |
| GET    | `/api/compare?test_a=GMT45-T4&test_b=GMT45-T15` | Descriptive comparison                      |
| GET    | `/api/insights?material=SIBAL`                  | Outcome counts and descriptive group means  |

See [`backend/README.md`](backend/README.md) for the unchanged backend's data provenance and API details.

## Checks and production build

```bash
pnpm check
pnpm test
pnpm build
pnpm start
```

`pnpm start` serves the built frontend on port 3000. In a non-container production process, start the unchanged FastAPI backend separately on `0.0.0.0:8000`, or set `FLOWTRACE_API_URL` to an external backend origin before starting the Node server.

## Docker

The production image installs Node dependencies and the supplied Python requirements into a dedicated virtual environment. With no `FLOWTRACE_API_URL`, the image starts the unchanged bundled FastAPI app on `0.0.0.0:8000` and the Node frontend on `0.0.0.0:3000`; the startup script forwards termination signals and stops both processes together:

```bash
docker build -t flowtrace .
docker run --rm -p 3000:3000 flowtrace
```

To use an external backend, pass `FLOWTRACE_API_URL`; the bundled Python service is then not launched:

```bash
docker run --rm -p 3000:3000 \
  -e FLOWTRACE_API_URL=https://api.example.test \
  flowtrace
```

The container publishes port 3000. `PORT` can override the Node listener when the hosting environment supplies another port; the bundled backend remains on port 8000.

## Frontend workflows

The dark, responsive interface starts with SIBAL fabric. The Explorer retrieves all backend records and applies its search and numerical filters locally, so the plotted records, table, and displayed denominators always describe the same selection. Export downloads the currently filtered records, preserving missing fields as empty CSV cells and including source and outcome-status fields.

Select two to four records to compare. The API's B-minus-A differences and control-context warning apply to the first pair; additional experiments are shown descriptively without attributing outcomes to one variable. Insights use the full selected-material cohort, not the Explorer's other filters. Every mean shows its contributing measurement count.

Click a record, a plotted point, or the featured experiment to inspect the exact measured conditions and its NASA source page. Unspecified final burn outcomes are visibly separate from sustained combustion. The NASA Evidence page links to original documents and preserves supplied page references without claiming they have been independently audited.

Open **API connection** using the status button or settings icon in the top navigation, or the footer link, to test, save, or reset a browser-local connection. The recommended base is `/api/flowtrace`. An optional build-time frontend override is `VITE_FLOWTRACE_API_BASE`; never put private API credentials in a frontend variable.

## Troubleshooting

**“Connection unavailable” or HTTP 502:** confirm your existing backend is running at `http://127.0.0.1:8000/api/health`. Restart the frontend after changing `FLOWTRACE_API_URL` in `.env`. This value is the backend origin, without `/api` or `/docs`.

**“Returned a webpage instead of JSON”:** the configured browser API base likely points to `/docs` or to the website root. Reset to `/api/flowtrace`, or use a direct local base ending in `/api`.

**Direct URL fails from an HTTPS preview:** your browser's `127.0.0.1` refers to your own computer, not the cloud server. Mixed-content or private-network policies may block it. Use the same-origin proxy and a server-reachable backend, or run this frontend locally with your backend. The Manus Preview uses the unchanged backend copy included here, not your own machine's server.

**CORS error:** direct browser API connections require `FLOWTRACE_CORS_ORIGINS` to include your frontend origin. The recommended same-origin proxy avoids this browser CORS issue.

**`pnpm` not found:** with Node.js 22 installed, use `corepack enable` followed by `corepack prepare pnpm@10.18.0 --activate`, or install the pinned pnpm version using your preferred Node package manager. Then run `pnpm install`.

**Port already in use:** reuse the backend already listening on port 8000; do not launch another copy. The frontend defaults to port 3000. To change the frontend port in local development, set `PORT` before `pnpm dev`.

**A value says “Not recorded”:** the field is missing from the returned experimental record. It is not a connection problem or a measured zero. Unspecified final outcomes remain unknown; no result is guessed.

## Project layout

`client/src/pages/` contains Explorer, comparison, insights, evidence, and the application layout. `client/src/components/` contains the airflow plot, detail drawer, and connection settings. `client/src/lib/flowtrace.ts` is the typed API client and scientific formatting layer. `server/flowtraceProxy.ts` forwards read-only requests to your existing API. `backend/` is the unchanged supplied backend, included as a convenience. `SOURCES.md` records verified source links and provenance limitations.

The package contains source code and a lockfile, not installed dependencies or private environment files. Run `pnpm install` before starting. Local type checks, application tests, API checks, and production build were run successfully. The Dockerfile is provided but was not image-built in this sandbox.

### Recorded pressure ranges

The original supplied PMMA rows B1–B22 contain `99.2-99.5` kPa, but the unchanged API's number parser returns null for those ranges. The frontend preserves this original range as a visibly labelled **supplied CSV annotation**, not a guessed or substituted API measurement. Pressure differences are not computed from a range. Exports keep the numeric API field empty and preserve the original range in the separate `source_csv_pressure_range_kpa` column. This distinction prevents a known source range from being confused with a genuinely absent pressure record.

## Orbital visual style update

The interface now uses a cinematic Earth/meteorite hero, luminous blue top navigation, dark glass research panels and restrained ambient meteor streaks, inspired only by the supplied visual references. The illustration is decorative: no meteorite records, satellite statistics or climate measurements have been added to the scientific dataset. FLOWTRACE is an independent project and does not use NASA branding. `client/public/space-orbit.webp` keeps the hero illustration available in local installations.

If you already installed the previous frontend, use `FLOWTRACE_space_style_update.zip` and the instructions in `UPDATE_STYLE.md`. The patch changes only `client` files and requires no new dependencies. The complete updated ZIP is also available for fresh installations.

On **Windows PowerShell**, after installation, start the frontend with the following commands from the project folder instead of the Unix-style `pnpm dev` shortcut:

```powershell
$env:NODE_ENV = "development"
pnpm exec tsx watch server/_core/index.ts
```

For a Windows production build, run `pnpm build`, set `$env:NODE_ENV = "production"`, then run `node dist/index.js`. Your Python backend must remain running separately in both cases. macOS/Linux users can continue using `pnpm dev` and `pnpm start`.

## Dark menus and experiment suggestions

All scientific selectors use custom dark option menus, avoiding the unreadable white Windows-native popup. The experiment search field shows a browsable list of actual experimental records with IDs, materials and recorded outcomes. Typing narrows this list; click an option or use the arrow keys and Enter to choose. Choosing a record uses exact-ID matching (for example, GMT45-T1 does not also match GMT45-T15). Clearing restores all eligible records. Free-text search continues to match IDs, materials, investigations, original outcome labels and notes. Suggestions honor the active material, direction, outcome and measurement bounds.

`FLOWTRACE_dropdown_search_update.zip` is the latest cumulative client-only update, including the space style. `FLOWTRACE_frontend_with_search.zip` is the complete updated source. Existing installations can apply the update without reinstalling dependencies; see `UPDATE_STYLE.md`.

## Research chatbot tab

The new **Chatbot** tab at `/chat` uses your n8n workflow through the frontend's Node/Express server. Set `FLOWTRACE_CHAT_WEBHOOK_URL` in that server's environment, never in a `VITE_` variable or client source. The managed project has the supplied destination configured; a local Windows installation needs the same key in its own private `.env`. Read `N8N_CHAT_SETUP.md` for activation, input/response fields and recommended AI system instructions.

Current live finding: the authorized synthetic POST returned n8n 404 (POST webhook not registered). An end-to-end call through `/api/chat` correctly returned a safe `UNREGISTERED` error. No successful AI answer, response schema, follow-up memory or workflow grounding has been verified. The interface is implemented and does not substitute fake answers. “n8n configured” is configuration status, not proof of successful chat.

The composer supports Enter/Shift+Enter, suggestions populate without sending, waiting can be stopped, failed requests have manual Retry, and assistant messages can be copied. Browser `sessionStorage` preserves a bounded transcript across routes/reloads. New chat rotates its anonymous ID and clears local history only. This release does not claim to erase remote logs or provide authenticated/distributed chat access.

Optional context is off by default and sends up to four selected experiments with their actual measurements, dimensions, original flow text, derived API fields, source links and separately labelled CSV pressure-range annotations. Chat remains reachable if the experiment API is offline, with context disabled. Recent completed history is bounded and shortened further when needed to fit the 64 KiB request limit. An oversized question/context is rejected locally instead of silently altered.

Use `FLOWTRACE_chatbot_update.zip` for a cumulative no-new-dependency update. Unlike the style patch, merge **client, server and shared** folders and restart the Node server; do not replace your Python backend, `node_modules` or private `.env`. `FLOWTRACE_frontend_with_chatbot.zip` contains the full updated source. See `UPDATE_STYLE.md` for Windows instructions.

## Flame in Freefall virtual lab

The **Simulation** tab at `/simulation` adds a deterministic educational reactive-transport model. Its calculated thermal/oxygen/fuel fields are normalized, its clock is dimensionless model time, and its developer-selected constants are disclosed. It is not NASA-validated CFD, a measured temperature display, a SIBAL reproduction or a fire-safety prediction. `SIMULATION_PLAN.md` contains the full sourced plan and `SIMULATION_GUIDE.md` explains controls, exports and limitations.

Manual/preset cases work without Python or n8n. When the experiment API is available, real-record import copies only the selected initial/final airflow and recorded oxygen; missing or unsupported measurements are rejected rather than substituted. The source observation remains visible separately, including the pressure-range annotation. Model outputs never replace API records, observed outcomes, comparison counts or chatbot record context.

Run/Pause, Step, Reset, playback speed, three field views, prescribed-flow guides, oxygen/ventilation/buoyancy controls, and synchronized 1g comparison are included. Physical-input changes reset/pause and detach applied-source context. JSON/CSV exports explicitly identify model assumptions and synthetic outputs; no waveform or burn-duration claim is made.

`FLOWTRACE_simulation_update.zip` is cumulative: merge its **client, server and shared** folders into the existing project, preserving other files and your private `.env`, then restart the Node frontend. It requires no new dependencies and does not replace the Python backend. `FLOWTRACE_with_simulation.zip` is the complete source project. See `UPDATE_STYLE.md` for Windows steps and `N8N_CHAT_SETUP.md` for the separate chatbot activation issue.
