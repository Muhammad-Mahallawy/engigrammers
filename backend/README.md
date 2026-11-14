# FLOWTRACE backend

A small FastAPI backend for exploring the actual BASS/BASS-II experimental records supplied in `flame_scraper.zip`.

## Included data

`app/data/bass2_tests.csv` is copied from `flame_scraper/data/raw/bass2_tests.csv` (56 source rows). The API filters the 31 SIBAL fabric records when requested; it does not silently discard the other materials.

The API does not infer missing outcomes, predict flame survival, or claim causal relationships. `burned_outcome_not_stated` remains explicitly unspecified. Airflow change is calculated only when both recorded values exist:

- `flow_change_cm_s = flow_final_cm_s - flow_initial_cm_s`
- `flow_ratio = flow_final_cm_s / flow_initial_cm_s`, when initial flow is non-zero

## Run locally

Python 3.10+ recommended.

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for interactive API documentation.

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API welcome and links |
| GET | `/api/health` | Health and loaded-row count |
| GET | `/api/filters` | Materials, directions, outcomes and ranges |
| GET | `/api/experiments` | Search/filter/paginate experiments |
| GET | `/api/experiments/{test_id}` | One experiment with derived airflow values |
| GET | `/api/compare?test_a=GMT45-T4&test_b=GMT45-T15` | Descriptive comparison of two tests |
| GET | `/api/insights?material=SIBAL` | Outcome counts and descriptive group means |

### Filtering example

```http
GET /api/experiments?material=SIBAL&flow_direction=concurrent&min_oxygen=17&max_oxygen=19
```

Supported query parameters: `material`, `flow_direction`, `outcome`, `min_oxygen`, `max_oxygen`, `min_initial_flow`, `max_initial_flow`, `limit`, and `offset`.

### CORS

For local frontend development, CORS is open by default. Before deployment, set `FLOWTRACE_CORS_ORIGINS` to a comma-separated list of trusted frontend origins, for example:

```bash
FLOWTRACE_CORS_ORIGINS=http://localhost:5173,https://your-frontend.example
```

### Run tests

```bash
pytest -q
```

## Data provenance

Source file: `flame_scraper/data/raw/bass2_tests.csv` from the user-provided `flame_scraper.zip` archive.

The dataset includes source identifiers and PDF page references in each row (`source_id`, `pdf_page`). Units follow the source column names: airflow in cm/s, oxygen in vol%, sample dimensions in mm, and pressure in kPa.
