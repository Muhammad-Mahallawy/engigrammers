import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileText, Info, RefreshCw } from "lucide-react";
import {
  apiGet,
  Experiment,
  fmt,
  Insights as InsightsData,
  outcomeInfo,
  sourceUrl,
} from "@/lib/flowtrace";
import OrbitalSelect from "@/components/OrbitalSelect";

export default function Insights({
  all,
  material,
  setMaterial,
  materials,
  base,
  onDetail,
}: {
  all: Experiment[];
  material: string;
  setMaterial: (s: string) => void;
  materials: string[];
  base: string;
  onDetail: (r: Experiment) => void;
}) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["insights", base, material],
    queryFn: () =>
      apiGet<InsightsData>(
        base,
        `/insights?material=${encodeURIComponent(material)}`
      ),
    retry: false,
  });
  const cohort = all.filter(r => !material || r.material === material);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">PATTERNS IN THE RECORD, NOT PREDICTIONS</div>
          <h1>
            Scientific insights<span className="cyan">.</span>
          </h1>
          <p>Descriptive summaries with the uncertainty left in view.</p>
        </div>
        <OrbitalSelect
          className="insight-material-select"
          ariaLabel="Insights material"
          value={material}
          onValueChange={setMaterial}
          options={[
            { value: "", label: "All materials" },
            ...materials.map(m => ({ value: m, label: m })),
          ]}
        />
      </div>
      <div className="notice">
        <Info size={17} />
        <p>
          Summaries include the full <b>{material || "all-material"}</b> cohort.
          Explorer search, outcome, direction and numerical filters do not apply
          here.
        </p>
      </div>
      {isLoading && (
        <div className="loading-state">
          Loading recorded outcome statistics…
        </div>
      )}
      {error && (
        <div className="error-state">
          <h3>Insights could not be loaded</h3>
          <p>{(error as Error).message}</p>
          <button className="secondary-button" onClick={() => refetch()}>
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      )}
      {data && (
        <>
          <div className="insight-overview">
            <div>
              <strong>{data.records_included}</strong>
              <span>EXPERIMENTS INCLUDED</span>
            </div>
            <div>
              <strong>{data.outcome_counts.length}</strong>
              <span>DISTINCT OUTCOME LABELS</span>
            </div>
            <div>
              <strong className="amber">
                {data.data_quality.records_with_unspecified_burn_outcome}
              </strong>
              <span>UNSPECIFIED BURN OUTCOMES</span>
            </div>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>What happened to the flame?</h2>
                <p>
                  Recorded outcome distribution · n = {data.records_included}
                </p>
              </div>
              <span className="tiny-tag">API SUMMARY</span>
            </div>
            <div className="outcome-bars">
              {data.outcome_counts.map(category => {
                const info = outcomeInfo(category.outcome);
                const pct = data.records_included
                  ? (category.count / data.records_included) * 100
                  : 0;
                return (
                  <div className="outcome-bar-row" key={category.outcome}>
                    <span>
                      <i style={{ background: info.color }} />
                      {info.label}
                    </span>
                    <div className="bar-track">
                      <i style={{ width: `${pct}%`, background: info.color }} />
                    </div>
                    <b>
                      {category.count}
                      <small>/{data.records_included}</small>
                    </b>
                    <span className="mono">{fmt(pct, 1)}%</span>
                  </div>
                );
              })}
            </div>
            <div className="panel-foot">
              Unspecified outcomes are retained as a separate category, never
              folded into sustained or extinguished.
            </div>
          </section>
          <section className="panel insights-means">
            <div className="panel-heading">
              <div>
                <h2>Conditions by recorded outcome</h2>
                <p>
                  Group means are not survival thresholds. Different sample
                  conditions may be mixed.
                </p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>OUTCOME</th>
                    <th>RECORDS</th>
                    <th>
                      MEAN INITIAL <small>cm/s · n</small>
                    </th>
                    <th>
                      MEAN FINAL <small>cm/s · n</small>
                    </th>
                    <th>
                      MEAN OXYGEN <small>vol% · n</small>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.outcome_counts.map(category => {
                    const group = cohort.filter(
                      r =>
                        r.outcome === category.outcome ||
                        (!r.outcome && category.outcome === "missing_outcome")
                    );
                    const nInitial = group.filter(
                      r => r.flow_initial_cm_s != null
                    ).length;
                    const nOxygen = group.filter(
                      r => r.oxygen_vol_pct != null
                    ).length;
                    return (
                      <tr key={category.outcome}>
                        <td>{outcomeInfo(category.outcome).label}</td>
                        <td className="mono">{category.count}</td>
                        <td className="mono">
                          {fmt(category.mean_initial_flow_cm_s, 3)}{" "}
                          <small>n={nInitial}</small>
                        </td>
                        <td className="mono">
                          {fmt(category.mean_final_flow_cm_s, 3)}{" "}
                          <small>n={category.final_flow_measurements}</small>
                        </td>
                        <td className="mono">
                          {fmt(category.mean_oxygen_vol_pct, 3)}{" "}
                          <small>n={nOxygen}</small>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <div className="insight-bottom">
            <section className="panel quality-panel">
              <h2>Data quality is part of the result</h2>
              <dl className="conditions">
                <div>
                  <dt>Missing final airflow</dt>
                  <dd>
                    {data.data_quality.records_missing_final_flow}/
                    {data.records_included}
                  </dd>
                </div>
                <div>
                  <dt>Missing oxygen concentration</dt>
                  <dd>
                    {data.data_quality.records_missing_oxygen}/
                    {data.records_included}
                  </dd>
                </div>
                <div>
                  <dt>Unspecified final burn outcomes</dt>
                  <dd className="amber">
                    {data.data_quality.records_with_unspecified_burn_outcome}/
                    {data.records_included}
                  </dd>
                </div>
              </dl>
              <p>{data.interpretation}</p>
            </section>
            <section className="panel quality-panel">
              <h2>
                <FileText size={17} /> Evidence behind this summary
              </h2>
              <p>
                Every aggregate above is derived from the returned experimental
                records. Follow an example back to its original source.
              </p>
              <div className="evidence-records">
                {cohort.slice(0, 3).map(r => (
                  <button
                    key={r.id}
                    className="text-link"
                    onClick={() => onDetail(r)}
                  >
                    {r.test_id}
                    <small>Page {fmt(r.pdf_page, 0)}</small>
                    <ArrowRight size={13} />
                  </button>
                ))}
              </div>
              {[...new Set(cohort.map(r => r.source_id))].map(
                s =>
                  sourceUrl(s) && (
                    <a
                      className="text-link"
                      key={s}
                      href={sourceUrl(s)!}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      NASA BASS-II summary report <ArrowRight size={13} />
                    </a>
                  )
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
