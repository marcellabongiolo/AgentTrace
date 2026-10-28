import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_TTL_SECONDS = 60 * 60 * 8;

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSession(secret: string, now = Date.now()): string {
  if (!secret) throw new Error("Session secret required");
  const expires = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const payload = String(expires);
  return `${payload}.${signature(payload, secret)}`;
}

export function verifySession(
  token: string | undefined,
  secret: string | undefined,
  now = Date.now(),
): boolean {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, provided] = parts;
  if (!/^\d{10,}$/.test(payload) || !/^[a-zA-Z0-9_-]+$/.test(provided)) return false;
  const expires = Number(payload);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(now / 1000)) return false;
  const expected = Buffer.from(signature(payload, secret));
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function safePasswordEquals(input: string, expected: string): boolean {
  if (!expected) return false;
  const a = createHmac("sha256", "agenttrace-password-compare").update(input).digest();
  const b = createHmac("sha256", "agenttrace-password-compare").update(expected).digest();
  return timingSafeEqual(a, b);
}
