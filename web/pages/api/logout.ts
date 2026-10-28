import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const cookie = ["agenttrace_session=", "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=0"];
  if (process.env.NODE_ENV === "production") cookie.push("Secure");
  res.setHeader("Set-Cookie", cookie.join("; "));
  return res.status(200).json({ ok: true });
}
