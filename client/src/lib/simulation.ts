/**
 * FLOWTRACE's educational, dimensionless localized-emitter model.
 *
 * This is a deterministic visual demonstrator, not validated CFD, a NASA
 * measurement model, or a calibrated SIBAL/material-flame predictor. Every
 * field and output is normalized and dimensionless; model time is not seconds.
 */

export interface SimulationParams {
  /** Ambient oxygen control, entered as volume percent and bounded to 0..30. */
  oxygenPct: number;
  /** Prescribed horizontal transport control, entered in cm/s and bounded to 0..60. */
  airflowCmS: number;
  /** Prescribed effective upward-flow proxy, bounded to 0..1. */
  buoyancy: number;
}

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  oxygenPct: 21,
  airflowCmS: 0,
  buoyancy: 0,
};

export const MODEL_VERSION = "flowtrace-educational-emitter-v1";
export const MODEL_SIZE = 56;
export const MODEL_DURATION = 12;

/**
 * Developer-selected numerical and emitter assumptions. Values that describe
 * rates are per model-time unit; velocities are normalized-grid units per
 * model-time unit; diffusivities are normalized-grid^2 per model-time unit.
 * They are not measured material properties or fitted experimental constants.
 */
export const MODEL_CONSTANTS = {
  maxOxygenPct: 30,
  maxAirflowCmS: 60,
  maxBuoyancy: 1,
  gridSpacing: 1 / (MODEL_SIZE - 1),
  maxAdvancePerCall: 0.1,
  maxFixedStep: 0.005,
  cflSafety: 0.62,
  heatDiffusion: 0.0045,
  fuelDiffusion: 0.0035,
  oxygenDiffusion: 0.003,
  reactionRate: 1.15,
  heatYield: 0.92,
  oxygenConsumption: 0.16,
  fuelEmissionRate: 0.95,
  heatLossRate: 0.12,
  airflowVelocityAtMax: 0.62,
  buoyancyVelocityAtMax: 0.55,
  emitterSigma: 0.055,
  initialHeatSigma: 0.09,
  ignitionPulseSigma: 0.072,
  initialHeatAmplitude: 0.8,
  ignitionPulseStrength: 1.2,
  ignitionPulseDuration: 0.4,
  activationHalfHeat: 0.08,
} as const;

export const MODEL_ASSUMPTIONS: string[] = [
  "All fields, rates, velocities, and outputs are dimensionless; model time is not seconds.",
  "Airflow is entered in cm/s and normalized by 60 into a prescribed rightward transport velocity.",
  "Oxygen volume percent is bounded to 0..30 and normalized by 30; oxygen has fixed open ambient boundaries.",
  "Effective buoyancy is a prescribed upward-flow proxy, suppressed at zero and proportional to local normalized heat at one.",
  "A centered Gaussian emitter replenishes a generic fuel-vapor proxy at a constant documented rate.",
  "The initial thermal seed and the first 0.4 model-time units contain an explicitly artificial localized ignition pulse.",
  "First-order upwind advection, five-point diffusion, bounded local reaction, and linear heat loss are used; pressure, continuity, chemistry, pyrolysis, radiation, soot, and combustion-induced flow are not solved.",
  "The emitter, coefficients, and normalized outputs are educational assumptions, not NASA measurements, calibrated SIBAL predictions, or safety thresholds.",
];

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const finiteOr = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** Normalize untrusted controls without importing or silently substituting measurements. */
export function normalizeSimulationParams(
  input: Partial<SimulationParams> = {},
): SimulationParams {
  return {
    oxygenPct: clamp(
      finiteOr(input.oxygenPct, DEFAULT_SIMULATION_PARAMS.oxygenPct),
      0,
      MODEL_CONSTANTS.maxOxygenPct,
    ),
    airflowCmS: clamp(
      finiteOr(input.airflowCmS, DEFAULT_SIMULATION_PARAMS.airflowCmS),
      0,
      MODEL_CONSTANTS.maxAirflowCmS,
    ),
    buoyancy: clamp(
      finiteOr(input.buoyancy, DEFAULT_SIMULATION_PARAMS.buoyancy),
      0,
      MODEL_CONSTANTS.maxBuoyancy,
    ),
  };
}

export interface SimulationSample {
  time: number;
  meanHeat: number;
  peakHeat: number;
  meanOxygen: number;
  /** Mean instantaneous normalized heuristic reaction activity, not heat release. */
  reactionActivity: number;
}

