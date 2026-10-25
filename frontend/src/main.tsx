import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  ChevronDown,
  X,
  Download,
  Upload,
  SlidersHorizontal,
  RotateCcw,
  Play,
  Pause,
  ExternalLink,
  Github,
  FlaskConical,
  Info,
  LockKeyhole,
  Search,
  Copy,
  Activity,
  ShieldCheck,
} from "lucide-react";
import {
  calibration,
  confidenceOf,
  defaults,
  evaluate,
  familyOf,
  families,
  frontier,
  optimal,
  outcome,
  pareto,
  pretty,
  validateRun,
} from "../../shared/engine.ts";
import type {
  Assumptions,
  Case,
  Metrics,
  Run,
  Prediction,
} from "../../shared/types.ts";
import "./styles.css";
const REPO = "https://github.com/ankitkapooor/escalation-frontier";
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n < 10 ? 2 : 0,
  }).format(n);
const pct = (n: number, d = 1) => (n * 100).toFixed(d) + "%";
const time = (n: number) =>
  n < 1000
    ? `${Math.round(n)} ms`
    : n < 60000
      ? `${(n / 1000).toFixed(1)} s`
      : `${(n / 60000).toFixed(1)} min`;
function track(event: string) {
  window.dispatchEvent(
    new CustomEvent("frontier:interaction", { detail: { event } }),
  );
}
function download(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function IconMark() {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M3 23h22M5 19l7-4 5-8 6-4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="17" cy="7" r="3" fill="currentColor" />
    </svg>
  );
}
function Tag({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
function SectionLabel({
  n,
  children,
}: {
  n: string;
  children: React.ReactNode;
}) {
  return (
    <div className="section-label">
      <span>{n}</span>
      {children}
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = ref.current?.querySelectorAll<HTMLElement>(
          'button,input,textarea,select,a[href],[tabindex="0"]',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-top">
          <span className="mono">{title}</span>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function RoutingDemo({ run, threshold }: { run: Run; threshold: number }) {
  const examples = useMemo(
    () =>
      [
        run.cases.find((c) => c.jev.confidence > 0.9 && !c.security)!,
        run.cases.find((c) => c.jev.confidence < 0.55)!,
        run.cases.find((c) => c.security)!,
      ].filter(Boolean),
    [run],
  );
  const [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % examples.length),
      6500,
    );
    return () => clearInterval(t);
  }, [playing, examples]);
  const c = examples[index % examples.length] ?? run.cases[0],
    esc =
      confidenceOf(c) <
      (c.securityProbability >= 0.85 ? Math.max(threshold, 0.97) : threshold);
  return (
    <div className="routing-demo">
      <div className="demo-top mono">
        <span>
          <span className="status-dot" /> ROUTING OBSERVATORY
        </span>
        <span>
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(examples.length).padStart(2, "0")}
        </span>
      </div>
      <div className="message" key={c.id}>
        <div className="micro">INCOMING CUSTOMER MESSAGE</div>
        <p>“{c.text}”</p>
        <span className="micro text-muted">
          BANKING77 / {c.id.replace("banking77-test-", "#")}
        </span>
      </div>
      <div className="routing-path">
        <span className="path-node active">Input</span>
        <span className="connector" />
        <span className="path-node jev">Jev</span>
        <span className="connector" />
        <span className={`path-node ${esc ? "llm" : "muted-node"}`}>
          Reasoning
        </span>
        <span className="connector" />
        <span className="path-node muted-node">Human</span>
      </div>
      <div className="confidence-row">
        <span className="micro">JEV CONFIDENCE</span>
        <span className="mono">{pct(confidenceOf(c), 1)}</span>
      </div>
      <div className="confidence-track">
        <div style={{ width: pct(confidenceOf(c)) }} />
        <span
          style={{ left: pct(threshold) }}
          title="Selected confidence threshold"
        />
      </div>
      <div className="routing-verdict">
        <span className={esc ? "text-amber" : "text-green"}>
          <span className="status-dot" />
          {esc ? "BUY MORE INTELLIGENCE" : "JEV HANDLES THIS"}
        </span>
        <button
          className="icon-button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause examples" : "Play examples"}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
      <div className="demo-bottom">
        <span>
          {run.kind === "simulation"
            ? "Illustrative outputs. Real customer queries."
            : "Recorded model outputs. No new API calls."}
        </span>
        <button
          className="text-button"
          onClick={() => setIndex((i) => (i + 1) % examples.length)}
          aria-label="Show next routing example"
        >
          Next case <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
function FrontierChart({
  points,
  selected,
  baselines,
  accuracyFloor,
  onSelect,
  costMode,
}: {
  points: Metrics[];
  selected: Metrics;
  baselines: Metrics[];
  accuracyFloor: number;
  onSelect: (t: number) => void;
  costMode: "total" | "inference";
}) {
  const [hover, setHover] = useState<Metrics | null>(null);
  const W = 780,
    H = 380,
    L = 58,
    R = 28,
    T = 26,
    B = 55,
    metric = (p: Metrics) =>
      costMode === "total" ? p.totalCost : p.inferenceCost + p.reviewCost;
  const all = [...points, ...baselines, selected];
  const maxCost = Math.max(10, ...all.map(metric)) * 1.12;
  const minCost = Math.max(
    0.01,
    Math.min(...all.map(metric).filter((n) => n > 0)) * 0.7,
  );
  const logMin = Math.log10(minCost),
    logMax = Math.log10(maxCost),
    x = (p: Metrics) =>
      L +
      ((Math.log10(Math.max(minCost, metric(p))) - logMin) /
        (logMax - logMin)) *
        (W - L - R);
  const floor = Math.min(
      0.8,
      Math.floor(Math.min(...all.map((p) => p.accuracy)) * 10) / 10,
    ),
    y = (n: number) => T + ((1 - n) / (1 - floor)) * (H - T - B);
  const ticks = [0.01, 0.1, 1, 10, 100, 1000, 10000, 100000, 1000000].filter(
    (n) => n >= minCost && n <= maxCost,
  );
  const ys = Array.from({ length: 5 }, (_, i) => floor + ((1 - floor) * i) / 4);
  const efficient = pareto(points);
  const plotted =
    costMode === "total"
      ? efficient
      : [...points].sort((a, b) => metric(a) - metric(b));
  const path = plotted
    .map((p, i) => `${i ? "L" : "M"}${x(p)},${y(p.accuracy)}`)
    .join(" ");
  const active = hover ?? selected;
  return (
    <div className="chart-wrap">
      <svg
        className="frontier-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Escalation frontier: accuracy versus cost per 1,000 decisions. Cost uses a logarithmic scale."
      >
        <defs>
          <pattern
            id="chartDots"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r=".6" fill="#dce1d8" />
          </pattern>
        </defs>
        <rect
          x={L}
          y={T}
          width={W - L - R}
          height={H - T - B}
          fill="url(#chartDots)"
        />
        {ys.map((n) => (
          <g key={n}>
            <line x1={L} x2={W - R} y1={y(n)} y2={y(n)} stroke="#e0e4db" />
            <text
              x={L - 12}
              y={y(n) + 4}
              textAnchor="end"
              className="svg-label"
            >
              {pct(n, 0)}
            </text>
          </g>
        ))}
        {ticks.map((n) => (
          <g key={n}>
            <line
              x1={
                L + ((Math.log10(n) - logMin) / (logMax - logMin)) * (W - L - R)
              }
              x2={
                L + ((Math.log10(n) - logMin) / (logMax - logMin)) * (W - L - R)
              }
              y1={T}
              y2={H - B}
              stroke="#e0e4db"
              strokeDasharray="2 5"
            />
            <text
              x={
                L + ((Math.log10(n) - logMin) / (logMax - logMin)) * (W - L - R)
              }
              y={H - B + 23}
              textAnchor="middle"
              className="svg-label"
            >
              {money(n)}
            </text>
          </g>
        ))}
        {accuracyFloor >= floor && (
          <>
            <line
              x1={L}
              x2={W - R}
              y1={y(accuracyFloor)}
              y2={y(accuracyFloor)}
              stroke="#9a9d8b"
              strokeDasharray="5 5"
            />
            <text
              x={W - R - 4}
              y={y(accuracyFloor) - 7}
              textAnchor="end"
              className="svg-label"
            >
              ACCURACY FLOOR {pct(accuracyFloor, 0)}
            </text>
          </>
        )}
        <path
          d={path}
          stroke="#286a50"
          strokeWidth="2.5"
          strokeLinejoin="round"
          fill="none"
        />
        {points
          .filter((_, i) => i % 2 === 0)
          .map((p, i) => (
            <circle
              key={i}
              cx={x(p)}
              cy={y(p.accuracy)}
              r="3"
              fill="#8fac97"
              opacity=".5"
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect(Math.min(1, p.threshold))}
            >
              <title>
                Threshold {p.threshold.toFixed(3)} · {pct(p.accuracy)} accuracy
                · {money(metric(p))}
              </title>
            </circle>
          ))}
        {baselines.map((p, i) => (
          <g key={i}>
            <rect
              x={x(p) - 5}
              y={y(p.accuracy) - 5}
              width="10"
              height="10"
              rx={i === 2 ? 0 : 2}
              fill={["#537c65", "#ba8c44", "#555e59"][i]}
            />
            <text
              x={x(p) + (i === 2 ? -10 : 10)}
              y={y(p.accuracy) + (i === 2 ? 19 : 5)}
              textAnchor={i === 2 ? "end" : "start"}
              className="svg-baseline"
            >
              {["Jev only", "LLM only", "Human*"][i]}
            </text>
          </g>
        ))}
        <line
          x1={x(selected)}
          x2={x(selected)}
          y1={y(selected.accuracy)}
          y2={H - B}
          stroke="#286a50"
          strokeDasharray="3 5"
        />
        <circle
          cx={x(selected)}
          cy={y(selected.accuracy)}
          r="13"
          fill="#286a50"
          opacity=".12"
        />
        <circle
          cx={x(selected)}
          cy={y(selected.accuracy)}
          r="6"
          stroke="#fff"
          strokeWidth="2.5"
          fill="#286a50"
        />
        <text x={L} y="12" className="svg-axis">
          DECISION ACCURACY ↑
        </text>
        <text
          x={(W + L - R) / 2}
          y={H - 6}
          textAnchor="middle"
          className="svg-axis"
        >
          {costMode === "total"
            ? "EXPECTED TOTAL COST"
            : "INFERENCE + REVIEW COST"}{" "}
          / 1,000 DECISIONS · LOG SCALE →
        </text>
      </svg>
      <div className="chart-readout mono">
        <span>
          <span className="legend-dot jev-bg" />{" "}
          {hover ? "HOVERED POLICY" : "SELECTED POLICY"}
        </span>
        <span>T {Math.min(1, active.threshold).toFixed(3)}</span>
        <span>{pct(active.accuracy)} accuracy</span>
        <span>{money(metric(active))} / 1k</span>
      </div>
    </div>
  );
}
function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 10000,
  step = 0.1,
  prefix = "$",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
}) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <span className="input-wrap">
        <span>{prefix}</span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = e.target.valueAsNumber;
            if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
        />
      </span>
    </label>
  );
}
function CaseInspector({
  c,
  threshold,
  a,
  human,
  advanced,
  onClose,
}: {
  c: Case;
  threshold: number;
  a: Assumptions;
  human: boolean;
  advanced: boolean;
  onClose: () => void;
}) {
  const result = outcome(c, threshold, a, human, "hybrid", advanced);
  const sorted = Object.entries(c.jev.probabilities).sort(
    (a, b) => b[1] - a[1],
  );
  return (
    <Modal title={`CASE FILE / ${c.id}`} onClose={onClose}>
      <div className="case-detail">
        <Tag tone={result.correct ? "green" : "red"}>
          {result.correct ? "CORRECT ROUTE" : "INCORRECT ROUTE"}
        </Tag>
        <h2>“{c.text}”</h2>
        <dl className="detail-grid">
          <div>
            <dt>Ground truth</dt>
            <dd>{advanced ? pretty(c.truth) : familyOf(c.truth)}</dd>
          </div>
          <div>
            <dt>Routing outcome</dt>
            <dd>
              {result.handler === "human"
                ? "Simulated human review"
                : result.handler === "jev"
                  ? "Jev → automatic route"
                  : "Escalated → reasoning model"}
            </dd>
          </div>
          <div>
            <dt>Jev prediction</dt>
            <dd>
              {advanced
                ? pretty(c.jev.label)
                : (c.jev.family ?? familyOf(c.jev.label))}{" "}
              <small>{pct(confidenceOf(c, advanced))}</small>
            </dd>
          </div>
          <div>
            <dt>Reference prediction</dt>
            <dd>
              {advanced
                ? pretty(c.llm.label)
                : (c.llm.family ?? familyOf(c.llm.label))}{" "}
              <small>{pct(c.llm.confidence)}</small>
            </dd>
          </div>
          <div>
            <dt>Security probability</dt>
            <dd>{pct(c.securityProbability)}</dd>
          </div>
          <div>
            <dt>Workflow latency</dt>
            <dd>{time(result.latencyMs)}</dd>
          </div>
        </dl>
        <h3 className="micro">
          JEV INTENT PROBABILITY DISTRIBUTION · TOP 8 / 77
        </h3>
        <div className="probabilities">
          {sorted.slice(0, 8).map(([label, p]) => (
            <div key={label}>
              <span>{pretty(label)}</span>
              <div>
                <i style={{ width: pct(p) }} />
              </div>
              <span className="mono">{pct(p)}</span>
            </div>
          ))}
        </div>
        <p className="small text-muted">
          Intent: {pretty(c.truth)}. Reference confidence is self-reported. No
          model explanations or chain of thought are requested.
        </p>
      </div>
    </Modal>
  );
}
function FailureAtlas({
  run,
  threshold,
  a,
  human,
  advanced,
}: {
  run: Run;
  threshold: number;
  a: Assumptions;
  human: boolean;
  advanced: boolean;
}) {
  const [filter, setFilter] = useState("All cases"),
    [search, setSearch] = useState(""),
    [family, setFamily] = useState("All workflows"),
    [selected, setSelected] = useState<Case | null>(null),
    [page, setPage] = useState(0);
  const correct = (c: Case, model: "jev" | "llm") =>
    advanced
      ? c[model].label === c.truth
      : (c[model].family ?? familyOf(c[model].label)) === familyOf(c.truth);
  const filtered = run.cases.filter((c) => {
    const j = correct(c, "jev"),
      l = correct(c, "llm");
    return (
      (family === "All workflows" || familyOf(c.truth) === family) &&
      (c.text.toLowerCase().includes(search.toLowerCase()) ||
        c.truth.includes(search.toLowerCase())) &&
      (filter === "All cases" ||
        (filter === "Confident errors" &&
          !j &&
          confidenceOf(c, advanced) >= 0.8) ||
        (filter === "Uncertain but correct" &&
          j &&
          confidenceOf(c, advanced) < 0.6) ||
        (filter === "Models disagree" &&
          (advanced
            ? c.jev.label !== c.llm.label
            : (c.jev.family ?? familyOf(c.jev.label)) !==
              (c.llm.family ?? familyOf(c.llm.label)))) ||
        (filter === "Both wrong" && !j && !l) ||
        (filter === "Both correct" && j && l))
    );
  });
  useEffect(() => setPage(0), [filter, search, family, run]);
  return (
    <section id="atlas" className="section atlas-section">
      <div className="section-heading">
        <div>
          <SectionLabel n="03">FAILURE ATLAS</SectionLabel>
          <h2>Look where the models break.</h2>
          <p>Confidence is a signal. Correctness is a separate question.</p>
        </div>
        <span className="mono text-muted">
          {run.kind === "simulation"
            ? "ILLUSTRATIVE CASE OUTCOMES"
            : "RECORDED CASE OUTCOMES"}
        </span>
      </div>
      <div className="atlas-toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search customer messages"
            placeholder="Search customer messages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="select-wrap">
          <span className="sr-only">Filter workflow</span>
          <select value={family} onChange={(e) => setFamily(e.target.value)}>
            <option>All workflows</option>
            {Object.keys(families).map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>
      </div>
      <div
        className="filter-row"
        role="group"
        aria-label="Filter failure types"
      >
        {[
          "All cases",
          "Confident errors",
          "Uncertain but correct",
          "Models disagree",
          "Both wrong",
          "Both correct",
        ].map((f) => (
          <button
            key={f}
            className={filter === f ? "filter active" : "filter"}
            onClick={() => {
              setFilter(f);
              track("failure_filter");
            }}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="atlas-table">
        <div className="table-header">
          <span>CUSTOMER MESSAGE</span>
          <span>JEV CONFIDENCE</span>
          <span>OUTCOME</span>
          <span />
        </div>
        {filtered.slice(page * 6, page * 6 + 6).map((c) => {
          const r = outcome(c, threshold, a, human, "hybrid", advanced);
          return (
            <button
              className="case-row"
              key={c.id}
              onClick={() => {
                setSelected(c);
                track("case_open");
              }}
            >
              <div>
                <span className="case-text">{c.text}</span>
                <span className="case-family">{familyOf(c.truth)}</span>
              </div>
              <div className="table-confidence">
                <span className="mono">{pct(confidenceOf(c, advanced))}</span>
                <div>
                  <i
                    className={correct(c, "jev") ? "" : "error-bar"}
                    style={{ width: pct(confidenceOf(c, advanced)) }}
                  />
                </div>
              </div>
              <div>
                <span className={`outcome-label ${r.correct ? "" : "error"}`}>
                  <span className="status-dot" />
                  {r.handler === "human"
                    ? "Human*"
                    : r.handler === "jev"
                      ? "Jev"
                      : "Reasoning"}
                </span>
                <span className="case-family">
                  {r.correct ? "Correct route" : "Incorrect route"}
                </span>
              </div>
              <ArrowUpRight size={17} />
            </button>
          );
        })}
        {!filtered.length && (
          <div className="empty-state">
            <Search size={23} />
            <h3>No matching cases.</h3>
            <p>Try another filter or search term.</p>
            <button
              className="text-button"
              onClick={() => {
                setFilter("All cases");
                setSearch("");
                setFamily("All workflows");
              }}
            >
              Clear filters <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="table-footer">
        <span>
          {filtered.length
            ? `${page * 6 + 1}–${Math.min((page + 1) * 6, filtered.length)} of ${filtered.length}`
            : "0"}{" "}
          cases · *Simulated human review
        </span>
        <div>
          <button
            className="text-button"
            disabled={!page}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Previous
          </button>
          <button
            className="text-button"
            disabled={(page + 1) * 6 >= filtered.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ArrowRight size={13} />
          </button>
        </div>
      </div>
      {selected && (
        <CaseInspector
          c={selected}
          threshold={threshold}
          a={a}
          human={human}
          advanced={advanced}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
function CalibrationView({ run, advanced }: { run: Run; advanced: boolean }) {
  const cal = calibration(run.cases, advanced);
  return (
    <div className="calibration-panel">
      <div className="calibration-intro">
        <SectionLabel n="04">CALIBRATION CHECK</SectionLabel>
        <h2>
          Does confidence
          <br />
          deserve your trust?
        </h2>
        <p>
          A confident answer can still be wrong. Compare Jev’s stated confidence
          with observed correctness in each bucket.
        </p>
        <div className="calibration-numbers">
          <div>
            <span className="micro">CALIBRATION ERROR</span>
            <strong>{pct(cal.ece)}</strong>
          </div>
          <div>
            <span className="micro">INTENT BRIER SCORE</span>
            <strong>{cal.brier.toFixed(3)}</strong>
          </div>
        </div>
        <span className="small text-muted">
          {run.kind === "simulation"
            ? "Illustrative calibration only."
            : "Observed on this run."}{" "}
          Lower is better. Brier uses all 77 intent probabilities.
        </span>
      </div>
      <div className="calibration-chart">
        <div className="legend">
          <span>
            <i className="legend-dot jev-bg" />
            Observed correctness
          </span>
          <span>
            <i className="legend-dot confidence-bg" />
            Mean confidence
          </span>
        </div>
        <svg
          viewBox="0 0 540 270"
          role="img"
          aria-label="Calibration bars compare mean confidence to observed accuracy in ten confidence buckets"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((n) => (
            <g key={n}>
              <line
                x1="40"
                x2="530"
                y1={225 - n * 180}
                y2={225 - n * 180}
                stroke="#d9dfd5"
              />
              <text
                x="31"
                y={229 - n * 180}
                textAnchor="end"
                className="svg-label"
              >
                {pct(n, 0)}
              </text>
            </g>
          ))}
          {cal.bins.map((b, i) => (
            <g key={i}>
              <rect
                x={47 + i * 48}
                y={225 - b.accuracy * 180}
                width="17"
                height={b.accuracy * 180}
                fill="#347056"
              />
              <rect
                x={66 + i * 48}
                y={225 - b.confidence * 180}
                width="10"
                height={b.confidence * 180}
                fill="#b3c3ad"
              />
              <text
                x={61 + i * 48}
                y="245"
                textAnchor="middle"
                className="svg-label"
              >
                {(b.lower + 0.1).toFixed(1)}
              </text>
              <title>
                {b.lower.toFixed(1)}–{(b.lower + 0.1).toFixed(1)}: {b.count}{" "}
                cases; correctness {pct(b.accuracy)}; mean confidence{" "}
                {pct(b.confidence)}
              </title>
            </g>
          ))}
          <text x="280" y="267" textAnchor="middle" className="svg-axis">
            CONFIDENCE BUCKET · UPPER BOUND
          </text>
        </svg>
        <div className="bucket-counts mono">
          {cal.bins.map((b, i) => (
            <span
              key={i}
              title={`${b.lower.toFixed(1)}–${(b.lower + 0.1).toFixed(1)} confidence`}
            >
              n={b.count}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
function LiveLab({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState(
      "I noticed a card payment I don’t recognize. Can you help?",
    ),
    [token, setToken] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<{
      prediction: Prediction;
      securityProbability: number;
    } | null>(null),
    [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((r) => setEnabled(r.liveEnabled))
      .catch(() => setEnabled(false));
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await fetch("/api/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Access-Token": token,
        },
        body: JSON.stringify({ text }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setResult(body);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to evaluate this message.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="LIVE DECISION LAB" onClose={onClose}>
      <div className="live-content">
        <Tag tone="green">
          <Activity size={12} /> JEV / TYPED JUDGMENTS
        </Tag>
        <h2>
          One message.
          <br />
          Five bounded judgments.
        </h2>
        <p>Inspect a real Jev result without changing the benchmark.</p>
        {enabled === false && (
          <div className="setup-notice">
            <LockKeyhole size={19} />
            <div>
              <strong>Waiting for the owner’s API key.</strong>
              <p>
                Add <code>JEV_API_KEY</code> and <code>LIVE_ACCESS_TOKEN</code>{" "}
                to the server environment. The key stays on the server. The
                workbench’s illustration is available now.
              </p>
            </div>
          </div>
        )}
        <form onSubmit={submit}>
          <label className="form-label">
            CUSTOMER MESSAGE
            <textarea
              maxLength={2000}
              minLength={3}
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
            />
          </label>
          <label className="form-label">
            OWNER ACCESS TOKEN
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Not stored in your browser"
              required
            />
          </label>
          <button
            className="button primary"
            disabled={busy || enabled !== true}
          >
            {busy ? "Evaluating…" : "Evaluate with Jev"}
            <ArrowUpRight size={16} />
          </button>
        </form>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {result && (
          <div className="live-result" aria-live="polite">
            <span className="micro">
              MEASURED RESULT / {result.prediction.model}
            </span>
            <h3>
              {result.prediction.family ?? familyOf(result.prediction.label)}
            </h3>
            <dl>
              <div>
                <dt>Intent</dt>
                <dd>{pretty(result.prediction.label)}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{pct(result.prediction.confidence)}</dd>
              </div>
              <div>
                <dt>Security probability</dt>
                <dd>{pct(result.securityProbability)}</dd>
              </div>
              <div>
                <dt>Round-trip latency</dt>
                <dd>{time(result.prediction.latencyMs)}</dd>
              </div>
            </dl>
            <button
              className="text-button"
              onClick={() => download(result, "jev-live-result.json")}
            >
              Download raw result <Download size={14} />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
function App() {
  const [run, setRun] = useState<Run | null>(null),
    [loadError, setLoadError] = useState(""),
    [notice, setNotice] = useState(""),
    [threshold, setThreshold] = useState(() => {
      const t = Number(new URLSearchParams(location.search).get("t") ?? ".78");
      return Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0.78;
    }),
    [a, setA] = useState<Assumptions>({ ...defaults }),
    [human, setHuman] = useState(true),
    [advanced, setAdvanced] = useState(false),
    [costMode, setCostMode] = useState<"total" | "inference">("total"),
    [live, setLive] = useState(false),
    [menu, setMenu] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  async function load() {
    setLoadError("");
    try {
      const benchmark = await fetch("/benchmark.json");
      if (benchmark.ok) {
        setRun(validateRun(await benchmark.json()));
      } else if (benchmark.status === 404) {
        const demo = await fetch("/demo.json");
        if (!demo.ok) throw new Error("The illustration could not be loaded.");
        setRun(validateRun(await demo.json()));
      } else throw new Error("Benchmark could not be loaded. Please retry.");
    } catch (e) {
      setLoadError(
        e instanceof Error ? e.message : "Unable to load the experiment.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  const cases = run?.cases ?? [];
  const points = useMemo(
    () => frontier(cases, a, human, advanced),
    [cases, a, human, advanced],
  );
  const selected = useMemo(
    () => evaluate(cases, threshold, a, human, "hybrid", advanced),
    [cases, threshold, a, human, advanced],
  );
  const baselines = useMemo(
    () =>
      ["jev", "llm", "human"].map((mode) =>
        evaluate(cases, 0, a, false, mode as "jev" | "llm" | "human", advanced),
      ),
    [cases, a, advanced],
  );
  const best = useMemo(() => optimal(points, a), [points, a]);
  const change = (key: keyof Assumptions, value: number) => {
    setA((s) => ({ ...s, [key]: value }));
    track("scenario_change");
  };
  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 30_000_000)
        throw new Error("Choose a JSON file smaller than 30 MB.");
      const next = validateRun(JSON.parse(await file.text()));
      setRun(next);
      setNotice(
        `Loaded ${next.cases.length.toLocaleString()} ${next.kind === "measured" ? "measured" : "illustrative"} cases.`,
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Invalid benchmark file.");
    }
    e.target.value = "";
  }
  async function share() {
    const url = new URL(location.href);
    url.hash = "frontier";
    url.searchParams.set("t", String(threshold));
    try {
      await navigator.clipboard.writeText(url.href);
      setNotice("Link copied with the selected confidence threshold.");
    } catch {
      setNotice("Copy this page URL to share the experiment.");
    }
  }
  if (!run)
    return (
      <div className="loading">
        <IconMark />
        <h1>The Escalation Frontier</h1>
        {loadError ? (
          <>
            <p role="alert">{loadError}</p>
            <button className="button primary" onClick={load}>
              Retry <RotateCcw size={16} />
            </button>
          </>
        ) : (
          <p>Preparing the experiment…</p>
        )}
      </div>
    );
  const isDemo = run.kind === "simulation",
    savings = 1 - selected.totalCost / (baselines[1].totalCost || 1);
  return (
    <>
      <a className="skip-link" href="#frontier">
        Skip to experiment
      </a>
      <header className="site-header">
        <a href="#" className="wordmark">
          <IconMark />
          <span>
            THE ESCALATION
            <br />
            FRONTIER<span className="wordmark-period">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation" className={menu ? "open" : ""}>
          {[
            ["experiment", "Experiment"],
            ["frontier", "The frontier"],
            ["atlas", "Failure atlas"],
            ["methodology", "Methodology"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => {
                setMenu(false);
                track(`${id}_open`);
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <a
          className="portfolio-link"
          href="https://ankitkapoor.me"
          target="_blank"
          rel="noreferrer"
        >
          Ankit Kapoor <ArrowUpRight size={14} />
        </a>
        <button
          className="mobile-menu icon-button"
          aria-label="Toggle navigation"
          aria-expanded={menu}
          onClick={() => setMenu((v) => !v)}
        >
          {menu ? <X /> : <SlidersHorizontal />}
        </button>
      </header>
      <main>
        <section id="experiment" className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" /> APPLIED AI / EXPERIMENT NO. 001
            </div>
            <h1>
              How much
              <br />
              intelligence should
              <br />
              <em>software buy?</em>
            </h1>
            <p className="hero-subtitle">
              Not every decision deserves the same model.
            </p>
            <p className="hero-description">
              Let fast judgments handle the obvious. Buy deeper reasoning for
              the uncertain. Explore what happens to cost, accuracy, and risk
              when you move the line.
            </p>
            <div className="hero-actions">
              <a
                href="#frontier"
                className="button primary"
                onClick={() => track("experiment_start")}
              >
                Explore the frontier <ArrowDown size={16} />
              </a>
              <button className="text-button" onClick={() => setLive(true)}>
                Try a live decision <ArrowUpRight size={15} />
              </button>
            </div>
            <div className="hero-footnote">
              <FlaskConical size={14} />
              <span>
                {isDemo
                  ? "Interactive illustration · no API key required"
                  : "Measured benchmark · replayed locally"}
              </span>
            </div>
          </div>
          <RoutingDemo run={run} threshold={threshold} />
        </section>
        <div className="thesis-strip">
          <div>
            <span className="micro">THE HYPOTHESIS</span>
            <p>
              Intelligence is a resource.
              <br />
              <strong>Allocate it where it matters.</strong>
            </p>
          </div>
          <span className="thesis-arrow">↗</span>
          <div>
            <span className="micro">THE EXPERIMENT</span>
            <p>
              One dataset. Three decision makers.
              <br />
              <strong>A threshold you control.</strong>
            </p>
          </div>
          <span className="thesis-arrow">↗</span>
          <div>
            <span className="micro">THE QUESTION</span>
            <p>
              When does extra certainty
              <br />
              <strong>justify the extra cost?</strong>
            </p>
          </div>
        </div>
        <section id="frontier" className="section frontier-section">
          <div className="section-heading">
            <div>
              <SectionLabel n="01">THE ESCALATION FRONTIER</SectionLabel>
              <h2>The price of being sure.</h2>
              <p>Move the threshold. Watch the work—and the economics—shift.</p>
            </div>
            <button className="button subtle small-button" onClick={share}>
              <Copy size={14} /> Share threshold
            </button>
          </div>
          <div className={`run-notice ${isDemo ? "" : "measured"}`}>
            <div>
              <span className="status-dot" />
              <strong>{isDemo ? "ILLUSTRATIVE MODE" : "MEASURED RUN"}</strong>
              <span>
                {isDemo
                  ? "Real BANKING77 messages. Simulated model outputs—not benchmark findings."
                  : `${run.cases.length.toLocaleString()} recorded decisions · ${new Date(run.timestamp!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
              </span>
            </div>
            <button
              className="text-button"
              onClick={() => upload.current?.click()}
            >
              {isDemo ? "Load measured results" : "Replace run"}{" "}
              <Upload size={13} />
            </button>
            <input
              type="file"
              accept="application/json,.json"
              ref={upload}
              className="sr-only"
              onChange={importFile}
            />
          </div>
          <div className="workbench">
            <div className="chart-panel">
              <div className="panel-top">
                <span className="micro">ACCURACY × COST</span>
                <div className="segmented" aria-label="Chart cost basis">
                  {(["total", "inference"] as const).map((m) => (
                    <button
                      key={m}
                      aria-pressed={costMode === m}
                      className={costMode === m ? "active" : ""}
                      onClick={() => setCostMode(m)}
                    >
                      {m === "total" ? "Total cost" : "Inference + review"}
                    </button>
                  ))}
                </div>
              </div>
              <FrontierChart
                points={points}
                selected={selected}
                baselines={baselines}
                accuracyFloor={a.accuracyFloor}
                onSelect={setThreshold}
                costMode={costMode}
              />
              <div className="legend chart-legend">
                <span>
                  <i className="line-key" />
                  {costMode === "total"
                    ? "Efficient hybrid policies"
                    : "Hybrid routing policies"}
                </span>
                <span>
                  <i className="legend-dot jev-bg" />
                  Jev
                </span>
                <span>
                  <i className="legend-dot llm-bg" />
                  Reasoning
                </span>
                <span>
                  <i className="legend-dot human-bg" />
                  Human*
                </span>
              </div>
              <div className="chart-note">
                Each point is a routing policy. All thresholds replay the same
                saved decisions.
                <br />
                *Human review uses benchmark ground truth and an explicit cost
                and delay.
              </div>
              <div className="metrics-row">
                <div>
                  <span className="micro">DECISION ACCURACY</span>
                  <strong>{pct(selected.accuracy)}</strong>
                  <span>
                    {isDemo ? "Illustrative outcomes" : "Observed correctness"}
                  </span>
                </div>
                <div>
                  <span className="micro">TOTAL COST / 1K</span>
                  <strong>{money(selected.totalCost)}</strong>
                  <span>Includes expected error cost</span>
                </div>
                <div>
                  <span className="micro">EXPECTED ERRORS / 1K</span>
                  <strong>{selected.errors.toFixed(1)}</strong>
                  <span>Across all decision makers</span>
                </div>
              </div>
            </div>
            <aside className="control-panel">
              <div className="control-heading">
                <span className="micro">YOUR ROUTING POLICY</span>
                <SlidersHorizontal size={17} />
              </div>
              <div className="threshold-heading">
                <label htmlFor="threshold">Confidence threshold</label>
                <output htmlFor="threshold">{threshold.toFixed(3)}</output>
              </div>
              <p className="small text-muted">
                Jev acts above this line. Uncertain cases buy more intelligence.
              </p>
              <input
                id="threshold"
                className="threshold-slider"
                type="range"
                min="0"
                max="1"
                step="any"
                value={threshold}
                style={
                  { "--range-progress": pct(threshold) } as React.CSSProperties
                }
                onChange={(e) => {
                  setThreshold(Number(e.target.value));
                  track("threshold_change");
                }}
              />
              <div className="range-labels mono">
                <span>MORE AUTOMATION</span>
                <span>MORE CERTAINTY</span>
              </div>
              <div className="human-toggle">
                <div>
                  <strong>Human safety net</strong>
                  <span>Review uncertain reference outputs</span>
                </div>
                <button
                  role="switch"
                  aria-checked={human}
                  aria-label="Enable simulated human review"
                  className={`switch ${human ? "on" : ""}`}
                  onClick={() => setHuman((v) => !v)}
                >
                  <span />
                </button>
              </div>
              <div className="allocation">
                <div className="micro">WHO HANDLES THE WORK?</div>
                <div
                  className="allocation-bar"
                  aria-label={`Jev ${pct(selected.jevRate)}, reasoning model ${pct(selected.llmRate)}, simulated human ${pct(selected.humanRate)}`}
                >
                  <div
                    className="jev-bg"
                    style={{ width: pct(selected.jevRate) }}
                  />
                  <div
                    className="llm-bg"
                    style={{ width: pct(selected.llmRate) }}
                  />
                  <div
                    className="human-bg"
                    style={{ width: pct(selected.humanRate) }}
                  />
                </div>
                <div className="allocation-labels">
                  {[
                    ["Jev", selected.jevRate, "jev-bg"],
                    ["Reasoning", selected.llmRate, "llm-bg"],
                    ["Human*", selected.humanRate, "human-bg"],
                  ].map(([name, rate, color]) => (
                    <div key={String(name)}>
                      <span>
                        <i className={`legend-dot ${color}`} />
                        {name}
                      </span>
                      <strong>{pct(Number(rate), 1)}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <dl className="cost-breakdown">
                <div>
                  <dt>Model inference</dt>
                  <dd>{money(selected.inferenceCost)}</dd>
                </div>
                <div>
                  <dt>Simulated human review</dt>
                  <dd>{money(selected.reviewCost)}</dd>
                </div>
                <div>
                  <dt>Expected decision errors</dt>
                  <dd>{money(selected.errorCost)}</dd>
                </div>
                {a.escalationCost > 0 && (
                  <div>
                    <dt>Escalation overhead</dt>
                    <dd>{money(selected.escalationCost)}</dd>
                  </div>
                )}
                <div className="cost-total">
                  <dt>Expected total / 1,000</dt>
                  <dd>{money(selected.totalCost)}</dd>
                </div>
              </dl>
              <div className="latency-row">
                <div>
                  <span className="micro">P50 LATENCY</span>
                  <strong>{time(selected.p50)}</strong>
                </div>
                <div>
                  <span className="micro">P95 LATENCY</span>
                  <strong>{time(selected.p95)}</strong>
                </div>
              </div>
              <div className="policy-note">
                <ShieldCheck size={15} />
                <span>
                  Security probability ≥85% raises Jev’s gate to at least 97%.
                  Human review below {pct(a.humanGate, 0)} reference confidence.
                </span>
              </div>
            </aside>
          </div>
          <div className="benchmark-bar">
            <span>
              <span className="status-dot" />
              {run.cases.length.toLocaleString()} CASES LOADED
            </span>
            <span>{advanced ? "77 INTENTS" : "12 OPERATIONAL WORKFLOWS"}</span>
            <span>
              {isDemo ? "NO EMPIRICAL CLAIMS" : "PROMPT " + run.promptVersion}
            </span>
            <label className="advanced-toggle">
              <input
                type="checkbox"
                checked={advanced}
                onChange={(e) => setAdvanced(e.target.checked)}
              />
              Advanced: 77-intent scoring
            </label>
          </div>
        </section>
        <section id="scenarios" className="section scenario-section">
          <div className="section-heading">
            <div>
              <SectionLabel n="02">SCENARIO LAB</SectionLabel>
              <h2>
                Change the stakes.
                <br />
                Change the architecture.
              </h2>
              <p>
                A wrong route isn’t always an expensive mistake. Sometimes it
                is.
              </p>
            </div>
            <button
              className="text-button"
              onClick={() => {
                setA({ ...defaults });
                setHuman(true);
                setThreshold(0.78);
              }}
            >
              <RotateCcw size={14} /> Reset assumptions
            </button>
          </div>
          <div className="scenario-grid">
            <div className="assumptions">
              <div className="assumption-column">
                <h3 className="micro">COST OF INTELLIGENCE / DECISION</h3>
                <NumberField
                  label="Jev inference"
                  value={a.jevCost}
                  onChange={(v) => change("jevCost", v)}
                  step={0.0001}
                  max={10}
                />
                <NumberField
                  label="Reasoning inference"
                  value={a.llmCost}
                  onChange={(v) => change("llmCost", v)}
                  step={0.001}
                  max={100}
                />
                <NumberField
                  label="Human review"
                  value={a.humanCost}
                  onChange={(v) => change("humanCost", v)}
                  step={1}
                  min={1}
                  max={100}
                />
                <NumberField
                  label="Escalation overhead"
                  value={a.escalationCost}
                  onChange={(v) => change("escalationCost", v)}
                  step={0.01}
                  max={100}
                />
              </div>
              <div className="assumption-column">
                <h3 className="micro">COST OF BEING WRONG</h3>
                <NumberField
                  label="Incorrect route"
                  value={a.errorCost}
                  onChange={(v) => change("errorCost", v)}
                  min={1}
                  max={500}
                  step={1}
                />
                <NumberField
                  label="Security-case error"
                  value={a.securityErrorCost}
                  onChange={(v) => change("securityErrorCost", v)}
                  min={10}
                  max={10000}
                  step={10}
                />
                <NumberField
                  label="Accuracy floor"
                  value={Math.round(a.accuracyFloor * 1000) / 10}
                  onChange={(v) => change("accuracyFloor", v / 100)}
                  min={80}
                  max={100}
                  step={0.1}
                  prefix="%"
                />
                <NumberField
                  label="Mean latency SLA"
                  value={a.latencySla / 1000}
                  onChange={(v) => change("latencySla", v * 1000)}
                  min={0.1}
                  max={300}
                  step={1}
                  prefix="s"
                />
              </div>
              <details className="more-assumptions">
                <summary>
                  More operational constraints <ChevronDown size={14} />
                </summary>
                <div>
                  <NumberField
                    label="Maximum human review"
                    value={a.maxHumanRate * 100}
                    onChange={(v) => change("maxHumanRate", v / 100)}
                    max={100}
                    step={1}
                    prefix="%"
                  />
                  <NumberField
                    label="Minimum automation"
                    value={a.automationFloor * 100}
                    onChange={(v) => change("automationFloor", v / 100)}
                    max={100}
                    step={1}
                    prefix="%"
                  />
                  <NumberField
                    label="Human review delay"
                    value={a.humanLatencyMs / 1000}
                    onChange={(v) => change("humanLatencyMs", v * 1000)}
                    min={1}
                    max={3600}
                    step={10}
                    prefix="s"
                  />
                  <NumberField
                    label="Human confidence gate"
                    value={a.humanGate * 100}
                    onChange={(v) => change("humanGate", v / 100)}
                    max={100}
                    step={1}
                    prefix="%"
                  />
                </div>
              </details>
            </div>
            <div className="recommendation">
              <div className="recommendation-top">
                <span className="micro">
                  {isDemo
                    ? "ILLUSTRATIVE OPTIMUM"
                    : "MINIMUM-COST FEASIBLE POLICY"}
                </span>
                <ArrowUpRight size={19} />
              </div>
              {best ? (
                <>
                  <h3>
                    Buy certainty
                    <br />
                    <em>selectively.</em>
                  </h3>
                  <p>
                    Under these assumptions, the lowest-cost feasible hybrid
                    policy lets Jev handle <strong>{pct(best.jevRate)}</strong>{" "}
                    of cases and escalates <strong>{pct(best.llmRate)}</strong>{" "}
                    to reasoning. <strong>{pct(best.humanRate)}</strong> reach
                    simulated human review.
                  </p>
                  <div className="recommendation-stats">
                    <div>
                      <span className="micro">TOTAL COST / 1K</span>
                      <strong>{money(best.totalCost)}</strong>
                    </div>
                    <div>
                      <span className="micro">ACCURACY</span>
                      <strong>{pct(best.accuracy)}</strong>
                    </div>
                  </div>
                  <button
                    className="button light"
                    onClick={() => {
                      setThreshold(Math.min(1, best.threshold));
                      document.getElementById("frontier")?.scrollIntoView({
                        behavior: matchMedia("(prefers-reduced-motion: reduce)")
                          .matches
                          ? "auto"
                          : "smooth",
                      });
                      track("apply_optimum");
                    }}
                  >
                    Apply threshold {Math.min(1, best.threshold).toFixed(3)}{" "}
                    <ArrowUpRight size={15} />
                  </button>
                </>
              ) : (
                <>
                  <h3>
                    No policy meets
                    <br />
                    <em>every constraint.</em>
                  </h3>
                  <p>
                    Try lowering the accuracy floor, allowing more human review,
                    or increasing the latency SLA. The model won’t hide an
                    infeasible target.
                  </p>
                  <Tag>NO FEASIBLE POLICY</Tag>
                </>
              )}
              <p className="recommendation-note">
                {isDemo
                  ? "A demonstration of the decision rule, not a model recommendation."
                  : "Exploratory optimum on this run. Validate on separate data before deployment."}
              </p>
            </div>
          </div>
          <div className="comparison-note">
            <Info size={15} />
            <span>
              At your selected threshold, expected total cost is{" "}
              <strong>
                {pct(Math.abs(savings), 1)} {savings >= 0 ? "lower" : "higher"}
              </strong>{" "}
              than reasoning-only. This includes error and human-review costs;
              it is not an inference-price comparison.
            </span>
          </div>
        </section>
        <FailureAtlas
          run={run}
          threshold={threshold}
          a={a}
          human={human}
          advanced={advanced}
        />
        <section className="section">
          <CalibrationView run={run} advanced={advanced} />
        </section>
        <section id="methodology" className="section methodology-section">
          <div className="methodology-title">
            <SectionLabel n="05">OPEN METHODOLOGY</SectionLabel>
            <h2>
              No magic.
              <br />
              <em>Just decisions.</em>
            </h2>
            <p>
              The interesting question isn’t which model is smartest. It’s which
              decisions are worth paying it to make.
            </p>
            <a
              className="text-button"
              href={REPO}
              target="_blank"
              rel="noreferrer"
              onClick={() => track("github_open")}
            >
              Inspect the repository <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="methodology-details">
            <details open>
              <summary>
                <span>01 / What’s behind the numbers?</span>
                <ChevronDown size={17} />
              </summary>
              <div>
                <p>
                  {isDemo
                    ? "This site currently uses 154 real BANKING77 test queries with deterministic, simulated model predictions. Every displayed outcome is illustrative; no benchmark has been run or model-performance claim established."
                    : "The interface is replaying a recorded benchmark run. Classification accuracy uses ground-truth labels; costs use the editable assumptions in the Scenario Lab."}
                </p>
                <p>
                  The complete official test split contains 3,080 queries across
                  77 intents. A published taxonomy groups them into 12
                  operational families. Training data is not used in the
                  zero-shot benchmark.
                </p>
              </div>
            </details>
            <details>
              <summary>
                <span>02 / How does routing work?</span>
                <ChevronDown size={17} />
              </summary>
              <div>
                <p>
                  Jev answers five independent typed questions in one request:
                  intent, operational family, urgency, security sensitivity, and
                  information sufficiency. Code compares the selected task’s
                  confidence (operational family or raw intent) with the
                  threshold. Security-sensitive cases use a gate of at least
                  0.97.
                </p>
                <p>
                  Below the gate, a configurable Anthropic reference model
                  classifies the message. With the safety net enabled, reference
                  confidence below the human gate sends the case to simulated
                  human review.
                </p>
                <p>
                  Reference confidence is self-reported and uncalibrated. Human
                  review assumes perfect benchmark-ground-truth correctness; its
                  cost and delay are assumptions.
                </p>
              </div>
            </details>
            <details>
              <summary>
                <span>03 / What does “cost” include?</span>
                <ChevronDown size={17} />
              </summary>
              <div>
                <p>
                  Total cost = inference + simulated human review + expected
                  decision errors + escalation overhead. Incorrect security
                  routes use the security error cost instead of the ordinary
                  error cost. Security ground truth is a proxy from six labeled
                  security intents.
                </p>
                <p>
                  All displayed dollar amounts are scenarios, not provider price
                  quotes or invoiced spend. Latency sums sequential model stages
                  and any simulated review delay. SLA constraints use mean
                  latency; p50 and p95 describe the case distribution.
                </p>
              </div>
            </details>
            <details>
              <summary>
                <span>04 / Can I reproduce this?</span>
                <ChevronDown size={17} />
              </summary>
              <div>
                <p>
                  Yes. Copy <code>.env.example</code> to <code>.env</code>, add
                  your Jev and reference credentials, then run{" "}
                  <code>npm run benchmark</code>. Raw outputs, returned model
                  versions, token counts, latencies, dataset hash, and prompt
                  version are saved. Import the resulting JSON here, or publish
                  it as the default run.
                </p>
                <p>
                  The frontier replays all unique confidence breakpoints. It
                  does not rerun model inference. Choosing the best test-set
                  threshold is exploratory analysis, not independent validation.
                </p>
              </div>
            </details>
            <div className="methodology-actions">
              <button
                className="button subtle small-button"
                onClick={() => download(run, `${run.id}.json`)}
              >
                <Download size={14} /> Download current run
              </button>
              <button
                className="text-button"
                onClick={() =>
                  download(
                    {
                      threshold,
                      human,
                      advanced,
                      assumptions: a,
                      selected,
                      baselines,
                      optimal: best ?? null,
                    },
                    "frontier-scenario.json",
                  )
                }
              >
                Export scenario <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="provenance mono">
              <div>
                <span>DATASET</span>
                <a
                  href="https://github.com/PolyAI-LDN/task-specific-datasets/tree/master/banking_data"
                  target="_blank"
                  rel="noreferrer"
                >
                  BANKING77 / PolyAI <ExternalLink size={11} />
                </a>
              </div>
              <div>
                <span>JEV</span>
                <span>{run.models.jev}</span>
              </div>
              <div>
                <span>REFERENCE</span>
                <span>{run.models.llm}</span>
              </div>
              <div>
                <span>RUN DATE</span>
                <span>
                  {run.timestamp
                    ? new Date(run.timestamp).toISOString().slice(0, 10)
                    : "Not run · illustrative fixtures"}
                </span>
              </div>
            </div>
          </div>
        </section>
        <div className="closing-line">
          <span className="micro">
            AN EXPERIMENT IN INTELLIGENCE ALLOCATION
          </span>
          <p>
            Better AI architecture starts
            <br />
            with a better <em>question.</em>
          </p>
          <a href="#frontier" className="button primary">
            Move the line <ArrowUpRight size={16} />
          </a>
        </div>
      </main>
      <footer>
        <a href="https://ankitkapoor.me" className="footer-name">
          A project by Ankit Kapoor <ArrowUpRight size={13} />
        </a>
        <span>BUILT TO QUESTION THE DEFAULT.</span>
        <a href={REPO} target="_blank" rel="noreferrer">
          <Github size={15} /> Source code
        </a>
      </footer>
      {live && <LiveLab onClose={() => setLive(false)} />}
      {notice && (
        <div className="toast" role="status">
          <Info size={16} />
          {notice}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
