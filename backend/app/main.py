from __future__ import annotations

import csv
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = Path(os.getenv("FLOWTRACE_DATA_FILE", BASE_DIR / "data" / "bass2_tests.csv"))

NUMERIC_FIELDS = {
    "thickness_mm", "width_mm", "flow_initial_cm_s", "flow_final_cm_s",
    "oxygen_vol_pct", "pressure_kpa", "pdf_page"
}
PUBLIC_FIELDS = [
    "id", "test_id", "investigation", "material", "thickness_mm", "width_mm",
    "flow_direction", "flow_initial_cm_s", "flow_final_cm_s", "flow_as_recorded",
    "oxygen_vol_pct", "pressure_kpa", "outcome", "outcome_label", "nasa_notes",
    "source_id", "pdf_page"
]


def parse_value(field: str, value: str | None) -> Any:
    if value is None or value.strip() == "":
        return None
    if field in NUMERIC_FIELDS:
        try:
            number = float(value)
            if number.is_integer():
                return int(number)
            return number
        except (TypeError, ValueError):
            return None
    return value


def load_records() -> list[dict[str, Any]]:
    if not DATA_FILE.exists():
        raise RuntimeError(f"Dataset not found: {DATA_FILE}")
    with DATA_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise RuntimeError("Dataset has no CSV header")
        required = {"test_id", "material", "flow_initial_cm_s", "flow_final_cm_s", "oxygen_vol_pct", "outcome"}
        missing = required.difference(reader.fieldnames)
        if missing:
            raise RuntimeError(f"Dataset is missing required columns: {sorted(missing)}")
        records = []
        for raw in reader:
            record = {field: parse_value(field, raw.get(field)) for field in PUBLIC_FIELDS}
            if record["test_id"] and record["material"]:
                records.append(record)
        return records


RECORDS = load_records()
app = FastAPI(
    title="FLOWTRACE API",
    description=(
        "Explore NASA BASS/BASS-II experimental records. The API reports recorded "
        "measurements and outcomes; it does not predict fire behavior or infer missing outcomes."
    ),
    version="1.0.0",
)

