# Methodology

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

Replays use exact unique confidence values plus an infinitesimal step above each value, as well as 0 and 1. This captures all allocations reachable with a threshold in [0,1], including inclusive gate boundaries. The Pareto boundary removes policies dominated in both total cost and accuracy. Ties can remain equivalent policies. The scenario optimizer chooses the minimum-cost **hybrid** policy meeting accuracy, mean latency, maximum human-review rate, and minimum automation constraints. It reports infeasibility rather than relaxing constraints. Fixed Jev, reference, and human baselines remain visible for comparison.

Selecting a threshold on the test split is exploratory analysis. Confirmatory claims require choosing policy settings on separate validation data and evaluating on untouched held-out data. Small imported runs are not substitutes for the complete test split. The bundled illustration supports no empirical conclusions.

## Metrics

- Accuracy: fraction of cases correctly classified at the chosen granularity.
- Allocation: final handler rates; automated = Jev + reference.
- Errors / 1,000: `(1 − accuracy) × 1,000`.
- Latency: sum measured model round trips along each simulated path plus assumed human review time. Includes retries if incurred; excludes offline serialization/queue overhead. p50/p95 use linear interpolation; SLA uses mean latency.
- Expected calibration error: ten equal-width confidence bins, sample-weighted absolute difference between mean confidence and observed correctness. Empty bins contribute zero.
- Multiclass Brier: mean sum of squared errors between Jev's full raw-intent probability vector and the one-hot ground truth. Range [0,2]. Always intent-level, even when the main view scores operational families.

## Provenance and limitations

A run records source revision, CSV SHA-256, prompt version, configured/returned model names, ISO timestamp, raw provider outputs, per-case token usage and measured latency. Runs checkpoint completed pairs of model calls. A failure after the first model but before completing the pair may repeat that first call on resume; completed pairs are reused. Models may remain nondeterministic even at fixed settings. Pinned aliases may be unavailable to some keys; configure an accessible version explicitly.

Costs, human accuracy, security proxies, self-reported reference confidence, and serial latency are assumptions that limit how the experiment generalizes. No real customer data is collected. Interaction events are dispatched locally as `frontier:interaction` browser events; no analytics provider or visitor-tracking endpoint is enabled by default.

## Sources

- [Official TypeSafe System One API](https://docs.typesafe.ai/api/system-one)
- [TypeSafe confidence](https://docs.typesafe.ai/confidence)
- [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages)
- [PolyAI BANKING77 source](https://github.com/PolyAI-LDN/task-specific-datasets/tree/9d081458ff52e53cf7e848f414e6e9344e4e6696/banking_data)
