import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, FileText, Plus, X } from "lucide-react";
import {
  apiGet,
  Experiment,
  fmt,
  signed,
  sourcePdf,
  sourceUrl,
  sourcePressureRange,
} from "@/lib/flowtrace";
import { OutcomeBadge } from "./FlowChart";
import PressureValue from "./PressureValue";

export default function ExperimentDetail({
  row,
  base,
  onClose,
  onCompare,
}: {
  row: Experiment;
  base: string;
  onClose: () => void;
  onCompare: (r: Experiment) => void;
}) {
  const { data, isError, error } = useQuery({
    queryKey: ["experiment", base, row.test_id],
    queryFn: () =>
      apiGet<Experiment>(
        base,
        `/experiments/${encodeURIComponent(row.test_id)}`
      ),
    retry: false,
  });
  const r = data || row;
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
          "button, a[href], input, select"
        );
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  const explanation =
    r.outcome === "quenched_low_flow"
      ? "The source classifies this test as low-flow quenching. The airflow values below are recorded conditions, not a universal extinction threshold."
      : r.outcome === "blowoff"
        ? "The source classifies this test as blowoff. This is a different recorded outcome from low-flow quenching; these measurements alone do not isolate its cause."
        : r.outcome === "burned_outcome_not_stated"
          ? "Burning was recorded, but the final outcome was not specified in the source table. This record must not be treated as confirmed sustained burning."
          : r.outcome === "not_ignited"
            ? "The source records that the sample did not ignite. This is not equivalent to a flame that ignited and was later extinguished."
            : "This label is the documented experimental result. Interpret it alongside the sample geometry, airflow direction, oxygen and pressure.";
  return (
    <div
      className="drawer-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="detail-drawer"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <div className="drawer-top">
          <span className="eyebrow">EXPERIMENT RECORD</span>
          <button
            ref={closeRef}
            className="icon-button"
            aria-label="Close experiment details"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="detail-title">{r.test_id}</h2>
        <p className="muted">
          {r.investigation || "Investigation not recorded"} / {r.material}
        </p>
        <OutcomeBadge record={r} />
        {isError && (
          <p className="error-inline">
            Detail refresh failed: {(error as Error).message}. Showing the
            record already returned by the API.
          </p>
        )}
        <section className="detail-section">
          <h3>Airflow investigation</h3>
          <div className="flow-readings">
            <div>
              <span>Initial airflow</span>
              <strong>{fmt(r.flow_initial_cm_s)}</strong>
              <small>cm/s</small>
            </div>
            <ArrowRight className="cyan" />
            <div>
              <span>Final airflow</span>
              <strong>{fmt(r.flow_final_cm_s)}</strong>
              <small>cm/s</small>
            </div>
          </div>
          <div className="detail-derived">
            <span>
              ΔV = final − initial <b>{signed(r.flow_change_cm_s)} cm/s</b>
            </span>
            <span>
              Final / initial ratio{" "}
              <b>
                {fmt(r.flow_ratio, 4)}
                {r.flow_ratio != null ? "×" : ""}
              </b>
            </span>
          </div>
          <p className="micro">
            As recorded: {r.flow_as_recorded || "Not recorded"}. A ratio is
            undefined when initial airflow is zero.
          </p>
        </section>
        <section className="detail-section">
          <h3>Experimental conditions</h3>
          <dl className="conditions">
            <div>
              <dt>Oxygen concentration</dt>
              <dd>
                {fmt(r.oxygen_vol_pct)}
                {r.oxygen_vol_pct != null ? " vol%" : ""}
              </dd>
            </div>
            <div>
              <dt>Pressure</dt>
              <dd>
                <PressureValue record={r} />
              </dd>
            </div>
            <div>
              <dt>Flow direction</dt>
              <dd>{r.flow_direction || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Sample thickness</dt>
              <dd>
                {fmt(r.thickness_mm)}
                {r.thickness_mm != null ? " mm" : ""}
              </dd>
            </div>
            <div>
              <dt>Sample width</dt>
              <dd>
                {fmt(r.width_mm)}
                {r.width_mm != null ? " mm" : ""}
              </dd>
            </div>
            <div>
              <dt>Outcome status</dt>
              <dd>{r.outcome_status}</dd>
            </div>
          </dl>
          {sourcePressureRange(r) && (
            <p className="micro">
              The API returns null for pressure because its numeric parser does
              not handle this range. The range above is preserved from the
              original supplied CSV as source context, not a numeric API
              measurement. No pressure difference is inferred.
            </p>
          )}
        </section>
        <section className="detail-section">
          <h3>What the record tells us</h3>
          <p>{explanation}</p>
          <div className="source-note">
            <b>Original outcome label</b>
            <p>{r.outcome_label || "No outcome label recorded"}</p>
          </div>
          {r.nasa_notes && (
            <div className="source-note">
              <b>NASA notes · as supplied</b>
              <p>{r.nasa_notes}</p>
            </div>
          )}
        </section>
        <section className="detail-section">
          <h3>
            <FileText size={16} /> Evidence trail
          </h3>
          <p>
            Source ID: <code>{r.source_id || "Not recorded"}</code>
            <br />
            Source page: {fmt(r.pdf_page, 0)}
          </p>
          {sourceUrl(r.source_id) && (
            <a
              className="text-link"
              href={sourcePdf(r.pdf_page)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original NASA report <ExternalLink size={14} />
            </a>
          )}
          <p className="micro">
            Page reference preserved from the supplied dataset; PDF and printed
            pagination may differ. The extracted row has not been independently
            re-audited.
          </p>
        </section>
        <div className="drawer-action">
          <button
            className="primary-button"
            onClick={() => {
              onCompare(r);
            }}
          >
            <Plus size={16} /> Add to comparison
          </button>
        </div>
      </aside>
    </div>
  );
}
