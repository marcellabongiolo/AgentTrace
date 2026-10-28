import { describe, expect, it } from "vitest";
import { resolveTelemetryPath } from "../pages/api/telemetry/[...path]";

describe("server-side telemetry path allowlist", () => {
  it("accepts only read-only trace and stats paths", () => {
    expect(resolveTelemetryPath({ path: ["traces"] })).toBe("/api/v1/traces");
    expect(resolveTelemetryPath({ path: ["stats"] })).toBe("/api/v1/stats");
    expect(resolveTelemetryPath({ path: ["traces", "trace_123"] }))
      .toBe("/api/v1/traces/trace_123");
  });

  it("rejects unknown, nested and invalid trace paths", () => {
    expect(resolveTelemetryPath({ path: ["health"] })).toBeNull();
    expect(resolveTelemetryPath({ path: ["traces", "../stats"] })).toBeNull();
    expect(resolveTelemetryPath({ path: ["traces", "a", "b"] })).toBeNull();
    expect(resolveTelemetryPath({ path: ["traces", ""] })).toBeNull();
    expect(resolveTelemetryPath({ path: ["traces", "x".repeat(129)] })).toBeNull();
    expect(resolveTelemetryPath({ path: "traces" })).toBeNull();
  });
});
