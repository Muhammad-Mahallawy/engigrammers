import {
  ArrowUpRight,
  BookOpen,
  ExternalLink,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Experiment, fmt, sourcePdf } from "@/lib/flowtrace";

export default function Evidence({
  all,
  onDetail,
}: {
  all: Experiment[];
  onDetail: (r: Experiment) => void;
}) {
  const sourceRows = all.filter(r => r.source_id === "bass2-summary");
  const pages = [
    ...new Set(
      sourceRows.flatMap(r => (r.pdf_page == null ? [] : [r.pdf_page]))
    ),
  ].sort((a, b) => a - b);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">FROM MEASUREMENT TO ORIGINAL DOCUMENT</div>
          <h1>
            Follow the evidence<span className="cyan">.</span>
          </h1>
          <p>Real experiments deserve a traceable source, not a black box.</p>
        </div>
        <span className="outline-label">
          <ShieldCheck size={15} />
          Open scientific evidence
        </span>
      </div>
      <section className="evidence-hero panel">
        <div className="document-icon">
          <FileText size={46} strokeWidth={1} />
          <span>NASA / TM</span>
        </div>
        <div>
          <span className="eyebrow">PRIMARY DATASET REFERENCE · 2021</span>
          <h2>
            Burning and Suppression of Solids–II
            <br />
            (BASS-II) Summary Report
          </h2>
          <p>NASA Technical Reports Server · Document 20210011385</p>
          <p className="evidence-description">
            The report describes the BASS-II experiments aboard the
            International Space Station, including ventilation flow, oxygen
            concentration, fuel type, thickness and geometry.
          </p>
          <div className="evidence-links">
            <a
              className="primary-button"
              href="https://ntrs.nasa.gov/citations/20210011385"
              target="_blank"
              rel="noopener noreferrer"
            >
              NASA citation <ExternalLink size={14} />
            </a>
            <a
              className="secondary-button"
              href={sourcePdf()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read original PDF <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </section>
      <div className="evidence-grid">
        <section className="panel quality-panel">
          <span className="eyebrow">PROVENANCE CHAIN</span>
          <h2>The record keeps its context</h2>
          <div className="provenance-chain">
            <div>
              <span>01</span>
              <div>
                <b>NASA research report</b>
                <p>Original experimental source and conditions</p>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <b>Supplied BASS/BASS-II dataset</b>
                <p>
                  <code>bass2_tests.csv</code> · {all.length} returned records
                </p>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <b>Existing FLOWTRACE FastAPI</b>
                <p>
                  Filters, measurements, recorded outcomes and derived values
                </p>
              </div>
            </div>
            <div>
              <span>04</span>
              <div>
                <b>Your investigation</b>
                <p>
                  Every plot point retains its experiment ID and source
                  reference
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="panel quality-panel">
          <span className="eyebrow">CONTEXTUAL READING · 2014</span>
          <h2>
            <BookOpen size={18} /> Combustion of Solids in Microgravity
          </h2>
          <p>Results from the BASS-II Experiment</p>
          <p>
            This NASA presentation provides research context for the opposed-
            and concurrent-flow configurations and the variables studied. It
            does not add numerical records to this interface.
          </p>
          <a
            href="https://ntrs.nasa.gov/citations/20160000593"
            className="text-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open NASA document 20160000593 <ExternalLink size={14} />
          </a>
          <div className="source-note">
            <b>An independent interface</b>
            <p>
              FLOWTRACE is an independent project using NASA experimental
              references. NASA does not endorse this application.
            </p>
          </div>
        </section>
      </div>
      <section className="panel source-pages">
        <div className="panel-heading">
          <div>
            <h2>Source-linked experiment records</h2>
            <p>
              Source ID: <code>bass2-summary</code> · {sourceRows.length}/
              {all.length} records
            </p>
          </div>
          <span className="tiny-tag">AS SUPPLIED</span>
        </div>
        <div className="page-groups">
          {pages.map(page => (
            <div key={page}>
              <a
                className="page-number"
                href={sourcePdf(page)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText size={16} />
                <span>
                  Source page <b>{fmt(page, 0)}</b>
                </span>
                <ArrowUpRight size={14} />
              </a>
              <div>
                {sourceRows
                  .filter(r => r.pdf_page === page)
                  .map(r => (
                    <button
                      key={r.id}
                      className="experiment-chip"
                      onClick={() => onDetail(r)}
                    >
                      {r.test_id}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="panel-foot">
          Page fields are preserved from the supplied dataset, not independently
          audited. Printed and PDF page numbering may differ.
        </div>
      </section>
      <div className="honesty-note">
        <span>KEEP THE LIMITATIONS VISIBLE</span>
        <p>
          This is a small, heterogeneous experimental dataset. Missing
          measurements are not zero, unspecified outcomes are not sustained
          burns, and associations do not establish causation.
        </p>
      </div>
    </>
  );
}
