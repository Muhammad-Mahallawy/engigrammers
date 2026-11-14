import type { Experiment } from "./flowtrace";

export function matchesExperimentSearch(
  record: Experiment,
  query: string,
  exact = false
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  if (exact) return record.test_id.toLowerCase() === normalized;
  const searchable = [
    record.test_id,
    record.material,
    record.investigation,
    record.outcome_label,
    record.nasa_notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return searchable.includes(normalized);
}
