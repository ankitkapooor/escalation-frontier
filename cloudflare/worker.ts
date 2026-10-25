// Cloudflare terminates the portfolio hostname's TLS and forwards to Railway's
// verified *.up.railway.app certificate. No API credentials belong in this Worker.
export default {
  async fetch(request: Request, env: { ORIGIN: string }): Promise<Response> {
    const origin = new URL(env.ORIGIN);
    if (origin.protocol !== "https:")
      return new Response("Invalid origin configuration.", { status: 503 });
    const url = new URL(request.url);
    url.protocol = origin.protocol;
    url.hostname = origin.hostname;
    url.port = origin.port;
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("X-Forwarded-Host", new URL(request.url).hostname);
    try {
      const upstream = await fetch(
        new Request(url, new Request(request, { headers, redirect: "manual" })),
      );
      const response = new Response(upstream.body, upstream);
      const location = response.headers.get("Location");
      if (location) {
        const redirect = new URL(location, url);
        if (redirect.origin === origin.origin) {
          const publicUrl = new URL(request.url);
          redirect.protocol = publicUrl.protocol;
          redirect.host = publicUrl.host;
          response.headers.set("Location", redirect.href);
        }
      }
      return response;
    } catch {
      return new Response(
        "The experiment is temporarily unavailable. Please retry shortly.",
        {
          status: 502,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        },
      );
    }
  },
};
