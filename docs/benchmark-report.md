# Recorded BANKING77 benchmark

Run `banking77-partial-1270-2026-10-25` · 2026-10-25T09:39:11.309Z · **1,270 official test queries**.

- Jev: `jev-1.13.0`
- Reference: `claude-sonnet-4-5-20250929`
- Source revision: `9d081458ff52e53cf7e848f414e6e9344e4e6696`
- Dataset SHA-256: `d12d6e3bc4c3103966ae786dc435913c0c563dfa328f5a3646d0e62cfeeb474d`
- Prompt version: `routing-v1`

These are measured API classifications. Dollar figures below are scenarios under the application's default unit costs, not measured provider invoices. Human review is simulated with perfect ground-truth accuracy.

## Primary 12 operational workflows

| Architecture | Accuracy | Jev handled | Reference handled | Human reviewed | Expected total / 1,000 | Median path latency |
|---|---:|---:|---:|---:|---:|---:|
| Jev only | 90.16% | 100.00% | 0.00% | 0.00% | $1149.71 | 90 ms |
| Reference only | 91.73% | 0.00% | 100.00% | 0.00% | $818.30 | 1226 ms |
| Hybrid at T=0.78 | 91.89% | 87.64% | 12.36% | 0.00% | $867.73 | 93 ms |
| Hybrid + simulated human at T=0.78 | 92.44% | 87.64% | 9.92% | 2.44% | $970.09 | 93 ms |

Jev expected calibration error: **3.67%**. Multiclass raw-intent Brier score: **0.3084**.

No hybrid policy meets all default accuracy, latency, human-review, and automation constraints.

## Original 77 intents

| Architecture | Accuracy | Jev handled | Reference handled | Human reviewed | Expected total / 1,000 | Median path latency |
|---|---:|---:|---:|---:|---:|---:|
| Jev only | 79.76% | 100.00% | 0.00% | 0.00% | $2270.97 | 90 ms |
| Reference only | 81.57% | 0.00% | 100.00% | 0.00% | $1775.78 | 1226 ms |
| Hybrid at T=0.78 | 82.36% | 77.64% | 22.36% | 0.00% | $1703.57 | 96 ms |
| Hybrid + simulated human at T=0.78 | 84.88% | 77.64% | 18.19% | 4.17% | $1752.39 | 96 ms |

Jev expected calibration error: **9.00%**. Multiclass raw-intent Brier score: **0.3084**.

No hybrid policy meets all default accuracy, latency, human-review, and automation constraints.

## Reproduction and limitations

Partial run: 1270 completed queries covering 32 of 77 intents. Stopped at the owner's request; no further inference is needed to explore these results.

Cases follow BANKING77's original, intent-grouped test order. This is not a representative sample of the full dataset and must not be presented as full BANKING77 performance.

Zero-shot prompts; no training examples. Two matching smoke cases were reused. Four cases processed concurrently; each case calls Jev then the reference model.

Threshold optimization on this subset is exploratory, not independent validation.

Reference confidence is self-reported. Human review is simulated using ground truth, with explicit cost and delay.

Dollar amounts are editable scenario assumptions, not invoiced provider spend. Security error labels are proxies from six security-related intents.

Provider-returned probability mass may differ from 1 by up to 0.01 due to rounding; raw outputs are preserved.

Recorded usage: Jev 3,078,837 input / 1,261,779 output tokens; reference 1,707,532 input / 72,010 output tokens. Provider billing rules can differ, including caching and free-output allowances.

Regenerate this report offline with `node analysis/report.ts public/benchmark.json`. An optional new paid smoke run is `npm run benchmark -- --limit 25 --run-id small-run`. Only a new inference run incurs provider charges; report generation and replay are offline. The checked-in JSON can be replayed without inference. Provider results may vary across reruns.

Threshold selection on the test set is exploratory. These results do not establish a policy validated on independent data. Reference confidence is self-reported; security labels are a published intent-based proxy. See [methodology](methodology.md) and the run's notes.
