import React, { useEffect, useState } from "react";
import TraceTree from "../components/TraceTree";
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [traceList, traceStats] = await Promise.all([
          fetchTraces(),
          fetchStats(),
        ]);
        setTraces(traceList);
        setStats(traceStats);

        if (traceList.length > 0) {
          setSelected(await fetchTrace(traceList[0].trace_id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load AgentTrace data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const selectTrace = async (traceId: string) => {
    try {
      setError(null);
      setSelected(await fetchTrace(traceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trace");
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
          {metric("Spans", stats.span_count)}
          {metric("Error rate", `${(stats.error_rate * 100).toFixed(1)}%`)}
          {metric("Avg duration", `${(stats.avg_duration * 1000).toFixed(1)} ms`)}
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
                {traces.map((trace) => (
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
