import { describe, expect, it } from "vitest";
import type { TraceSummary } from "./api";
import { filterTraces, traceHealth } from "./monitoring";

const traces: TraceSummary[] = [
  { trace_id: "a1", name: "Research Agent", start_time: 1, end_time: 2, status: "success", duration: 1, span_count: 2, created_at: "2026-10-28" },
  { trace_id: "b2", name: "Search Agent", start_time: 2, end_time: 3, status: "error", duration: 1, span_count: 1, created_at: "2026-10-28" },
  { trace_id: "c3", name: "Research Agent", start_time: 3, end_time: null, status: "running", span_count: 0, created_at: "2026-10-28" },
];

describe("filterTraces", () => {
  it("matches names case-insensitively and trace IDs", () => {
    expect(filterTraces(traces, "RESEARCH", "all").map((item) => item.trace_id)).toEqual(["a1", "c3"]);
    expect(filterTraces(traces, "b2", "all").map((item) => item.trace_id)).toEqual(["b2"]);
  });
  it("filters running traces by unfinished execution", () => {
    expect(filterTraces(traces, "", "running").map((item) => item.trace_id)).toEqual(["c3"]);
    expect(filterTraces(traces, "agent", "error").map((item) => item.trace_id)).toEqual(["b2"]);
  });
  it("combines search and status filters without matching unrelated traces", () => {
    expect(filterTraces(traces, "research", "success").map((item) => item.trace_id)).toEqual(["a1"]);
    expect(filterTraces(traces, "research", "error")).toEqual([]);
    expect(filterTraces(traces, "research", "running").map((item) => item.trace_id)).toEqual(["c3"]);
  });
  it("trims surrounding whitespace and ignores search capitalization", () => {
    expect(filterTraces(traces, "  RESEARCH AGENT  ", "all").map((item) => item.trace_id)).toEqual(["a1", "c3"]);
    expect(filterTraces(traces, "  B2  ", "error").map((item) => item.trace_id)).toEqual(["b2"]);
  });
  it("treats an unfinished trace as running even if its status is stale", () => {
    const inconsistent: TraceSummary[] = [
      { ...traces[0], trace_id: "unfinished", end_time: null, status: "success" },
      { ...traces[2], trace_id: "finished", end_time: 5, status: "running" },
    ];
    expect(filterTraces(inconsistent, "", "running").map((item) => item.trace_id)).toEqual(["unfinished"]);
  });
  it("does not mutate the input order when filtering", () => {
    const originalIds = traces.map((item) => item.trace_id);
    expect(filterTraces(traces, "", "all").map((item) => item.trace_id)).toEqual(originalIds);
    expect(traces.map((item) => item.trace_id)).toEqual(originalIds);
  });
  it("returns an empty list when nothing matches", () => {
    expect(filterTraces(traces, "missing", "all")).toEqual([]);
  });
});

describe("traceHealth", () => {
  it("counts completed, running, successful and failed traces", () => {
    expect(traceHealth(traces)).toEqual({ completed: 2, running: 1, errors: 1, successes: 1, successRate: 0.5 });
  });
  it("handles empty data without division by zero", () => {
    expect(traceHealth([])).toEqual({ completed: 0, running: 0, errors: 0, successes: 0, successRate: 0 });
  });
});
