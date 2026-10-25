import { readFile, writeFile } from "node:fs/promises";
import {
  calibration,
  defaults,
  evaluate,
  frontier,
  optimal,
  validateRun,
} from "../shared/engine.ts";
const path = process.argv[2] || "public/benchmark.json";
const run = validateRun(JSON.parse(await readFile(path, "utf8")));
if (run.kind !== "measured")
  throw new Error("A benchmark report requires a measured run.");
const p = (value: number) => (value * 100).toFixed(2) + "%";
const currency = (value: number) => "$" + value.toFixed(2);
const rows = (advanced: boolean) =>
  [
    ["Jev only", evaluate(run.cases, 0, defaults, false, "jev", advanced)],
    [
      "Reference only",
      evaluate(run.cases, 0, defaults, false, "llm", advanced),
    ],
    [
      "Hybrid at T=0.78",
      evaluate(run.cases, 0.78, defaults, false, "hybrid", advanced),
    ],
    [
      "Hybrid + simulated human at T=0.78",
      evaluate(run.cases, 0.78, defaults, true, "hybrid", advanced),
    ],
  ] as const;
let text = `# Recorded BANKING77 benchmark\n\nRun \`${run.id}\` · ${run.timestamp} · **${run.cases.length.toLocaleString()} official test queries**.\n\n- Jev: \`${run.models.jev}\`\n- Reference: \`${run.models.llm}\`\n- Source revision: \`${run.datasetRevision}\`\n- Dataset SHA-256: \`${run.datasetSha256}\`\n- Prompt version: \`${run.promptVersion}\`\n\nThese are measured API classifications. Dollar figures below are scenarios under the application's default unit costs, not measured provider invoices. Human review is simulated with perfect ground-truth accuracy.\n`;
for (const advanced of [false, true]) {
  const cal = calibration(run.cases, advanced);
  text += `\n## ${advanced ? "Original 77 intents" : "Primary 12 operational workflows"}\n\n| Architecture | Accuracy | Jev handled | Reference handled | Human reviewed | Expected total / 1,000 | Median path latency |\n|---|---:|---:|---:|---:|---:|---:|\n`;
  for (const [name, m] of rows(advanced))
    text += `| ${name} | ${p(m.accuracy)} | ${p(m.jevRate)} | ${p(m.llmRate)} | ${p(m.humanRate)} | ${currency(m.totalCost)} | ${m.p50.toFixed(0)} ms |\n`;
  text += `\nJev expected calibration error: **${p(cal.ece)}**. Multiclass raw-intent Brier score: **${cal.brier.toFixed(4)}**.\n`;
  const best = optimal(frontier(run.cases, defaults, true, advanced), defaults);
  text += best
    ? `\nThe exploratory minimum-cost feasible hybrid policy under the default constraints uses threshold **${best.threshold.toPrecision(7)}**, reaches **${p(best.accuracy)}** accuracy, and has scenario cost **${currency(best.totalCost)} / 1,000**. It routes **${p(best.jevRate)}** to Jev, **${p(best.llmRate)}** to the reference model, and **${p(best.humanRate)}** to simulated human review.\n`
    : "\nNo hybrid policy meets all default accuracy, latency, human-review, and automation constraints.\n";
}
const usage = (model: "jev" | "llm", key: "input_tokens" | "output_tokens") =>
  run.cases.reduce((s, c) => s + (c[model].usage?.[key] || 0), 0);
text += `\n## Reproduction and limitations\n\nRecorded usage: Jev ${usage("jev", "input_tokens").toLocaleString()} input / ${usage("jev", "output_tokens").toLocaleString()} output tokens; reference ${usage("llm", "input_tokens").toLocaleString()} input / ${usage("llm", "output_tokens").toLocaleString()} output tokens. Provider billing rules can differ, including caching and free-output allowances.\n\nRun \`npm run benchmark -- --run-id independent-run --concurrency 4\` with your own credentials, then \`node analysis/report.ts data/runs/independent-run/benchmark.json\`. Reproduction repeats API inference and incurs provider charges. The checked-in JSON can be replayed without inference. Provider results may vary across reruns.\n\nThreshold selection on the test set is exploratory. These results do not establish a policy validated on independent data. Reference confidence is self-reported; security labels are a published intent-based proxy. See [methodology](methodology.md) and the run's notes.\n`;
const target = process.argv[3] || "docs/benchmark-report.md";
await writeFile(target, text);
console.log(`Report saved to ${target}`);
