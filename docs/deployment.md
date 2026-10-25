# Deployment: Railway + Cloudflare

The app is a single stateless Node 24 service. The included Dockerfile builds the frontend and serves it alongside the protected Jev API. No database or persistent volume is required for published read-only results.

## Railway

1. Create a project from `ankitkapooor/escalation-frontier`, branch `main`.
2. Railway detects the Dockerfile and `railway.json`. Health check: `/api/health`. It provides `PORT` automatically. Use one replica.
3. Deploy with no API keys to publish the illustration immediately.
4. When ready, set `JEV_API_KEY`, `JEV_MODEL`, and `LIVE_ACCESS_TOKEN` in **Variables**. Never add a `VITE_` prefix to a secret. Redeploy after changes.
5. The reference key is only required by the offline benchmark runner, not by the public service. Run full benchmarks locally, review the results, and publish the resulting `public/benchmark.json` via Git.

A new deployment follows pushes to `main` when Railway's GitHub integration is connected. Runtime source needs no installed npm packages: the final image uses Node built-ins and its native TypeScript support.

## Domain

In Railway's service **Settings → Networking**, add custom domain `escalation.ankitkapoor.me`, targeting the assigned application port. Railway returns the CNAME destination and any verification TXT record.

In the existing Cloudflare zone for `ankitkapoor.me`, add the **exact values Railway provides**:

- Type CNAME, name `escalation`, target the Railway destination.
- Add any required TXT verification record, preserving its exact host/value.

Start DNS-only until Railway confirms its certificate and domain are active. Do not guess the CNAME target from a generated Railway URL: use the custom domain's supplied records. Preserve all other portfolio DNS records. Check `/api/health` and the homepage at the final hostname after propagation.

## Verification

```sh
curl -fsS https://escalation.ankitkapoor.me/api/health
```

`{"ok":true,"liveEnabled":false}` is expected until both server-side live settings are entered. Illustration, chart, scenarios, imports/exports, and methodology work without credentials.

## Alternative hosts

The Dockerfile works with any Node-capable container host. Static `dist/` can also be served on Cloudflare Pages, but the live `/api/classify` endpoint then requires a separately deployed backend or Worker; the supplied Railway setup keeps that as one service.
