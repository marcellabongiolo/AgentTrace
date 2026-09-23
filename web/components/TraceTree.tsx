import React, { useMemo, useState } from "react";
import { SpanData } from "../lib/api";

interface TraceTreeProps {
  spans: SpanData[];
}

function formatDuration(duration?: number | null): string {
  if (duration == null) return "running";
  return `${(duration * 1000).toFixed(1)} ms`;
}

export default function TraceTree({ spans }: TraceTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, SpanData[]>();
    for (const span of spans) {
      const parent = span.parent_id ?? null;
      const children = map.get(parent) ?? [];
      children.push(span);
      map.set(parent, children);
    }
    return map;
  }, [spans]);

  const renderSpan = (span: SpanData, depth: number): React.ReactNode => {
    const isOpen = expanded[span.span_id] ?? true;
    const children = childrenByParent.get(span.span_id) ?? [];

    return (
      <div key={span.span_id} style={{ marginLeft: depth * 20, marginBottom: 12 }}>
        <div
          style={{
            border: "1px solid #273244",
            borderRadius: 10,
            background: "#111827",
            padding: 14,
          }}
        >
          <button
            onClick={() =>
              setExpanded((current) => ({
                ...current,
                [span.span_id]: !isOpen,
              }))
            }
            style={{
              width: "100%",
              border: 0,
              background: "transparent",
              color: "#f8fafc",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              textAlign: "left",
              padding: 0,
            }}
          >
            <span>
              {isOpen ? "▾" : "▸"} <strong>{span.name}</strong>
            </span>
            <span style={{ color: span.status === "error" ? "#fca5a5" : "#86efac" }}>
              {span.status} · {formatDuration(span.duration)}
            </span>
          </button>

          {isOpen && (
            <div style={{ marginTop: 12, color: "#cbd5e1" }}>
              {span.error && (
                <p style={{ color: "#fca5a5" }}>
                  <strong>Error:</strong> {span.error}
                </p>
              )}

              {span.events.length > 0 && (
                <div>
                  <strong>Events</strong>
                  <ul>
                    {span.events.map((event, index) => (
                      <li key={`${span.span_id}-event-${index}`} style={{ marginTop: 6 }}>
                        <code>{event.event_type}</code> — {event.message}
                        {Object.keys(event.attributes).length > 0 && (
                          <div style={{ color: "#94a3b8", fontSize: 13 }}>
                            {JSON.stringify(event.attributes)}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Object.keys(span.metrics).length > 0 && (
                <div>
                  <strong>Metrics</strong>
                  <pre
                    style={{
                      overflowX: "auto",
                      background: "#0b1220",
                      padding: 10,
                      borderRadius: 8,
                    }}
                  >
                    {JSON.stringify(span.metrics, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {children.map((child) => renderSpan(child, depth + 1))}
      </div>
    );
  };

  const roots = childrenByParent.get(null) ?? [];

  if (spans.length === 0) {
    return <p style={{ color: "#94a3b8" }}>This trace has no spans.</p>;
  }

  return <div>{roots.map((span) => renderSpan(span, 0))}</div>;
}
