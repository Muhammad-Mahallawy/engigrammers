# FLOWTRACE virtual lab

Open the **Simulation** tab or `/simulation`. The model runs entirely in the browser. It does not need the Python experiment API or a working n8n webhook for manual/preset scenarios, and no extra dependencies are required.

## Run a controlled demonstration

Start with **Still microgravity**. The case is paused at a generic localized emitter with an artificial ignition pulse. Press **Run model**, **Pause**, **Step** or **Reset**. Step advances a fixed amount of **dimensionless model time**, not a fraction of a second of a measured NASA burn. Playback speed affects presentation only. The app pauses when the tab is hidden and stops its animation loop on navigation.

Change oxygen, imposed ventilation or effective buoyancy to ask a new question. A physical change resets and pauses the case; old trace points are not re-labelled under new inputs. View changes and playback speed do not change the physical inputs. Enable **Compare with synchronized 1g** to compare identical inputs except for the prescribed buoyancy surrogate. The two fields share the same model clock; if the current case is already 1g they are intentionally identical.

The displayed fields are normalized thermal activity, oxygen availability and generic fuel-vapor availability. The colors are false-color scalar mappings, not real flame temperatures or measured visible spectra. Reaction activity is a dimensionless model proxy, not heat-release rate. All numerical constants are developer-selected educational assumptions available under **Inside the model** and in the exported case.

## What “microgravity” means here

The zero-buoyancy setting removes the model's imposed buoyancy surrogate. It does not remove Earth's gravitational field on the ISS. In freefall, buoyant circulation is greatly reduced; ventilation, fuel geometry and combustion-induced flow can still matter. NASA's candle illustrations motivate a rounded low-momentum example, but its SoFIE fabric images also describe self-generated flow. Not all microgravity flames are spherical. Intermediate settings are exploratory and not validated lunar/Martian fire forecasts.

## Use actual experiment conditions carefully

Keep the scientific backend running to enable **Start from a real record**. Browse/select an actual identifier, choose initial or final measured airflow, then apply. The app copies only that speed and the recorded oxygen concentration into its generic model. Missing measurements are not turned into zero, and unsupported measurements are not silently clamped.

An observation card displays the original material, outcome, notes, sample dimensions, flow direction, pressure/labelled CSV pressure range and NASA page reference. The real recorded outcome remains an observation—not the model's predicted label. Source pressure, dimensions, geometry, opposed/concurrent flame-spread configuration and material chemistry are not reproduced by this point-emitter model. Its ventilation is a schematic rightward flow, not reconstruction of the original experiment's spatial boundary conditions.

Changing physical model controls detaches the applied-record link. The simulation cannot change the NASA dataset, outcome counts, source evidence, real comparisons or chatbot experiment context. It does not provide safe atmosphere recommendations, calibrated flammability limits or burn-duration estimates.

## Save the calculated case

**Case JSON** downloads model version, controls and input units, grid size, fixed UI tick, dimensionless horizon, constants/assumptions, comparison setting and an optional full source-record snapshot. Use it to document the case or reproduce its settings against the same code version; this release does not claim a research-grade calibrated solver or a JSON-loading UI.

**History CSV** downloads model-time samples and normalized thermal/reaction/oxygen outputs. Comparison columns are included only when enabled. The filename and `not_nasa_measurements` column explicitly distinguish those calculations from observations. Both exports remain local; no credential or webhook address is embedded.

## Numerical interpretation

The model solves simplified scalar advection–diffusion–reaction updates on a fixed square grid. It uses bounded reactant consumption, heat loss and a centered replenishing emitter. Velocity is prescribed from the ventilation input plus a local-heat-dependent upward buoyancy proxy. It does not solve pressure, incompressible continuity, full Navier–Stokes, detailed chemistry, solid pyrolysis, radiation, soot, cool-flame behavior or real-wall confinement. Non-finite/unsupported controls are guarded in the solver; observational imports are checked before reaching it.

Model stability tests and repeatability checks establish code behavior under its assumptions. They are not evidence that the model predicts NASA experiments or spacecraft safety. A research-grade extension would require verified raw data, real geometry/boundary conditions, material parameters, independent calibration, held-out validation, quantified uncertainty and expert review. See `SIMULATION_PLAN.md` for the complete sourced plan and architecture.

## NASA context

- [Flame in Freefall challenge](https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/)
- [Why NASA studies flames in space](https://science.nasa.gov/biological-physical/resources/explainers-infographics/why-nasa-is-studying-flames-in-space/)
- [NASA SoFIE imagery and transport explanation](https://svs.gsfc.nasa.gov/31394/)
- [BASS-II experimental results](https://ntrs.nasa.gov/citations/20160000593)

These sources establish the research context, not validation of the browser model.
