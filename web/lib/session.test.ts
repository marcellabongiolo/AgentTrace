import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE, allowAttempt, configuration, cookie, createSession, passwordMatches, revokeSession, verifySession } from "./session";
import login from "../pages/api/login";
import logout from "../pages/api/logout";
import telemetry from "../pages/api/telemetry/[...path]";
import { getServerSideProps } from "../pages/index";
import type { NextApiRequest, NextApiResponse, GetServerSidePropsContext } from "next";

function request(extra: Record<string, unknown> = {}) {
  return { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, socket: { remoteAddress: "test-" + Math.random() }, cookies: {}, body: { password: "correct-password-for-tests" }, ...extra } as unknown as NextApiRequest;
}
function response() {
  const headers: Record<string, string> = {};
  const res = { statusCode: 200, body: undefined as unknown, setHeader: (key: string, value: string) => { headers[key] = value; }, status: (code: number) => { res.statusCode = code; return res; }, json: (value: unknown) => { res.body = value; return res; } };
  return { res: res as unknown as NextApiResponse, state: res, headers };
}
beforeEach(() => {
  vi.stubEnv("AGENTTRACE_DASHBOARD_PASSWORD", "correct-password-for-tests");
  vi.stubEnv("AGENTTRACE_SESSION_SECRET", "test-session-secret-at-least-32-characters");
  vi.stubEnv("AGENTTRACE_DASHBOARD_ORIGIN", "http://localhost:3000");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("private dashboard authentication", () => {
  it("fails closed for missing or unsafe configuration", () => {
    vi.stubEnv("AGENTTRACE_SESSION_SECRET", "short");
    expect(configuration()).toBeNull();
    expect(verifySession("x")).toBe(false);
    expect(() => createSession()).toThrow();
    vi.stubEnv("AGENTTRACE_SESSION_SECRET", "test-session-secret-at-least-32-characters");
    vi.stubEnv("AGENTTRACE_DASHBOARD_ORIGIN", "http://public.example.com");
    expect(configuration()).toBeNull();
  });
  it("accepts only the configured password and bounded strings", () => {
    expect(passwordMatches("correct-password-for-tests")).toBe(true);
    expect(passwordMatches("wrong")).toBe(false);
    expect(passwordMatches({})).toBe(false);
    expect(passwordMatches("a".repeat(257))).toBe(false);
  });
  it("uses random, expiring sessions and rejects tampering and secret rotation", () => {
    const token = createSession(1000);
    expect(token).not.toBe(createSession(1000));
    expect(verifySession(token, 1001)).toBe(true);
    expect(verifySession(token.slice(0, -1) + "!", 1001)).toBe(false);
    expect(verifySession(token, 1000 + 28800000)).toBe(false);
    const next = createSession();
    vi.stubEnv("AGENTTRACE_SESSION_SECRET", "rotated-session-secret-at-least-32-characters");
    expect(verifySession(next)).toBe(false);
  });
  it("revokes captured cookies on logout and sets HTTPS cookie flags", () => {
    const token = createSession();
    revokeSession(token);
    expect(verifySession(token)).toBe(false);
    expect(cookie("x")).toContain("HttpOnly; SameSite=Lax; Path=/");
    expect(cookie("x")).not.toContain("Secure");
    vi.stubEnv("AGENTTRACE_DASHBOARD_ORIGIN", "https://dashboard.example.com");
    expect(cookie("x")).toContain("; Secure");
  });
  it("limits repeated attempts and resets the window", () => {
    const address = "rate-limit-unit";
    for (let i = 0; i < 5; i++) expect(allowAttempt(address, 1)).toBe(true);
    expect(allowAttempt(address, 2)).toBe(false);
    expect(allowAttempt(address, 60001)).toBe(true);
  });
  it("runs login, protected API access, SSR and logout with replay rejection", async () => {
    const signedIn = response();
    login(request(), signedIn.res);
    expect(signedIn.state.statusCode).toBe(200);
    const token = signedIn.headers["Set-Cookie"].split(";")[0].split("=")[1];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ traces: [] }) });
    vi.stubGlobal("fetch", fetchMock);
    const authed = request({ method: "GET", cookies: { [COOKIE]: token }, query: { path: ["traces"] } });
    const data = response();
    await telemetry(authed, data.res);
    expect(data.state.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const context = { req: authed, res: response().res } as unknown as GetServerSidePropsContext;
    expect(await getServerSideProps(context)).toEqual({ props: {} });
    const signedOut = response();
    logout(request({ cookies: { [COOKIE]: token } }), signedOut.res);
    expect(signedOut.state.statusCode).toBe(200);
    expect(signedOut.headers["Set-Cookie"]).toContain("Max-Age=0");
    fetchMock.mockClear();
    const replay = response();
    await telemetry(authed, replay.res);
    expect(replay.state.statusCode).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getServerSideProps(context)).toEqual({ redirect: { destination: "/login", permanent: false } });
  });
  it("rejects cross-origin login and logout without issuing or revoking sessions", () => {
    const token = createSession();
    for (const handler of [login, logout]) {
      const result = response();
      handler(request({ headers: { origin: "https://attacker.example" }, cookies: { [COOKIE]: token } }), result.res);
      expect(result.state.statusCode).toBe(403);
      expect(result.headers["Set-Cookie"]).toBeUndefined();
    }
    expect(verifySession(token)).toBe(true);
  });
  it("rejects missing sessions before upstream access and missing configuration", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const denied = response();
    await telemetry(request({ method: "GET" }), denied.res);
    expect(denied.state.statusCode).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv("AGENTTRACE_DASHBOARD_PASSWORD", "");
    const unavailable = response();
    login(request(), unavailable.res);
    expect(unavailable.state.statusCode).toBe(503);
    await telemetry(request(), unavailable.res);
    expect(unavailable.state.statusCode).toBe(503);
  });
  it("rejects wrong passwords and rate-limits the login endpoint", () => {
    const req = request({ body: { password: "wrong" } });
    for (let i = 0; i < 5; i++) {
      const result = response(); login(req, result.res); expect(result.state.statusCode).toBe(401);
    }
    const blocked = response(); login(req, blocked.res);
    expect(blocked.state.statusCode).toBe(429);
    expect(blocked.headers["Retry-After"]).toBe("60");
  });
});
