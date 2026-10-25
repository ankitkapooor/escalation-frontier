import test from "node:test";
import assert from "node:assert/strict";
import worker from "../cloudflare/worker.ts";
const env = { ORIGIN: "https://escalation-frontier-production.up.railway.app" };
test("Cloudflare proxy preserves API paths, query, body, and owner authorization while using verified HTTPS", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (request) => {
    const r = request as Request;
    assert.equal(r.url, env.ORIGIN + "/api/classify?sample=1");
    assert.equal(r.method, "POST");
    assert.equal(r.headers.get("x-access-token"), "test-owner-token");
    assert.equal(r.headers.get("host"), null);
    assert.equal(
      r.headers.get("x-forwarded-host"),
      "escalation.ankitkapoor.me",
    );
    assert.equal(await r.text(), '{"text":"test message"}');
    return Response.json({ ok: true });
  };
  try {
    const response = await worker.fetch(
      new Request("https://escalation.ankitkapoor.me/api/classify?sample=1", {
        method: "POST",
        headers: {
          "x-access-token": "test-owner-token",
          host: "escalation.ankitkapoor.me",
        },
        body: '{"text":"test message"}',
      }),
      env,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  } finally {
    globalThis.fetch = original;
  }
});
test("proxy keeps origin redirects on the public hostname", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(null, {
      status: 302,
      headers: { Location: env.ORIGIN + "/methodology" },
    });
  try {
    const response = await worker.fetch(
      new Request("https://escalation.ankitkapoor.me/"),
      env,
    );
    assert.equal(
      response.headers.get("Location"),
      "https://escalation.ankitkapoor.me/methodology",
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("proxy rejects an insecure origin configuration", async () => {
  assert.equal(
    (
      await worker.fetch(new Request("https://escalation.ankitkapoor.me"), {
        ORIGIN: "http://example.com",
      })
    ).status,
    503,
  );
});
