import React, { useEffect, useRef, useState } from "react";
import TraceTree from "../components/TraceTree";
import { isCurrentRequest } from "../lib/request-order";
import { filterTraces, traceHealth, TraceStatusFilter } from "../lib/monitoring";
import {
  fetchStats,
  fetchTrace,
  fetchTraces,
  TraceDetail,
  TraceStats,
  TraceSummary,
} from "../lib/api";

const emptyStats: TraceStats = {
  trace_count: 0,
  error_count: 0,
  error_rate: 0,
  avg_duration: 0,
  span_count: 0,
};

function metric(label: string, value: string | number) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #273244",
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: 13 }}>{label}</div>
      <div style={{ color: "#f8fafc", fontSize: 26, fontWeight: 700, marginTop: 5 }}>
        {value}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [stats, setStats] = useState<TraceStats>(emptyStats);
  const [selected, setSelected] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TraceStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const selectionRequest = useRef(0);
  const refreshRequest = useRef(0);

  useEffect(() => {
    let active = true;
    const requestId = ++selectionRequest.current;
    const load = async () => {
      try {
        const [traceList, traceStats] = await Promise.all([
          fetchTraces(),
          fetchStats(),
        ]);
        if (!active) return;
        setTraces(traceList);
        setStats(traceStats);

        if (traceList.length > 0) {
          const detail = await fetchTrace(traceList[0].trace_id);
          if (active && isCurrentRequest(requestId, selectionRequest.current)) setSelected(detail);
        }
      } catch (err) {
        if (active && isCurrentRequest(requestId, selectionRequest.current)) setError(err instanceof Error ? err.message : "Failed to load AgentTrace data");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; selectionRequest.current += 1; refreshRequest.current += 1; };
  }, []);

  const visibleTraces = filterTraces(traces, search, statusFilter);
  const health = traceHealth(traces);

  const refresh = async () => {
    const requestId = ++selectionRequest.current;
    const refreshId = ++refreshRequest.current;
    setRefreshing(true);
    setError(null);
    try {
      const [nextTraces, nextStats] = await Promise.all([fetchTraces(), fetchStats()]);
      if (!isCurrentRequest(requestId, selectionRequest.current)) return;
      setTraces(nextTraces);
      setStats(nextStats);
      if (selected && !nextTraces.some((trace) => trace.trace_id === selected.trace_id)) {
        setSelected(null);
      } else if (selected) {
        const detail = await fetchTrace(selected.trace_id);
        if (isCurrentRequest(requestId, selectionRequest.current)) setSelected(detail);
      }
    } catch (err) {
      if (isCurrentRequest(requestId, selectionRequest.current)) setError(err instanceof Error ? err.message : "Failed to refresh monitoring data");
    } finally {
      if (isCurrentRequest(refreshId, refreshRequest.current)) setRefreshing(false);
    }
  };

  const selectTrace = async (traceId: string) => {
    const requestId = ++selectionRequest.current;
    try {
      setError(null);
      const detail = await fetchTrace(traceId);
      if (isCurrentRequest(requestId, selectionRequest.current)) setSelected(detail);
    } catch (err) {
      if (isCurrentRequest(requestId, selectionRequest.current)) setError(err instanceof Error ? err.message : "Failed to load trace");
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070b14",
        color: "#f8fafc",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 28,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>AgentTrace</h1>
          <p style={{ color: "#94a3b8", marginTop: 6 }}>
            Structured observability for AI-agent executions, tool calls, metrics and errors.
          </p>
        </header>

        {error && (
          <div
            style={{
              background: "#451a1a",
              border: "1px solid #7f1d1d",
              borderRadius: 10,
              padding: 12,
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {metric("Traces", stats.trace_count)}
          {metric("Completed (recent)", health.completed)}
          {metric("Running (recent)", health.running)}
          {metric("Errors (recent)", health.errors)}
          {metric("Spans", stats.span_count)}
          {metric("Error rate", `${(stats.error_rate * 100).toFixed(1)}%`)}
          {metric("Avg duration", `${(stats.avg_duration * 1000).toFixed(1)} ms`)}
        </section>

        <section aria-label="Trace monitoring controls" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <input aria-label="Search traces" placeholder="Search by agent name or trace ID" value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ flex: "1 1 230px", background: "#111827", border: "1px solid #334155", color: "#f8fafc", borderRadius: 8, padding: 10 }} />
          <select aria-label="Filter trace status" value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as TraceStatusFilter)}
            style={{ background: "#111827", border: "1px solid #334155", color: "#f8fafc", borderRadius: 8, padding: 10 }}>
            <option value="all">All statuses</option><option value="success">Success</option>
            <option value="error">Error</option><option value="running">Running</option>
          </select>
          <button type="button" disabled={refreshing} onClick={() => void refresh()}
            style={{ background: "#1e293b", border: "1px solid #334155", color: "#f8fafc", borderRadius: 8, padding: "10px 16px", cursor: "pointer" }}>
            {refreshing ? "Refreshing..." : "Refresh data"}
          </button>
        </section>
        {loading ? (
          <p style={{ color: "#94a3b8" }}>Loading traces...</p>
        ) : traces.length === 0 ? (
          <div
            style={{
              border: "1px dashed #334155",
              borderRadius: 12,
              padding: 28,
              color: "#94a3b8",
            }}
          >
            No traces yet. Run an instrumented agent with the Python SDK to populate the dashboard.
          </div>
        ) : visibleTraces.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>No traces match these filters.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(260px, 0.8fr) minmax(0, 2fr)",
              gap: 20,
              alignItems: "start",
            }}
          >
            <aside>
              <h2 style={{ fontSize: 17 }}>Recent traces</h2>
              <div style={{ display: "grid", gap: 8 }}>
                {visibleTraces.map((trace) => (
                  <button
                    key={trace.trace_id}
                    onClick={() => void selectTrace(trace.trace_id)}
                    style={{
                      textAlign: "left",
                      border: "1px solid #273244",
                      borderRadius: 9,
                      background:
                        selected?.trace_id === trace.trace_id ? "#1e293b" : "#111827",
                      color: "#f8fafc",
                      padding: 12,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{trace.name}</div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                      {trace.status} · {trace.span_count} spans ·{" "}
                      {trace.duration == null
                        ? "running"
                        : `${(trace.duration * 1000).toFixed(1)} ms`}
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section>
              {selected && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <h2 style={{ marginBottom: 4 }}>{selected.name}</h2>
                      <code style={{ color: "#94a3b8" }}>{selected.trace_id}</code>
                    </div>
                    <strong
                      style={{
                        color: selected.status === "error" ? "#fca5a5" : "#86efac",
                      }}
                    >
                      {selected.status}
                    </strong>
                  </div>

                  {selected.error && (
                    <p style={{ color: "#fca5a5" }}>{selected.error}</p>
                  )}

                  <TraceTree spans={selected.spans} />
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
