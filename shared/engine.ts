import taxonomy from "../data/taxonomy.json" with { type: "json" };
import type {
  Assumptions,
  Architecture,
  Case,
  Metrics,
  Outcome,
  Run,
} from "./types.ts";
export const families = taxonomy as Record<string, string[]>;
export const familyOf = (label: string): string =>
  Object.entries(families).find(([, labels]) => labels.includes(label))?.[0] ??
  label;
export const confidenceOf = (c: Case, advanced = false) =>
  advanced ? c.jev.confidence : (c.jev.familyConfidence ?? c.jev.confidence);
export const pretty = (s: string) =>
  s.replace(/[?_]/g, " ").replace(/^./, (c) => c.toUpperCase());
export const defaults: Assumptions = {
  jevCost: 0.0001,
  llmCost: 0.012,
  humanCost: 6,
  errorCost: 8,
  securityErrorCost: 100,
  escalationCost: 0,
  overhead: 0,
  humanLatencyMs: 180000,
  humanGate: 0.85,
  accuracyFloor: 0.95,
  maxHumanRate: 0.2,
  latencySla: 30000,
  automationFloor: 0.6,
};
export function outcome(
  c: Case,
  threshold: number,
  a: Assumptions,
  human: boolean,
  architecture: Architecture = "hybrid",
  advanced = false,
): Outcome {
  const gate =
    c.securityProbability >= 0.85 ? Math.max(threshold, 0.97) : threshold;
  const handler =
    architecture === "human"
      ? "human"
      : architecture === "jev"
        ? "jev"
        : architecture === "llm"
          ? "llm"
          : confidenceOf(c, advanced) >= gate
            ? "jev"
            : human && c.llm.confidence < a.humanGate
              ? "human"
              : "llm";
  const prediction = handler === "human" ? c.truth : c[handler].label;
  const truth = advanced ? c.truth : familyOf(c.truth);
  const predicted =
    handler === "human" || advanced
      ? advanced
        ? prediction
        : familyOf(prediction)
      : (c[handler].family ?? familyOf(prediction));
  const correct = predicted === truth;
  const usesJev = architecture === "jev" || architecture === "hybrid";
  const usesLlm =
    architecture === "llm" || (architecture === "hybrid" && handler !== "jev");
  return {
    handler,
    prediction: predicted,
    correct,
    latencyMs:
      (usesJev ? c.jev.latencyMs : 0) +
      (usesLlm ? c.llm.latencyMs : 0) +
      (handler === "human" ? a.humanLatencyMs : 0),
    inference: (usesJev ? a.jevCost : 0) + (usesLlm ? a.llmCost : 0),
    review: handler === "human" ? a.humanCost : 0,
    error: correct ? 0 : c.security ? a.securityErrorCost : a.errorCost,
    escalation: usesLlm && architecture === "hybrid" ? a.escalationCost : 0,
  };
}
export function quantile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const i = (sorted.length - 1) * p;
  return (
    sorted[Math.floor(i)] +
    (sorted[Math.ceil(i)] - sorted[Math.floor(i)]) * (i % 1)
  );
}
export function evaluate(
  cases: Case[],
  threshold: number,
  a: Assumptions,
  human = true,
  architecture: Architecture = "hybrid",
  advanced = false,
): Metrics {
  const results = cases.map((c) =>
    outcome(c, threshold, a, human, architecture, advanced),
  );
  const n = results.length || 1;
  const sum = (
    key: "inference" | "review" | "error" | "escalation" | "latencyMs",
  ) => results.reduce((v, r) => v + r[key], 0);
  const inferenceCost = (sum("inference") / n) * 1000,
    reviewCost = (sum("review") / n) * 1000,
    errorCost = (sum("error") / n) * 1000,
    escalationCost = (sum("escalation") / n) * 1000;
  return {
    threshold,
    count: results.length,
    accuracy: results.filter((r) => r.correct).length / n,
    jevRate: results.filter((r) => r.handler === "jev").length / n,
    llmRate: results.filter((r) => r.handler === "llm").length / n,
    humanRate: results.filter((r) => r.handler === "human").length / n,
    inferenceCost,
    reviewCost,
    errorCost,
    escalationCost,
    totalCost:
      inferenceCost +
      reviewCost +
      errorCost +
      escalationCost +
      a.overhead * 1000,
    errors: (results.filter((r) => !r.correct).length / n) * 1000,
    p50: quantile(
      results.map((r) => r.latencyMs),
      0.5,
    ),
    p95: quantile(
      results.map((r) => r.latencyMs),
      0.95,
    ),
    meanLatency: sum("latencyMs") / n,
  };
}
export function frontier(
  cases: Case[],
  a: Assumptions,
  human: boolean,
  advanced = false,
): Metrics[] {
  // Exact breakpoints preserve every possible allocation; no inference is repeated.
  const thresholds = [
    ...new Set([
      0,
      1,
      ...cases.flatMap((c) => [
        confidenceOf(c, advanced),
        Math.min(1, confidenceOf(c, advanced) + 0.000001),
      ]),
    ]),
  ].sort((x, y) => x - y);
  return thresholds.map((t) =>
    evaluate(cases, t, a, human, "hybrid", advanced),
  );
}
export function pareto(points: Metrics[]) {
  return points
    .filter(
      (p) =>
        !points.some(
          (q) =>
            q.totalCost <= p.totalCost &&
            q.accuracy >= p.accuracy &&
            (q.totalCost < p.totalCost || q.accuracy > p.accuracy),
        ),
    )
    .sort((a, b) => a.totalCost - b.totalCost);
}
export function optimal(
  points: Metrics[],
  a: Assumptions,
): Metrics | undefined {
  return points
    .filter(
      (p) =>
        p.accuracy >= a.accuracyFloor &&
        p.humanRate <= a.maxHumanRate &&
        p.meanLatency <= a.latencySla &&
        1 - p.humanRate >= a.automationFloor,
    )
    .sort((a, b) => a.totalCost - b.totalCost)[0];
}
export function calibration(cases: Case[], advanced = false) {
  const bins = Array.from({ length: 10 }, (_, i) => {
    const rows = cases.filter(
      (c) => Math.min(9, Math.floor(confidenceOf(c, advanced) * 10)) === i,
    );
    const n = rows.length;
    const accuracy = n
      ? rows.filter((c) =>
          advanced
            ? c.jev.label === c.truth
            : (c.jev.family ?? familyOf(c.jev.label)) === familyOf(c.truth),
        ).length / n
      : 0;
    return {
      lower: i / 10,
      count: n,
      confidence: n
        ? rows.reduce((s, c) => s + confidenceOf(c, advanced), 0) / n
        : 0,
      accuracy,
    };
  });
  const ece = bins.reduce(
    (s, b) =>
      s + (b.count / (cases.length || 1)) * Math.abs(b.accuracy - b.confidence),
    0,
  );
  // Multiclass Brier uses the full 77-intent probability vector, not confidence.
  const brier =
    cases.reduce(
      (s, c) =>
        s +
        Object.entries(c.jev.probabilities).reduce(
          (v, [label, p]) => v + (p - Number(label === c.truth)) ** 2,
          0,
        ),
      0,
    ) / (cases.length || 1);
  return { bins, ece, brier };
}
export function validateRun(value: unknown): Run {
  if (!value || typeof value !== "object")
    throw new Error("Expected a benchmark JSON object.");
  const r = value as Run;
  if (
    r.schemaVersion !== 1 ||
    !["simulation", "measured"].includes(r.kind) ||
    !Array.isArray(r.cases) ||
    !r.cases.length ||
    r.cases.length > 15000 ||
    !r.models ||
    typeof r.models.jev !== "string" ||
    typeof r.models.llm !== "string" ||
    typeof r.dataset !== "string" ||
    !Array.isArray(r.notes)
  )
    throw new Error(
      "Invalid run metadata or cases. See the documented benchmark schema.",
    );
  const known = new Set(Object.values(families).flat()),
    ids = new Set<string>();
  for (const c of r.cases) {
    if (
      !c ||
      typeof c.id !== "string" ||
      ids.has(c.id) ||
      typeof c.text !== "string" ||
      !known.has(c.truth) ||
      typeof c.security !== "boolean" ||
      !Number.isFinite(c.securityProbability) ||
      c.securityProbability < 0 ||
      c.securityProbability > 1
    )
      throw new Error("Invalid or duplicate case.");
    ids.add(c.id);
    for (const p of [c.jev, c.llm]) {
      if (
        !p ||
        !known.has(p.label) ||
        !Number.isFinite(p.confidence) ||
        p.confidence < 0 ||
        p.confidence > 1 ||
        !Number.isFinite(p.latencyMs) ||
        p.latencyMs < 0 ||
        typeof p.model !== "string" ||
        (p.family && !Object.hasOwn(families, p.family)) ||
        (p.familyConfidence !== undefined &&
          (!Number.isFinite(p.familyConfidence) ||
            p.familyConfidence < 0 ||
            p.familyConfidence > 1)) ||
        !p.probabilities ||
        typeof p.probabilities !== "object"
      )
        throw new Error(`Invalid prediction in ${c.id}.`);
      const entries = Object.entries(p.probabilities);
      if (
        !entries.length ||
        entries.some(
          ([k, v]) => !known.has(k) || !Number.isFinite(v) || v < 0 || v > 1,
        ) ||
        Math.abs(entries.reduce((s, [, v]) => s + v, 0) - 1) > 0.01 ||
        !Object.hasOwn(p.probabilities, c.truth)
      )
        throw new Error(`Invalid probability distribution in ${c.id}.`);
    }
  }
  if (
    r.kind === "measured" &&
    (!r.timestamp ||
      !Number.isFinite(Date.parse(r.timestamp)) ||
      !r.datasetSha256 ||
      !r.promptVersion ||
      !r.datasetRevision)
  )
    throw new Error(
      "Measured runs require timestamp, dataset hash, revision, and prompt version.",
    );
  return r;
}
