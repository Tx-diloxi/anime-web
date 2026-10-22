import { createFileRoute } from "@tanstack/react-router";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

// Les lecteurs vidéo exigent un Referer que le navigateur ne peut pas fixer : on relaie la requête.
function isPublicHttps(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null;
  if (/^\[/.test(host) || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return null;
  return url;
}

const proxied = (url: string, referer: string) =>
  `/api/proxy?u=${encodeURIComponent(url)}&r=${encodeURIComponent(referer)}`;

function rewritePlaylist(body: string, base: string, referer: string): string {
  const abs = (value: string) => new URL(value, base).toString();
  return body
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith("#")) {
        return line.replace(
          /URI="([^"]+)"/g,
          (_m, uri: string) => `URI="${proxied(abs(uri), referer)}"`,
        );
      }
      return proxied(abs(t), referer);
    })
    .join("\n");
}

export const Route = createFileRoute("/api/proxy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const target = isPublicHttps(params.get("u") ?? "");
        const referer = isPublicHttps(params.get("r") ?? "");
        if (!target || !referer) return new Response("Paramètres invalides", { status: 400 });

        const headers: Record<string, string> = {
          "User-Agent": USER_AGENT,
          Referer: referer.toString(),
          Origin: referer.origin,
        };
        const range = request.headers.get("range");
        if (range) headers.Range = range;

        let upstream: Response;
        try {
          upstream = await fetch(target, {
            headers,
            redirect: "follow",
            signal: AbortSignal.timeout(20000),
          });
        } catch {
          return new Response("Source injoignable", { status: 502 });
        }

        const type = upstream.headers.get("content-type") || "";
        const isPlaylist =
          /mpegurl/i.test(type) || /\.m3u8(?:[?#]|$)/i.test(target.pathname + target.search);
        if (isPlaylist && upstream.ok) {
          const text = await upstream.text();
          if (/^\s*#EXTM3U/.test(text)) {
            return new Response(
              rewritePlaylist(text, upstream.url || target.toString(), referer.toString()),
              {
                status: 200,
                headers: {
                  "content-type": "application/vnd.apple.mpegurl",
                  "cache-control": "no-store",
                },
              },
            );
          }
          return new Response(text, { status: 200, headers: { "content-type": type } });
        }

        const out = new Headers();
        for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
          const value = upstream.headers.get(name);
          if (value) out.set(name, value);
        }
        out.set("cache-control", "private, max-age=300");
        return new Response(upstream.body, { status: upstream.status, headers: out });
      },
    },
  },
});
