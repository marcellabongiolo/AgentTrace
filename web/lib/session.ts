import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const COOKIE = "agenttrace_session";
const TTL = 8 * 60 * 60 * 1000;
type State = { sessions: Map<string, number>; attempts: Map<string, { count: number; until: number }> };
const shared = globalThis as typeof globalThis & { agenttraceAuth?: State };
const state = shared.agenttraceAuth ??= { sessions: new Map(), attempts: new Map() };

export function configuration() {
  const password = process.env.AGENTTRACE_DASHBOARD_PASSWORD ?? "";
  const secret = process.env.AGENTTRACE_SESSION_SECRET ?? "";
  const origin = process.env.AGENTTRACE_DASHBOARD_ORIGIN ?? "http://localhost:3000";
  try {
    const url = new URL(origin);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (password.length < 12 || password.length > 256 || secret.length < 32 || url.origin !== origin || url.username || url.password || !(url.protocol === "https:" || (local && url.protocol === "http:"))) return null;
    return { password, secret, origin, secure: url.protocol === "https:" };
  } catch { return null; }
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}
export function passwordMatches(value: unknown): boolean {
  const config = configuration();
  return !!config && typeof value === "string" && value.length <= 256 && timingSafeEqual(digest(value), digest(config.password));
}
function sessionKey(token: string) {
  return createHash("sha256").update(configuration()?.secret ?? "").update("\0").update(token).digest("hex");
}
export function createSession(now = Date.now()): string {
  if (!configuration()) throw new Error("Login unavailable");
  for (const [key, expiry] of state.sessions) if (expiry <= now) state.sessions.delete(key);
  if (state.sessions.size >= 1000) throw new Error("Session capacity reached");
  const token = randomBytes(32).toString("base64url");
  state.sessions.set(sessionKey(token), now + TTL);
  return token;
}
export function verifySession(token: string | undefined, now = Date.now()): boolean {
  if (!configuration() || !token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const key = sessionKey(token);
  const expiry = state.sessions.get(key) ?? 0;
  if (expiry <= now) { state.sessions.delete(key); return false; }
  return true;
}
export function revokeSession(token: string | undefined) {
  if (token) state.sessions.delete(sessionKey(token));
}
export function cookie(token: string, clear = false): string {
  return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear ? 0 : TTL / 1000}${configuration()?.secure ? "; Secure" : ""}`;
}
export function allowAttempt(address: string, now = Date.now()): boolean {
  for (const [key, value] of state.attempts) if (value.until <= now) state.attempts.delete(key);
  const current = state.attempts.get(address);
  if (current) { current.count++; return current.count <= 5; }
  if (state.attempts.size >= 10000) return false;
  state.attempts.set(address, { count: 1, until: now + 60000 });
  return true;
}
