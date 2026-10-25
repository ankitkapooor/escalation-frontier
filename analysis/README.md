# Analysis

The app ships with **1,270 measured cases covering 32/77 intents**, labeled as a partial, nonrepresentative test run. Raw outputs and provenance are in `public/benchmark.json`; [the report](../docs/benchmark-report.md) summarizes results and limitations.

Regenerate the report without model calls:

```sh
node analysis/report.ts public/benchmark.json
```

All routing and economic calculations use `shared/engine.ts`. New paid benchmark runs default to 25 cases; no more model calls are necessary to finish or explore this portfolio project.
