export interface SimulationHistoryPoint {
  time: number;
  current: number;
  reference?: number;
  reaction: number;
  meanOxygen: number;
  referenceReaction?: number;
  referenceOxygen?: number;
}
export default function SimulationTrace({
  history,
  duration,
  comparing,
}: {
  history: SimulationHistoryPoint[];
  duration: number;
  comparing: boolean;
}) {
  const width = 650,
    height = 192,
    left = 48,
    right = 19,
    top = 19,
    bottom = 40;
  const x = (time: number) => left + (time / duration) * (width - left - right);
  const y = (value: number) => top + (1 - value) * (height - top - bottom);
  const path = (key: "current" | "reference") =>
    history
      .filter(point => point[key] !== undefined)
      .map(
        (point, index) =>
          `${index ? "L" : "M"}${x(point.time).toFixed(2)},${y(point[key]!).toFixed(2)}`
      )
      .join(" ");
  const last = history[history.length - 1];
  return (
    <section className="panel sim-trace">
      <div className="sim-trace-heading">
        <div>
          <span className="eyebrow">CALCULATED, NOT OBSERVED</span>
          <h2>Follow the model.</h2>
        </div>
        <div className="sim-trace-legend">
          <span>
            <i />
            Current case
          </span>
          {comparing && (
            <span className="reference">
              <i />
              1g reference
            </span>
          )}
        </div>
      </div>
      <p>Peak normalized thermal activity · t* is model time, not seconds</p>
      <div className="sim-trace-plot">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Calculated peak thermal activity versus dimensionless model time. Latest current value ${last?.current.toFixed(3) ?? "0"}${comparing ? `; 1g reference ${last?.reference?.toFixed(3) ?? "0"}` : ""}. Export CSV for exact model values.`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map(value => (
            <g key={value}>
              <line
                x1={left}
                x2={width - right}
                y1={y(value)}
                y2={y(value)}
                stroke="#2c4353"
                strokeDasharray="3 6"
              />
              <text
                x={left - 10}
                y={y(value) + 4}
                textAnchor="end"
                fill="#8aaabc"
                fontSize="10"
              >
                {value}
              </text>
            </g>
          ))}
          {[0, 3, 6, 9, 12]
            .filter(time => time <= duration)
            .map(time => (
              <text
                key={time}
                x={x(time)}
                y={height - bottom + 20}
                textAnchor="middle"
                fill="#8aaabc"
                fontSize="10"
              >
                {time}
              </text>
            ))}
          <text x={left} y={12} fill="#8daec4" fontSize="9">
            normalized activity
          </text>
          <text
            x={width - right}
            y={height - 5}
            textAnchor="end"
            fill="#8daec4"
            fontSize="10"
          >
            model time t*
          </text>
          <path
            d={path("current")}
            fill="none"
            stroke="#91daff"
            strokeWidth="2"
          />
          {comparing && (
            <path
              d={path("reference")}
              fill="none"
              stroke="#d7ac76"
              strokeDasharray="5 4"
              strokeWidth="1.8"
            />
          )}
        </svg>
      </div>
      <small>
        Same model, same inputs except prescribed buoyancy. This is not a NASA
        measurement or controlled experimental validation.
      </small>
    </section>
  );
}
