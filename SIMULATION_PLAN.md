# FLOWTRACE — Flame in Freefall simulation plan

## What will be built

Add a **Simulation** tab at `/simulation` to the existing FLOWTRACE website. It will be a browser-based virtual lab that demonstrates how prescribed buoyancy, ventilation and ambient oxygen influence a simplified reactive-transport field. The user approved both planning and execution in advance, so implementation proceeds without another approval step. The existing dark orbital style, meteorite backdrop, original experiment explorer, comparisons, source evidence and n8n chatbot remain intact.

NASA's Flame in Freefall challenge calls for a dashboard that makes microgravity combustion investigations easier to find, compare and interpret. It lists extracting data to support predictive modeling as a possible capability, but supplies neither a universal model nor validation parameters for this site's uploaded experiments. The simulation is therefore an educational companion to the evidence dashboard, not a claimed NASA prediction engine. Rocket-engine/propellant fire modeling is outside the challenge's cited PSI scope and this implementation. [1]

## Scientific basis and limits

NASA explains the role of buoyant circulation in a terrestrial candle's teardrop shape and illustrates a spherical microgravity candle flame. That is a useful transport example, not proof that every spacecraft fire is spherical. Its SoFIE fabric visualization explicitly describes fuel-vaporization-induced flow in a quiescent chamber, showing why fuel geometry and transport still matter in microgravity. [2] [3]

BASS-II studied multiple solid samples and geometries in opposed/concurrent imposed flows; the published abstract reports strong sensitivity at low ventilation and some flames persisting below 1 cm/s. Those are specific observations. We will not convert them into a universal extinction slider or declare a model scenario safe merely because ventilation or oxygen is low. [4]

This release uses a generic localized fuel emitter, not calibrated SIBAL, Nomex or PMMA chemistry. Importing a record copies only its chosen initial/final airflow and measured oxygen into model controls. The source material, pressure, dimensions and recorded outcome remain visible as observation context, **not** coefficients used to reproduce that experiment. Pressure, solid pyrolysis, soot, radiation, cool-flame chemistry, wall confinement, detailed kinetics, flame spread and combustion-induced flow are not solved. No estimated temperatures, burn durations, certified flammability limits, safety scores or outcome probabilities will be presented.

The control labelled microgravity means suppressed effective buoyant acceleration in the model. It does not assert that Earth's gravitational field vanishes on the ISS. Intermediate buoyancy is exploratory; the challenge states that partial-gravity combustion data is currently unavailable in PSI. It is not a validated lunar/Martian forecast. [1]

## Numerical model

Implement a deterministic two-dimensional, reduced-order advection–diffusion–reaction demonstrator on a modest fixed square grid. The fields are normalized thermal activity `H`, fuel-vapor proxy `F`, and oxygen abundance `O`; all are dimensionless and bounded. A centered localized emitter replenishes `F` and supplies a short explicitly artificial ignition pulse. Ambient oxygen is set from the oxygen control at open boundaries.

The conceptual equations are:

```text
∂H/∂t* + u·∇H = D_H ∇²H + Q·R − λH
∂F/∂t* + u·∇F = D_F ∇²F + S_F − R
∂O/∂t* + u·∇O = D_O ∇²O − νR
R = k · F · O · a(H)
```

`t*` is model time, not seconds of a NASA burn. `a(H)` is a documented smooth heuristic activation function. Ventilation is mapped from entered cm/s into a documented nondimensional transport scale; buoyancy contributes a prescribed upward velocity surrogate proportional to selected effective gravity and thermal activity. Velocity is not obtained by solving Navier–Stokes, pressure or incompressible continuity. Model constants are developer-selected demonstration assumptions, exposed in the Method panel and configuration export—not experimentally fitted material properties. False colors are display mappings, not measured flame color or temperature.

Use first-order upwind advection and an explicit diffusion update with a combined stability bound. Bound reaction consumption by available reactants and use fixed deterministic numerical stepping to a requested model time. Run, pause, single-step and reset must refer to this model clock, never to rendering frame count or random animation. Protect against invalid input, excessive elapsed catch-up, non-finite fields and out-of-range values. No server compute, paid models or additional package installations are required.

## Interaction and visual design

The page keeps the established near-black/cyan orbital navigation. Its principal panel is a labelled virtual combustion chamber with the calculated field, fine spatial guides, an emitter marker, a false-color legend and clearly visible **Educational model — not validated CFD** status. A compact controls column exposes ambient oxygen, forced airflow and effective buoyancy. Users choose field views for thermal activity, oxygen or fuel vapor and may overlay a prescribed-flow guide. All field modes share explicit normalized scales.

