# Benchmark JSON schema v1

The authoritative TypeScript contract is `shared/types.ts`. Uploads are validated in `shared/engine.ts` before rendering. Maximum 15,000 cases and 30 MB per uploaded file. Each case ID must be unique.

Run fields: `schemaVersion: 1`, `kind: "measured" | "simulation"`, `id`, ISO `timestamp` (null only for simulations), `dataset`, `datasetRevision`, `datasetSha256`, `promptVersion`, `models: {jev, llm}`, `notes: string[]`, `cases: Case[]`.

Each case has `id`, `text`, `truth` (an original BANKING77 category), `security` (intent-derived ground-truth proxy), `securityProbability` (Jev Noul output), optional `urgency` and `sufficiency`, and `jev`/`llm` predictions.

Prediction fields: `label`, optional `family` and `familyConfidence`, `confidence`, `probabilities`, `latencyMs`, `model`, optional `usage: {input_tokens, output_tokens}`, optional `raw` (unaltered provider response). Probabilities must be finite, in [0,1], and sum to one within 0.01. The vector must include the truth label. The runner stores all 77 keys. Reference vectors are one-hot schema placeholders, not estimated class distributions; calibration uses Jev vectors only.

The public UI treats imported files as user-supplied evidence. The schema validates structure and ranges; it cannot attest that an uploaded run was actually produced by a provider. Do not publish arbitrary uploads as verified experiments without reviewing provenance.

For an example, inspect `public/demo.json`; its `kind: "simulation"` designation is essential and must not be changed to make it appear empirical.
