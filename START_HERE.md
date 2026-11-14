# Start here — install and run FLOWTRACE from scratch

This guide starts with a fresh copy of the repository. It does **not** assume an existing Python virtual environment, installed project dependencies, running server, private configuration, n8n workflow or knowledge of the development chat. All commands operate on your own copy of the project.

FLOWTRACE has a React interface served by Node/Express, a Python/FastAPI scientific API and a browser-local educational simulation. The scientific records and artwork are included in the repository. The chatbot additionally requires an externally configured n8n workflow; it is optional for local setup.

## 1. Install the required tools

Install the tools below before running the project. A **terminal** is the application where you type commands: use PowerShell on Windows or Terminal on macOS/Linux. After installing tools, close and reopen the terminal so it can find them.

| Tool | Requirement | Purpose |
| --- | --- | --- |
| Node.js and npm | A supported Node.js LTS release meeting **Node 22.12 or newer** | Runs the frontend/website server; npm is included with Node |
| Python | **Python 3.10 or newer** | Runs the scientific API and creates its virtual environment |
| pnpm | **10.18.0**, installed below | Installs the exact Node dependency versions from the lockfile |
| Git | Needed only for the `git clone` option | Downloads the repository; not required for GitHub Download ZIP |
| Internet access | Needed during initial tool/dependency installation | Downloads packages; the optional n8n chatbot also needs internet |

