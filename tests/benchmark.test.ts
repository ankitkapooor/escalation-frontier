import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runConcurrent, checkpoint } from "../experiments/run.ts";
test("benchmark concurrency is bounded and drains completed in-flight work", async () => {
  let active = 0,
    peak = 0;
  const completed: number[] = [];
  await runConcurrent([0, 1, 2, 3, 4, 5], 2, async (i) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 3));
    completed.push(i);
    active--;
  });
  assert.equal(peak, 2);
  assert.deepEqual(completed.sort(), [0, 1, 2, 3, 4, 5]);
});
test("benchmark failure stops dispatch and awaits in-flight checkpoints", async () => {
  const started: number[] = [],
    completed: number[] = [];
  await assert.rejects(
    runConcurrent([0, 1, 2, 3], 2, async (i) => {
      started.push(i);
      if (i === 0) throw new Error("provider unavailable");
      await new Promise((r) => setTimeout(r, 3));
      completed.push(i);
    }),
    /provider unavailable/,
  );
  assert.deepEqual(started, [0, 1]);
  assert.deepEqual(completed, [1]);
});
test("provider checkpoints prevent repeated paid calls, and corrupt files fail closed", async () => {
  const dir = await mkdtemp(join(tmpdir(), "frontier-checkpoint-"));
  const file = join(dir, "case.json");
  let calls = 0;
  const create = async () => {
    calls++;
    return { label: "card_arrival" };
  };
  try {
    assert.deepEqual(await checkpoint(file, create), { label: "card_arrival" });
    assert.deepEqual(await checkpoint(file, create), { label: "card_arrival" });
    assert.equal(calls, 1);
    await writeFile(file, "corrupt");
    await assert.rejects(checkpoint(file, create));
    assert.equal(calls, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