const cellCount = MODEL_SIZE * MODEL_SIZE;
const gridSpacingSquared = MODEL_CONSTANTS.gridSpacing * MODEL_CONSTANTS.gridSpacing;
const ambientBoundaryHeat = 0;
const ambientBoundaryFuel = 0;

const gaussian = (x: number, y: number, sigma: number): number => {
  const distanceSquared = x * x + y * y;
  return Math.exp(-distanceSquared / (2 * sigma * sigma));
};

const boundedField = (value: number, fallback = 0): number =>
  Number.isFinite(value) ? clamp(value, 0, 1) : fallback;

const smoothActivation = (heat: number): number => {
  const positiveHeat = boundedField(heat);
  return positiveHeat / (positiveHeat + MODEL_CONSTANTS.activationHalfHeat);
};

export class FlameSimulation {
  readonly size = MODEL_SIZE;
  readonly params: SimulationParams;
  time = 0;
  heat: Float32Array;
  oxygen: Float32Array;
  fuel: Float32Array;

  private nextHeat: Float32Array;
  private nextOxygen: Float32Array;
  private nextFuel: Float32Array;
  private readonly emitterProfile: Float32Array;
  private readonly ignitionProfile: Float32Array;
  private readonly ambientOxygen: number;
  private readonly fixedStep: number;

  constructor(params: SimulationParams) {
    this.params = normalizeSimulationParams(params);
    this.ambientOxygen = this.params.oxygenPct / MODEL_CONSTANTS.maxOxygenPct;
    this.heat = new Float32Array(cellCount);
    this.oxygen = new Float32Array(cellCount);
    this.fuel = new Float32Array(cellCount);
    this.nextHeat = new Float32Array(cellCount);
    this.nextOxygen = new Float32Array(cellCount);
    this.nextFuel = new Float32Array(cellCount);
    this.emitterProfile = new Float32Array(cellCount);
    this.ignitionProfile = new Float32Array(cellCount);

    const center = 0.5;
    for (let y = 0; y < this.size; y += 1) {
      const normalizedY = y / (this.size - 1);
      for (let x = 0; x < this.size; x += 1) {
        const index = y * this.size + x;
        const normalizedX = x / (this.size - 1);
        const seed = gaussian(
          normalizedX - center,
          normalizedY - center,
          MODEL_CONSTANTS.initialHeatSigma,
        );
        this.emitterProfile[index] = gaussian(
          normalizedX - center,
          normalizedY - center,
          MODEL_CONSTANTS.emitterSigma,
        );
        this.ignitionProfile[index] = gaussian(
          normalizedX - center,
          normalizedY - center,
          MODEL_CONSTANTS.ignitionPulseSigma,
        );
        this.heat[index] = boundedField(MODEL_CONSTANTS.initialHeatAmplitude * seed);
        this.oxygen[index] = this.ambientOxygen;
      }
    }
    this.setBoundaryValues(this.heat, this.oxygen, this.fuel);
    this.fixedStep = this.calculateStableStep();
  }

  /** Return prescribed normalized transport velocity; y grows downward, so upward v is negative. */
  velocityAt(x: number, y: number): { u: number; v: number } {
    const normalizedX = clamp(finiteOr(x, 0.5), 0, 1);
    const normalizedY = clamp(finiteOr(y, 0.5), 0, 1);
    const cellX = Math.round(normalizedX * (this.size - 1));
    const cellY = Math.round(normalizedY * (this.size - 1));
    const localHeat = boundedField(this.heat[cellY * this.size + cellX]);

    return {
      u:
        (this.params.airflowCmS / MODEL_CONSTANTS.maxAirflowCmS) *
        MODEL_CONSTANTS.airflowVelocityAtMax,
      v:
        this.params.buoyancy === 0
          ? 0
          : -this.params.buoyancy * MODEL_CONSTANTS.buoyancyVelocityAtMax * localHeat,
    };
  }

  /** Advance at most 0.1 model-time units and never beyond the 12-unit model duration. */
  advance(deltaModelTime: number): SimulationSample {
    const requested = Number.isNaN(deltaModelTime)
      ? 0
      : clamp(deltaModelTime, 0, MODEL_CONSTANTS.maxAdvancePerCall);
    const target = Math.min(MODEL_DURATION, this.time + requested);
    let remaining = target - this.time;

    while (remaining > 1e-12) {
      const step = Math.min(this.fixedStep, remaining);
      this.integrate(step);
      this.time += step;
      remaining = target - this.time;
    }

    if (Math.abs(target - this.time) <= 1e-10) {
      this.time = target;
    }
    return this.sample();
  }

