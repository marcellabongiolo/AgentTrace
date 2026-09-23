export interface TraceSummary {
  trace_id: string;
  name: string;
  start_time: number;
  end_time?: number | null;
  duration?: number | null;
  status: string;
  error?: string | null;
  span_count: number;
  created_at: string;
}

export interface TraceEventData {
  event_type: string;
  message: string;
  timestamp: number;
  attributes: Record<string, unknown>;
}

export interface SpanData {
  span_id: string;
  trace_id?: string | null;
  parent_id?: string | null;
  name: string;
  start_time: number;
  end_time?: number | null;
  duration?: number | null;
  status: string;
  error?: string | null;
  events: TraceEventData[];
  metrics: Record<string, unknown>;
}

export interface TraceDetail {
  trace_id: string;
  name: string;
  start_time: number;
  end_time?: number | null;
  duration?: number | null;
  status: string;
  error?: string | null;
  metadata: Record<string, unknown>;
  spans: SpanData[];
}

export interface TraceStats {
  trace_count: number;
  error_count: number;
  error_rate: number;
  avg_duration: number;
  span_count: number;
}

const API_URL =
  process.env.NEXT_PUBLIC_AGENTTRACE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);

  if (!response.ok) {
    throw new Error(`AgentTrace API returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchTraces(): Promise<TraceSummary[]> {
  return request<TraceSummary[]>("/api/v1/traces");
}

export function fetchTrace(traceId: string): Promise<TraceDetail> {
  return request<TraceDetail>(`/api/v1/traces/${encodeURIComponent(traceId)}`);
}

export function fetchStats(): Promise<TraceStats> {
  return request<TraceStats>("/api/v1/stats");
}
