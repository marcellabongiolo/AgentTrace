from urllib.parse import urlparse

from fastapi.testclient import TestClient

from agenttrace import AgentTrace
from agenttrace.api import create_app


class ClientSessionAdapter:
    """Small requests.Session-compatible adapter backed by FastAPI TestClient."""

    def __init__(self, client: TestClient) -> None:
        self.client = client

    def post(self, url, json, headers, timeout):
        path = urlparse(url).path
        return self.client.post(path, json=json, headers=headers)


def test_sdk_exports_trace_into_api_and_sqlite(tmp_path):
    app = create_app(tmp_path / "e2e.db")
    client = TestClient(app)
    tracer = AgentTrace(
        endpoint="http://testserver/api/v1/traces",
        session=ClientSessionAdapter(client),
    )

    @tracer.trace_agent("research-agent")
    def run() -> str:
        with tracer.span("search") as span:
            span.log_event("tool_call", "Fetched a document", tool="search")
            span.set_metric("tokens_used", 32)
        return "done"

    assert run() == "done"

    listing = client.get("/api/v1/traces")
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    trace_id = listing.json()[0]["trace_id"]
    detail = client.get(f"/api/v1/traces/{trace_id}")
    assert detail.status_code == 200
    assert detail.json()["name"] == "research-agent"
    assert detail.json()["spans"][0]["events"][0]["event_type"] == "tool_call"
    assert detail.json()["spans"][0]["metrics"]["tokens_used"] == 32
