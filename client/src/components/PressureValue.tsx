import { Experiment, fmt, sourcePressureRange } from "@/lib/flowtrace";

export default function PressureValue({ record }: { record: Experiment }) {
  if (record.pressure_kpa != null)
    return <>{fmt(record.pressure_kpa, 3)} kPa</>;
  const range = sourcePressureRange(record);
  if (range)
    return (
      <span className="source-pressure">
        <span>{range} kPa</span>
        <small>Supplied CSV range · not parsed by API</small>
      </span>
    );
  return <>Not available in API</>;
}
