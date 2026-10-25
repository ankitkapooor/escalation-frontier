import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { timingSafeEqual } from "node:crypto";
import { classifyJev } from "../jev/client.ts";
const port = Number(process.env.PORT || 3001),
  root = resolve("dist");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};
const buckets = new Map();
let day = new Date().toISOString().slice(0, 10),
  dailyCalls = 0;
function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}
function authorized(value) {
  const expected = process.env.LIVE_ACCESS_TOKEN;
  if (!expected || typeof value !== "string") return false;
  const a = Buffer.from(value),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
  );
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/health" && req.method === "GET")
      return json(res, 200, {
        ok: true,
        liveEnabled: Boolean(
          process.env.JEV_API_KEY && process.env.LIVE_ACCESS_TOKEN,
        ),
      });
    if (url.pathname === "/api/classify" && req.method === "POST") {
      if (!process.env.JEV_API_KEY || !process.env.LIVE_ACCESS_TOKEN)
        return json(res, 503, {
          error:
            "Live evaluation is not configured. Add JEV_API_KEY and LIVE_ACCESS_TOKEN on the server.",
        });
      if (!authorized(req.headers["x-access-token"]))
        return json(res, 401, {
          error: "Enter the owner access token to use live evaluation.",
        });
      const today = new Date().toISOString().slice(0, 10);
      if (today !== day) {
        day = today;
        dailyCalls = 0;
      }
      if (dailyCalls >= 100)
        return json(res, 429, {
          error: "The daily limit of 100 live requests has been reached.",
        });
      // One shared owner token; global throttle also bounds concurrency behind proxies.
      const minute = Math.floor(Date.now() / 60000);
      for (const key of buckets.keys()) if (key !== minute) buckets.delete(key);
      let body = "",
        size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8192) {
          json(res, 413, { error: "Request is too large." });
          req.destroy();
          return;
        }
        body += chunk;
      }
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        return json(res, 400, { error: "Invalid JSON." });
      }
      if (
        typeof parsed.text !== "string" ||
        parsed.text.trim().length < 3 ||
        parsed.text.length > 2000
      )
        return json(res, 400, {
          error: "Enter a message between 3 and 2,000 characters.",
        });
      const used = buckets.get(minute) || 0;
      if (used >= 5 || dailyCalls >= 100)
        return json(res, 429, {
          error: "Live evaluation limit reached. Please wait and retry.",
        });
      buckets.set(minute, used + 1);
      dailyCalls++;
      try {
        return json(
          res,
          200,
          await classifyJev(parsed.text.trim(), process.env.JEV_API_KEY),
        );
      } catch {
        return json(res, 502, {
          error:
            "Jev could not complete this request. Check the server credentials and model configuration, then retry.",
        });
      }
    }
    if (url.pathname.startsWith("/api/"))
      return json(res, 404, { error: "Endpoint not found." });
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      return res.end();
    }
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400);
      return res.end();
    }
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + "/")) {
      res.writeHead(403);
      return res.end();
    }
    try {
      if (!(await stat(file)).isFile()) file = resolve(root, "index.html");
    } catch {
      if (extname(pathname)) {
        res.writeHead(404);
        return res.end("Not found");
      }
      file = resolve(root, "index.html");
    }
    const bytes = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Cache-Control": file.includes("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch {
    if (!res.headersSent) json(res, 500, { error: "Server error." });
    else res.end();
  }
});
server.requestTimeout = 70000;
server.listen(port, "0.0.0.0", () =>
  console.log(`Escalation Frontier listening on http://localhost:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
