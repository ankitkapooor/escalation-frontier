import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  defaults,
  evaluate,
  outcome,
  frontier,
  pareto,
  optimal,
  calibration,
  validateRun,
  families,
  confidenceOf,
} from "../shared/engine.ts";
import { parseCsv } from "../experiments/run.ts";
import type { Case, Prediction } from "../shared/types.ts";
const labels = Object.values(families).flat();
function pred(label: string, confidence: number): Prediction {
  return {
    label,
    confidence,
    latencyMs: 100,
    model: "test",
    probabilities: Object.fromEntries(
      labels.map((l) => [l, Number(l === label)]),
    ),
  };
}
const c: Case = {
  id: "test",
  text: "My card is not working",
  truth: "card_not_working",
  security: false,
  securityProbability: 0.1,
  jev: pred("card_not_working", 0.8),
  llm: pred("card_not_working", 0.95),
};
const a = {
  ...defaults,
  jevCost: 0.01,
  llmCost: 0.1,
  humanCost: 5,
  errorCost: 10,
  securityErrorCost: 100,
  humanLatencyMs: 1000,
};
test("taxonomy covers exactly 77 distinct intents", () => {
  assert.equal(labels.length, 77);
  assert.equal(new Set(labels).size, 77);
  assert.equal(Object.keys(families).length, 12);
});
test("confidence equal to gate is accepted", () => {
  assert.equal(outcome(c, 0.8, a, true).handler, "jev");
  assert.equal(outcome(c, 0.801, a, true).handler, "llm");
});
test("security signal enforces stricter gate without reading ground truth", () => {
  assert.equal(
    outcome({ ...c, securityProbability: 0.9 }, 0.2, a, false).handler,
    "llm",
  );
  assert.equal(outcome({ ...c, security: true }, 0.2, a, false).handler, "jev");
});
test("family confidence drives family scoring; intent confidence drives advanced scoring", () => {
  const row = {
    ...c,
    jev: {
      ...c.jev,
      family: "Card issues",
      familyConfidence: 0.95,
      confidence: 0.3,
    },
  };
  assert.equal(confidenceOf(row), 0.95);
  assert.equal(outcome(row, 0.8, a, false).handler, "jev");
  assert.equal(outcome(row, 0.8, a, false, "hybrid", true).handler, "llm");
});
test("family and raw intent scoring differ for closely related labels", () => {
  const row = { ...c, jev: pred("card_arrival", 0.95) };
  assert.equal(evaluate([row], 0.5, a, false).accuracy, 1);
  assert.equal(evaluate([row], 0.5, a, false, "hybrid", true).accuracy, 0);
});
test("human path pays both models, review cost, and sequential delay", () => {
  const row = { ...c, llm: pred("card_arrival", 0.4) };
  const r = outcome(row, 0.9, a, true);
  assert.equal(r.handler, "human");
  assert.equal(r.correct, true);
  assert.equal(r.inference, 0.11);
  assert.equal(r.review, 5);
  assert.equal(r.latencyMs, 1200);
  const m = evaluate([row], 0.9, a, true);
  assert.equal(m.totalCost, 5110);
  assert.equal(m.humanRate, 1);
});
test("security error replaces ordinary error cost", () => {
  const row = { ...c, security: true, jev: pred("request_refund", 0.99) };
  assert.equal(outcome(row, 0.5, a, false).error, 100);
  assert.equal(evaluate([row], 0.5, a, false).errorCost, 100000);
});
test("baselines do not pay unused stages", () => {
  assert.equal(outcome(c, 0, a, false, "llm").inference, 0.1);
  assert.equal(outcome(c, 0, a, false, "llm").latencyMs, 100);
  assert.equal(outcome(c, 0, a, false, "human").inference, 0);
  assert.equal(outcome(c, 0, a, false, "human").review, 5);
});
test("allocation fractions sum to one and per-1000 costs add up", () => {
  const cases = [
    c,
    { ...c, id: "b", jev: pred("request_refund", 0.4) },
    {
      ...c,
      id: "d",
      jev: pred("request_refund", 0.4),
      llm: pred("request_refund", 0.4),
    },
  ];
  const m = evaluate(cases, 0.8, a, true);
  assert.equal(m.jevRate + m.llmRate + m.humanRate, 1);
  assert.equal(
    m.totalCost,
    m.inferenceCost + m.reviewCost + m.errorCost + m.escalationCost,
  );
  assert.equal(m.p50, 200);
});
test("frontier includes every attainable policy around confidence breakpoints", () => {
  const points = frontier(
    [c, { ...c, id: "b", jev: pred("request_refund", 0.5) }],
    a,
    false,
  );
  assert.deepEqual(new Set(points.map((p) => p.jevRate)), new Set([0, 0.5, 1]));
  assert.ok(points.some((p) => p.threshold === 1));
});
test("Pareto removes dominated policies", () => {
  const base = evaluate([c], 0, a, false);
  const points = [
    { ...base, totalCost: 10, accuracy: 0.9 },
    { ...base, totalCost: 12, accuracy: 0.8 },
    { ...base, totalCost: 20, accuracy: 0.95 },
  ];
  assert.equal(pareto(points).length, 2);
});
test("optimizer reports impossible constraints instead of silently relaxing them", () => {
  const points = frontier([c], a, true);
  assert.equal(optimal(points, { ...a, latencySla: 1 }), undefined);
});
test("changing error costs can change the optimal threshold", () => {
  const rows = [{ ...c, jev: pred("request_refund", 0.8) }];
  const cheap = {
    ...a,
    jevCost: 0,
    llmCost: 2,
    errorCost: 1,
    accuracyFloor: 0,
    latencySla: 10000,
  };
  const expensive = { ...cheap, errorCost: 10 };
  assert.equal(optimal(frontier(rows, cheap, false), cheap)?.jevRate, 1);
  assert.equal(
    optimal(frontier(rows, expensive, false), expensive)?.jevRate,
    0,
  );
});
test("calibration measures empirical accuracy independently of confidence", () => {
  const result = calibration([c]);
  assert.ok(Math.abs(result.ece - 0.2) < 1e-8);
  assert.equal(result.brier, 0);
  const wrong = calibration([{ ...c, jev: pred("request_refund", 0.8) }]);
  assert.ok(Math.abs(wrong.ece - 0.8) < 1e-8);
  assert.equal(wrong.brier, 2);
});
test("CSV parser preserves quoted commas, escaped quotes, and multiline queries", () => {
  assert.deepEqual(
    parseCsv('text,category\r\n"a, b",x\n"say ""hi""\nnow",y\n'),
    [
      ["text", "category"],
      ["a, b", "x"],
      ['say "hi"\nnow', "y"],
    ],
  );
});
test("bundled data matches pinned official split; demo is explicitly a simulation", async () => {
  const csv = await readFile(
    new URL("../data/banking77-test.csv", import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(csv).digest("hex"),
    "d12d6e3bc4c3103966ae786dc435913c0c563dfa328f5a3646d0e62cfeeb474d",
  );
  assert.equal(parseCsv(csv.toString()).length - 1, 3080);
  const demo = validateRun(
    JSON.parse(
      await readFile(new URL("../public/demo.json", import.meta.url), "utf8"),
    ),
  );
  assert.equal(demo.kind, "simulation");
  assert.equal(demo.cases.length, 154);
  assert.equal(demo.timestamp, null);
  assert.throws(() => validateRun({ ...demo, kind: "measured" }));
  assert.throws(() =>
    validateRun({ ...demo, cases: [demo.cases[0], demo.cases[0]] }),
  );
  assert.throws(() =>
    validateRun({
      ...demo,
      cases: [
        { ...demo.cases[0], jev: { ...demo.cases[0].jev, confidence: NaN } },
      ],
    }),
  );
});