  sample(): SimulationSample {
    let heatTotal = 0;
    let oxygenTotal = 0;
    let peakHeat = 0;
    let reactionTotal = 0;

    for (let index = 0; index < cellCount; index += 1) {
      const heat = boundedField(this.heat[index]);
      const oxygen = boundedField(this.oxygen[index]);
      const fuel = boundedField(this.fuel[index]);
      heatTotal += heat;
      oxygenTotal += oxygen;
      peakHeat = Math.max(peakHeat, heat);
      // The activity is the instantaneous normalized local heuristic R/k = F*O*a(H).
      reactionTotal += fuel * oxygen * smoothActivation(heat);
    }

    return {
      time: this.time,
      meanHeat: heatTotal / cellCount,
      peakHeat,
      meanOxygen: oxygenTotal / cellCount,
      reactionActivity: clamp(reactionTotal / cellCount, 0, 1),
    };
  }

  private calculateStableStep(): number {
    const maximumSpeed =
      MODEL_CONSTANTS.airflowVelocityAtMax + MODEL_CONSTANTS.buoyancyVelocityAtMax;
    const maximumDiffusion = Math.max(
      MODEL_CONSTANTS.heatDiffusion,
      MODEL_CONSTANTS.fuelDiffusion,
      MODEL_CONSTANTS.oxygenDiffusion,
    );
    const combinedRate =
      maximumSpeed / MODEL_CONSTANTS.gridSpacing +
      (4 * maximumDiffusion) / gridSpacingSquared +
      MODEL_CONSTANTS.reactionRate +
      MODEL_CONSTANTS.heatLossRate;
    const safeStep = MODEL_CONSTANTS.cflSafety / combinedRate;
    return Math.min(MODEL_CONSTANTS.maxFixedStep, safeStep);
  }

