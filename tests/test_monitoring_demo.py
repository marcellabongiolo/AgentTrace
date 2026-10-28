import pytest

from agenttrace import AgentTrace
from agenttrace.examples.monitoring_demo import run_demo


def test_demo_records_successful_nested_spans_without_network():
    tracer = AgentTrace(auto_export=False)
    result = run_demo(tracer, "agent observability")

    assert "observability" in result.lower()
    trace = tracer.last_trace
    assert trace is not None
    assert trace.status == "ok"
    assert {span.name for span in trace.spans} == {
        "retrieve_documents", "rank_results", "prepare_summary"
    }
    retrieve = next(span for span in trace.spans if span.name == "retrieve_documents")
    ranking = next(span for span in trace.spans if span.name == "rank_results")
    assert ranking.parent_id == retrieve.span_id
    assert retrieve.metrics["documents_scanned"] == 3
    assert retrieve.metrics["documents_matched"] >= 1
    assert retrieve.events[0].event_type == "tool_call"


def test_demo_records_failed_trace_and_error_event():
    tracer = AgentTrace(auto_export=False)

    with pytest.raises(ValueError, match="Simulated summarization failure"):
        run_demo(tracer, "agent observability", fail=True)

    trace = tracer.last_trace
    assert trace is not None
    assert trace.status == "error"
    assert trace.error == "Simulated summarization failure"
    failed = next(span for span in trace.spans if span.name == "prepare_summary")
    assert failed.status == "error"
    assert any(event.event_type == "error" for event in failed.events)


def test_demo_no_matching_documents():
    tracer = AgentTrace(auto_export=False)
    assert run_demo(tracer, "unmatched-token-xyz") == "No matching documents"