Run/Pause controls advance the same case. Step advances a fixed increment while paused. Reset restarts from the same initial state. Any physical-control change pauses and resets the run with a visible notice; it must not silently reinterpret an existing time series. Playback speed changes only wall-clock presentation, not the equations. Reduce motion disables auto-running decorative presentation; calculations only start through user controls.

Preset buttons demonstrate still microgravity, Earth-like buoyancy, ventilated microgravity and reduced oxygen. They are illustrative cases, not spacecraft operating recommendations. An optional **Compare with 1g** view runs two synchronized instances using identical inputs except effective buoyancy, allowing a controlled model comparison rather than conflating unrelated changes. Each side remains individually labelled.

Readouts show model time, normalized peak/mean thermal activity and model reaction activity. A small time-series plot tracks normalized thermal activity with the same case labels and model-time units. A canvas fallback provides a readable summary if graphics are unsupported. Keyboard-accessible controls, explicit labels, dark custom dropdowns, responsive stacked mobile panels and reduced-motion handling are required.

## Connecting observations without confusing them with outputs

When the experiment API is available, show a dark searchable experiment picker with real record identifiers, material and outcome labels. Users choose **initial** or **final** measured airflow before applying conditions. If either that chosen airflow or oxygen is missing, do not substitute zero or infer a value; explain why import is unavailable. If a measurement exceeds model-control bounds, do not silently clamp it as if it were the recorded value.

The source card preserves the original outcome/status, notes, pressure or separately labelled source CSV pressure range, and NASA page reference. A persistent note states that the generic emitter is not the source sample and that the original outcome is not the model's prediction. Changing imported physical controls visibly detaches that applied-condition link. Observation details can still be inspected through the existing record drawer.

Simulation remains usable when the scientific API fails: preset/manual cases run locally, and the import area explains that observed records are unavailable. The n8n webhook is not called during simulation, and its current activation issue does not block the lab. No artificial model rows are inserted into NASA records, evidence counts, comparisons or chatbot experiment context.

## Export and reproducibility

Provide a JSON case export containing the model version, bounded inputs, developer-selected constants/assumptions, fixed resolution, optional source-record identity and explicit non-validation notice. Provide a CSV export of calculated history using model-time and normalized-output column names, with separate comparison-case columns where enabled. Exports never describe calculated fields as NASA measurements and never include webhook credentials or private environment values. Export is a local download, not a server submission or cloud storage write.

## Project structure and serving

`client/src/lib/simulation.ts` owns the typed parameters, documented model constants, deterministic numerical solver and normalization safeguards. `simulation.test.ts` covers numerical invariants, repeatability, input limits and controlled gravity/oxygen differences. `client/src/components/SimulationCanvas.tsx` owns calculated-field rendering and its textual alternative; it does not generate measurements or advance the numerical solver independently. `SimulationTrace.tsx` owns the labelled model-history plot. `client/src/pages/Simulation.tsx` owns the lab controls, animation loop, comparisons, experimental import, provenance and local exports. `simulation.css` supplies the matching responsive theme.

`Home.tsx` gains a lazy Simulation page, passes available real records and the existing detail callback, and places the route before the scientific API loading/error gate. `App.tsx` and `client/public/manus-routes.json` gain `/simulation`. The existing Express/FastAPI deployment remains unchanged. The cumulative update packaging helper adds these client files; a full source ZIP, incremental update ZIP, this plan and model documentation support the user's Windows setup without another dependency install.

## Execution sequence

First preserve verified NASA sources and this approved plan. Then implement the numerical model and frontend in parallel with clear file ownership. Integrate the route and experimental condition import, document every synthetic quantity, and add reproducible exports. Use existing TypeScript diagnostics, focused numerical tests and the production build; obtain one read-only implementation review for the connected model/UI/provenance behavior. Correct confirmed defects rather than expanding into an unrequested high-fidelity combustion project. Finally package the complete source and cumulative update, retain setup instructions and save the accepted version to the existing managed repository.

A later research-grade stage would require raw PSI time-series data, verified geometry/boundary conditions, independent calibration and held-out validation, uncertainty estimates, pressure/chemistry/pyrolysis models and expert review. Those requirements are not met by the uploaded small descriptive record set, so this release will not pretend otherwise.

## References

[1]: https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/ "NASA Space Apps Flame in Freefall challenge"
[2]: https://science.nasa.gov/biological-physical/resources/explainers-infographics/why-nasa-is-studying-flames-in-space/ "NASA Science: Why NASA is studying flames in space"
[3]: https://svs.gsfc.nasa.gov/31394/ "NASA SVS: NASA Studies Fire in Microgravity"
[4]: https://ntrs.nasa.gov/citations/20160000593 "NASA NTRS: Combustion of Solids in Microgravity—BASS-II results"
