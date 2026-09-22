import React from 'react';
import ThoughtTree, { SpanData } from '../components/ThoughtTree';

// Dados simulados para testar o componente visual
const mockSpans: SpanData[] = [
  {
    span_id: 'span-1',
    name: 'Market Search & Data Gathering',
    duration: 0.52,
    thoughts: [
      { timestamp: 1700000000, content: 'Fetching quarterly financial records for ticker AAPL...' },
      { timestamp: 1700000001, content: 'Successfully retrieved 10-K report filing.' }
    ],
    metrics: { tokens_used: 420, latency_ms: 520 }
  },
  {
    span_id: 'span-2',
    name: 'Tool: Growth Calculator',
    duration: 0.18,
    thoughts: [
      { timestamp: 1700000002, content: 'Computing YoY revenue growth rate based on 2025 vs 2026 data.' },
      { timestamp: 1700000003, content: 'Result computed: +14.2% YoY growth.' }
    ],
    metrics: { tokens_used: 150, accuracy_score: 0.99 }
  }
];

export default function DashboardPage() {
  return (
    <div style={{ backgroundColor: '#fafafa', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#111' }}>⚡ AgentTrace Dashboard</h1>
        <p style={{ color: '#666', marginTop: '8px' }}>Real-time observability and time-travel debugging for AI agents</p>
      </div>
      
      <ThoughtTree spans={mockSpans} />
    </div>
  );
}
