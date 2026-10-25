# Methodology

## Published evidence

The published artifact contains **1,270 measured cases covering 32 of 77 intents**. The run was stopped at the owner’s request. Cases follow the original intent-grouped test order; this is not a representative full-dataset benchmark. No further inference is needed to replay these results. The original simulated illustration remains available only as a fallback fixture.

## Task and data

Zero-shot banking support classification on the official BANKING77 test split. No training examples are used. Primary scoring uses a published 12-family operational taxonomy; advanced scoring uses the original 77 labels. The benchmark does not execute banking actions or generate customer responses.

Jev makes five independent judgments against the same message in one request: intent (Choice), operational family (Choice), urgency (Score), security-sensitive (Noul), and information sufficiency (Score). Questions are versioned in `jev/client.ts`. Family scoring gates on the family question's confidence. Intent scoring gates on the intent question's confidence. The exact raw probabilities remain available. Urgency and sufficiency are exposed in saved results but do not alter the MVP gate.

The reference model classifies the same message independently through a forced Anthropic tool. No ground truth is sent to either model. Reference confidence is self-reported; it is not a verified or calibrated probability. Its model ID is configurable in `REFERENCE_MODEL`. No chain of thought is requested or displayed.

## Policies

1. Jev only: always use Jev, including for security cases.
2. Reference only: always use the reference model, with no human fallback.
3. Jev → reference: accept Jev at confidence ≥ threshold; otherwise escalate.
4. Jev → reference → simulated human: same gate, then human review when reference confidence is below the editable human gate (default 0.85).

If predicted security probability is ≥0.85, hybrid policies raise the Jev gate to `max(threshold, 0.97)`. This uses a model signal, not ground truth. Ground-truth security status is used **only to price mistakes**, never to route them. The proxy marks the six intents published under `Security & fraud` in the taxonomy; BANKING77 does not provide independent fraud annotations.

Human review is simulated using the ground-truth label: 100% correct by assumption. Default human delay is 180 seconds, adjustable. This idealized baseline does not model human error or queueing.

## Economics

Every reported dollar figure is a scenario estimate using editable per-call costs:

`total / 1,000 = model inference + human review + expected error loss + escalation overhead`

An escalated case pays for both model calls. A human case in the cascade pays for Jev, reference, and review. An ordinary error pays `errorCost`; an error on a security-proxy case pays `securityErrorCost` **instead**, not both. Escalation overhead applies to each hybrid reference call. Baselines pay only their own stages. The optional internal infrastructure-overhead field is zero in the UI's MVP assumptions.

Offline benchmark spend is different from simulated policy spend: both models evaluate every case offline so policies can be replayed without further calls. Provider token usage is retained; this workbench does not claim the example prices match a provider invoice.

## Threshold analysis and constraints

Replays use exact unique confidence values, midpoints between neighboring values, and endpoints 0 and 1. Midpoints represent strict-above policies without hiding an epsilon in the displayed threshold. This captures all allocations reachable with a threshold in [0,1], including inclusive gate boundaries. The Pareto boundary removes policies dominated in both total cost and accuracy. Ties can remain equivalent policies. The scenario optimizer chooses the minimum-cost **hybrid** policy meeting accuracy, mean latency, maximum human-review rate, and minimum automation constraints. It reports infeasibility rather than relaxing constraints. Fixed Jev, reference, and human baselines remain visible for comparison.

Selecting a threshold on the test split is exploratory analysis. Confirmatory claims require choosing policy settings on separate validation data and evaluating on untouched held-out data. Small imported runs are not substitutes for the complete test split. The bundled illustration supports no empirical conclusions.

## Metrics

- Accuracy: fraction of cases correctly classified at the chosen granularity.
- Allocation: final handler rates; automated = Jev + reference.
- Errors / 1,000: `(1 − accuracy) × 1,000`.
- Latency: sum measured model round trips along each simulated path plus assumed human review time. Includes retries if incurred; excludes offline serialization/queue overhead. p50/p95 use linear interpolation; SLA uses mean latency.
- Expected calibration error: ten equal-width confidence bins, sample-weighted absolute difference between mean confidence and observed correctness. Empty bins contribute zero.
- Multiclass Brier: mean sum of squared errors between Jev's full raw-intent probability vector and the one-hot ground truth. Range [0,2]. Provider-returned probabilities are retained without normalization; validation tolerates up to 0.01 total-mass rounding error plus floating-point epsilon. Always intent-level, even when the main view scores operational families.

## Provenance and limitations

A run records source revision, CSV SHA-256, prompt version, configured/returned model names, ISO timestamp, raw provider outputs, per-case token usage and measured latency. Runs checkpoint each provider result atomically, then serialize completed pairs. Both provider results and completed pairs are reused on resume. The default runner processes four cases concurrently; calls within each case remain sequential. Models may remain nondeterministic even at fixed settings. Pinned aliases may be unavailable to some keys; configure an accessible version explicitly.

Costs, human accuracy, security proxies, self-reported reference confidence, and serial latency are assumptions that limit how the experiment generalizes. No real customer data is collected. Interaction events are dispatched locally as `frontier:interaction` browser events; no analytics provider or visitor-tracking endpoint is enabled by default.

## Sources

- [Official TypeSafe System One API](https://docs.typesafe.ai/api/system-one)
- [TypeSafe confidence](https://docs.typesafe.ai/confidence)
- [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages)
- [PolyAI BANKING77 source](https://github.com/PolyAI-LDN/task-specific-datasets/tree/9d081458ff52e53cf7e848f414e6e9344e4e6696/banking_data)
