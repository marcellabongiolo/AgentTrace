import type { NextApiRequest, NextApiResponse } from "next";
import { createSession, safePasswordEquals } from "../../lib/session";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const configuredPassword = process.env.AGENTTRACE_DASHBOARD_PASSWORD;
  const secret = process.env.AGENTTRACE_SESSION_SECRET;
  if (!configuredPassword || !secret || secret.length < 32) {
    return res.status(503).json({ error: "Dashboard login is not configured" });
  }
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!safePasswordEquals(password, configuredPassword)) {
    return res.status(401).json({ error: "Invalid password" });
  }
  const cookie = [
    `agenttrace_session=${createSession(secret)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=28800",
  ];
  if (process.env.NODE_ENV === "production") cookie.push("Secure");
  res.setHeader("Set-Cookie", cookie.join("; "));
  return res.status(200).json({ ok: true });
}
