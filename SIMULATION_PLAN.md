# FLOWTRACE — Flame in Freefall simulation plan

## What is included

The **Simulation** tab at `/simulation` is a browser-based virtual lab demonstrating how prescribed buoyancy, ventilation, and ambient oxygen influence a simplified reactive-transport field. It is an educational companion to the Explorer, Compare, Insights, and Evidence views, not a claimed NASA prediction engine.

NASA's Flame in Freefall challenge describes a dashboard for finding, comparing, and interpreting combustion investigations. It does not provide a universal simulator or validation parameters for this site's uploaded experiments. Rocket-engine and propellant fire modeling are outside this implementation's scope. [1]

## Scientific basis and limits

NASA explains the role of buoyant circulation in a terrestrial candle's teardrop shape and illustrates a spherical microgravity candle flame. That is a transport example, not proof that every spacecraft fire is spherical. Its SoFIE fabric visualization describes fuel-vaporization-induced flow in a quiescent chamber, showing why fuel geometry and transport still matter in reduced gravity. [2] [3]

BASS-II studied multiple solid samples and geometries in opposed/concurrent imposed flows; its published abstract reports sensitivity at low ventilation and some flames persisting below 1 cm/s. Those are experiment-specific observations. They are not converted into a universal extinction slider or a safety claim. [4]

This release uses a generic localized fuel emitter, not calibrated SIBAL, Nomex, or PMMA chemistry. Importing a record copies only its chosen initial/final airflow and measured oxygen into model controls. Source material, pressure, dimensions, and recorded outcome remain visible as observation context, not model coefficients. Pressure, solid pyrolysis, soot, radiation, cool-flame chemistry, wall confinement, detailed kinetics, flame spread, and combustion-induced flow are not solved. No estimated temperatures, burn durations, certified flammability limits, safety scores, or outcome probabilities are presented.

The control labelled microgravity means suppressed effective buoyant acceleration in the model. It does not assert that Earth's gravitational field vanishes on the ISS. Intermediate buoyancy is exploratory; the challenge notes that partial-gravity combustion data is currently unavailable in PSI. It is not a validated lunar/Martian forecast. [1]

## Numerical model

The deterministic two-dimensional reduced-order advection–diffusion–reaction demonstrator uses a modest fixed square grid. Its fields are normalized thermal activity `H`, fuel-vapor proxy `F`, and oxygen abundance `O`; all are dimensionless and bounded. A centered localized emitter replenishes `F` and supplies a short explicitly artificial ignition pulse. Ambient oxygen is set from the oxygen control at open boundaries.

The conceptual equations are:

```text
∂H/∂t* + u·∇H = D_H ∇²H + Q·R − λH
∂F/∂t* + u·∇F = D_F ∇²F + S_F − R
∂O/∂t* + u·∇O = D_O ∇²O − νR
R = k · F · O · a(H)
```

`t*` is model time, not seconds of a NASA burn. `a(H)` is a documented smooth heuristic activation function. Ventilation is mapped from entered cm/s into a documented nondimensional transport scale; buoyancy contributes a prescribed upward velocity surrogate proportional to selected effective gravity and thermal activity. Velocity is not obtained by solving Navier–Stokes, pressure, or incompressible continuity. Model constants are developer-selected demonstration assumptions, exposed in the Method panel and configuration export, not experimentally fitted material properties. False colors are display mappings, not measured flame color or temperature.

The implementation uses first-order upwind advection, an explicit diffusion update with a combined stability bound, bounded reactant consumption, and fixed deterministic stepping. It guards invalid input, excessive elapsed catch-up, non-finite fields, and out-of-range values. No server compute or additional package installation is required for the model.

## Interaction and visual design

