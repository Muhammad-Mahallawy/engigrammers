import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, RefreshCw, X } from "lucide-react";
import { apiGet, DEFAULT_API_BASE, normalizeApiBase } from "@/lib/flowtrace";

export default function ConnectionSettings({
  base,
  onSave,
  onClose,
}: {
  base: string;
  onSave: (s: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(base);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );
  const [testing, setTesting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    inputRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
          "button, a[href], input"
        );
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      const next = normalizeApiBase(value);
      const health = await apiGet<{ status: string; records_loaded?: number }>(
        next,
        "/health"
      );
      if (health.status !== "ok")
        throw new Error("The health endpoint did not report an OK status.");
      const sample = await apiGet<{ total: number; items: unknown[] }>(
        next,
        "/experiments?limit=1"
      );
      if (!Array.isArray(sample.items))
        throw new Error(
          "This is not a compatible FLOWTRACE experiments endpoint."
        );
      const filters = await apiGet<Record<string, unknown>>(next, "/filters");
      const arraysValid = ["materials", "flow_directions", "outcomes"].every(
        key => Array.isArray(filters[key])
      );
      const rangesValid = [
        "oxygen_range_vol_pct",
        "initial_flow_range_cm_s",
      ].every(key => {
        const range = filters[key];
        return (
          range != null &&
          typeof range === "object" &&
          "min" in range &&
          "max" in range
        );
      });
      if (!arraysValid || !rangesValid)
        throw new Error(
          "The API filters endpoint is missing required arrays or ranges."
        );
      setResult({
        ok: true,
        message: `Connected successfully · ${sample.total} experimental records available.`,
      });
    } catch (error) {
      setResult({ ok: false, message: (error as Error).message });
    } finally {
      setTesting(false);
    }
  };
  const save = () => {
    try {
      onSave(normalizeApiBase(value));
      onClose();
    } catch (error) {
      setResult({ ok: false, message: (error as Error).message });
    }
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="connection-modal"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connection-title"
      >
        <div className="drawer-top">
          <span className="eyebrow">DATA CONNECTION</span>
          <button
            className="icon-button"
            aria-label="Close connection settings"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <h2 id="connection-title">
          Connect your API<span className="cyan">.</span>
        </h2>
        <p>
          The frontend reads your existing FLOWTRACE FastAPI backend. It never
          substitutes demo data.
        </p>
        <label className="connection-label">
          API base URL
          <input
            ref={inputRef}
            value={value}
            onChange={e => {
              setValue(e.target.value);
              setResult(null);
            }}
            placeholder="/api/flowtrace"
          />
        </label>
        <div className="settings-help">
          <b>Default: same-origin proxy</b>
          <code>/api/flowtrace</code>
          <p>
            The frontend server forwards read-only requests to the backend
            configured by <code>FLOWTRACE_API_URL</code> (default{" "}
            <code>http://127.0.0.1:8000</code>).
          </p>
          <b>Direct local connection</b>
          <code>http://127.0.0.1:8000/api</code>
          <p>
            Use this only when the browser and backend run on the same computer.
            Allow your frontend origin in backend CORS. A cloud HTTPS preview
            cannot reliably access your local HTTP API.
          </p>
          <p>
            The <code>/docs</code> URL is the documentation page, not the API
            base.
          </p>
        </div>
        {result && (
          <div
            role="status"
            className={result.ok ? "connection-success" : "error-inline"}
          >
            {result.ok && <CheckCircle2 size={16} />} {result.message}
          </div>
        )}
        <div className="connection-actions">
          <button
            className="text-link"
            onClick={() => {
              setValue(DEFAULT_API_BASE);
              setResult(null);
            }}
          >
            Reset to default
          </button>
          <button
            className="secondary-button"
            disabled={testing}
            onClick={test}
          >
            <RefreshCw size={14} className={testing ? "spin" : ""} />
            {testing ? "Testing…" : "Test connection"}
          </button>
          <button className="primary-button" onClick={save}>
            Save connection
          </button>
        </div>
        <a
          className="text-link settings-docs"
          href={`${base.replace(/\/api(?:\/flowtrace)?$/, "") || ""}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => {
            if (base.startsWith("/")) e.preventDefault();
          }}
          style={base.startsWith("/") ? { display: "none" } : undefined}
        >
          Backend API documentation <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
