# The Escalation Frontier

**How much intelligence should software buy?**

An interactive portfolio experiment by [Ankit Kapoor](https://ankitkapoor.me). Explore how a confidence gate allocates banking support decisions between Jev, a reasoning model, and simulated human review.

Live at **[escalation.ankitkapoor.me](https://escalation.ankitkapoor.me)**. One Node service serves the React interface and the optional live Jev endpoint, with a tiny Cloudflare Worker forwarding the portfolio hostname over HTTPS. No database, background worker, or new model API calls are needed to explore the saved results.

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

**The published app replays 1,270 completed, measured cases**, using Jev `jev-1.13.0` and Anthropic `claude-sonnet-4-5-20250929`. Raw outputs, token usage, measured latency, model IDs, and provenance are included in [`public/benchmark.json`](public/benchmark.json). See the [recorded results report](docs/benchmark-report.md).

This is a **partial test run covering 32 of 77 intents**, collected in BANKING77's original, intent-grouped order. It is not representative of the complete dataset and is not a full BANKING77 benchmark. The run was stopped at the owner's request; the saved results require no further paid inference. The interface labels this as a measured subset.

The original 154-case illustration remains in `public/demo.json` as a fallback and test fixture. Its outputs are simulated and are not used for the published measured results. All dollar figures are editable scenario assumptions, not invoiced provider spend. Human review remains simulated.

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

New paid runs default to **25 cases**. Nothing runs automatically. Larger runs over 100 cases require an explicit `--allow-large-run` flag; use a bounded case count suitable for a portfolio project.

```sh
npm run benchmark -- --limit 25 --run-id small-run
```

Each case makes one Jev request (five typed questions) and one reference-model request. Exploring the published workbench, generating reports, and running unit tests make no model API calls.

Runs are checkpointed under `data/runs/<run-id>/`; repeat the same command to resume completed cases. The runner defaults to four cases in flight (`--concurrency 1` through `16` is supported) and checkpoints each provider separately so paid results survive an interruption. Dataset, model configuration, and prompt version must match the manifest. These files are ignored by Git. Each output stores the dataset hash/revision, prompts version, returned model IDs, timestamp, raw provider responses, measured round-trip latency, token usage, and correctness inputs. Original prompts are versioned in `jev/client.ts` and `llm/client.ts`.

To view a completed run, use **Load measured results** in the interface. To publish it as the default, copy its `benchmark.json` to `public/benchmark.json`, rebuild, and deploy. A partial run is clearly labeled with its sample size. The portfolio ships with the completed partial results; it does not claim the PRD’s full 3,000-case empirical acceptance criterion.

## Methodology and data

- [Recorded benchmark results](docs/benchmark-report.md)
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

**30 automated tests** verify the published archive, bounded benchmark defaults, typed provider adapters, threshold boundaries, security gates, operational versus intent scoring, sequential costs/latency, error-cost sensitivity, infeasible constraints, Pareto dominance, calibration, CSV parsing, and data provenance. GitHub Actions runs these checks on pushes and pull requests.

## Stack and layout

React + TypeScript + Vite, custom SVG charts, plain CSS, Node's built-in HTTP server. The runtime needs no external database or server package.

```
cloudflare/    HTTPS proxy for the portfolio subdomain
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
