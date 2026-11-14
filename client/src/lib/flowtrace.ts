export interface Experiment {
  id: string;
  test_id: string;
  investigation: string | null;
  material: string;
  thickness_mm: number | null;
  width_mm: number | null;
  flow_direction: string | null;
  flow_initial_cm_s: number | null;
  flow_final_cm_s: number | null;
  flow_as_recorded: string | null;
  oxygen_vol_pct: number | null;
  pressure_kpa: number | null;
  outcome: string | null;
  outcome_label: string | null;
  nasa_notes: string | null;
  source_id: string | null;
  pdf_page: number | null;
  flow_change_cm_s: number | null;
  flow_ratio: number | null;
  outcome_status: "recorded" | "unspecified" | "unknown";
}
export interface Filters {
  materials: string[];
  flow_directions: string[];
  outcomes: { value: string; label: string | null }[];
  oxygen_range_vol_pct: { min: number | null; max: number | null };
  initial_flow_range_cm_s: { min: number | null; max: number | null };
}
export interface Insights {
  material_filter: string | null;
  records_included: number;
  outcome_counts: {
    outcome: string;
    label: string | null;
    count: number;
    mean_initial_flow_cm_s: number | null;
    mean_final_flow_cm_s: number | null;
    mean_oxygen_vol_pct: number | null;
    final_flow_measurements: number;
  }[];
  interpretation: string;
  data_quality: {
    records_missing_final_flow: number;
    records_with_unspecified_burn_outcome: number;
    records_missing_oxygen: number;
  };
}
export interface Comparison {
  experiment_a: Experiment;
  experiment_b: Experiment;
  difference_b_minus_a: Record<string, number | null>;
  comparison_context: {
    same_material: boolean;
    same_flow_direction: boolean;
    same_investigation: boolean;
    caution: string;
  };
}
export const DEFAULT_API_BASE =
  import.meta.env.VITE_FLOWTRACE_API_BASE || "/api/flowtrace";
export function savedApiBase(): string {
  try {
    return localStorage.getItem("flowtrace-api-base") || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
}
export function normalizeApiBase(value: string): string {
  const base = value.trim().replace(/\/+$/, "");
  if (/\/docs$/.test(base))
    throw new Error("Use the API base ending in /api, not the /docs page.");
  if (base.startsWith("/") && !base.startsWith("//") && !/[?#]/.test(base))
    return base;
  const url = new URL(base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Use an HTTP(S) API base without credentials, query parameters, or fragments."
    );
  if (/\/docs\/?$/.test(url.pathname))
    throw new Error("Use the API base ending in /api, not the /docs page.");
  return base;
}
export async function apiGet<T>(
  base: string,
  path: string,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    signal: signal ?? AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    let message = `API request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
      else if (typeof body.message === "string") message = body.message;
    } catch {
      /* Keep HTTP status if non-JSON. */
    }
    throw new Error(message);
  }
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "The API returned a webpage instead of JSON. Check the API base URL."
    );
  return response.json() as Promise<T>;
}
export async function loadExperiments(base: string): Promise<Experiment[]> {
  const all: Experiment[] = [];
  let total = Infinity;
  while (all.length < total) {
    const page = await apiGet<{ total: number; items: Experiment[] }>(
      base,
      `/experiments?limit=500&offset=${all.length}`
    );
    total = page.total;
    if (!page.items.length) break;
    all.push(...page.items);
  }
  if (all.length < total)
    throw new Error("The API returned an incomplete dataset. Please retry.");
  return all;
}
export const outcomeStyles: Record<
  string,
  { label: string; color: string; className: string }
> = {
  quenched_low_flow: {
    label: "Low-flow quenching",
    color: "#56c9df",
    className: "quench",
  },
  sustained_no_blowoff: {
    label: "Sustained · no blowoff",
    color: "#66d6ad",
    className: "sustained",
  },
  blowoff: { label: "Blowoff", color: "#ecab66", className: "blowoff" },
  not_ignited: {
    label: "Not ignited",
    color: "#a89bd5",
    className: "not-ignited",
  },
  burned_outcome_not_stated: {
    label: "Final outcome unspecified",
    color: "#7b8999",
    className: "unspecified",
  },
  no_sustained_flame: {
    label: "No sustained flame",
    color: "#c18fa5",
    className: "other",
  },
  burned_entire_sample: {
    label: "Burned entire sample",
    color: "#d3c57a",
    className: "other",
  },
  extinguished_flow_off: {
    label: "Extinguished · flow off",
    color: "#6ba8c4",
    className: "quench",
  },
};
export function outcomeInfo(outcome: string | null) {
  return (
    outcomeStyles[outcome || ""] || {
      label: outcome ? outcome.replaceAll("_", " ") : "Unknown outcome",
      color: "#7b8999",
      className: "unspecified",
    }
  );
}
export function fmt(value: number | null | undefined, decimals = 2): string {
  return value == null || !Number.isFinite(value)
    ? "Not recorded"
    : Number(value.toFixed(decimals)).toString();
}
export function signed(value: number | null | undefined): string {
  return value == null
    ? "Not recorded"
    : `${value > 0 ? "+" : ""}${fmt(value)}`;
}
export function sourceUrl(source: string | null): string | null {
  return source === "bass2-summary"
    ? "https://ntrs.nasa.gov/citations/20210011385"
    : null;
}
export function sourcePdf(page?: number | null): string {
  return `https://ntrs.nasa.gov/api/citations/20210011385/downloads/TM-20210011385.pdf${page ? `#page=${page}` : ""}`;
}
export function sourcePressureRange(
  record: Pick<
    Experiment,
    "id" | "test_id" | "material" | "source_id" | "pressure_kpa"
  >
): string | null {
  // Provenance annotation read from the user-supplied bass2_tests.csv, not an API estimate.
  // Exact PMMA records B1 through B22 contain 99.2-99.5; the unchanged API's float parser returns null.
  // Keep this separate from the API numeric field and never calculate a pressure delta from it.
  return record.pressure_kpa == null &&
    record.material === "PMMA" &&
    record.source_id === "bass2-summary" &&
    /^B(?:[1-9]|1\d|2[0-2])$/.test(record.test_id) &&
    record.id === `bass2-${record.test_id}`
    ? "99.2–99.5"
    : null;
}
export function downloadCsv(rows: Experiment[]): void {
  const keys: (keyof Experiment)[] = [
    "test_id",
    "investigation",
    "material",
    "flow_direction",
    "flow_initial_cm_s",
    "flow_final_cm_s",
    "flow_change_cm_s",
    "flow_ratio",
    "oxygen_vol_pct",
    "pressure_kpa",
    "thickness_mm",
    "width_mm",
    "outcome",
    "outcome_label",
    "outcome_status",
    "nasa_notes",
    "source_id",
    "pdf_page",
  ];
  const escape = (value: unknown) => {
    const raw = value == null ? "" : String(value);
    const safe =
      /^[=+@\-\t\r]/.test(raw) && typeof value === "string" ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const csv = [
    [...keys, "source_csv_pressure_range_kpa"].join(","),
    ...rows.map(row =>
      [
        ...keys.map(key => escape(row[key])),
        escape(sourcePressureRange(row)),
      ].join(",")
    ),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "flowtrace-experiments.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