  private integrate(step: number): void {
    const heat = this.heat;
    const oxygen = this.oxygen;
    const fuel = this.fuel;
    const nextHeat = this.nextHeat;
    const nextOxygen = this.nextOxygen;
    const nextFuel = this.nextFuel;
    const inverseGridSpacing = 1 / MODEL_CONSTANTS.gridSpacing;
    const inverseGridSpacingSquared = 1 / gridSpacingSquared;
    const horizontalVelocity =
      (this.params.airflowCmS / MODEL_CONSTANTS.maxAirflowCmS) *
      MODEL_CONSTANTS.airflowVelocityAtMax;
    const buoyancyVelocityFactor =
      -this.params.buoyancy * MODEL_CONSTANTS.buoyancyVelocityAtMax;
    const ignitionEnvelope =
      this.time < MODEL_CONSTANTS.ignitionPulseDuration
        ? 1 - this.time / MODEL_CONSTANTS.ignitionPulseDuration
        : 0;

    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        const index = y * this.size + x;
        const currentHeat = heat[index];
        const currentOxygen = oxygen[index];
        const currentFuel = fuel[index];
        const verticalVelocity = buoyancyVelocityFactor * currentHeat;

        const heatLeft = x === 0 ? ambientBoundaryHeat : heat[index - 1];
        const heatRight =
          x === this.size - 1 ? ambientBoundaryHeat : heat[index + 1];
        const heatUp = y === 0 ? ambientBoundaryHeat : heat[index - this.size];
        const heatDown =
          y === this.size - 1 ? ambientBoundaryHeat : heat[index + this.size];
        const oxygenLeft = x === 0 ? this.ambientOxygen : oxygen[index - 1];
        const oxygenRight =
          x === this.size - 1 ? this.ambientOxygen : oxygen[index + 1];
        const oxygenUp = y === 0 ? this.ambientOxygen : oxygen[index - this.size];
        const oxygenDown =
          y === this.size - 1 ? this.ambientOxygen : oxygen[index + this.size];
        const fuelLeft = x === 0 ? ambientBoundaryFuel : fuel[index - 1];
        const fuelRight =
          x === this.size - 1 ? ambientBoundaryFuel : fuel[index + 1];
        const fuelUp = y === 0 ? ambientBoundaryFuel : fuel[index - this.size];
        const fuelDown =
          y === this.size - 1 ? ambientBoundaryFuel : fuel[index + this.size];

        const heatXGradient =
          horizontalVelocity >= 0
            ? (currentHeat - heatLeft) * inverseGridSpacing
            : (heatRight - currentHeat) * inverseGridSpacing;
        const heatYGradient =
          verticalVelocity >= 0
            ? (currentHeat - heatUp) * inverseGridSpacing
            : (heatDown - currentHeat) * inverseGridSpacing;
        const oxygenXGradient =
          horizontalVelocity >= 0
            ? (currentOxygen - oxygenLeft) * inverseGridSpacing
            : (oxygenRight - currentOxygen) * inverseGridSpacing;
        const oxygenYGradient =
          verticalVelocity >= 0
            ? (currentOxygen - oxygenUp) * inverseGridSpacing
            : (oxygenDown - currentOxygen) * inverseGridSpacing;
        const fuelXGradient =
          horizontalVelocity >= 0
            ? (currentFuel - fuelLeft) * inverseGridSpacing
            : (fuelRight - currentFuel) * inverseGridSpacing;
        const fuelYGradient =
          verticalVelocity >= 0
            ? (currentFuel - fuelUp) * inverseGridSpacing
            : (fuelDown - currentFuel) * inverseGridSpacing;
        const heatAdvection = -(horizontalVelocity * heatXGradient + verticalVelocity * heatYGradient);
        const oxygenAdvection =
          -(horizontalVelocity * oxygenXGradient + verticalVelocity * oxygenYGradient);
        const fuelAdvection = -(horizontalVelocity * fuelXGradient + verticalVelocity * fuelYGradient);
        const heatDiffusion =
          (heatLeft + heatRight + heatUp + heatDown - 4 * currentHeat) *
          inverseGridSpacingSquared;
        const oxygenDiffusion =
          (oxygenLeft + oxygenRight + oxygenUp + oxygenDown - 4 * currentOxygen) *
          inverseGridSpacingSquared;
        const fuelDiffusion =
          (fuelLeft + fuelRight + fuelUp + fuelDown - 4 * currentFuel) *
          inverseGridSpacingSquared;

        const activation = smoothActivation(currentHeat);
        const rawReaction =
          MODEL_CONSTANTS.reactionRate * currentFuel * currentOxygen * activation;
        const availableReaction =
          step > 0
            ? Math.min(
                currentFuel / step,
                MODEL_CONSTANTS.oxygenConsumption > 0
                  ? currentOxygen / (MODEL_CONSTANTS.oxygenConsumption * step)
                  : Number.POSITIVE_INFINITY,
              )
            : 0;
        const reaction = Math.max(0, Math.min(rawReaction, availableReaction));
        const emitter = this.emitterProfile[index];
        const ignition =
          MODEL_CONSTANTS.ignitionPulseStrength *
          Math.max(0, ignitionEnvelope) *
          this.ignitionProfile[index];

        nextHeat[index] = boundedField(
          currentHeat +
            step *
              (heatAdvection +
                MODEL_CONSTANTS.heatDiffusion * heatDiffusion +
                MODEL_CONSTANTS.heatYield * reaction -
                MODEL_CONSTANTS.heatLossRate * currentHeat +
                ignition),
        );
        nextOxygen[index] = boundedField(
          currentOxygen +
            step *
              (oxygenAdvection +
                MODEL_CONSTANTS.oxygenDiffusion * oxygenDiffusion -
                MODEL_CONSTANTS.oxygenConsumption * reaction),
        );
        nextFuel[index] = boundedField(
          currentFuel +
            step *
              (fuelAdvection +
                MODEL_CONSTANTS.fuelDiffusion * fuelDiffusion +
                MODEL_CONSTANTS.fuelEmissionRate * emitter -
                reaction),
        );
      }
    }

    this.setBoundaryValues(nextHeat, nextOxygen, nextFuel);
    this.heat = nextHeat;
    this.oxygen = nextOxygen;
    this.fuel = nextFuel;
    this.nextHeat = heat;
    this.nextOxygen = oxygen;
    this.nextFuel = fuel;
  }

  private setBoundaryValues(
    heat: Float32Array,
    oxygen: Float32Array,
    fuel: Float32Array,
  ): void {
    for (let x = 0; x < this.size; x += 1) {
      this.setBoundaryCell(x, 0, heat, oxygen, fuel);
      this.setBoundaryCell(x, this.size - 1, heat, oxygen, fuel);
    }
    for (let y = 1; y < this.size - 1; y += 1) {
      this.setBoundaryCell(0, y, heat, oxygen, fuel);
      this.setBoundaryCell(this.size - 1, y, heat, oxygen, fuel);
    }
  }

  private setBoundaryCell(
    x: number,
    y: number,
    heat: Float32Array,
    oxygen: Float32Array,
    fuel: Float32Array,
  ): void {
    const index = y * this.size + x;
    heat[index] = ambientBoundaryHeat;
    oxygen[index] = this.ambientOxygen;
    fuel[index] = ambientBoundaryFuel;
  }
}
