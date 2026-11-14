import { describe, expect, it } from "vitest";

import {
  DEFAULT_SIMULATION_PARAMS,
  FlameSimulation,
  MODEL_DURATION,
  MODEL_SIZE,
  normalizeSimulationParams,
} from "./simulation";

const expectBoundedFinite = (values: Float32Array): void => {
  for (const value of values) {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }
};

describe("FlameSimulation", () => {
  it("normalizes missing, non-finite, signed, and out-of-range controls", () => {
    expect(normalizeSimulationParams({})).toEqual(DEFAULT_SIMULATION_PARAMS);
    expect(
      normalizeSimulationParams({
        oxygenPct: Number.NaN,
        airflowCmS: Number.POSITIVE_INFINITY,
        buoyancy: Number.NEGATIVE_INFINITY,
      }),
    ).toEqual(DEFAULT_SIMULATION_PARAMS);
    expect(
      normalizeSimulationParams({ oxygenPct: -4, airflowCmS: 100, buoyancy: 4 }),
    ).toEqual({ oxygenPct: 0, airflowCmS: 60, buoyancy: 1 });
  });

  it("initializes the documented grid and bounded fields", () => {
    const simulation = new FlameSimulation(DEFAULT_SIMULATION_PARAMS);

    expect(simulation.size).toBe(MODEL_SIZE);
    expect(simulation.heat).toHaveLength(MODEL_SIZE * MODEL_SIZE);
    expect(simulation.oxygen).toHaveLength(MODEL_SIZE * MODEL_SIZE);
    expect(simulation.fuel).toHaveLength(MODEL_SIZE * MODEL_SIZE);
    expect(simulation.time).toBe(0);
    expect(simulation.sample().peakHeat).toBeGreaterThan(0);
    expect(simulation.sample().reactionActivity).toBe(0);
    expectBoundedFinite(simulation.heat);
    expectBoundedFinite(simulation.oxygen);
    expectBoundedFinite(simulation.fuel);
  });

  it("keeps extreme-control fields bounded through the full model duration", () => {
    const simulation = new FlameSimulation({ oxygenPct: 30, airflowCmS: 60, buoyancy: 1 });

    while (simulation.time < MODEL_DURATION) {
      simulation.advance(0.1);
      expect(simulation.time).toBeLessThanOrEqual(MODEL_DURATION);
      expectBoundedFinite(simulation.heat);
      expectBoundedFinite(simulation.oxygen);
      expectBoundedFinite(simulation.fuel);
    }

    expect(simulation.time).toBe(MODEL_DURATION);
    expect(simulation.advance(0.1).time).toBe(MODEL_DURATION);
  });

  it("does not react when oxygen is zero, while retaining the artificial initial heat seed", () => {
    const simulation = new FlameSimulation({ oxygenPct: 0, airflowCmS: 0, buoyancy: 0 });
    const initialPeak = simulation.sample().peakHeat;

    simulation.advance(0.1);

    expect(initialPeak).toBeGreaterThan(0);
    expect(simulation.sample().meanOxygen).toBe(0);
    expect(simulation.sample().reactionActivity).toBe(0);
    expectBoundedFinite(simulation.heat);
    expectBoundedFinite(simulation.oxygen);
    expectBoundedFinite(simulation.fuel);
  });

  it("is exactly repeatable for the same parameters and advance call sequence", () => {
    const params = { oxygenPct: 18, airflowCmS: 12, buoyancy: 0.7 };
    const first = new FlameSimulation(params);
    const second = new FlameSimulation(params);
    const calls = [0, 0.037, 0.1, -1, 0.052, 0.1];

    for (const delta of calls) {
      expect(first.advance(delta)).toEqual(second.advance(delta));
    }
    expect(Array.from(first.heat)).toEqual(Array.from(second.heat));
    expect(Array.from(first.oxygen)).toEqual(Array.from(second.oxygen));
    expect(Array.from(first.fuel)).toEqual(Array.from(second.fuel));
  });

  it("keeps zero and negative advances finite and stationary, and caps one call", () => {
    const simulation = new FlameSimulation(DEFAULT_SIMULATION_PARAMS);
    const initial = simulation.sample();

    expect(simulation.advance(0).time).toBe(0);
    expect(simulation.advance(-0.5).time).toBe(0);
    expect(simulation.advance(Number.NaN).time).toBe(0);
    expect(simulation.advance(Number.POSITIVE_INFINITY).time).toBe(0.1);
    const capped = new FlameSimulation(DEFAULT_SIMULATION_PARAMS);
    expect(capped.advance(1).time).toBe(0.1);
    expect(simulation.sample().time).toBeLessThanOrEqual(MODEL_DURATION);
    expect(initial.time).toBe(0);
  });

  it("suppresses buoyant velocity at zero and changes the field with effective buoyancy", () => {
    const still = new FlameSimulation({ oxygenPct: 21, airflowCmS: 0, buoyancy: 0 });
    const buoyant = new FlameSimulation({ oxygenPct: 21, airflowCmS: 0, buoyancy: 1 });

    expect(still.velocityAt(0.5, 0.5).v).toBe(0);
    expect(buoyant.velocityAt(0.5, 0.5).v).toBeLessThan(0);
    still.advance(0.1);
    buoyant.advance(0.1);

    expect(Array.from(still.heat)).not.toEqual(Array.from(buoyant.heat));
    expect(Array.from(still.fuel)).not.toEqual(Array.from(buoyant.fuel));
  });
});
