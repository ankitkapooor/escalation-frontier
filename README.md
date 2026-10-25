# The Escalation Frontier

**How much intelligence should software buy?**

An interactive portfolio experiment by [Ankit Kapoor](https://ankitkapoor.me). Explore how a confidence gate allocates banking support decisions between Jev, a reasoning model, and simulated human review.

Designed for **escalation.ankitkapoor.me**. One Node service serves the React interface and the optional live Jev endpoint. No database, background worker, or paid API is needed to explore the illustration.

## Run locally

Requires Node.js 24 or later.

```sh
npm ci
cp .env.example .env
npm run build
npm start
```

Open http://localhost:3001. During frontend development, run `npm start` in one terminal and `npm run dev` in another; Vite proxies `/api` to port 3001.

## Add your Jev key

The placeholder is in [`.env.example`](.env.example). Copy it to `.env`, then manually enter:

```dotenv
JEV_API_KEY=your_key_here
JEV_MODEL=jev-1.13.0
LIVE_ACCESS_TOKEN=your_private_owner_access_token
```

On Railway, enter these under the service's **Variables** tab. `.env` is ignored by Git and excluded from Docker. Keys never enter the frontend bundle. The owner token unlocks the live decision dialog; it is kept only in React memory. Public visitors can explore all saved results without it. Live calls are limited to five per minute and 100 per day per server process. Restarting resets the in-memory counters; use one replica for this portfolio deployment.

## What works

- Interactive cost/accuracy chart, exact confidence breakpoints, Pareto boundary, and Jev/LLM/human baselines.
- Allocation bar, accuracy, inference/error/review cost breakdown, expected errors, p50/p95 latency.
- Editable business assumptions and operational constraints; minimum-cost feasible hybrid policy.
- Optional simulated human safety net and stricter gating for security signals.
- Searchable Failure Atlas, outcome filters, workflow filter, pagination, and probability inspector.
- Calibration bins, expected calibration error, multiclass intent Brier score.
- Operational-family and advanced 77-intent scoring.
- Benchmark JSON import, current-run download, scenario export, and threshold links.
- Optional real Jev evaluation through a protected server endpoint.
- Responsive desktop/mobile layouts, keyboard controls, dialog focus management, and reduced-motion support.

## Evidence status

**No empirical model benchmark is bundled.** The default illustration contains 154 real BANKING77 test messages with deterministic simulated predictions, confidence scores, and latencies. It is labeled throughout the UI. It is not evidence of Jev or reference-model performance. There is no fabricated run date.

The complete official **3,080-query test split** is bundled for the real benchmark. All dollar amounts in the workbench are editable scenario assumptions, not invoiced costs or provider price quotes. Simulated human review assumes perfect ground-truth correctness and an explicit cost and delay.

## Run a real benchmark

The reference adapter uses Anthropic's Messages API with a forced routing tool; set your chosen supported model and key:

```dotenv
REFERENCE_API_KEY=your_reference_key_here
REFERENCE_MODEL=claude-sonnet-4-5-20250929
```

Check configuration without making any API requests:

```sh
npm run benchmark:dry
```

Start with a small paid smoke run, then evaluate the full official split:

```sh
npm run benchmark -- --limit 10 --run-id smoke
npm run benchmark -- --run-id banking77-full
```

The full run makes **3,080 Jev requests and 3,080 reference requests**. Each Jev request asks five typed questions in parallel. Each item is evaluated by both models so every policy can be replayed without additional inference. This is an offline benchmark, not the online cost of the hybrid policy.

Runs are checkpointed under `data/runs/<run-id>/`; repeat the same command to resume completed cases. Dataset, model configuration, and prompt version must match the manifest. These files are ignored by Git. Each output stores the dataset hash/revision, prompts version, returned model IDs, timestamp, raw provider responses, measured round-trip latency, token usage, and correctness inputs. Original prompts are versioned in `jev/client.ts` and `llm/client.ts`.

To view a completed run, use **Load measured results** in the interface. To publish it as the default, copy its `benchmark.json` to `public/benchmark.json`, rebuild, and deploy. A partial run is clearly labeled with its sample size. Full PRD empirical acceptance requires a real completed run after you add credentials.

## Methodology and data

- [Methodology and assumptions](docs/methodology.md)
- [Deployment and domain setup](docs/deployment.md)
- [Benchmark schema](docs/benchmark-schema.md)
- [77-intent → 12-family taxonomy](data/taxonomy.json)
- [Dataset attribution](data/README.md)

Threshold optimization is exploratory on the test split. It is not a separately validated policy. Reference confidence is self-reported. Security ground truth is an explicit intent-based proxy. See methodology for limitations.

## Verify

```sh
npm test
npm run benchmark:dry
npm run build
```

Tests cover typed provider adapters, threshold boundaries, security gates, operational versus intent scoring, sequential costs/latency, error-cost sensitivity, infeasible constraints, Pareto dominance, calibration, CSV parsing, and data provenance. GitHub Actions runs these checks on pushes and pull requests.

## Stack and layout

React + TypeScript + Vite, custom SVG charts, plain CSS, Node's built-in HTTP server. The runtime needs no external database or server package.

```
frontend/      research interface
shared/        types, routing, economics, calibration, validation
server/        static hosting and protected live endpoint
jev/           TypeSafe System One adapter and typed questions
llm/           configurable Anthropic reference adapter
experiments/   reproducible runner and illustration generator
analysis/      analysis notes
data/         pinned official dataset and published taxonomy
public/        illustration and optional published measured run
docs/         methodology, schema, deployment
```

## License

Application source: MIT. BANKING77: © PolyAI Limited, CC BY 4.0; see `data/README.md`. The application license does not replace the dataset's license.
