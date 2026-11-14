import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Experiment,
  Filters,
  downloadCsv,
  fmt,
  outcomeInfo,
  signed,
} from "@/lib/flowtrace";
import { FlowChart, OutcomeBadge } from "@/components/FlowChart";
import SpaceHero from "@/components/SpaceHero";
import OrbitalSelect from "@/components/OrbitalSelect";
import ExperimentSearch from "@/components/ExperimentSearch";
import { matchesExperimentSearch } from "@/lib/experimentSearch";

interface Props {
  all: Experiment[];
  filters: Filters;
  material: string;
  setMaterial: (s: string) => void;
  selected: string[];
  toggleSelected: (r: Experiment) => void;
  onDetail: (r: Experiment) => void;
  onCompare: () => void;
}
export default function Explorer({
  all,
  filters,
  material,
  setMaterial,
  selected,
  toggleSelected,
  onDetail,
  onCompare,
}: Props) {
  const [search, setSearch] = useState("");
  const [exactSearch, setExactSearch] = useState(false);
  const [direction, setDirection] = useState("");
  const [outcome, setOutcome] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [bounds, setBounds] = useState({
    minO: "",
    maxO: "",
    minF: "",
    maxF: "",
  });
  const [sort, setSort] = useState<"id" | "oxygen" | "change">("id");
  const [desc, setDesc] = useState(false);
  const [page, setPage] = useState(0);
  const cohort = all.filter(r => !material || r.material === material);
  const invalidRange =
    (bounds.minO !== "" &&
      bounds.maxO !== "" &&
      Number(bounds.minO) > Number(bounds.maxO)) ||
    (bounds.minF !== "" &&
      bounds.maxF !== "" &&
      Number(bounds.minF) > Number(bounds.maxF));
  const matchingConditions = useMemo(
    () =>
      cohort.filter(r => {
        const within = (value: number | null, min: string, max: string) =>
          (min === "" || (value != null && value >= Number(min))) &&
          (max === "" || (value != null && value <= Number(max)));
        return (
          (!direction || r.flow_direction === direction) &&
          (!outcome || r.outcome === outcome) &&
          within(r.oxygen_vol_pct, bounds.minO, bounds.maxO) &&
          within(r.flow_initial_cm_s, bounds.minF, bounds.maxF)
        );
      }),
    [cohort, direction, outcome, bounds]
  );
  const rows = useMemo(
    () =>
      matchingConditions
        .filter(r => matchesExperimentSearch(r, search, exactSearch))
        .sort((a, b) => {
          let diff: number;
          if (sort === "id")
            diff = a.test_id.localeCompare(b.test_id, undefined, {
              numeric: true,
            });
          else {
            const av =
              sort === "oxygen" ? a.oxygen_vol_pct : a.flow_change_cm_s;
            const bv =
              sort === "oxygen" ? b.oxygen_vol_pct : b.flow_change_cm_s;
            if (av == null) return 1;
            if (bv == null) return -1;
            diff = av - bv;
          }
          return desc ? -diff : diff;
        }),
    [matchingConditions, search, exactSearch, sort, desc]
  );
  const suggestions = useMemo(
    () =>
      matchingConditions
        .filter(r => exactSearch || matchesExperimentSearch(r, search))
        .sort((a, b) =>
          a.test_id.localeCompare(b.test_id, undefined, { numeric: true })
        ),
    [matchingConditions, search, exactSearch]
  );
  const pageCount = Math.ceil(rows.length / 8);
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const visible = rows.slice(safePage * 8, safePage * 8 + 8);
  const oxygen = rows.flatMap(r =>
    r.oxygen_vol_pct == null ? [] : [r.oxygen_vol_pct]
  );
  const featured =
    rows.find(r => r.test_id === "GMT45-T4") ||
    rows.find(r => r.outcome === "quenched_low_flow") ||
    rows[0];
  const unspecified = rows.filter(r => r.outcome_status !== "recorded").length;
  const complete = rows.filter(
    r => r.flow_initial_cm_s != null && r.flow_final_cm_s != null
  ).length;
  const reset = () => {
    setSearch("");
    setExactSearch(false);
    setDirection("");
    setOutcome("");
    setBounds({ minO: "", maxO: "", minF: "", maxF: "" });
    setPage(0);
  };
  const filtered =
    !!search || !!direction || !!outcome || Object.values(bounds).some(Boolean);
  const setSortField = (field: typeof sort) => {
    if (sort === field) setDesc(!desc);
    else {
      setSort(field);
      setDesc(false);
    }
  };
  return (
    <>
      <SpaceHero />
      <div className="cohort-line">
        <span className="live-dot" />
        NASA BASS / BASS-II<span className="divider-dot">·</span>
        {material || "All materials"}
        <span className="divider-dot">·</span>Recorded observations, not
        predictions
      </div>
      <div className="metric-strip">
        <div className="metric">
          <span>
            EXPERIMENTS IN VIEW <FileText size={14} />
          </span>
          <div>
            <strong>{rows.length.toString().padStart(2, "0")}</strong>
            <small>of {cohort.length} in this cohort</small>
          </div>
          <div className="metric-mini-line">
            <i
              style={{
                width: `${cohort.length ? (rows.length / cohort.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="metric">
          <span>
            PAIRED AIRFLOW RECORDS <ArrowRight size={14} />
          </span>
          <div>
            <strong>
              {complete}
              <em>/{rows.length}</em>
            </strong>
            <small>initial + final measurements</small>
          </div>
          <span className="metric-note cyan">
            {rows.length
              ? `${Math.round((complete / rows.length) * 100)}% complete`
              : "No records"}
          </span>
        </div>
        <div className="metric">
          <span>
            OXYGEN RANGE <span className="metric-symbol">O₂</span>
          </span>
          <div>
            <strong className="range-value">
              {oxygen.length
                ? `${fmt(Math.min(...oxygen))}–${fmt(Math.max(...oxygen))}`
                : "—"}
              <em> vol%</em>
            </strong>
          </div>
          <span className="metric-note">
            {oxygen.length}/{rows.length} measured concentrations
          </span>
        </div>
        <div className="metric">
          <span>
            UNSPECIFIED / UNKNOWN <span className="amber">◌</span>
          </span>
          <div>
            <strong>{unspecified.toString().padStart(2, "0")}</strong>
            <small>of {rows.length} final outcomes</small>
          </div>
          <span className="metric-note amber">
            Never classified as sustained
          </span>
        </div>
      </div>
      <div className="workspace-heading" id="experiment-workspace">
        <div>
          <span className="eyebrow">THE EXPERIMENTAL ARCHIVE</span>
          <h2>
            Follow the flow<span className="cyan">.</span>
          </h2>
          <p>
            Filter the conditions. Compare the outcomes. Find your next
            question.
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={!rows.length}
          onClick={() => downloadCsv(rows)}
        >
          <Download size={15} /> Export records
        </button>
      </div>
      <div className="filter-bar">
        <ExperimentSearch
          value={search}
          exact={exactSearch}
          options={suggestions}
          onChange={(value, exact) => {
            setSearch(value);
            setExactSearch(exact);
            setPage(0);
          }}
        />
        <div className="filter-select">
          <span>Material</span>
          <OrbitalSelect
            ariaLabel="Filter material"
            value={material}
            onValueChange={value => {
              setMaterial(value);
              setPage(0);
            }}
            options={[
              { value: "", label: "All materials" },
              ...filters.materials.map(m => ({ value: m, label: m })),
            ]}
          />
        </div>
        <div className="filter-select">
          <span>Flow direction</span>
          <OrbitalSelect
            ariaLabel="Filter flow direction"
            value={direction}
            onValueChange={value => {
              setDirection(value);
              setPage(0);
            }}
            options={[
              { value: "", label: "All directions" },
              ...filters.flow_directions.map(m => ({
                value: m,
                label: m[0].toUpperCase() + m.slice(1),
              })),
            ]}
          />
        </div>
        <div className="filter-select outcome-select">
          <span>Outcome</span>
          <OrbitalSelect
            ariaLabel="Filter outcome"
            value={outcome}
            onValueChange={value => {
              setOutcome(value);
              setPage(0);
            }}
            options={[
              { value: "", label: "All outcomes" },
              ...filters.outcomes.map(o => ({
                value: o.value,
                label: outcomeInfo(o.value).label,
              })),
            ]}
          />
        </div>
        <button
          className={`filter-more ${advanced ? "active" : ""}`}
          aria-expanded={advanced}
          onClick={() => setAdvanced(!advanced)}
        >
          <SlidersHorizontal size={16} />
          <span>More filters</span>
        </button>
      </div>
      {advanced && (
        <div className="advanced-filters">
          <div>
            <b>
              Oxygen concentration <small>vol%</small>
            </b>
            <div>
              {(["minO", "maxO"] as const).map((key, i) => (
                <input
                  key={key}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  aria-label={i ? "Maximum oxygen" : "Minimum oxygen"}
                  placeholder={i ? "Maximum" : "Minimum"}
                  value={bounds[key]}
                  onChange={e => {
                    setBounds({ ...bounds, [key]: e.target.value });
                    setPage(0);
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <b>
              Initial airflow <small>cm/s</small>
            </b>
            <div>
              {(["minF", "maxF"] as const).map((key, i) => (
                <input
                  key={key}
                  type="number"
                  min="0"
                  step="0.1"
                  aria-label={
                    i ? "Maximum initial airflow" : "Minimum initial airflow"
                  }
                  placeholder={i ? "Maximum" : "Minimum"}
                  value={bounds[key]}
                  onChange={e => {
                    setBounds({ ...bounds, [key]: e.target.value });
                    setPage(0);
                  }}
                />
              ))}
            </div>
          </div>
          <p className={invalidRange ? "amber" : "micro"}>
            {invalidRange
              ? "Minimum must not exceed maximum."
              : "Missing values are excluded when a numerical bound is active."}
          </p>
          <button className="text-link" onClick={reset}>
            Reset filters <X size={13} />
          </button>
        </div>
      )}
      <div className="explorer-visuals">
        <FlowChart rows={rows} onSelect={onDetail} />
        <section className="panel featured-panel">
          <div className="feature-top">
            <span className="eyebrow">UNDER THE MICROSCOPE</span>
            <ArrowUpRight size={17} />
          </div>
          {featured ? (
            <>
              <h2>{featured.test_id}</h2>
              <p className="feature-subtitle">
                {featured.material} ·{" "}
                {featured.flow_direction || "Direction not recorded"}
              </p>
              <OutcomeBadge record={featured} />
              <div className="feature-flow">
                <div>
                  <span>INITIAL</span>
                  <strong>{fmt(featured.flow_initial_cm_s)}</strong>
                  <small>cm/s</small>
                </div>
                <div className="flow-arrow">
                  <ArrowRight size={24} />
                </div>
                <div>
                  <span>FINAL</span>
                  <strong>{fmt(featured.flow_final_cm_s)}</strong>
                  <small>cm/s</small>
                </div>
              </div>
              <div className="feature-facts">
                <span>
                  Airflow change <b>{signed(featured.flow_change_cm_s)} cm/s</b>
                </span>
                <span>
                  Oxygen concentration{" "}
                  <b>{fmt(featured.oxygen_vol_pct)} vol%</b>
                </span>
              </div>
              <p className="feature-explanation">
                {featured.outcome === "quenched_low_flow"
                  ? "Airflow decreased. The recorded result: low-flow quenching. Investigate the conditions behind this observation."
                  : featured.outcome_status === "unspecified"
                    ? "Burning was recorded, but the final outcome is unspecified. Explore the original conditions and evidence."
                    : "Explore the measured conditions and the documented result for this experiment."}
              </p>
              <button
                className="feature-button"
                onClick={() => onDetail(featured)}
              >
                Investigate experiment <ArrowRight size={15} />
              </button>
              <div className="feature-source">
                <FileText size={12} />
                Source page {fmt(featured.pdf_page, 0)} ·{" "}
                {featured.investigation}
              </div>
            </>
          ) : (
            <p>No experiments match these filters.</p>
          )}
        </section>
      </div>
      <section className="panel records-panel">
        <div className="records-heading">
          <div>
            <h2>
              Experimental records{" "}
              <span className="count-tag">{rows.length}</span>
            </h2>
            <p>
              Select up to four records to compare their measured conditions.
            </p>
          </div>
          <div className="record-actions">
            {filtered && (
              <button className="text-link" onClick={reset}>
                Clear filters <X size={13} />
              </button>
            )}
            <span className="micro">
              {selected.length
                ? `${selected.length} selected`
                : "All values as recorded"}
            </span>
          </div>
        </div>
        <div className="table-scroll">
          <table className="records-table">
            <thead>
              <tr>
                <th className="check-cell">
                  <span className="sr-only">Select</span>
                </th>
                <th>
                  <button onClick={() => setSortField("id")}>
                    EXPERIMENT <ArrowDown size={11} />
                  </button>
                </th>
                <th>
                  INITIAL <small>cm/s</small>
                </th>
                <th>
                  FINAL <small>cm/s</small>
                </th>
                <th>
                  <button onClick={() => setSortField("change")}>
                    Δ FLOW <small>cm/s</small>
                    <ArrowDown size={11} />
                  </button>
                </th>
                <th>
                  <button onClick={() => setSortField("oxygen")}>
                    OXYGEN <small>vol%</small>
                    <ArrowDown size={11} />
                  </button>
                </th>
                <th>RECORDED OUTCOME</th>
                <th>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr
                  key={r.id}
                  className={selected.includes(r.test_id) ? "selected" : ""}
                >
                  <td className="check-cell">
                    <label className="record-check">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.test_id} for comparison`}
                        checked={selected.includes(r.test_id)}
                        onChange={() => toggleSelected(r)}
                      />
                      <span>
                        {selected.includes(r.test_id) && <Check size={11} />}
                      </span>
                    </label>
                  </td>
                  <td>
                    <button className="id-button" onClick={() => onDetail(r)}>
                      {r.test_id}
                      <small>{r.investigation}</small>
                    </button>
                  </td>
                  <td className="mono">{fmt(r.flow_initial_cm_s)}</td>
                  <td className="mono">{fmt(r.flow_final_cm_s)}</td>
                  <td
                    className={`mono ${r.flow_change_cm_s != null && r.flow_change_cm_s < 0 ? "cyan" : ""}`}
                  >
                    <span className="delta-value">
                      {r.flow_change_cm_s != null && r.flow_change_cm_s < 0 && (
                        <ArrowDownRight size={13} />
                      )}{" "}
                      {signed(r.flow_change_cm_s)}
                    </span>
                  </td>
                  <td className="mono">{fmt(r.oxygen_vol_pct)}</td>
                  <td>
                    <OutcomeBadge record={r} />
                  </td>
                  <td>
                    <button
                      className="row-detail"
                      aria-label={`View ${r.test_id}`}
                      onClick={() => onDetail(r)}
                    >
                      <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="empty-state">
            <Search size={28} />
            <h3>No experiments match</h3>
            <p>Try a different ID, material, or measurement range.</p>
            <button className="secondary-button" onClick={reset}>
              Reset filters
            </button>
          </div>
        )}
        <div className="table-footer">
          <span>
            {rows.length
              ? `${safePage * 8 + 1}–${Math.min((safePage + 1) * 8, rows.length)} of ${rows.length} experiments`
              : "0 experiments"}
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Previous page"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            <span>
              Page {rows.length ? safePage + 1 : 0} of {pageCount}
            </span>
            <button
              className="icon-button"
              aria-label="Next page"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>
      <div className="honesty-note">
        <span>OBSERVATION ≠ PREDICTION</span>
        <p>
          These records describe specific experimental conditions. They do not
          establish a universal flame-survival boundary or isolate the effect of
          gravity.
        </p>
      </div>
      {selected.length > 0 && (
        <div className="comparison-tray">
          <span>
            <b>{selected.length}</b> experiment{selected.length > 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="tray-ids">
            {selected.map(id => (
              <span key={id}>{id}</span>
            ))}
          </div>
          <button
            className="primary-button"
            disabled={selected.length < 2}
            onClick={onCompare}
          >
            Compare records <ArrowRight size={15} />
          </button>
        </div>
      )}
    </>
  );
}