origins = [item.strip() for item in os.getenv("FLOWTRACE_CORS_ORIGINS", "*").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


def with_derived_fields(record: dict[str, Any]) -> dict[str, Any]:
    result = dict(record)
    initial = record.get("flow_initial_cm_s")
    final = record.get("flow_final_cm_s")
    result["flow_change_cm_s"] = round(final - initial, 4) if initial is not None and final is not None else None
    result["flow_ratio"] = round(final / initial, 4) if initial not in (None, 0) and final is not None else None
    result["outcome_status"] = (
        "unspecified" if record.get("outcome") == "burned_outcome_not_stated"
        else "recorded" if record.get("outcome") else "unknown"
    )
    return result


def filtered_records(
    material: str | None = None,
    flow_direction: str | None = None,
    outcome: str | None = None,
    min_oxygen: float | None = None,
    max_oxygen: float | None = None,
    min_initial_flow: float | None = None,
    max_initial_flow: float | None = None,
) -> list[dict[str, Any]]:
    rows = RECORDS
    if material:
        rows = [r for r in rows if material.casefold() in str(r["material"]).casefold()]
    if flow_direction:
        rows = [r for r in rows if str(r["flow_direction"]).casefold() == flow_direction.casefold()]
    if outcome:
        rows = [r for r in rows if str(r["outcome"]).casefold() == outcome.casefold()]
    if min_oxygen is not None:
        rows = [r for r in rows if r["oxygen_vol_pct"] is not None and r["oxygen_vol_pct"] >= min_oxygen]
    if max_oxygen is not None:
        rows = [r for r in rows if r["oxygen_vol_pct"] is not None and r["oxygen_vol_pct"] <= max_oxygen]
    if min_initial_flow is not None:
        rows = [r for r in rows if r["flow_initial_cm_s"] is not None and r["flow_initial_cm_s"] >= min_initial_flow]
    if max_initial_flow is not None:
        rows = [r for r in rows if r["flow_initial_cm_s"] is not None and r["flow_initial_cm_s"] <= max_initial_flow]
    return rows


@app.get("/", tags=["system"])
def root():
    return {"name": "FLOWTRACE API", "version": app.version, "docs": "/docs", "health": "/api/health"}


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok", "dataset": DATA_FILE.name, "records_loaded": len(RECORDS)}


@app.get("/api/filters", tags=["experiments"])
def get_filters():
    def unique(field: str) -> list[Any]:
        return sorted({r[field] for r in RECORDS if r.get(field) not in (None, "")}, key=lambda x: str(x))
    return {
        "materials": unique("material"),
        "flow_directions": unique("flow_direction"),
        "outcomes": [
            {"value": value, "label": next(r["outcome_label"] for r in RECORDS if r["outcome"] == value)}
            for value in unique("outcome")
        ],
        "oxygen_range_vol_pct": _numeric_range("oxygen_vol_pct"),
        "initial_flow_range_cm_s": _numeric_range("flow_initial_cm_s"),
        "units": {"oxygen_vol_pct": "vol%", "flow_initial_cm_s": "cm/s", "flow_final_cm_s": "cm/s", "pressure_kpa": "kPa"},
    }


def _numeric_range(field: str) -> dict[str, float | None]:
    values = [r[field] for r in RECORDS if r[field] is not None]
    return {"min": min(values) if values else None, "max": max(values) if values else None}


@app.get("/api/experiments", tags=["experiments"])
def list_experiments(
    material: str | None = None,
    flow_direction: str | None = None,
    outcome: str | None = None,
    min_oxygen: float | None = Query(default=None, ge=0, le=100),
    max_oxygen: float | None = Query(default=None, ge=0, le=100),
    min_initial_flow: float | None = Query(default=None, ge=0),
    max_initial_flow: float | None = Query(default=None, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    if min_oxygen is not None and max_oxygen is not None and min_oxygen > max_oxygen:
        raise HTTPException(status_code=422, detail="min_oxygen cannot exceed max_oxygen")
    if min_initial_flow is not None and max_initial_flow is not None and min_initial_flow > max_initial_flow:
        raise HTTPException(status_code=422, detail="min_initial_flow cannot exceed max_initial_flow")
    rows = filtered_records(material, flow_direction, outcome, min_oxygen, max_oxygen, min_initial_flow, max_initial_flow)
    rows = sorted(rows, key=lambda r: (str(r["test_id"])))
    return {"total": len(rows), "limit": limit, "offset": offset, "items": [with_derived_fields(r) for r in rows[offset:offset + limit]]}


@app.get("/api/experiments/{test_id}", tags=["experiments"])
def get_experiment(test_id: str):
    matches = [r for r in RECORDS if r["test_id"].casefold() == test_id.casefold() or r["id"].casefold() == test_id.casefold()]
    if not matches:
        raise HTTPException(status_code=404, detail=f"Experiment '{test_id}' was not found")
    return with_derived_fields(matches[0])


@app.get("/api/compare", tags=["analysis"])
def compare_experiments(
    test_a: str = Query(..., description="First test_id, e.g. GMT45-T4"),
    test_b: str = Query(..., description="Second test_id, e.g. GMT45-T15"),
):
    a = next((r for r in RECORDS if r["test_id"].casefold() == test_a.casefold()), None)
    b = next((r for r in RECORDS if r["test_id"].casefold() == test_b.casefold()), None)
    if a is None or b is None:
        missing = [name for name, record in ((test_a, a), (test_b, b)) if record is None]
        raise HTTPException(status_code=404, detail={"message": "One or more experiments were not found", "missing": missing})

    def delta(field: str):
        av, bv = a.get(field), b.get(field)
        return round(bv - av, 4) if av is not None and bv is not None else None

    same_material = a["material"] == b["material"]
    same_direction = a["flow_direction"] == b["flow_direction"]
    return {
        "experiment_a": with_derived_fields(a),
        "experiment_b": with_derived_fields(b),
        "difference_b_minus_a": {
            "flow_initial_cm_s": delta("flow_initial_cm_s"),
            "flow_final_cm_s": delta("flow_final_cm_s"),
            "oxygen_vol_pct": delta("oxygen_vol_pct"),
            "thickness_mm": delta("thickness_mm"),
            "width_mm": delta("width_mm"),
            "pressure_kpa": delta("pressure_kpa"),
        },
        "comparison_context": {
            "same_material": same_material,
            "same_flow_direction": same_direction,
            "same_investigation": a["investigation"] == b["investigation"],
            "caution": "A two-record comparison is descriptive. Differences in outcome cannot be attributed to one variable unless other experimental conditions are controlled."
        }
    }


@app.get("/api/insights", tags=["analysis"])
def get_insights(material: str | None = "SIBAL"):
    rows = filtered_records(material=material) if material else RECORDS
    counts: dict[str, int] = {}
    for row in rows:
        key = row["outcome"] or "missing_outcome"
        counts[key] = counts.get(key, 0) + 1

    def mean_for(outcome: str, field: str):
        values = [r[field] for r in rows if r["outcome"] == outcome and r[field] is not None]
        return round(sum(values) / len(values), 3) if values else None

    categories = []
    for outcome, count in sorted(counts.items()):
        categories.append({
            "outcome": outcome,
            "label": next((r["outcome_label"] for r in rows if r["outcome"] == outcome), outcome),
            "count": count,
            "mean_initial_flow_cm_s": mean_for(outcome, "flow_initial_cm_s"),
            "mean_final_flow_cm_s": mean_for(outcome, "flow_final_cm_s"),
            "mean_oxygen_vol_pct": mean_for(outcome, "oxygen_vol_pct"),
            "final_flow_measurements": sum(1 for r in rows if r["outcome"] == outcome and r["flow_final_cm_s"] is not None),
        })
    return {
        "material_filter": material,
        "records_included": len(rows),
        "outcome_counts": categories,
        "interpretation": "These are descriptive summaries of recorded experiments, not causal estimates or universal flame-survival thresholds.",
        "data_quality": {
            "records_missing_final_flow": sum(1 for r in rows if r["flow_final_cm_s"] is None),
            "records_with_unspecified_burn_outcome": sum(1 for r in rows if r["outcome"] == "burned_outcome_not_stated"),
            "records_missing_oxygen": sum(1 for r in rows if r["oxygen_vol_pct"] is None),
        }
    }
