import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, Plus, X } from "lucide-react";
import {
  apiGet,
  Comparison,
  Experiment,
  fmt,
  signed,
  sourcePdf,
} from "@/lib/flowtrace";
import { OutcomeBadge } from "@/components/FlowChart";
import OrbitalSelect from "@/components/OrbitalSelect";
import PressureValue from "@/components/PressureValue";

export default function Compare({
  all,
  selected,
  setSelected,
  base,
  onDetail,
}: {
  all: Experiment[];
  selected: string[];
  setSelected: (s: string[]) => void;
  base: string;
  onDetail: (r: Experiment) => void;
}) {
  const ids = selected.length
    ? selected
    : ["GMT45-T4", "GMT45-T15"].filter(id => all.some(r => r.test_id === id));
  const rows = ids.flatMap(id => {
    const row = all.find(r => r.test_id === id);
    return row ? [row] : [];
  });
  const { data, error, isLoading } = useQuery({
    queryKey: ["compare", base, ids[0], ids[1]],
    queryFn: () =>
      apiGet<Comparison>(
        base,
        `/compare?test_a=${encodeURIComponent(ids[0])}&test_b=${encodeURIComponent(ids[1])}`
      ),
    enabled: ids.length >= 2,
    retry: false,
  });
  const fields: { key: keyof Experiment; label: string; unit?: string }[] = [
    { key: "flow_initial_cm_s", label: "Initial airflow", unit: "cm/s" },
    { key: "flow_final_cm_s", label: "Final airflow", unit: "cm/s" },
    { key: "flow_change_cm_s", label: "Airflow change · ΔV", unit: "cm/s" },
    { key: "flow_ratio", label: "Final / initial ratio", unit: "×" },
    { key: "oxygen_vol_pct", label: "Oxygen concentration", unit: "vol%" },
    { key: "pressure_kpa", label: "Pressure", unit: "kPa" },
    { key: "thickness_mm", label: "Sample thickness", unit: "mm" },
    { key: "width_mm", label: "Sample width", unit: "mm" },
    { key: "material", label: "Material" },
    { key: "flow_direction", label: "Flow direction" },
    { key: "investigation", label: "Investigation" },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SIDE BY SIDE, NOT CAUSE AND EFFECT</div>
          <h1>
            Compare experiments<span className="cyan">.</span>
          </h1>
          <p>
            Look closer at the conditions behind different recorded outcomes.
          </p>
        </div>
        <button className="secondary-button" onClick={() => setSelected([])}>
          Load example pair
        </button>
      </div>
      <section className="panel compare-selector">
        <span className="eyebrow">INVESTIGATION SET</span>
        <div className="compare-selectors">
          {ids.map((id, index) => (
            <div key={index}>
              <span>EXPERIMENT {String.fromCharCode(65 + index)}</span>
              <OrbitalSelect
                ariaLabel={`Experiment ${String.fromCharCode(65 + index)}`}
                className="comparison-experiment-select"
                value={id}
                onValueChange={value => {
                  const next = [...ids];
                  if (next.includes(value)) return;
                  next[index] = value;
                  setSelected(next);
                }}
                options={all.map(r => ({
                  value: r.test_id,
                  label: `${r.test_id} · ${r.material}`,
                  disabled: ids.includes(r.test_id) && r.test_id !== id,
                }))}
              />
              <button
                aria-label={`Remove ${id}`}
                className="icon-button"
                onClick={() => setSelected(ids.filter((_, i) => i !== index))}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {ids.length < 4 && (
            <button
              className="add-compare"
              onClick={() => {
                const next = all.find(r => !ids.includes(r.test_id));
                if (next) setSelected([...ids, next.test_id]);
              }}
            >
              <Plus size={18} />
              Add experiment
            </button>
          )}
        </div>
        <p className="micro">
          Up to four records. The API's pairwise differences below compare B
          minus A.
        </p>
      </section>
      {rows.length > 0 && (
        <div
          className="compare-cards"
          style={{
            gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))`,
          }}
        >
          {rows.map((r, index) => (
            <section className="panel compare-card" key={r.test_id}>
              <span className="eyebrow">
                EXPERIMENT {String.fromCharCode(65 + index)}
              </span>
              <h2>{r.test_id}</h2>
              <OutcomeBadge record={r} />
              <div className="feature-flow">
                <div>
                  <span>INITIAL</span>
                  <strong>{fmt(r.flow_initial_cm_s)}</strong>
                  <small>cm/s</small>
                </div>
                <ArrowRight className="cyan" size={22} />
                <div>
                  <span>FINAL</span>
                  <strong>{fmt(r.flow_final_cm_s)}</strong>
                  <small>cm/s</small>
                </div>
              </div>
              <button className="text-link" onClick={() => onDetail(r)}>
                Read experiment evidence <ArrowRight size={14} />
              </button>
            </section>
          ))}
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Measured conditions</h2>
            <p>
              Missing values stay missing. No estimates or substituted values.
            </p>
          </div>
          <span className="tiny-tag">DESCRIPTIVE COMPARISON</span>
        </div>
        <div className="table-scroll">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>VARIABLE</th>
                {rows.map((r, i) => (
                  <th key={r.id}>
                    {String.fromCharCode(65 + i)} / {r.test_id}
                  </th>
                ))}
                {rows.length >= 2 && (
                  <th>
                    B − A <small>API result</small>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {fields.map(field => (
                <tr key={field.key}>
                  <td>
                    {field.label}
                    <small>{field.unit}</small>
                  </td>
                  {rows.map(r => (
                    <td
                      key={r.id}
                      className={typeof r[field.key] === "number" ? "mono" : ""}
                    >
                      {field.key === "pressure_kpa" ? (
                        <PressureValue record={r} />
                      ) : typeof r[field.key] === "number" ? (
                        fmt(r[field.key] as number, 4)
                      ) : r[field.key] == null ? (
                        "Not recorded"
                      ) : (
                        String(r[field.key])
                      )}
                    </td>
                  ))}
                  {rows.length >= 2 && (
                    <td className="cyan mono">
                      {data &&
                      Object.hasOwn(data.difference_b_minus_a, field.key)
                        ? signed(data.difference_b_minus_a[field.key])
                        : "—"}
                    </td>
                  )}
                </tr>
              ))}
              <tr>
                <td>Recorded outcome</td>
                {rows.map(r => (
                  <td key={r.id}>
                    <OutcomeBadge record={r} />
                  </td>
                ))}
                {rows.length >= 2 && <td>Not a numeric difference</td>}
              </tr>
              <tr>
                <td>Source evidence</td>
                {rows.map(r => (
                  <td key={r.id}>
                    {r.source_id === "bass2-summary" ? (
                      <a
                        className="text-link"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={sourcePdf(r.pdf_page)}
                      >
                        Page {fmt(r.pdf_page, 0)} <ExternalLink size={12} />
                      </a>
                    ) : (
                      r.source_id || "Not recorded"
                    )}
                  </td>
                ))}
                {rows.length >= 2 && <td>Original page references</td>}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      {isLoading && rows.length >= 2 && (
        <p className="micro">Retrieving the API's pairwise comparison…</p>
      )}
      {error && (
        <p className="error-inline">
          Pairwise API comparison unavailable: {(error as Error).message}.
          Differences are not estimated.
        </p>
      )}
      {data && (
        <section className="context-panel">
          <span className="eyebrow">COMPARISON CONTEXT / A & B</span>
          <div className="context-chips">
            <span>
              {data.comparison_context.same_material
                ? "Same material"
                : "Different materials"}
            </span>
            <span>
              {data.comparison_context.same_flow_direction
                ? "Same flow direction"
                : "Different flow directions"}
            </span>
            <span>
              {data.comparison_context.same_investigation
                ? "Same investigation"
                : "Different investigations"}
            </span>
          </div>
          <p>{data.comparison_context.caution}</p>
          {rows.length > 2 && (
            <p className="micro">
              C and D are shown as returned experimental records; the API
              context above applies only to A and B.
            </p>
          )}
        </section>
      )}
      {rows.length < 2 && (
        <div className="empty-state">
          <h3>Select a second experiment</h3>
          <p>Two or more records are needed for a comparison.</p>
        </div>
      )}
    </>
  );
}