The page keeps the near-black/cyan orbital navigation. Its principal panel is a labelled virtual combustion chamber with the calculated field, spatial guides, an emitter marker, a false-color legend, and a clearly visible **Educational model — not validated CFD** status. Controls expose ambient oxygen, forced airflow, and effective buoyancy. Users choose thermal activity, oxygen, or fuel-vapor views and may overlay a prescribed-flow guide. All field modes share explicit normalized scales.

Run/Pause advances the same case. Step advances a fixed increment while paused. Reset restarts the same initial state. Any physical-control change pauses and resets the run with a visible notice; it does not silently reinterpret an existing time series. Playback speed changes only wall-clock presentation. Reduced motion disables decorative auto-running; calculations start through user controls.

Preset buttons demonstrate still microgravity, Earth-like buoyancy, ventilated microgravity, and reduced oxygen. They are illustrative cases, not spacecraft operating recommendations. **Compare with synchronized 1g** runs two instances with identical inputs except effective buoyancy, allowing a controlled model comparison. Each side remains labelled.

Readouts show model time, normalized peak/mean thermal activity, and model reaction activity. A time-series plot tracks normalized thermal activity with model-time units. A canvas fallback provides a readable summary if graphics are unsupported. Keyboard-accessible controls, explicit labels, dark custom dropdowns, responsive stacked panels, and reduced-motion handling are required.

## Connecting observations without confusing them with outputs

When the experiment API is available, the page shows a searchable picker with real record identifiers, material, and outcome labels. Users choose **initial** or **final** measured airflow before applying conditions. If the chosen airflow or oxygen is missing, import is unavailable; no zero or inferred value is substituted. If a measurement exceeds model-control bounds, it is rejected rather than silently clamped.

The source card preserves original outcome/status, notes, sample dimensions, flow direction, pressure or separately labelled source CSV pressure range, and NASA page reference. A persistent note states that the generic emitter is not the source sample and that the original outcome is not the model's prediction. Changing imported physical controls visibly detaches the applied-condition link. Observation details remain inspectable through the existing record drawer.

Simulation remains usable when the scientific API fails: preset/manual cases run locally and the import area explains that observed records are unavailable. No artificial model rows are inserted into records, evidence counts, comparisons, or exports of observed data.

## Export and reproducibility

JSON case export contains model version, bounded inputs, developer-selected constants/assumptions, fixed resolution, optional source-record identity, and an explicit non-validation notice. CSV export contains calculated history using model-time and normalized-output names, with separate comparison-case columns when enabled. Exports never describe calculated fields as NASA measurements and never include private environment values. Export is a local download, not a server submission or cloud-storage write.

## Project structure and serving

`client/src/lib/simulation.ts` owns typed parameters, documented model constants, the deterministic numerical solver, and normalization safeguards. `simulation.test.ts` covers numerical invariants, repeatability, input limits, and controlled gravity/oxygen differences. `SimulationCanvas.tsx` renders calculated fields and their textual alternative; `SimulationTrace.tsx` renders the labelled model-history plot. `Simulation.tsx` owns controls, animation, comparisons, observation import, provenance, and local exports. `simulation.css` supplies the responsive theme.

`Home.tsx` exposes the lazy Simulation page independently of the scientific API loading/error gate, and `App.tsx`/the route manifest register `/simulation`. The existing Express/FastAPI deployment remains unchanged. The full source handoff is `FLOWTRACE_FINAL.zip`; fresh extraction is required because the final package includes deletions. See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) and [START_HERE.md](START_HERE.md).

## References

[1]: https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/ "NASA Space Apps Flame in Freefall challenge"
[2]: https://science.nasa.gov/biological-physical/resources/explainers-infographics/why-nasa-is-studying-flames-in-space/ "NASA Science: Why NASA is studying flames in space"
[3]: https://svs.gsfc.nasa.gov/31394/ "NASA SVS: NASA Studies Fire in Microgravity"
[4]: https://ntrs.nasa.gov/citations/20160000593 "NASA NTRS: Combustion of Solids in Microgravity—BASS-II results"
