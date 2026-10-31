import type { NextApiRequest, NextApiResponse } from "next";

const DEFAULT_UPSTREAM = "http://api:8000";
const MAX_TRACE_ID_LENGTH = 128;

export function resolveTelemetryPath(query: NextApiRequest["query"]): string | null {
  const parts = query.path;
  if (!Array.isArray(parts)) return null;
  if (parts.length === 1 && parts[0] === "traces") return "/api/v1/traces";
  if (parts.length === 1 && parts[0] === "stats") return "/api/v1/stats";
  if (parts.length === 2 && parts[0] === "traces") {
    const id = parts[1];
    if (id.length > 0 && id.length <= MAX_TRACE_ID_LENGTH && /^[a-zA-Z0-9_-]+$/.test(id)) {
      return `/api/v1/traces/${encodeURIComponent(id)}`;
    }
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const path = resolveTelemetryPath(req.query);
  if (!path) return res.status(404).json({ error: "Not found" });

  const base = process.env.AGENTTRACE_INTERNAL_API_URL ?? DEFAULT_UPSTREAM;
  const key = process.env.AGENTTRACE_API_KEY;

  try {
    const upstream = await fetch(new URL(path, base), {
      method: "GET",
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({
        error: upstream.status === 404 ? "Trace not found" : "Upstream API error",
      });
    }
    const data: unknown = await upstream.json();
    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: "Unable to reach telemetry API" });
  }
}
