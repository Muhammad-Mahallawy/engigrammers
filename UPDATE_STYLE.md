# Apply the FLOWTRACE simulation update

This cumulative update adds the **Simulation** tab at `/simulation` while retaining the orbital/meteorite design, dark dropdowns, selectable experiment search and n8n Chatbot tab. The new virtual lab calculates normalized thermal/oxygen/fuel fields, supports controls/presets and synchronized 1g comparison, imports measured airflow/oxygen with source context, and exports clearly labelled model JSON/CSV.

**Scientific boundary:** this is an educational reduced-order model, not NASA-validated CFD, a SIBAL/material prediction or a certified fire-safety tool. Its constants and dimensionless model clock are disclosed. Read `SIMULATION_PLAN.md` and `SIMULATION_GUIDE.md` for the complete scope and limitations.

## Update your existing project

Download `FLOWTRACE_simulation_update.zip` and extract it to a temporary folder. It is cumulative and works over the original frontend or any earlier update delivered here. Stop the Node frontend with Ctrl+C; the Python backend can remain running. Back up any files you customized before replacement.

Copy/merge **client, server and shared** into the existing project folder containing `package.json`. Replace matching files, but do not delete those folders before merging. Copy the included Markdown guides if desired. Your project folder was:

```text
C:\Users\win11\Desktop\FLOWTRACE_frontend\FLOWTRACE_frontend
```

Do not replace the Python `backend`, `node_modules`, `package.json`, `pnpm-lock.yaml` or private `.env`. Those are not part of this patch. `.env.example` is a reference template, not your active configuration. An already working installation needs no dependency reinstall.

Restart in PowerShell:

```powershell
cd "C:\Users\win11\Desktop\FLOWTRACE_frontend\FLOWTRACE_frontend"
$env:NODE_ENV = "development"
pnpm exec tsx watch server/_core/index.ts
```

Open `http://localhost:3000/simulation`, or choose **Simulation** in the navigation. Press Ctrl+F5 if cached content remains. The lab starts paused. It runs locally without Python/n8n for presets and manual conditions. Keep the scientific backend on port 8000 if you want real-record import and the existing evidence/explorer features.

## Use the virtual lab

Run/Pause advances the deterministic model clock. Step advances a small fixed interval while paused. Reset restarts the same conditions. Changes to oxygen, ventilation or effective buoyancy reset/pause the case and detach any previously applied experimental source. Field-view and playback changes do not alter the physical inputs. The comparison uses identical inputs except the prescribed 1g buoyancy surrogate.

Choose a real experiment and initial/final airflow before applying recorded conditions. Missing or out-of-range observations are rejected, not silently replaced. Only airflow and oxygen are copied. The source outcome, material, geometry, pressure and NASA page remain a separate observation card, not a model prediction or calibration. Intermediate buoyancy is exploratory, not validated lunar/Martian behavior.

Case JSON and History CSV are local downloads. They identify the model version, input units, developer-selected assumptions and normalized outputs. No simulation rows are written into NASA records or chatbot experiment context.

## The separate chatbot setting

If you already configured `FLOWTRACE_CHAT_WEBHOOK_URL` in your private `.env`, preserve it. If not, add your POST production webhook as described in `N8N_CHAT_SETUP.md`, then restart Node. Never use a `VITE_` prefix for that private server value. The current n8n test reports **POST webhook not registered**; activate/publish the matching workflow and verify its production URL before expecting live answers. This does not block the simulation.

## Complete source

`FLOWTRACE_with_simulation.zip` contains the complete updated source, unchanged uploaded Python backend, numerical/application tests and all guides. It excludes installed dependencies and private environment files. First-time users should follow `README.md`; existing working installations should use the smaller cumulative update ZIP.
