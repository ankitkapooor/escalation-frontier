import { readFile, mkdir, writeFile, appendFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { classifyJev, PROMPT_VERSION } from "../jev/client.ts";
import { classifyReference } from "../llm/client.ts";
import { familyOf, validateRun } from "../shared/engine.ts";
import type { Run, Case } from "../shared/types.ts";
const args = process.argv.slice(2);
function option(name: string, fallback: string) {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
}
// Minimal RFC4180 reader: preserves commas, quotes, and newlines inside fields.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("Unclosed CSV field");
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
async function main() {
  const csv = await readFile(
    new URL("../data/banking77-test.csv", import.meta.url),
    "utf8",
  );
  const rows = parseCsv(csv);
  const header = rows.shift()!;
  const ti = header.indexOf("text"),
    li = header.indexOf("category");
  const limit = Number(option("--limit", "3080"));
  if (!Number.isInteger(limit) || limit < 1 || limit > 3080)
    throw new Error("--limit must be between 1 and 3080.");
  const entries = rows.slice(0, limit);
  if (args.includes("--dry-run")) {
    console.log(
      JSON.stringify(
        {
          dataset: "BANKING77 official test",
          total: rows.length,
          selected: entries.length,
          sha256: createHash("sha256").update(csv).digest("hex"),
          promptVersion: PROMPT_VERSION,
          questions: 5,
          requests: entries.length * 2,
          credentialsRequired: ["JEV_API_KEY", "REFERENCE_API_KEY"],
          note: "No API requests were made.",
        },
        null,
        2,
      ),
    );
    return;
  }
  if (!process.env.JEV_API_KEY || !process.env.REFERENCE_API_KEY)
    throw new Error(
      "Copy .env.example to .env and enter JEV_API_KEY and REFERENCE_API_KEY before running the benchmark.",
    );
  const runId = option(
    "--run-id",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
  if (!/^[a-zA-Z0-9_-]+$/.test(runId)) throw new Error("Invalid run id.");
  const path = resolve("data/runs", runId);
  await mkdir(path, { recursive: true });
  const run: Run = {
    schemaVersion: 1,
    kind: "measured",
    id: runId,
    timestamp: new Date().toISOString(),
    dataset: `BANKING77 · official test split (${entries.length}/3080)`,
    datasetRevision: "9d081458ff52e53cf7e848f414e6e9344e4e6696",
    datasetSha256: createHash("sha256").update(csv).digest("hex"),
    promptVersion: PROMPT_VERSION,
    models: {
      jev: process.env.JEV_MODEL || "jev-1.13.0",
      llm: process.env.REFERENCE_MODEL || "claude-sonnet-4-5-20250929",
    },
    cases: [],
    notes: [
      "Zero-shot evaluation; no training examples used. Threshold sweeps are exploratory test-set analysis, not a validated production policy.",
      "Reference model confidence is self-reported and uncalibrated. Simulated human review assumes ground-truth correctness.",
      "Costs are hypothetical editable unit-cost assumptions; measured token usage and raw responses are retained per case.",
      "Security ground truth is a proxy from six security-related BANKING77 intents, not a separately annotated fraud label.",
    ],
  };
  const manifest = {
    datasetSha256: run.datasetSha256,
    promptVersion: run.promptVersion,
    models: run.models,
  };
  try {
    const old = JSON.parse(await readFile(`${path}/manifest.json`, "utf8"));
    if (JSON.stringify(old) !== JSON.stringify(manifest))
      throw new Error(
        "Resume configuration differs from the stored run. Use a new --run-id.",
      );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    await writeFile(`${path}/manifest.json`, JSON.stringify(manifest, null, 2));
  }
  const cached = new Map<string, Case>();
  try {
    for (const line of (await readFile(`${path}/cases.jsonl`, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)) {
      const c = JSON.parse(line) as Case;
      cached.set(c.id, c);
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  for (const [i, row] of entries.entries()) {
    const id = `banking77-test-${String(i).padStart(4, "0")}`;
    if (cached.has(id)) {
      run.cases.push(cached.get(id)!);
      continue;
    }
    const text = row[ti],
      truth = row[li];
    const j = await classifyJev(text, process.env.JEV_API_KEY!);
    const llm = await classifyReference(text, process.env.REFERENCE_API_KEY!);
    const c: Case = {
      id,
      text,
      truth,
      security: familyOf(truth) === "Security & fraud",
      ...j,
      jev: j.prediction,
      llm,
    };
    // Never include credentials in recorded requests or outputs.
    delete (c as Case & { prediction?: unknown }).prediction;
    validateRun({ ...run, cases: [c] });
    await appendFile(`${path}/cases.jsonl`, JSON.stringify(c) + "\n");
    run.cases.push(c);
    console.log(`${i + 1}/${entries.length} ${id}`);
  }
  run.models = { jev: run.cases[0].jev.model, llm: run.cases[0].llm.model };
  validateRun(run);
  await writeFile(`${path}/benchmark.json`, JSON.stringify(run));
  console.log(
    `Saved ${path}/benchmark.json. Import it in the workbench, or copy it to public/benchmark.json and rebuild to publish.`,
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)
)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
