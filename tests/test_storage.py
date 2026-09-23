from agenttrace.storage import TraceStore


def sample_trace(trace_id: str = "trace-1", status: str = "ok") -> dict:
    return {
        "trace_id": trace_id,
        "name": "demo-agent",
        "start_time": 10.0,
        "end_time": 11.5,
        "duration": 1.5,
        "status": status,
        "error": "boom" if status == "error" else None,
        "metadata": {"environment": "test"},
        "spans": [
            {
                "span_id": "span-1",
                "trace_id": trace_id,
                "parent_id": None,
                "name": "search",
                "start_time": 10.1,
                "end_time": 10.4,
                "duration": 0.3,
                "status": "ok",
                "error": None,
                "events": [],
                "metrics": {"tokens_used": 12},
            }
        ],
    }


def test_save_list_and_get_trace(tmp_path):
    store = TraceStore(tmp_path / "traces.db")
    trace = sample_trace()

    store.save_trace(trace)

    summaries = store.list_traces()
    assert len(summaries) == 1
    assert summaries[0]["trace_id"] == "trace-1"
    assert summaries[0]["span_count"] == 1

    stored = store.get_trace("trace-1")
    assert stored == trace


def test_store_upserts_same_trace_id(tmp_path):
    store = TraceStore(tmp_path / "traces.db")
    trace = sample_trace()
    store.save_trace(trace)

    trace["status"] = "error"
    trace["error"] = "updated"
    store.save_trace(trace)

    assert len(store.list_traces()) == 1
    stored = store.get_trace("trace-1")
    assert stored["status"] == "error"
    assert stored["error"] == "updated"


def test_stats_and_status_filter(tmp_path):
    store = TraceStore(tmp_path / "traces.db")
    store.save_trace(sample_trace("trace-ok"))
    store.save_trace(sample_trace("trace-error", status="error"))

    error_traces = store.list_traces(status="error")
    stats = store.stats()

    assert [item["trace_id"] for item in error_traces] == ["trace-error"]
    assert stats["trace_count"] == 2
    assert stats["error_count"] == 1
    assert stats["error_rate"] == 0.5
    assert stats["span_count"] == 2
