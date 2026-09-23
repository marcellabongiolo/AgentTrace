import asyncio

import pytest
import requests

from agenttrace import AgentTrace


class FakeResponse:
    def raise_for_status(self) -> None:
        return None


class FakeSession:
    def __init__(self) -> None:
        self.calls = []

    def post(self, url, json, headers, timeout):
        self.calls.append(
            {
                "url": url,
                "json": json,
                "headers": headers,
                "timeout": timeout,
            }
        )
        return FakeResponse()


def test_sync_trace_collects_nested_spans_and_exports():
    session = FakeSession()
    tracer = AgentTrace(
        endpoint="http://example.test/api/v1/traces",
        session=session,
        api_key="test-key",
    )

    @tracer.trace_agent("demo-agent")
    def run() -> str:
        with tracer.span("parent") as parent:
            parent.log_event("tool_call", "search", query="agent observability")
            with tracer.span("child") as child:
                child.set_metric("tokens_used", 12)
        return "ok"

    assert run() == "ok"
    assert tracer.last_trace is not None
    assert tracer.last_trace.status == "ok"
    assert [span.name for span in tracer.last_trace.spans] == ["child", "parent"]
    assert tracer.last_trace.spans[0].parent_id == tracer.last_trace.spans[1].span_id

    assert len(session.calls) == 1
    payload = session.calls[0]["json"]
    assert payload["name"] == "demo-agent"
    assert len(payload["spans"]) == 2
    assert session.calls[0]["headers"]["Authorization"] == "Bearer test-key"


def test_trace_records_exception_and_reraises():
    tracer = AgentTrace(auto_export=False)

    @tracer.trace_agent("broken-agent")
    def run() -> None:
        with tracer.span("failing-step"):
            raise RuntimeError("boom")

    with pytest.raises(RuntimeError, match="boom"):
        run()

    assert tracer.last_trace is not None
    assert tracer.last_trace.status == "error"
    assert tracer.last_trace.error == "boom"
    assert tracer.last_trace.spans[0].status == "error"


def test_async_agent_is_supported():
    tracer = AgentTrace(auto_export=False)

    @tracer.trace_agent("async-agent")
    async def run() -> int:
        with tracer.span("async-step") as span:
            span.set_metric("items", 3)
        return 3

    assert asyncio.run(run()) == 3
    assert tracer.last_trace is not None
    assert tracer.last_trace.status == "ok"
    assert tracer.last_trace.spans[0].metrics["items"] == 3


def test_export_failure_does_not_crash(monkeypatch):
    class BrokenSession:
        def post(self, *args, **kwargs):
            raise requests.ConnectionError("offline")

    tracer = AgentTrace(session=BrokenSession())

    assert tracer.send_trace({"trace_id": "trace-1"}) is False
