import type { NextApiRequest, NextApiResponse } from "next";
import { COOKIE, configuration, cookie, revokeSession } from "../../lib/session";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  const settings = configuration();
  if (!settings) return res.status(503).json({ error: "Login unavailable" });
  if (req.headers.origin !== settings.origin) return res.status(403).json({ error: "Invalid origin" });
  revokeSession(req.cookies[COOKIE]);
  res.setHeader("Set-Cookie", cookie("", true));
  return res.status(200).json({ ok: true });
}
