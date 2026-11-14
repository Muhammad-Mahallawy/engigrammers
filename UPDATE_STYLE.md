# FLOWTRACE final visual and simulation update

The final package combines the orbital visual treatment, dark scientific panels, searchable experiment suggestions, and the **Simulation** tab at `/simulation`. The live navigation has five tabs: Explorer `/`, Compare `/compare`, Insights `/insights`, Evidence `/evidence`, and Simulation `/simulation`.

The complete handoff is **`FLOWTRACE_FINAL.zip`**. It extracts to one top-level folder named **`FLOWTRACE`**.

## Install the final package

Use a fresh extraction into a new, empty destination. Do **not** merge this package over an older FLOWTRACE folder: this release removes obsolete files, and merging can retain them. The archive excludes installed dependencies, `backend/.venv`, private `.env` files, caches, and generated output.

For a first installation, follow [START_HERE.md](START_HERE.md). It includes Windows PowerShell, macOS, and Linux commands, pinned Node.js 22.12+ and pnpm 10.18.0 requirements, a newly created `backend/.venv`, and the two-terminal startup sequence.

If you have customized an older installation, copy your changes out separately before switching to the final folder. Do not replace or alter the unchanged `backend/` files while comparing your customizations.

## Visual and interaction behavior

The interface uses a near-black orbital backdrop, luminous blue navigation, dark glass research panels, custom dark selectors, restrained meteor ambience, responsive layouts, and reduced-motion handling. The artwork is decorative and does not add measurements or NASA branding. Scientific outcome colors and units retain their existing meaning.

The Explorer keeps local filtering, plotted records, selection metrics, exact experiment suggestions, detail inspection, and CSV export. Compare handles two to four records descriptively; Insights uses the selected material cohort and shows contributing counts; Evidence preserves supplied source links and page references with provenance caveats.

## Simulation behavior

The browser-only lab is deterministic and starts paused. Run/Pause, Step, Reset, playback speed, thermal/oxygen/fuel field views, prescribed-flow guides, oxygen/ventilation/effective-buoyancy controls, presets, synchronized 1g comparison, model-time history, and local JSON/CSV exports are included.

Physical-input changes reset and pause the case. View and playback changes do not change physical inputs. Real-record import copies only a selected measured airflow and recorded oxygen when both are available and within model bounds. The source material, geometry, pressure, recorded outcome, and NASA reference remain separate observation context.

Simulation quantities are normalized educational fields, not measured temperature, heat-release, flame color, or NASA observations. The model is not NASA-validated CFD, a calibrated SIBAL/material reproduction, a fire-safety tool, or a validated partial-gravity forecast. See [SIMULATION_PLAN.md](SIMULATION_PLAN.md), [SIMULATION_GUIDE.md](SIMULATION_GUIDE.md), and [SIMULATION_SOURCES.md](SIMULATION_SOURCES.md).

## API connection after the update

Keep the unchanged Python FastAPI backend running on port `8000` when using experiment data. The Node/Express server exposes the same-origin scientific proxy at `/api/flowtrace` and forwards it to the Python API, which reads `backend/app/data/bass2_tests.csv`. Verify both services at:

- `http://127.0.0.1:8000/api/health`
- `http://localhost:3000/api/flowtrace/health`

Do not configure the browser connection to `/docs`; that is FastAPI documentation, not the API base. See [README.md](README.md) for external-backend configuration and production options.
