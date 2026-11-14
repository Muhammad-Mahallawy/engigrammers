import { describe, expect, it } from "vitest";
import type { Experiment } from "./flowtrace";
import { matchesExperimentSearch } from "./experimentSearch";

const record = {
  test_id: "GMT45-T15",
  material: "SIBAL fabric",
  investigation: "BASS-II",
  outcome_label: "Sustained - no blowoff",
  nasa_notes: "Airflow increased",
} as Experiment;
describe("experiment suggestion matching", () => {
  it("supports partial IDs and free-text scientific notes", () => {
    expect(matchesExperimentSearch(record, "GMT45-T1")).toBe(true);
    expect(matchesExperimentSearch(record, "airflow increased")).toBe(true);
    expect(matchesExperimentSearch(record, "SIBAL")).toBe(true);
    expect(matchesExperimentSearch(record, "other record")).toBe(false);
  });
  it("choosing a suggestion isolates its exact ID", () => {
    expect(matchesExperimentSearch(record, "GMT45-T1", true)).toBe(false);
    expect(matchesExperimentSearch(record, "GMT45-T15", true)).toBe(true);
  });
  it("handles case, whitespace and clearing without losing records", () => {
    expect(matchesExperimentSearch(record, " gmt45-t15 ", true)).toBe(true);
    expect(matchesExperimentSearch(record, "  ", false)).toBe(true);
    expect(matchesExperimentSearch(record, "", true)).toBe(true);
  });
});
