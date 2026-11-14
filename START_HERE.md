# START HERE — fresh FLOWTRACE installation

This guide is for a **new, clean installation** on Windows, macOS, or Linux. It assumes no existing project path, Python virtual environment, Node dependencies, server, or private configuration.

The final complete download is **`FLOWTRACE_FINAL.zip`**. Extract it into a new, empty destination. It produces one top-level folder named **`FLOWTRACE`**. Do not merge it over an older project: this version removes files, and merging can leave obsolete files behind. The package is a downloadable handoff; no published GitHub repository is assumed.

FLOWTRACE contains five tabs: Explorer (`/`), Compare (`/compare`), Insights (`/insights`), Evidence (`/evidence`), and Simulation (`/simulation`). The Node/Express server provides the browser's `/api/flowtrace` scientific proxy. The unchanged Python/FastAPI service reads the included CSV at `backend/app/data/bass2_tests.csv`.

## 1. Install the required tools

Install these tools before opening the project:

| Tool | Required version | Use |
| --- | --- | --- |
| Node.js | **22.12 or newer** | Runs the React/Node application |
| Python | **3.10 or newer** | Runs the FastAPI service and creates its new virtual environment |
| pnpm | **10.18.0** | Installs the locked Node dependencies |
| Internet access | Required for first installation | Downloads package dependencies |

