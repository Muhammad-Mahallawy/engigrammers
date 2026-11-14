import { useEffect, useRef, useState } from "react";
import { FlameSimulation } from "@/lib/simulation";

export type SimulationField = "heat" | "oxygen" | "fuel";
const palettes: Record<SimulationField, number[][]> = {
  heat: [
    [3, 12, 23],
    [7, 34, 74],
    [38, 97, 169],
    [127, 95, 206],
    [237, 139, 96],
    [255, 239, 183],
  ],
  oxygen: [
    [5, 14, 24],
    [16, 49, 82],
    [34, 106, 132],
    [60, 167, 174],
    [113, 220, 201],
    [214, 251, 224],
  ],
  fuel: [
    [5, 13, 26],
    [31, 34, 75],
    [78, 57, 125],
    [137, 86, 177],
    [191, 135, 218],
    [242, 218, 252],
  ],
};
export function fieldColor(
  field: SimulationField,
  value: number
): [number, number, number] {
  const palette = palettes[field];
  const pos = Math.min(1, Math.max(0, value)) * (palette.length - 1);
  const left = Math.min(palette.length - 2, Math.floor(pos));
  const amount = pos - left;
  return palette[left].map((channel, index) =>
    Math.round(channel + amount * (palette[left + 1][index] - channel))
  ) as [number, number, number];
}
export default function SimulationCanvas({
  simulation,
  revision,
  field,
  showFlow,
  label,
}: {
  simulation: FlameSimulation;
  revision: number;
  field: SimulationField;
  showFlow: boolean;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const buffer = useRef<HTMLCanvasElement | null>(null);
  const [supported, setSupported] = useState(true);
  const sample = simulation.sample();
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    const ctx = target.getContext("2d");
    if (!ctx) {
      setSupported(false);
      return;
    }
    if (!buffer.current) buffer.current = document.createElement("canvas");
    const source = buffer.current;
    source.width = simulation.size;
    source.height = simulation.size;
    const sourceCtx = source.getContext("2d");
    if (!sourceCtx) {
      setSupported(false);
      return;
    }
    const values =
      field === "heat"
        ? simulation.heat
        : field === "oxygen"
          ? simulation.oxygen
          : simulation.fuel;
    const image = sourceCtx.createImageData(simulation.size, simulation.size);
    for (let index = 0; index < values.length; index++) {
      const color = fieldColor(field, values[index]);
      const offset = index * 4;
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = 255;
    }
    sourceCtx.putImageData(image, 0, 0);
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source, 0, 0, target.width, target.height);
    ctx.strokeStyle = "rgba(122, 174, 203, .09)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo((i * target.width) / 10, 0);
      ctx.lineTo((i * target.width) / 10, target.height);
      ctx.moveTo(0, (i * target.height) / 10);
      ctx.lineTo(target.width, (i * target.height) / 10);
      ctx.stroke();
    }
    if (showFlow) {
      ctx.strokeStyle = "rgba(184, 224, 249, .48)";
      ctx.lineWidth = 1.3;
      for (let y = 1; y < 9; y++)
        for (let x = 1; x < 9; x++) {
          const velocity = simulation.velocityAt(x / 10, y / 10);
          const magnitude = Math.hypot(velocity.u, velocity.v);
          if (magnitude < 0.002) continue;
          const length = Math.min(23, magnitude * 75);
          const dx = (velocity.u / magnitude) * length;
          const dy = (velocity.v / magnitude) * length;
          const px = (x / 10) * target.width;
          const py = (y / 10) * target.height;
          const angle = Math.atan2(dy, dx);
          ctx.beginPath();
          ctx.moveTo(px - dx / 2, py - dy / 2);
          ctx.lineTo(px + dx / 2, py + dy / 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(
            px + dx / 2 - Math.cos(angle - 0.55) * 5,
            py + dy / 2 - Math.sin(angle - 0.55) * 5
          );
          ctx.lineTo(px + dx / 2, py + dy / 2);
          ctx.lineTo(
            px + dx / 2 - Math.cos(angle + 0.55) * 5,
            py + dy / 2 - Math.sin(angle + 0.55) * 5
          );
          ctx.stroke();
        }
    }
    ctx.beginPath();
    ctx.arc(target.width / 2, target.height / 2, 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#c6e8fc";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#c6e8fc";
    ctx.fillRect(target.width / 2 - 2, target.height / 2 - 2, 4, 4);
  }, [simulation, revision, field, showFlow]);
  return (
    <div className="sim-field-stage">
      <div className="sim-field-tag">
        <i />
        {label}
      </div>
      {supported ? (
        <canvas
          ref={canvas}
          width={560}
          height={560}
          role="img"
          aria-label={`${label}: calculated ${field} field at model time ${sample.time.toFixed(2)}. Normalized peak thermal activity ${sample.peakHeat.toFixed(3)}; domain mean oxygen ${sample.meanOxygen.toFixed(3)}. Colors are illustrative, not measured temperature.`}
        >
          Calculated normalized {field} field. Model time{" "}
          {sample.time.toFixed(2)}; thermal peak {sample.peakHeat.toFixed(3)}.
        </canvas>
      ) : (
        <div className="sim-canvas-fallback">
          <strong>Field graphics unavailable</strong>
          <p>
            The numerical model still runs. Read the normalized values below or
            export its history.
          </p>
          <p>
            Model time {sample.time.toFixed(2)} · thermal peak{" "}
            {sample.peakHeat.toFixed(3)} · mean oxygen{" "}
            {sample.meanOxygen.toFixed(3)}
          </p>
        </div>
      )}
      <span className="sim-field-corner">
        GENERIC EMITTER · NOT A BASS SAMPLE
      </span>
    </div>
  );
}
