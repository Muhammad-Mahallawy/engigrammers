import { useMemo, useState } from "react";
import { ArrowUpRight, CircleHelp } from "lucide-react";
import { Experiment, fmt, outcomeInfo } from "@/lib/flowtrace";

export function OutcomeBadge({
  record,
}: {
  record: Pick<Experiment, "outcome" | "outcome_label">;
}) {
  const info = outcomeInfo(record.outcome);
  return (
    <span
      className={`outcome-badge ${info.className}`}
      title={record.outcome_label || "No outcome recorded"}
    >
      <i style={{ background: info.color }} />
      {info.label}
    </span>
  );
}
export function FlowChart({
  rows,
  onSelect,
}: {
  rows: Experiment[];
  onSelect: (row: Experiment) => void;
}) {
  const [mode, setMode] = useState<"final" | "change">("final");
  const [hover, setHover] = useState<Experiment | null>(null);
  const plotted = rows.filter(
    r =>
      r.flow_initial_cm_s != null &&
      r.flow_final_cm_s != null &&
      (mode === "final" || r.flow_change_cm_s != null)
  );
  const categories = useMemo(
    () => [...new Set(rows.map(r => r.outcome))],
    [rows]
  );
  const xMax =
    Math.ceil(Math.max(50, ...plotted.map(r => r.flow_initial_cm_s!)) / 10) *
    10;
  const yMin =
    mode === "change"
      ? Math.floor(
          Math.min(-10, ...plotted.map(r => r.flow_change_cm_s!)) / 10
        ) * 10
      : 0;
  const yMax =
    Math.ceil(
      Math.max(
        mode === "change" ? 40 : 50,
        ...plotted.map(r =>
          mode === "change" ? r.flow_change_cm_s! : r.flow_final_cm_s!
        )
      ) / 10
    ) * 10;
  const px = (v: number) => 66 + (v / xMax) * 616;
  const py = (v: number) => 294 - ((v - yMin) / (yMax - yMin)) * 248;
  const yTicks = Array.from(
    { length: (yMax - yMin) / 10 + 1 },
    (_, i) => yMin + i * 10
  );
  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <h2>
            Airflow & flame outcome <span className="tiny-tag">OBSERVED</span>
          </h2>
          <p>Each point is a recorded experiment. Select one to investigate.</p>
        </div>
        <div className="segmented">
          <button
            className={mode === "final" ? "active" : ""}
            onClick={() => setMode("final")}
          >
            Final flow
          </button>
          <button
            className={mode === "change" ? "active" : ""}
            onClick={() => setMode("change")}
          >
            Flow change
          </button>
        </div>
      </div>
      <div className="plot-wrap">
        <svg
          viewBox="0 0 740 350"
          role="group"
          aria-label={`${mode === "final" ? "Final airflow" : "Airflow change"} against initial airflow; ${plotted.length} complete records`}
        >
          <defs>
            <pattern
              id="plotDots"
              width="13"
              height="13"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r=".6" fill="#233342" />
            </pattern>
          </defs>
          <rect x="66" y="46" width="616" height="248" fill="url(#plotDots)" />
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1="66"
                y1={py(t)}
                x2="682"
                y2={py(t)}
                stroke="#25323f"
                strokeDasharray="3 5"
              />
              <text
                x="51"
                y={py(t) + 4}
                textAnchor="end"
                className="plot-label"
              >
                {fmt(t, 1)}
              </text>
            </g>
          ))}
          {[0, 10, 20, 30, 40, 50]
            .filter(v => v <= xMax)
            .map(t => (
              <g key={t}>
                <line
                  x1={px(t)}
                  y1="46"
                  x2={px(t)}
                  y2="294"
                  stroke="#25323f"
                  strokeDasharray="3 5"
                />
                <text
                  x={px(t)}
                  y="313"
                  textAnchor="middle"
                  className="plot-label"
                >
                  {t}
                </text>
              </g>
            ))}
          {mode === "final" ? (
            <>
              <line
                x1={px(0)}
                y1={py(0)}
                x2={px(Math.min(xMax, yMax))}
                y2={py(Math.min(xMax, yMax))}
                stroke="#586c7c"
                strokeDasharray="5 6"
              />
              <text
                x="528"
                y="59"
                className="plot-label"
                transform="rotate(-22 528 59)"
              >
                unchanged airflow
              </text>
            </>
          ) : (
            <line
              x1="66"
              y1={py(0)}
              x2="682"
              y2={py(0)}
              stroke="#586c7c"
              strokeDasharray="5 6"
            />
          )}
          <text x="375" y="343" textAnchor="middle" className="plot-axis">
            Initial airflow (cm/s)
          </text>
          <text
            transform="translate(18 175) rotate(-90)"
            textAnchor="middle"
            className="plot-axis"
          >
            {mode === "final"
              ? "Final airflow (cm/s)"
              : "Airflow change (cm/s)"}
          </text>
          {plotted.map(r => {
            const y =
              mode === "final" ? r.flow_final_cm_s! : r.flow_change_cm_s!;
            const active = hover?.id === r.id;
            return (
              <g
                key={r.id}
                role="button"
                tabIndex={0}
                aria-label={`${r.test_id}: initial ${r.flow_initial_cm_s}, final ${r.flow_final_cm_s} cm/s, ${outcomeInfo(r.outcome).label}`}
                onClick={() => onSelect(r)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(r);
                  }
                }}
                onMouseEnter={() => setHover(r)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(r)}
                onBlur={() => setHover(null)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={px(r.flow_initial_cm_s!)}
                  cy={py(y)}
                  r={active ? 12 : 10}
                  fill="transparent"
                />
                <circle
                  cx={px(r.flow_initial_cm_s!)}
                  cy={py(y)}
                  r={active ? 7 : 4.8}
                  fill={outcomeInfo(r.outcome).color}
                  fillOpacity={active ? 1 : 0.72}
                  stroke={active ? "#edf8ff" : "#111d28"}
                  strokeWidth={active ? 1.6 : 1.2}
                />
                <title>
                  {r.test_id} · {outcomeInfo(r.outcome).label}
                </title>
              </g>
            );
          })}
          {!plotted.length && (
            <text x="375" y="175" textAnchor="middle" className="plot-axis">
              No complete airflow measurements in this selection
            </text>
          )}
        </svg>
        {hover && (
          <div className="plot-tooltip">
            <b>{hover.test_id}</b>
            <span>
              {fmt(hover.flow_initial_cm_s)} → {fmt(hover.flow_final_cm_s)} cm/s
            </span>
            <small>{outcomeInfo(hover.outcome).label}</small>
          </div>
        )}
      </div>
      <div className="chart-legend">
        {categories.map((o, i) => (
          <span key={o || i}>
            <i style={{ background: outcomeInfo(o).color }} />
            {outcomeInfo(o).label}
          </span>
        ))}
      </div>
      <div className="panel-foot">
        <span>
          <CircleHelp size={13} />
          {plotted.length}/{rows.length} records plotted · overlapping points
          share measured values
        </span>
        <span>
          No inferred thresholds <ArrowUpRight size={13} />
        </span>
      </div>
    </section>
  );
}
