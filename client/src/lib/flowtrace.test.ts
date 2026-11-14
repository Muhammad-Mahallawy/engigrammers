import { describe, expect, it } from "vitest";
import {
  fmt,
  normalizeApiBase,
  outcomeInfo,
  signed,
  sourceUrl,
  sourcePressureRange,
} from "./flowtrace";

describe("scientific presentation safeguards", () => {
  it("keeps missing values separate from measured zero", () => {
    expect(fmt(null)).toBe("Not recorded");
    expect(fmt(undefined)).toBe("Not recorded");
    expect(fmt(0)).toBe("0");
    expect(signed(null)).toBe("Not recorded");
    expect(signed(-7.8)).toBe("-7.8");
    expect(signed(19)).toBe("+19");
  });
  it("never labels an unspecified burn as sustained", () => {
    expect(outcomeInfo("burned_outcome_not_stated").label).toBe(
      "Final outcome unspecified"
    );
    expect(outcomeInfo(null).label).toBe("Unknown outcome");
    expect(outcomeInfo("not_ignited").label).toBe("Not ignited");
  });
  it("accepts same-origin proxy and direct API bases without docs or credentials", () => {
    expect(normalizeApiBase("/api/flowtrace/")).toBe("/api/flowtrace");
    expect(normalizeApiBase("http://127.0.0.1:8000/api/")).toBe(
      "http://127.0.0.1:8000/api"
    );
    expect(() => normalizeApiBase("http://127.0.0.1:8000/docs")).toThrow(
      "not the /docs"
    );
    expect(() =>
      normalizeApiBase("https://user:pass@example.org/api")
    ).toThrow();
    expect(() => normalizeApiBase("javascript:alert(1)")).toThrow();
  });
  it("only maps recognized source identifiers to NASA references", () => {
    expect(sourceUrl("bass2-summary")).toBe(
      "https://ntrs.nasa.gov/citations/20210011385"
    );
    expect(sourceUrl("unrecognized")).toBe(null);
    expect(sourceUrl(null)).toBe(null);
  });
  it("keeps the supplied CSV pressure range separate from a missing API number", () => {
    const pmma = {
      id: "bass2-B1",
      test_id: "B1",
      material: "PMMA",
      source_id: "bass2-summary",
      pressure_kpa: null,
    };
    expect(sourcePressureRange(pmma)).toBe("99.2–99.5");
    expect(
      sourcePressureRange({ ...pmma, id: "bass2-B22", test_id: "B22" })
    ).toBe("99.2–99.5");
    expect(sourcePressureRange({ ...pmma, pressure_kpa: 100 })).toBe(null);
    expect(sourcePressureRange({ ...pmma, material: "Nomex" })).toBe(null);
    expect(sourcePressureRange({ ...pmma, test_id: "B23" })).toBe(null);
    expect(
      sourcePressureRange({ ...pmma, source_id: "different-source" })
    ).toBe(null);
    expect(pmma.pressure_kpa).toBe(null);
  });
});
