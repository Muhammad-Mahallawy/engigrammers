import { lazy, Suspense, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Route, Switch, useLocation } from "wouter";
import {
  Activity,
  ArrowUpRight,
  Database,
  ExternalLink,
  Menu,
  Orbit,
  Radio,
  RefreshCw,
  Settings2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  apiGet,
  Experiment,
  Filters,
  loadExperiments,
  savedApiBase,
} from "@/lib/flowtrace";
import Explorer from "./Explorer";
import Compare from "./Compare";
import Insights from "./Insights";
import Evidence from "./Evidence";
import ExperimentDetail from "@/components/ExperimentDetail";
import ConnectionSettings from "@/components/ConnectionSettings";

const Simulation = lazy(() => import("./Simulation"));
const navigation = [
  { href: "/", title: "Explorer" },
  { href: "/compare", title: "Compare" },
  { href: "/insights", title: "Insights" },
  { href: "/evidence", title: "Evidence" },
  { href: "/simulation", title: "Simulation" },
];

export default function Home() {
  const [location, navigate] = useLocation();
  const [base, setBase] = useState(savedApiBase);
  const [material, setMaterial] = useState("SIBAL fabric");
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Experiment | null>(null);
  const [settings, setSettings] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const records = useQuery({
    queryKey: ["records", base],
    queryFn: () => loadExperiments(base),
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 4000),
  });
  const filters = useQuery({
    queryKey: ["filters", base],
    queryFn: () => apiGet<Filters>(base, "/filters"),
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 4000),
  });
  const health = useQuery({
    queryKey: ["health", base],
    queryFn: () =>
      apiGet<{ status: string; records_loaded: number; dataset: string }>(
        base,
        "/health"
      ),
    retry: false,
    refetchInterval: 60000,
  });
  const toggleSelected = useCallback((r: Experiment) => {
    setSelected(previous => {
      if (previous.includes(r.test_id))
        return previous.filter(id => id !== r.test_id);
      if (previous.length >= 4) {
        toast(
          "Compare up to four experiments. Remove a record to add another."
        );
        return previous;
      }
      return [...previous, r.test_id];
    });
  }, []);
  const addCompare = (r: Experiment) => {
    if (!selected.includes(r.test_id)) {
      if (selected.length >= 4) {
        toast("Your comparison already contains four experiments.");
        return;
      }
      setSelected([...selected, r.test_id]);
    }
    setDetail(null);
    toast(`${r.test_id} added to your comparison`);
  };
  const closeDetail = useCallback(() => setDetail(null), []);
  const closeSettings = useCallback(() => setSettings(false), []);
  const ready = records.data && filters.data;
  const failed = records.isError || filters.isError;
  const connected = health.data?.status === "ok" && !health.isError && !failed;

  return (
    <div
      className={`app-shell orbital-app ${location === "/" ? "explorer-route" : "inner-route"}`}
    >
      <div className="cosmic-dust" aria-hidden="true" />
      <a href="#main-content" className="skip-link">
        {location === "/simulation"
          ? "Skip to simulation lab"
          : "Skip to experiments"}
      </a>
      <div className="main-shell">
        <header className="orbital-header">
          <div className="orbital-header-inner">
            <Link
              href="/"
              className="brand orbital-brand"
              aria-label="FLOWTRACE home"
              onClick={() => setMobileOpen(false)}
            >
              <span className="brand-orbit" aria-hidden="true">
                <Orbit size={32} strokeWidth={1.3} />
              </span>
              <div>
                <strong>FLOWTRACE</strong>
                <span>THE FLAME SURVIVAL INVESTIGATOR</span>
              </div>
            </Link>
            <nav className="orbital-nav" aria-label="Main navigation">
              {navigation.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`orbital-nav-link ${location === item.href ? "active" : ""}`}
                  aria-current={location === item.href ? "page" : undefined}
                >
                  {item.title}
                  {item.href === "/compare" && selected.length > 0 && (
                    <span className="nav-badge">{selected.length}</span>
                  )}
                </Link>
              ))}
            </nav>
            <div className="orbital-header-actions">
              <button
                className={`api-pill ${connected ? "" : "not-connected"}`}
                onClick={() => setSettings(true)}
              >
                <i className={connected ? "live-dot" : "offline-dot"} />
                {connected
                  ? "API connected"
                  : health.isPending
                    ? "Connecting…"
                    : "API unavailable"}
              </button>
              <button
                className="orbital-settings icon-button"
                aria-label="Open API connection settings"
                title="API connection"
                onClick={() => setSettings(true)}
              >
                <Settings2 size={18} />
              </button>
              <button
                className="orbital-mobile-menu icon-button"
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-navigation"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
          {mobileOpen && (
            <nav
              className="orbital-mobile-nav"
              id="mobile-navigation"
              aria-label="Mobile navigation"
            >
              {navigation.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={location === item.href ? "page" : undefined}
                  className={location === item.href ? "active" : ""}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.title}
                  <ArrowUpRight size={17} />
                </Link>
              ))}
              <button
                onClick={() => {
                  setSettings(true);
                  setMobileOpen(false);
                }}
              >
                <Settings2 size={16} /> API connection
              </button>
            </nav>
          )}
        </header>
        <main className="page-content" id="main-content">
          {location !== "/" && (
            <div className="mission-breadcrumb">
              <Orbit size={14} />
              <Link href="/">Research workspace</Link>
              <span>/</span>
              <span>{navigation.find(n => n.href === location)?.title}</span>
              <span className="mission-breadcrumb-note">
                {location === "/simulation"
                  ? "EDUCATIONAL MODEL · NOT EXPERIMENTAL DATA"
                  : "BASS / BASS-II · RECORDED OBSERVATIONS"}
              </span>
            </div>
          )}
          {location === "/simulation" ? (
            <Suspense
              fallback={
                <div className="loading-state large-state">
                  <Orbit className="pulse" size={30} />
                  <h2>Preparing the virtual lab…</h2>
                </div>
              }
            >
              <Simulation
                records={records.data || []}
                dataAvailable={Boolean(ready) && !failed}
                onDetail={setDetail}
              />
            </Suspense>
          ) : failed ? (
            <div className="error-state large-state">
              <Database size={35} />
              <h1>Let's reconnect the data.</h1>
              <p>
                {(records.error || (filters.error as Error))?.message ||
                  "The backend is not reachable."}
              </p>
              <p className="micro">
                Run your existing FastAPI backend on port 8000 or update the
                connection. No sample data is shown in place of your
                experiments.
              </p>
              <div>
                <button
                  className="primary-button"
                  onClick={() => {
                    records.refetch();
                    filters.refetch();
                    health.refetch();
                  }}
                >
                  <RefreshCw size={15} /> Retry connection
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setSettings(true)}
                >
                  API settings
                </button>
              </div>
            </div>
          ) : !ready ? (
            <div className="loading-state large-state">
              <Activity size={32} className="pulse" />
              <h2>Reading the experimental record…</h2>
              <p>Connecting to FLOWTRACE FastAPI. No simulated data.</p>
            </div>
          ) : (
            <Switch>
              <Route path="/">
                <Explorer
                  all={records.data}
                  filters={filters.data}
                  material={material}
                  setMaterial={setMaterial}
                  selected={selected}
                  toggleSelected={toggleSelected}
                  onDetail={setDetail}
                  onCompare={() => navigate("/compare")}
                />
              </Route>
              <Route path="/compare">
                <Compare
                  all={records.data}
                  selected={selected}
                  setSelected={setSelected}
                  base={base}
                  onDetail={setDetail}
                />
              </Route>
              <Route path="/insights">
                <Insights
                  all={records.data}
                  material={material}
                  setMaterial={setMaterial}
                  materials={filters.data.materials}
                  base={base}
                  onDetail={setDetail}
                />
              </Route>
              <Route path="/evidence">
                <Evidence all={records.data} onDetail={setDetail} />
              </Route>
            </Switch>
          )}
          <footer className="page-footer orbital-footer">
            <div>
              <strong>FLOWTRACE</strong>
              <span>Small experiments. Bigger questions.</span>
            </div>
            <span className="footer-provenance">
              Independent project · NASA BASS / BASS-II source data
              <br />
              Space artwork is illustrative, not experimental evidence.
            </span>
            <div className="footer-actions">
              <button onClick={() => setSettings(true)}>
                <Radio size={13} /> API connection
              </button>
              <a
                href="https://ntrs.nasa.gov/citations/20210011385"
                target="_blank"
                rel="noopener noreferrer"
              >
                Original NASA report <ExternalLink size={12} />
              </a>
            </div>
          </footer>
        </main>
      </div>
      {detail && (
        <ExperimentDetail
          row={detail}
          base={base}
          onClose={closeDetail}
          onCompare={addCompare}
        />
      )}
      {settings && (
        <ConnectionSettings
          base={base}
          onClose={closeSettings}
          onSave={next => {
            try {
              localStorage.setItem("flowtrace-api-base", next);
            } catch {
              /* Session works even if storage is restricted. */
            }
            setBase(next);
            setSelected([]);
            setDetail(null);
            toast("API connection updated");
          }}
        />
      )}
    </div>
  );
}
