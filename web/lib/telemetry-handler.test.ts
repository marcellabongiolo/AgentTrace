import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import handler from "../pages/api/telemetry/[...path]";

function response() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: unknown;
  const res = {
    setHeader: vi.fn((name: string, value: string) => { headers[name] = value; }),
    status: vi.fn((code: number) => { statusCode = code; return res; }),
    json: vi.fn((value: unknown) => { body = value; return res; }),
  };
  return { res: res as unknown as NextApiResponse, get status() { return statusCode; }, get body() { return body; }, headers };
}

function request(method: string, path: string[]) {
  return { method, query: { path } } as unknown as NextApiRequest;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("telemetry proxy HTTP handler", () => {
  it("rejects writes without calling the upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = response();
    await handler(request("POST", ["traces"]), result.res);
    expect(result.status).toBe(405);
    expect(result.headers.Allow).toBe("GET");
    expect(result.headers["Cache-Control"]).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unapproved paths before fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = response();
    await handler(request("GET", ["admin"]), result.res);
    expect(result.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not follow redirects or expose upstream errors", async () => {
    vi.stubEnv("AGENTTRACE_INTERNAL_API_URL", "http://api:8000");
    vi.stubEnv("AGENTTRACE_API_KEY", "test-secret");
    const fetchMock = vi.fn().mockRejectedValue(new Error("redirect rejected"));
    vi.stubGlobal("fetch", fetchMock);
    const result = response();
    await handler(request("GET", ["traces"]), result.res);
    expect(result.status).toBe(502);
    expect(result.body).toEqual({ error: "Unable to reach telemetry API" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url.toString()).toBe("http://api:8000/api/v1/traces");
    expect(options.redirect).toBe("error");
    expect(options.headers).toEqual({ Authorization: "Bearer test-secret" });
    expect(JSON.stringify(result.body)).not.toContain("test-secret");
  });

  it("returns upstream data for a valid read", async () => {
    vi.stubEnv("AGENTTRACE_INTERNAL_API_URL", "http://api:8000");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ traces: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = response();
    await handler(request("GET", ["traces"]), result.res);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ traces: [] });
  });
});
