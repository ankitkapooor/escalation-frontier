# Deployment: Railway + Cloudflare

Live site: **https://escalation.ankitkapoor.me**.

The app runs as one stateless Node 24 service on Railway. A 1.5 KB Cloudflare Worker forwards the portfolio hostname to Railway's HTTPS origin. The Worker carries no API credentials. No database or persistent volume is required for published read-only results.

## Existing deployment

- GitHub: `ankitkapooor/escalation-frontier`, branch `main`, with automatic Railway deploys.
- Railway project: `escalation-frontier` (`94cc4aaa-74c3-4847-af2a-8ccdb3261d45`).
- Railway service: `escalation-frontier` (`eac9f67c-92ad-4bea-b17c-88553e7b3000`).
- Railway origin: `https://escalation-frontier-production.up.railway.app`, port 8080.
- Cloudflare Worker: `escalation-frontier-proxy`, route `escalation.ankitkapoor.me/*`.
- Cloudflare DNS: CNAME `escalation` → `unji6ujm.up.railway.app`, **Proxied**.
- Railway ownership TXT record: `_railway-verify.escalation`, supplied by Railway and already published.

The Worker uses Cloudflare's valid edge certificate and fetches the Railway origin through its valid Railway-provided certificate. It was added because Let's Encrypt rate-limited issuance for the direct Railway custom domain. Neither application code nor a zone-wide SSL setting depends on a successful direct-domain retry. Keep the Worker route and proxied DNS record in place. Do not disable certificate verification.

## Add the Jev key

In the Railway service's **Variables** tab, manually enter:

```dotenv
JEV_API_KEY=your_key_here
JEV_MODEL=jev-1.13.0
LIVE_ACCESS_TOKEN=your_private_owner_access_token
```

Never add a `VITE_` prefix to a secret. Redeploy after changes. No credential belongs in the Cloudflare Worker. The deployed service has live Jev configured. Public exploration replays the saved 1,270-case measured subset without inference; the owner token is required for paid single-message evaluation. Without credentials on a fresh deployment, live API requests remain disabled.

The reference key is only required by the offline benchmark runner, not by the public service. Run full benchmarks locally, review the results, and publish `public/benchmark.json` via Git.

## Application updates

Push changes to `main`. Railway builds the included Dockerfile, serves on its supplied `PORT`, and checks `/api/health`. Use one replica for the in-memory owner call limits. Runtime source uses Node built-ins and native TypeScript support; no server packages are installed in the final image.

`.railway/railway.ts` uses Railway's supported configuration format. The old `railway.json` format is not used. To change infrastructure settings, install dependencies, link to this existing project with the Railway CLI, review `railway config plan`, then run `railway config apply`. The declared GitHub source preserves automatic deployments. Review any proposed deletions or source changes before applying.

## Proxy updates

Only required when `cloudflare/worker.ts`, its route, or the Railway origin changes:

```sh
npx wrangler deploy --config cloudflare/wrangler.toml
```

This uses your existing Cloudflare CLI session. The public config includes no secrets. The proxy preserves method, body, path, query, and owner-token headers, follows no redirects automatically, rewrites origin redirects back to the public hostname, and enforces an HTTPS origin.

## Verification

```sh
curl -fsS https://escalation.ankitkapoor.me/api/health
```

`{"ok":true,"liveEnabled":false}` is expected until both server-side live settings are entered. Check the homepage, illustration JSON, and asset responses at the final hostname after deployment.

The saved benchmark, chart, scenarios, imports/exports, and methodology work without credentials. Live Jev was verified with one authenticated request; the published partial benchmark contains real outputs from both providers. No further model calls are required.
