import type { TraceSummary } from "./api";

export type TraceStatusFilter = "all" | "success" | "error" | "running";

export function filterTraces(
  traces: TraceSummary[],
  search: string,
  status: TraceStatusFilter,
): TraceSummary[] {
  const term = search.trim().toLocaleLowerCase();
  return traces.filter((trace) => {
    const matchesName = trace.name.toLocaleLowerCase().includes(term) ||
      trace.trace_id.toLocaleLowerCase().includes(term);
    const matchesStatus = status === "all" ||
      (status === "running" ? trace.end_time == null : trace.status === status);
    return matchesName && matchesStatus;
  });
}

export function traceHealth(traces: TraceSummary[]) {
  const completed = traces.filter((trace) => trace.end_time != null);
  const errors = completed.filter((trace) => trace.status === "error").length;
  const successes = completed.filter((trace) => trace.status === "success").length;
  return {
    completed: completed.length,
    running: traces.length - completed.length,
    errors,
    successes,
    successRate: completed.length ? successes / completed.length : 0,
  };
}
