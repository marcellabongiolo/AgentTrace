import React, { useState } from 'react';

export interface SpanData {
  span_id: string;
  parent_id?: string | null;
  name: string;
  duration?: number;
  thoughts: Array<{ timestamp: number; content: string }>;
  metrics: Record<string, any>;
}

interface ThoughtTreeProps {
  spans: SpanData[];
}

export const ThoughtTree: React.FC<ThoughtTreeProps> = ({ spans }) => {
  const [expandedSpans, setExpandedSpans] = useState<Record<string, boolean>>({});

  const toggleSpan = (id: string) => {
    setExpandedSpans((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: '#1a1a1a', borderBottom: '2px solid #eaeaea', paddingBottom: '10px' }}>
        🧠 Agent Thought Tree (Árvore de Raciocínio)
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {spans.map((span) => {
          const isExpanded = expandedSpans[span.span_id] ?? true;

          return (
            <div
              key={span.span_id}
              style={{
                border: '1px solid #e1e4e8',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#f6f8fa',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div
                onClick={() => toggleSpan(span.span_id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                <span>
                  {isExpanded ? '🔽' : '▶️'} {span.name}
                </span>
                <span style={{ fontSize: '0.85em', color: '#586069', backgroundColor: '#e1e4e8', padding: '2px 8px', borderRadius: '12px' }}>
                  {span.duration ? `${span.duration}s` : 'Executando...'}
                </span>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e1e4e8' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.9em', color: '#24292e', fontWeight: 600 }}>
                    Pensamentos / Decisões:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9em', color: '#444' }}>
                    {span.thoughts.map((t, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        {t.content}
                      </li>
                    ))}
                  </ul>

                  {Object.keys(span.metrics).length > 0 && (
                    <div style={{ marginTop: '10px', fontSize: '0.85em', color: '#0366d6' }}>
                      <strong>Métricas:</strong> {JSON.stringify(span.metrics)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ThoughtTree;
