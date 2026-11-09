import type { NextApiRequest, NextApiResponse } from "next";
import { allowAttempt, configuration, cookie, createSession, passwordMatches } from "../../lib/session";

export const config = { api: { bodyParser: { sizeLimit: "1kb" } } };
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  const settings = configuration();
  if (!settings) return res.status(503).json({ error: "Login unavailable" });
  if (req.headers.origin !== settings.origin) return res.status(403).json({ error: "Invalid origin" });
  if (!allowAttempt(req.socket.remoteAddress ?? "unknown")) { res.setHeader("Retry-After", "60"); return res.status(429).json({ error: "Try again later" }); }
  if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json") return res.status(415).json({ error: "JSON required" });
  if (!passwordMatches(req.body?.password)) return res.status(401).json({ error: "Invalid password" });
  try { res.setHeader("Set-Cookie", cookie(createSession())); }
  catch { return res.status(503).json({ error: "Login unavailable" }); }
  return res.status(200).json({ ok: true });
}