Use the official installers for [Node.js](https://nodejs.org/en/download), [Python](https://www.python.org/downloads/), and, if you need it for another workflow, [Git](https://git-scm.com/downloads). Git is not required to run the supplied ZIP. On Windows, enable Python's PATH option if offered. On Linux, install your distribution's Python virtual-environment support if `python3 -m venv` is unavailable.

Open a new terminal after installing tools and verify versions:

```text
node --version
npm --version
```

Windows PowerShell:

```powershell
py -3 --version
```

macOS/Linux:

```bash
python3 --version
```

Node must be at least `22.12`; Python must be at least `3.10`.

Install the pinned package manager:

```text
npm install --global pnpm@10.18.0
pnpm --version
```

The final command should report `10.18.0`. If global installation needs a per-user setup on your system, use that setup rather than running the project as administrator/root.

## 2. Obtain a fresh copy and choose the project root

Extract **`FLOWTRACE_FINAL.zip`** into a new, empty folder. Open the single extracted **`FLOWTRACE`** folder—the one containing `package.json`, `pnpm-lock.yaml`, `client/`, `server/`, `shared/`, and `backend/`. That folder is the project root.

If a maintainer supplies a repository URL separately, a clean clone is also supported: clone it into a new destination and open the resulting folder containing the same files. This guide does not assume that a public GitHub repository exists or provide a repository URL.

Do not run commands from the ZIP preview, the parent folder, or `client/`. No particular username, desktop path, or pre-existing virtual-environment path is required. On Windows, open PowerShell by entering `powershell` in File Explorer's address bar while viewing the `FLOWTRACE` folder. On macOS/Linux, open Terminal and `cd` to the extracted folder.

## 3. Install Node dependencies and create local configuration

From the **project root**, install the locked dependencies:

```text
pnpm install --frozen-lockfile
```

This creates `node_modules` locally. Installed dependencies are intentionally not in the download.

Create a private root `.env` from the public template if one is not already present.

Windows PowerShell:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

macOS/Linux:

```bash
[ -f .env ] || cp .env.example .env
```

The template defaults use Node port `3000` and the FastAPI origin `http://127.0.0.1:8000` through the Node proxy. No API credential is required to read the included CSV. Keep `.env` private and never place secrets in client variables.

## 4. Create a NEW `backend/.venv` and run FastAPI

You must create a **new** project-local virtual environment for this installation. Do not point the commands at a personal or pre-existing virtual environment. Use the new environment's interpreter for both dependency installation and Uvicorn.

Open **Terminal 1** at the project root and choose the block for your operating system.

### Windows PowerShell

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

If `py -3` is unavailable but `python --version` met the requirement, replace only the environment-creation line with:

```powershell
python -m venv .venv
```

### macOS/Linux

```bash
cd backend
python3 -m venv .venv
./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/python -m pip install -r requirements.txt
./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Run each command only after the previous command succeeds. Activation is optional because every command explicitly uses the new `.venv` interpreter. Leave Terminal 1 open.

Verify the unchanged FastAPI service in a browser:

- `http://127.0.0.1:8000/api/health` should return JSON with a health result and loaded-row count.
- `http://127.0.0.1:8000/docs` opens interactive API documentation.

The backend reads `backend/app/data/bass2_tests.csv`; no separate dataset download or database migration is needed.

## 5. Run Node in a SECOND terminal

Open **Terminal 2** at the project root and keep Terminal 1 running.

### Windows PowerShell

```powershell
$env:NODE_ENV = "development"
pnpm exec tsx watch server/_core/index.ts
```

### macOS/Linux

```bash
pnpm dev
```

Wait for Node to listen on port `3000`, then open:

- `http://localhost:3000` — FLOWTRACE Explorer
- `http://localhost:3000/api/health` — Node service health
- `http://localhost:3000/api/flowtrace/health` — scientific proxy health

The normal browser API base is `/api/flowtrace`. Node forwards that same-origin path to the Python API and preserves query strings and upstream responses. Do not replace it with `/docs`.

The navigation contains only Explorer, Compare, Insights, Evidence, and Simulation. Manual and preset Simulation cases work in the browser; keep FastAPI running for experiment records and real-record condition import.

## 6. Use, stop, and restart

Explorer reads the supplied records through the API. Compare and Insights are descriptive views, and Evidence shows source/provenance notes. Simulation is a deterministic normalized educational model; it is not NASA-validated CFD, a measured temperature display, or a fire-safety prediction. Read [SIMULATION_GUIDE.md](SIMULATION_GUIDE.md) and [SIMULATION_PLAN.md](SIMULATION_PLAN.md) before interpreting exports.

To stop the project, press **Ctrl+C** in both terminals. A normal local run uses Node on port `3000` and Python on port `8000`.

For a later run on this same computer, reuse the dependencies and the `backend/.venv` that you created in steps 3–4:

- Terminal 1: `cd backend`, then run the `.venv` Uvicorn command for your OS from step 4.
- Terminal 2: return to the project root and run the Node command from step 5.

After extracting the final download on another computer, repeat the new-environment and installation steps there. Do not move `.venv` between computers.

## 7. Optional checks

From the project root:

```text
pnpm check
pnpm test
pnpm build
```

For backend tests, use the new interpreter in another terminal.

Windows PowerShell:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

macOS/Linux:

```bash
cd backend
./.venv/bin/python -m pytest
```

Passing tests confirms code behavior under the documented assumptions; it does not validate the educational simulation scientifically.

## First-install troubleshooting

| Symptom | Check |
| --- | --- |
| `node`, `npm`, `pnpm`, `py`, `python`, or `python3` is not recognized | Install the required tool, reopen the terminal, and verify PATH. |
| Node is below 22.12 or Python is below 3.10 | Install a supported version before running dependency commands. |
| `No module named venv` or `ensurepip` failure | Install your OS's Python virtual-environment support, then create the new `backend/.venv` again. |
| `.venv` interpreter is missing | Return to `backend` and confirm environment creation completed before installing requirements. |
| `No module named uvicorn` | Install `requirements.txt` with the same new `.venv` interpreter used to start Uvicorn. |
| `package.json` or `requirements.txt` is not found | Use the project root for Node commands and `backend` only for Python commands. |
| Dashboard cannot reach experiments or returns HTTP 502 | Confirm Python `/api/health`, then Node `/api/flowtrace/health`; do not start a duplicate backend. |
| A port is already in use | Stop your own duplicate service or deliberately choose another port and update the corresponding configuration. |
| A record field says “Not recorded” | The source/API field is missing. It is not a measured zero or a connection error. |

If the backend uses another port, set `FLOWTRACE_API_URL` in the root `.env` to the backend **origin** without `/api` or `/docs`, then restart Node. If Node uses another port, set `PORT` and open that port.

## What not to include in a handoff

Do not distribute or commit `.env`, credentials, `node_modules`, `backend/.venv`, caches, or generated build output. The final download intentionally excludes these local artifacts. See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the source map and [SOURCES.md](SOURCES.md) for record provenance.
