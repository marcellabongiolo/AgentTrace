"""Reproducible AgentTrace showcase: no model API keys or external LLM calls.

Run locally (without export):
    python -m agenttrace.examples.monitoring_demo

To populate a running local API/dashboard:
    python -m agenttrace.examples.monitoring_demo --export

The example instruments an application-defined agent-like workflow; its inputs
and outputs are deterministic fixtures, not actual LLM inference.
"""

from __future__ import annotations

import argparse

from agenttrace import AgentTrace

DOCUMENTS = (
    "Agent observability tracks execution latency and tool calls.",
    "Structured traces help debug agent failures and performance.",
    "Financial dashboards visualize spending over time.",
)


def run_demo(tracer: AgentTrace, query: str, fail: bool = False) -> str:
    """Run a deterministic workflow with nested spans and an optional failure."""

    @tracer.trace_agent("Document Research Agent")
    def research() -> str:
        with tracer.span("retrieve_documents") as retrieve:
            retrieve.log_event("tool_call", "Local document search", source="demo_fixture")
            matches = [doc for doc in DOCUMENTS if any(
                word in doc.lower() for word in query.lower().split()
            )]
            retrieve.set_metric("documents_scanned", len(DOCUMENTS))
            retrieve.set_metric("documents_matched", len(matches))

            with tracer.span("rank_results") as rank:
                rank.log_event("decision", "Application ranks fixture matches by length")
                matches.sort(key=len, reverse=True)
                rank.set_metric("result_count", len(matches))

        with tracer.span("prepare_summary") as summary:
            if fail:
                raise ValueError("Simulated summarization failure")
            summary.log_event("decision", "Application selects the first matching document")
            summary.set_metric("output_characters", len(matches[0]) if matches else 0)
            return matches[0] if matches else "No matching documents"

    return research()


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate example AgentTrace telemetry")
    parser.add_argument("--export", action="store_true", help="Send traces to the local API")
    parser.add_argument("--endpoint", default=None, help="Override ingestion URL")
    parser.add_argument("--runs", type=int, default=3, help="Number of runs (default: 3)")
    args = parser.parse_args()
    if args.runs < 1:
        parser.error("--runs must be at least 1")

    tracer = AgentTrace(endpoint=args.endpoint, auto_export=args.export)
    for index in range(args.runs):
        fail = index % 3 == 2
        try:
            result = run_demo(tracer, "agent observability", fail=fail)
            print(f"Run {index + 1}: ok - {result}")
        except ValueError as exc:
            print(f"Run {index + 1}: expected demo error - {exc}")

        trace = tracer.last_trace
        if trace is not None:
            print(f"  trace_id={trace.trace_id} status={trace.status} spans={len(trace.spans)}")
            if args.export:
                print("  export requested (check API/dashboard to confirm ingestion)")


if __name__ == "__main__":
    main()
