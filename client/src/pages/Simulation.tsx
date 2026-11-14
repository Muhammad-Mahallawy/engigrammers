import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Flame,
  Gauge,
  Info,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  StepForward,
  Wind,
} from "lucide-react";
import {
  FlameSimulation,
  DEFAULT_SIMULATION_PARAMS,
  MODEL_ASSUMPTIONS,
  MODEL_CONSTANTS,
  MODEL_DURATION,
  MODEL_SIZE,
  MODEL_VERSION,
  SimulationParams,
} from "@/lib/simulation";
import {
  Experiment,
  fmt,
  outcomeInfo,
  sourcePdf,
  sourcePressureRange,
} from "@/lib/flowtrace";
import SimulationCanvas, {
  SimulationField,
} from "@/components/SimulationCanvas";
import SimulationTrace, {
  SimulationHistoryPoint,
} from "@/components/SimulationTrace";
import OrbitalSelect from "@/components/OrbitalSelect";
import ExperimentSearch from "@/components/ExperimentSearch";
import PressureValue from "@/components/PressureValue";

interface Props {
  records: Experiment[];
  dataAvailable: boolean;
  onDetail: (record: Experiment) => void;
}
interface AppliedSource {
  record: Experiment;
  phase: "initial" | "final";
}
const MODEL_TICK = 0.025;
const presets = [
  {
    name: "Still microgravity",
    description: "Buoyancy suppressed · no imposed wind",
    params: { oxygenPct: 21, airflowCmS: 0, buoyancy: 0 },
  },
  {
    name: "Earth-like buoyancy",
    description: "Same emitter · prescribed upward flow",
    params: { oxygenPct: 21, airflowCmS: 0, buoyancy: 1 },
  },
  {
    name: "Ventilated microgravity",
    description: "Same oxygen · forced transport",
    params: { oxygenPct: 21, airflowCmS: 10, buoyancy: 0 },
  },
  {
    name: "Reduced oxygen",
    description: "Illustrative case, not a safe threshold",
    params: { oxygenPct: 16, airflowCmS: 10, buoyancy: 0 },
  },
];
function downloadLocal(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function samplePoint(
  current: FlameSimulation,
  reference: FlameSimulation
): SimulationHistoryPoint {
  const a = current.sample(),
    b = reference.sample();
  return {
    time: a.time,
    current: a.peakHeat,
    reference: b.peakHeat,
    reaction: a.reactionActivity,
    meanOxygen: a.meanOxygen,
    referenceReaction: b.reactionActivity,
    referenceOxygen: b.meanOxygen,
  };
}

export default function Simulation({
  records,
  dataAvailable,
  onDetail,
}: Props) {
  const [params, setParams] = useState<SimulationParams>({
    ...DEFAULT_SIMULATION_PARAMS,
  });
  const current = useRef<FlameSimulation | null>(null);
  const reference = useRef<FlameSimulation | null>(null);
  if (!current.current)
    current.current = new FlameSimulation(DEFAULT_SIMULATION_PARAMS);
  if (!reference.current)
    reference.current = new FlameSimulation({
      ...DEFAULT_SIMULATION_PARAMS,
      buoyancy: 1,
    });
  const [revision, setRevision] = useState(0);
  const [running, setRunning] = useState(false);
  const playing = useRef(false);
  const [comparing, setComparing] = useState(false);
  const [field, setField] = useState<SimulationField>("heat");
  const [showFlow, setShowFlow] = useState(true);
  const [speed, setSpeed] = useState("1");
  const [history, setHistory] = useState<SimulationHistoryPoint[]>(() => [
    samplePoint(current.current!, reference.current!),
  ]);
  const historyRef = useRef(history);
  const ticks = useRef(0);
  const [notice, setNotice] = useState(
    "Ready. Run the model or advance one step."
  );
  const [query, setQuery] = useState("");
  const [exact, setExact] = useState(false);
  const [phase, setPhase] = useState<"initial" | "final">("initial");
  const [applied, setApplied] = useState<AppliedSource | null>(null);
  const [importError, setImportError] = useState("");
  const [methodOpen, setMethodOpen] = useState(false);
  const available = dataAvailable ? records : [];
  const options = available.filter(record =>
    `${record.test_id} ${record.material}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  const selectedRecord = exact
    ? available.find(record => record.test_id === query)
    : undefined;
  const a = current.current.sample(),
    b = reference.current.sample();

  const capture = () => {
    const point = samplePoint(current.current!, reference.current!);
    const last = historyRef.current[historyRef.current.length - 1];
    if (!last || Math.abs(last.time - point.time) > 0.00001) {
      historyRef.current = [...historyRef.current, point];
      setHistory(historyRef.current);
    }
  };
  const resetCase = (
    next: SimulationParams,
    source: AppliedSource | null = null,
    message = "Conditions changed. The model is reset and paused."
  ) => {
    playing.current = false;
    setRunning(false);
    ticks.current = 0;
    current.current = new FlameSimulation(next);
    reference.current = new FlameSimulation({ ...next, buoyancy: 1 });
    setParams({ ...next });
    setApplied(source);
    setImportError("");
    historyRef.current = [samplePoint(current.current, reference.current)];
    setHistory(historyRef.current);
    setRevision(value => value + 1);
    setNotice(message);
  };
  const change = (key: keyof SimulationParams, value: number) =>
    resetCase(
      { ...params, [key]: value },
      null,
      applied
        ? "Input changed. The applied-record link is detached; this is now a manual case."
        : "Conditions changed. The model is reset and paused."
    );
  const tick = () => {
    current.current!.advance(MODEL_TICK);
    reference.current!.advance(MODEL_TICK);
    ticks.current++;
    if (ticks.current % 4 === 0 || current.current!.time >= MODEL_DURATION)
      capture();
  };
  useEffect(() => {
    if (!running) return;
    let id = 0;
    let previous = performance.now();
    let accumulator = 0;
    const frame = (now: number) => {
      if (!playing.current) return;
      accumulator +=
        Math.min(0.05, Math.max(0, (now - previous) / 1000)) * Number(speed);
      previous = now;
      let advances = 0;
      while (
        accumulator >= MODEL_TICK &&
        advances < 4 &&
        current.current!.time < MODEL_DURATION
      ) {
        tick();
        accumulator -= MODEL_TICK;
        advances++;
      }
      if (advances) setRevision(value => value + 1);
      if (current.current!.time >= MODEL_DURATION) {
        playing.current = false;
        setRunning(false);
        setNotice("Model horizon reached. Reset to run the same case again.");
        capture();
        return;
      }
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [running, speed]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && playing.current) {
        playing.current = false;
        setRunning(false);
        setNotice("Paused while the tab is hidden. Resume when ready.");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      playing.current = false;
    };
  }, []);
  const toggleRun = () => {
    if (running) {
      playing.current = false;
      setRunning(false);
      capture();
      setNotice("Paused. Change a view, export, or advance one step.");
    } else if (a.time < MODEL_DURATION) {
      playing.current = true;
      setRunning(true);
      setNotice("Running a deterministic educational model.");
    }
  };
  const step = () => {
    if (playing.current || a.time >= MODEL_DURATION) return;
    tick();
    tick();
    capture();
    setRevision(value => value + 1);
    setNotice(
      "Advanced 0.05 model-time units. This is not a measured burn duration."
    );
  };
  const applyRecord = () => {
    if (!selectedRecord) return;
    const flow =
      phase === "initial"
        ? selectedRecord.flow_initial_cm_s
        : selectedRecord.flow_final_cm_s;
    const oxygen = selectedRecord.oxygen_vol_pct;
    if (
      flow == null ||
      oxygen == null ||
      !Number.isFinite(flow) ||
      !Number.isFinite(oxygen)
    ) {
      setImportError(
        `The selected ${phase} airflow or oxygen measurement is missing. No value was substituted.`
      );
      return;
    }
    if (flow < 0 || flow > 60 || oxygen < 0 || oxygen > 30) {
      setImportError(
        "Recorded conditions are outside this demonstrator’s supported bounds. They were not silently clamped."
      );
      return;
    }
    resetCase(
      { oxygenPct: oxygen, airflowCmS: flow, buoyancy: 0 },
      { record: selectedRecord, phase },
      `Applied ${selectedRecord.test_id} ${phase} airflow and oxygen. The generic model does not reproduce that sample or predict its recorded outcome.`
    );
  };
  const exportCase = () => {
    downloadLocal(
      "flowtrace-educational-model-case.json",
      JSON.stringify(
        {
          modelVersion: MODEL_VERSION,
          modelType:
            "unvalidated 2D prescribed-flow reactive-transport demonstrator",
          notice:
            "NOT NASA MEASUREMENTS, NOT VALIDATED CFD, NOT A FIRE-SAFETY PREDICTION",
          parameters: params,
          parameterUnits: {
            oxygenPct: "vol%",
            airflowCmS: "cm/s input mapped into nondimensional transport",
            buoyancy: "effective-buoyancy fraction of the 1g surrogate",
          },
          fixedModelTick: MODEL_TICK,
          gridSize: MODEL_SIZE,
          modelDuration: MODEL_DURATION,
          timeUnits: "dimensionless model time",
          comparedWith1g: comparing,
          constants: MODEL_CONSTANTS,
          assumptions: MODEL_ASSUMPTIONS,
          conditionSource: applied
            ? {
                experimentId: applied.record.id,
                testId: applied.record.test_id,
                airflowPhase: applied.phase,
                observation: applied.record,
                sourceCsvPressureRangeKpa: sourcePressureRange(applied.record),
                notAModelCalibration: true,
              }
            : null,
        },
        null,
        2
      ),
      "application/json"
    );
  };
  const exportHistory = () => {
    capture();
    const header = [
      "model_version",
      "model_time_dimensionless",
      "current_peak_thermal_normalized",
      "current_reaction_proxy_normalized",
      "current_mean_oxygen_normalized",
      "oxygen_input_vol_pct",
      "airflow_input_cm_s",
      "effective_buoyancy_fraction",
      "not_nasa_measurements",
      ...(comparing
        ? [
            "reference_1g_peak_thermal_normalized",
            "reference_1g_reaction_proxy_normalized",
            "reference_1g_mean_oxygen_normalized",
          ]
        : []),
    ];
    const csv = [
      header.join(","),
      ...historyRef.current.map(point =>
        [
          MODEL_VERSION,
          point.time.toFixed(4),
          point.current.toFixed(6),
          point.reaction.toFixed(6),
          point.meanOxygen.toFixed(6),
          params.oxygenPct,
          params.airflowCmS,
          params.buoyancy,
          "true",
          ...(comparing
            ? [
                point.reference?.toFixed(6),
                point.referenceReaction?.toFixed(6),
                point.referenceOxygen?.toFixed(6),
              ]
            : []),
        ].join(",")
      ),
    ].join("\r\n");
    downloadLocal(
      "flowtrace-model-history-not-observations.csv",
      csv,
      "text/csv;charset=utf-8"
    );
  };
  return (
    <>
      <section className="sim-page-heading">
        <div>
          <span className="eyebrow">FLAME IN FREEFALL · VIRTUAL LAB</span>
          <h1>
            Change the conditions.
            <br />
            Question the behavior<span className="cyan">.</span>
          </h1>
          <p>Explore transport. Keep the evidence in view.</p>
        </div>
        <span className="sim-model-pill">
          <Orbit size={13} />
          Educational model · not validated CFD
        </span>
      </section>
      <div className="sim-boundary">
        <ShieldCheck size={16} />
        <p>
          Calculated fields are illustrative—not NASA observations, measured
          temperatures or material fire-safety predictions. The emitter is
          generic; it is not a reconstruction of BASS/SIBAL.
        </p>
        <button onClick={() => setMethodOpen(!methodOpen)}>
          Model & assumptions <ArrowUpRight size={12} />
        </button>
      </div>
      <div className="sim-workspace">
        <div className="sim-main">
          <section className="panel sim-chamber">
            <div className="sim-chamber-heading">
              <div>
                <Flame size={19} />
                <h2>Virtual combustion chamber</h2>
                <span className={`sim-state ${running ? "running" : ""}`}>
                  <i />
                  {running
                    ? "RUNNING"
                    : a.time >= MODEL_DURATION
                      ? "COMPLETE"
                      : a.time > 0
                        ? "PAUSED"
                        : "READY"}
                </span>
              </div>
              <OrbitalSelect
                value={field}
                onValueChange={value => setField(value as SimulationField)}
                ariaLabel="Calculated field view"
                options={[
                  { value: "heat", label: "Thermal activity" },
                  { value: "oxygen", label: "Oxygen abundance" },
                  { value: "fuel", label: "Fuel-vapor proxy" },
                ]}
              />
            </div>
            <div
              className={`sim-chamber-fields ${comparing ? "comparison" : ""}`}
            >
              <SimulationCanvas
                simulation={current.current}
                revision={revision}
                field={field}
                showFlow={showFlow}
                label={
                  params.buoyancy === 0
                    ? "CURRENT · BUOYANCY SUPPRESSED"
                    : `CURRENT · ${fmt(params.buoyancy)}g SURROGATE`
                }
              />
              {comparing && (
                <SimulationCanvas
                  simulation={reference.current}
                  revision={revision}
                  field={field}
                  showFlow={showFlow}
                  label="REFERENCE · 1g SURROGATE"
                />
              )}
            </div>
            <div className="sim-scale-row">
              <span>
                Normalized{" "}
                {field === "heat"
                  ? "thermal activity"
                  : field === "oxygen"
                    ? "oxygen abundance"
                    : "fuel availability"}
              </span>
              <div className={`sim-color-scale ${field}`} />
              <span>0 → 1</span>
              <span className="sim-color-note">
                false color, not temperature
              </span>
            </div>
            <div className="sim-transport">
              <div>
                <button
                  className="sim-run"
                  onClick={toggleRun}
                  disabled={!running && a.time >= MODEL_DURATION}
                >
                  {running ? <Pause size={15} /> : <Play size={15} />}
                  {running ? "Pause" : "Run model"}
                </button>
                <button
                  className="secondary-button"
                  onClick={step}
                  disabled={running || a.time >= MODEL_DURATION}
                  title="Advance 0.05 model-time units"
                >
                  <StepForward size={14} /> Step
                </button>
                <button
                  className="sim-icon-button"
                  onClick={() =>
                    resetCase(
                      params,
                      applied,
                      "Reset to the same initial conditions."
                    )
                  }
                  aria-label="Reset current simulation"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
              <div>
                <span>Playback</span>
                <OrbitalSelect
                  value={speed}
                  onValueChange={setSpeed}
                  ariaLabel="Simulation playback speed"
                  options={[
                    { value: ".5", label: "0.5×" },
                    { value: "1", label: "1×" },
                    { value: "2", label: "2×" },
                  ]}
                />
              </div>
            </div>
            <div className="sim-progress">
              <span style={{ width: `${(a.time / MODEL_DURATION) * 100}%` }} />
            </div>
            <p className="sim-status-message" role="status">
              {notice}
            </p>
          </section>
          <div className="sim-readouts">
            <div>
              <span>MODEL TIME t*</span>
              <strong>
                {a.time.toFixed(2)}
                <small> / {MODEL_DURATION}</small>
              </strong>
            </div>
            <div>
              <span>PEAK THERMAL PROXY</span>
              <strong>{a.peakHeat.toFixed(3)}</strong>
              {comparing && <small>1g: {b.peakHeat.toFixed(3)}</small>}
            </div>
            <div>
              <span>MEAN OXYGEN PROXY</span>
              <strong>{a.meanOxygen.toFixed(3)}</strong>
              {comparing && <small>1g: {b.meanOxygen.toFixed(3)}</small>}
            </div>
            <div>
              <span>REACTION ACTIVITY</span>
              <strong>{a.reactionActivity.toFixed(4)}</strong>
              {comparing && <small>1g: {b.reactionActivity.toFixed(4)}</small>}
            </div>
          </div>
          <SimulationTrace
            history={history}
            duration={MODEL_DURATION}
            comparing={comparing}
          />
          <section className="panel sim-export">
            <div>
              <Download size={17} />
              <span>
                <strong>A case you can reproduce.</strong>
                <small>
                  Versioned inputs, assumptions and calculated history—not
                  experimental data.
                </small>
              </span>
            </div>
            <div>
              <button className="secondary-button" onClick={exportCase}>
                Case JSON <ArrowDownToLine size={12} />
              </button>
              <button className="secondary-button" onClick={exportHistory}>
                History CSV <ArrowDownToLine size={12} />
              </button>
            </div>
          </section>
        </div>
        <aside className="sim-side">
          <section className="panel sim-controls">
            <span className="eyebrow">ONE VARIABLE AT A TIME</span>
            <h2>Set the conditions.</h2>
            <p>Changing physical controls resets and pauses the case.</p>
            <label className="sim-range">
              <span>
                <Orbit size={13} />
                Effective buoyancy{" "}
                <strong>
                  {fmt(params.buoyancy)}
                  <small>g surrogate</small>
                </strong>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={params.buoyancy}
                onChange={event =>
                  change("buoyancy", Number(event.target.value))
                }
                aria-label="Effective buoyancy fraction"
                aria-valuetext={`${fmt(params.buoyancy)} of the 1g buoyancy surrogate`}
              />
              <small>
                0: suppressed/freefall proxy{" "}
                <span>1: Earth-like surrogate</span>
              </small>
            </label>
            <label className="sim-range">
              <span>
                <Wind size={13} />
                Forced airflow{" "}
                <strong>
                  {fmt(params.airflowCmS)}
                  <small>cm/s input</small>
                </strong>
              </span>
              <input
                type="range"
                min={0}
                max={60}
                step={0.01}
                value={params.airflowCmS}
                onChange={event =>
                  change("airflowCmS", Number(event.target.value))
                }
                aria-label="Forced airflow input in centimeters per second"
              />
              <small>
                0 <span>60 cm/s</span>
              </small>
            </label>
            <label className="sim-range">
              <span>
                <Gauge size={13} />
                Ambient oxygen{" "}
                <strong>
                  {fmt(params.oxygenPct)}
                  <small>vol%</small>
                </strong>
              </span>
              <input
                type="range"
                min={0}
                max={30}
                step={0.01}
                value={params.oxygenPct}
                onChange={event =>
                  change("oxygenPct", Number(event.target.value))
                }
                aria-label="Ambient oxygen concentration in volume percent"
              />
              <small>
                0 <span>30 vol%</span>
              </small>
            </label>
            <small className="sim-input-note">
              Airflow is mapped to normalized transport. Intermediate buoyancy
              is exploratory, not validated lunar or Martian behavior.
            </small>
            <label className="sim-check">
              <input
                type="checkbox"
                checked={showFlow}
                onChange={event => setShowFlow(event.target.checked)}
              />
              <span>Show prescribed-flow guide</span>
            </label>
            <label className="sim-check">
              <input
                type="checkbox"
                checked={comparing}
                onChange={event => setComparing(event.target.checked)}
              />
              <span>Compare with synchronized 1g</span>
            </label>
            {comparing && (
              <small className="sim-input-note">
                Same oxygen and ventilation, different buoyancy only.{" "}
                {params.buoyancy === 1
                  ? "The two cases are identical at 1g."
                  : "A controlled model comparison, not measured validation."}
              </small>
            )}
          </section>
          <section className="panel sim-presets">
            <span className="eyebrow">ILLUSTRATIVE STARTING POINTS</span>
            <h3>Choose a question.</h3>
            {presets.map(preset => (
              <button
                key={preset.name}
                onClick={() =>
                  resetCase(
                    preset.params,
                    null,
                    `${preset.name}: illustrative preset loaded and paused.`
                  )
                }
              >
                <span>
                  <strong>{preset.name}</strong>
                  <small>{preset.description}</small>
                </span>
                <ArrowUpRight size={13} />
              </button>
            ))}
          </section>
          <section className="panel sim-import">
            <span className="eyebrow">OBSERVED CONDITIONS ≠ PREDICTION</span>
            <h3>Start from a real record.</h3>
            {!dataAvailable ? (
              <p>
                Experiment API unavailable. Manual and preset cases still run;
                record import is disabled.
              </p>
            ) : (
              <>
                <p>
                  Choose a record and copy its measured airflow and oxygen—not
                  its flame outcome.
                </p>
                <ExperimentSearch
                  value={query}
                  options={options}
                  exact={exact}
                  onChange={(value, selected) => {
                    setQuery(value);
                    setExact(selected);
                    setImportError("");
                  }}
                />
                <OrbitalSelect
                  value={phase}
                  onValueChange={value =>
                    setPhase(value as "initial" | "final")
                  }
                  ariaLabel="Recorded airflow to apply"
                  options={[
                    { value: "initial", label: "Use initial airflow" },
                    { value: "final", label: "Use final airflow" },
                  ]}
                />
                <button
                  className="secondary-button sim-apply"
                  disabled={!selectedRecord}
                  onClick={applyRecord}
                >
                  <Check size={13} /> Apply recorded conditions
                </button>
                {importError && (
                  <p className="sim-import-error" role="alert">
                    {importError}
                  </p>
                )}
              </>
            )}
          </section>
        </aside>
      </div>
      {applied && (
        <section className="panel sim-provenance">
          <div>
            <span className="eyebrow">
              MEASURED INPUT SOURCE · NOT A CALIBRATION
            </span>
            <h2>
              {applied.record.test_id}
              <span>{applied.record.material}</span>
            </h2>
            <p>
              Copied {applied.phase} airflow and oxygen only. The source
              geometry, chemistry, pressure and recorded outcome are not
              simulated.
            </p>
          </div>
          <div className="sim-provenance-values">
            <span>
              Recorded outcome
              <strong>{outcomeInfo(applied.record.outcome).label}</strong>
            </span>
            <span>
              Observed pressure
              <strong>
                <PressureValue record={applied.record} />
              </strong>
            </span>
            <span>
              Sample thickness / width
              <strong>
                {fmt(applied.record.thickness_mm)} /{" "}
                {fmt(applied.record.width_mm)} mm
              </strong>
            </span>
            <span>
              Original flow direction
              <strong>{applied.record.flow_direction || "Not recorded"}</strong>
            </span>
          </div>
          <p className="sim-source-notes">
            {applied.record.nasa_notes || "No source notes recorded."}
          </p>
          <div className="sim-provenance-actions">
            <button
              className="text-link"
              onClick={() => onDetail(applied.record)}
            >
              Inspect original record <ArrowUpRight size={12} />
            </button>
            {applied.record.source_id === "bass2-summary" && (
              <a
                href={sourcePdf(applied.record.pdf_page)}
                target="_blank"
                rel="noopener noreferrer"
              >
                NASA source{" "}
                {applied.record.pdf_page
                  ? `page ${applied.record.pdf_page}`
                  : "document"}{" "}
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </section>
      )}
      <section className={`panel sim-method ${methodOpen ? "open" : ""}`}>
        <button
          className="sim-method-toggle"
          onClick={() => setMethodOpen(!methodOpen)}
          aria-expanded={methodOpen}
        >
          <span>
            <BookOpen size={17} />
            <strong>Inside the model.</strong>
            <small>Equations, assumptions & source boundaries</small>
          </span>
          <ChevronDown size={17} />
        </button>
        {methodOpen && (
          <div className="sim-method-content">
            <div>
              <h3>Transport, not a safety verdict.</h3>
              <p>
                A generic localized fuel-vapor emitter and an artificial
                ignition pulse drive normalized thermal, oxygen and fuel fields.
                Upwind advection, diffusion, bounded heuristic reaction and
                cooling are calculated on a {MODEL_SIZE} × {MODEL_SIZE} grid.
                The prescribed velocity does not solve Navier–Stokes.
              </p>
              <code>∂H/∂t* + u·∇H = D∇²H + Q·R − λH</code>
              <p>
                Oxygen is scaled by 30 vol%; ventilation is scaled into a
                dimensionless velocity. The case advances in fixed {MODEL_TICK}{" "}
                model-time ticks and the horizon is {MODEL_DURATION}. Playback
                speed changes presentation only.
              </p>
              <p>
                No pressure coupling, material kinetics, solid pyrolysis,
                radiation, soot, cool-flame chemistry or source geometry is
                solved. A rounded field in still microgravity is not evidence
                that every space fire is spherical. All colors are false-color
                field mappings.
              </p>
            </div>
            <div>
              <h3>Disclosed assumptions.</h3>
              <ul>
                {MODEL_ASSUMPTIONS.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <details>
                <summary>Developer-selected numerical constants</summary>
                <pre>{JSON.stringify(MODEL_CONSTANTS, null, 2)}</pre>
              </details>
              <small>Model version: {MODEL_VERSION}</small>
            </div>
            <div className="sim-method-sources">
              <h3>Why this lab exists.</h3>
              <a
                href="https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/"
                target="_blank"
                rel="noopener noreferrer"
              >
                NASA Space Apps · Flame in Freefall <ExternalLink size={11} />
              </a>
              <a
                href="https://science.nasa.gov/biological-physical/resources/explainers-infographics/why-nasa-is-studying-flames-in-space/"
                target="_blank"
                rel="noopener noreferrer"
              >
                NASA · Why study flames in space? <ExternalLink size={11} />
              </a>
              <a
                href="https://svs.gsfc.nasa.gov/31394/"
                target="_blank"
                rel="noopener noreferrer"
              >
                NASA · SoFIE fabric behavior and transport{" "}
                <ExternalLink size={11} />
              </a>
              <a
                href="https://ntrs.nasa.gov/citations/20160000593"
                target="_blank"
                rel="noopener noreferrer"
              >
                NASA NTRS · BASS-II experimental results{" "}
                <ExternalLink size={11} />
              </a>
              <p>
                These references explain the research context. They do not
                validate this demonstrator's constants or predicted fields.
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