Use the official installers from [Node.js](https://nodejs.org/en/download), [Python](https://www.python.org/downloads/) and [Git](https://git-scm.com/downloads). On Windows, enable the Python installer's PATH option if offered; installing its launcher also enables `py`. On Linux, install your distribution's Python virtual-environment support package if `python3 -m venv` reports that it is unavailable. You do not need Docker, a SQL database, an OpenAI API key or a Manus account to run the core local application.

Check Node and npm in your terminal:

```text
node --version
npm --version
```

Check Python using the command for your system:

```powershell
# Windows PowerShell
py -3 --version
```

```bash
# macOS / Linux
python3 --version
```

If Windows does not recognize `py` but `python --version` reports Python 3.10 or newer, use `python` instead of `py -3` in the environment-creation command later. If neither command works, install Python and fix PATH before continuing. Do not run the project's Python commands with Node or npm.

Install the pinned package manager, then check its version:

```text
npm install --global pnpm@10.18.0
pnpm --version
```

The second command should report `10.18.0`. If global installation fails because of permissions, use your Node installation method's documented per-user setup; do not run all subsequent project commands as administrator or root just to bypass that error.

## 2. Obtain the project and identify its root folder

Choose **one** method.

### Option A — clone from GitHub

On this project's GitHub page, select **Code → HTTPS** and copy the repository URL. Replace `REPOSITORY_URL` below with that copied URL; it is a placeholder, not a real repository address. Run these commands from a folder where you want to store the project:

```text
git clone REPOSITORY_URL FLOWTRACE
cd FLOWTRACE
```

`FLOWTRACE` is the new local destination folder; it must not already contain another project. No GitHub account is needed to clone a public repository. A private repository requires access from its owner.

### Option B — download a ZIP

Select **Code → Download ZIP** on GitHub, or extract a supplied complete source ZIP. Extract it before running commands. Open the extracted folder containing **`package.json`**, **`pnpm-lock.yaml`**, **`client/`**, **`server/`**, **`shared/`** and **`backend/`**. GitHub may name that folder after the repository and branch; no particular desktop path, username or folder name is required.

This folder is the **project root**. In Windows File Explorer, navigate to it, enter `powershell` in the address bar and press Enter to open PowerShell there. On macOS/Linux, open Terminal, type `cd `, then drag the project folder into the terminal to insert its path and press Enter. You can also use `cd` with its quoted full path.

For all remaining root-level commands, start in this folder—not in `client`, `server`, the ZIP preview or a parent folder. Keep `START_HERE.md` handy; the backend commands temporarily move into `backend`.

## 3. Install Node dependencies and create local configuration

From the **project root**, run:

```text
pnpm install --frozen-lockfile
```

Wait for installation to finish successfully. This creates `node_modules` locally; that directory is not shipped or committed to GitHub. Do not copy dependencies from another computer or run multiple installations in the same folder at once.

Create your own root `.env` from the public template **only if it does not already exist**:

```powershell
# Windows PowerShell, from the project root
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

```bash
# macOS / Linux, from the project root
[ -f .env ] || cp .env.example .env
```

The template's defaults are enough for the local scientific dashboard and simulation. The Node server listens on port `3000` and forwards scientific requests to `http://127.0.0.1:8000`. You do not need to supply API credentials to read the included experiment data. Chatbot configuration is explained separately in step 7.

`.env` is private configuration and is ignored by Git. Keep real webhook URLs, tokens and passwords out of source files, screenshots and commits. `.env.example` is the shareable template; it is not a copy of someone else's private settings.

## 4. Create a NEW Python virtual environment and run the backend

A virtual environment is a local directory containing an isolated Python interpreter and packages for this project. **It does not exist in a fresh clone and must be created on each computer.** Its expected location will be `backend/.venv`, inside the project—not somewhere on another developer's device.

Open a terminal at the **project root** and choose the command block for your operating system.

### Windows PowerShell

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

If step 1 established that your Windows Python command is `python`, replace **only** `py -3 -m venv .venv` with `python -m venv .venv`.

### macOS / Linux

```bash
cd backend
python3 -m venv .venv
./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/python -m pip install -r requirements.txt
./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Run each command only after the previous one succeeds.** The `.venv` interpreter commands are valid only after environment creation succeeds. Both sets use the newly created interpreter directly; activation is optional, and Windows PowerShell activation-policy changes are unnecessary.

Leave this terminal open while using FLOWTRACE. When Uvicorn reports that it is running, open these addresses in a browser:

- `http://127.0.0.1:8000/api/health` — should return JSON with a health result.
- `http://127.0.0.1:8000/docs` — interactive API documentation.

The included dataset is `backend/app/data/bass2_tests.csv`; no separate NASA dataset download or SQL migration is needed for the current dashboard. `/docs` is documentation, not the application API base.

## 5. Run the frontend/website server in a SECOND terminal

Open a new terminal at the **project root**. Keep the backend terminal running. If your new terminal is in `backend`, use `cd ..` once to return to the project root.

### Windows PowerShell

```powershell
$env:NODE_ENV = "development"
pnpm exec tsx watch server/_core/index.ts
```

### macOS / Linux

```bash
pnpm dev
```

Wait for the message that the server is listening on port `3000`. Leave this terminal open too. The Windows commands are explicit because the current `pnpm dev` script uses Unix-style environment-variable assignment, which is not a native PowerShell command.

Now open **`http://localhost:3000`**. The navigation includes Explorer, Compare, Insights, Evidence, Chatbot and Simulation. You can also verify the Node service at `http://localhost:3000/api/health`, then its scientific connection at `http://localhost:3000/api/flowtrace/health`.

The normal connection is `/api/flowtrace`; the Node server forwards those browser requests to Python. Do not change it to the `/docs` address. No browser CORS changes are required for this default same-origin setup.

Some starter code logs a warning that optional `MANUS_OAUTH_API_URL` configuration is missing outside its managed hosting environment. The core scientific pages, local simulation and configured n8n adapter do not require that login integration. Do not invent platform credentials to silence the warning; use the health checks above to distinguish it from an actual startup failure.

## 6. Stop and restart the project

To stop, press **Ctrl+C** in each server terminal. Closing either terminal also stops that service. A normal local setup runs two services: Node on `3000` and Python on `8000`.

On subsequent runs, the dependencies and `backend/.venv` exist **because you created them on this computer in steps 3–4**. Open a terminal at the project root, enter `backend`, and run the appropriate `.venv` Uvicorn command from step 4. In another root terminal, repeat the startup command from step 5. You do not need to reinstall on every restart; install again when requirements or the lockfile change.

Do not commit or move `.venv` as a portable dependency bundle. After cloning on a different computer, repeat the creation and installation steps there.

## 7. Optional — configure your own n8n chatbot

The chat interface and Node adapter are included. A live n8n workflow, its model credentials and private webhook address are **not** bundled with a GitHub clone. You must create/configure a workflow or obtain access to one yourself. The other project features do not require it.

Read [N8N_CHAT_SETUP.md](N8N_CHAT_SETUP.md) for the request and response contract. Configure and activate/publish a production workflow that accepts a **POST** and returns an assistant answer. Put its real HTTPS production webhook URL in your root `.env`:

```dotenv
FLOWTRACE_CHAT_WEBHOOK_URL=https://YOUR-N8N-HOST/webhook/YOUR-WEBHOOK-ID
```

The URL above is a placeholder, not a working service. Restart the Node terminal after saving `.env`. Do not prefix this setting with `VITE_`; it belongs on the server. An unregistered webhook, inactive workflow, model-provider error or wrong response format is a workflow setup problem—not a reason to insert fake chatbot replies.

The adapter forwards messages, session identity and optional selected-record context to the configured external workflow. Configure its retention/access policies before using sensitive information. Local transcript clearing does not delete the external workflow's logs.

## 8. Optional — use the simulation and run checks

Open the **Simulation** tab or `http://localhost:3000/simulation`. Manual and preset cases run in the browser without Python or n8n. Keep Python running for real-record condition import. Read [SIMULATION_GUIDE.md](SIMULATION_GUIDE.md) and [SIMULATION_PLAN.md](SIMULATION_PLAN.md): the calculated normalized fields and dimensionless clock are educational, **not NASA-validated CFD, measured temperatures or fire-safety predictions**.

From the project root, optional development checks are:

```text
pnpm check
pnpm test
pnpm build
```

For backend tests, open another terminal at the project root and use:

```powershell
# Windows PowerShell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

```bash
# macOS / Linux
cd backend
./.venv/bin/python -m pytest
```

Tests require the dependencies created in this guide. Passing code tests does not scientifically validate the educational simulation. For production or container deployment, see [README.md](README.md).

## Troubleshooting a first installation

| Symptom | What to check |
| --- | --- |
| `node`, `npm`, `pnpm`, `py` or `python3` is not recognized | Complete tool installation, reopen the terminal and verify PATH. On Windows use the verified Python command from step 1. |
| `No module named venv` or `ensurepip` failure | Install Python's virtual-environment support for your OS, then rerun the environment-creation command. Do not continue as if `.venv` already exists. |
| `.venv` interpreter not found | Return to `backend`; confirm creation succeeded and use your OS's `Scripts/python.exe` or `bin/python` path. |
| `No module named uvicorn` | Install `requirements.txt` with the **same new `.venv` interpreter** used to start Uvicorn. |
| `package.json` or `requirements.txt` not found | Frontend commands belong in the project root; Python installation/startup commands belong in `backend`. |
| Unsupported Node version | Use a supported LTS release meeting Node 22.12+, then rerun Node dependency installation. |
| pnpm `EBUSY` / file locked | Stop processes using this project's files, avoid concurrent installs and retry after the file lock clears. Do not copy someone else's `node_modules`. |
| Port already in use | Identify the process using that port. Do not launch a second copy or kill an unknown process blindly. Stop your own duplicate service or deliberately choose a different port. |
| Dashboard cannot reach experiments / HTTP 502 | Verify Python health on port 8000, then Node's `/api/flowtrace/health`. Use `/api/flowtrace` as the browser connection. |
| Chatbot is not configured | Complete optional step 7; this is expected when no external workflow was configured. |

If you choose a different backend port, change the Uvicorn `--port` value and set `FLOWTRACE_API_URL=http://127.0.0.1:YOUR_BACKEND_PORT` in the root `.env`, without `/api` or `/docs`, then restart Node. For a different frontend port, set `PORT` in the same `.env` and open that port instead of `3000`.

## Files that belong on GitHub

Commit source code, the included CSV/artwork, lockfile, `.env.example`, this guide and the other documentation. Do **not** commit `.env`, passwords/webhook credentials, `node_modules`, `backend/.venv`, caches or generated build output. The repository's ignore rules cover the guide's `.env`, Node dependencies, build output and backend `.venv` paths. Inspect `git status` and staged changes before publishing; ignore rules do not remove secrets that were previously committed.

This guide is repository-ready, but its presence does not mean the project has already been published to a GitHub repository. The repository owner supplies the actual GitHub URL and access settings.
