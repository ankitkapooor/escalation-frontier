import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { validateRun } from "../shared/engine.ts";
import { parseCsv } from "../experiments/run.ts";
test("published results contain 1,270 genuine completed cases and disclose partial coverage", async () => {
  const run = validateRun(
    JSON.parse(
      await readFile(
        new URL("../public/benchmark.json", import.meta.url),
        "utf8",
      ),
    ),
  );
  const rows = parseCsv(
    await readFile(
      new URL("../data/banking77-test.csv", import.meta.url),
      "utf8",
    ),
  ).slice(1);
  assert.equal(run.kind, "measured");
  assert.equal(run.cases.length, 1270);
  assert.equal(new Set(run.cases.map((c) => c.truth)).size, 32);
  assert.ok(run.notes.some((n) => n.includes("not a representative")));
  for (const c of run.cases) {
    const index = Number(c.id.split("-").at(-1));
    assert.equal(c.text, rows[index][0]);
    assert.equal(c.truth, rows[index][1]);
    assert.equal((c.jev.raw as { model: string }).model, c.jev.model);
    assert.equal((c.llm.raw as { model: string }).model, c.llm.model);
  }
});
test("benchmark defaults to 25 cases and refuses large runs without explicit opt-in", () => {
  const result = JSON.parse(
    execFileSync(process.execPath, ["experiments/run.ts", "--dry-run"], {
      encoding: "utf8",
    }),
  );
  assert.equal(result.selected, 25);
  assert.equal(result.requests, 50);
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        ["experiments/run.ts", "--limit", "101", "--dry-run"],
        { stdio: "pipe" },
      ),
    /Command failed/,
  );
});
