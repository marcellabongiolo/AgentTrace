from fastapi.testclient import TestClient

from agenttrace.api import create_app


def trace_payload(trace_id: str = "trace-1") -> dict:
    return {
        "trace_id": trace_id,
        "name": "portfolio-agent",
        "start_time": 100.0,
        "end_time": 101.25,
        "duration": 1.25,
        "status": "ok",
        "error": None,
        "metadata": {"environment": "test"},
        "spans": [
            {
                "span_id": "span-1",
                "trace_id": trace_id,
                "parent_id": None,
                "name": "market-data",
                "start_time": 100.1,
                "end_time": 100.5,
                "duration": 0.4,
                "status": "ok",
                "error": None,
                "events": [
                    {
                        "event_type": "tool_call",
                        "message": "Fetched market data",
                        "timestamp": 100.2,
                        "attributes": {"source": "demo"},
                    }
                ],
                "metrics": {"tokens_used": 25},
            }
        ],
    }


def test_ingest_list_detail_and_stats(tmp_path):
    app = create_app(tmp_path / "api.db")
    client = TestClient(app)
    payload = trace_payload()

    response = client.post("/api/v1/traces", json=payload)
    assert response.status_code == 201
    assert response.json()["trace_id"] == "trace-1"

    listing = client.get("/api/v1/traces")
    assert listing.status_code == 200
    assert listing.json()[0]["name"] == "portfolio-agent"

    detail = client.get("/api/v1/traces/trace-1")
    assert detail.status_code == 200
    assert detail.json()["spans"][0]["events"][0]["event_type"] == "tool_call"

    stats = client.get("/api/v1/stats")
    assert stats.status_code == 200
    assert stats.json()["trace_count"] == 1
    assert stats.json()["span_count"] == 1


def test_missing_trace_returns_404(tmp_path):
    client = TestClient(create_app(tmp_path / "api.db"))

    response = client.get("/api/v1/traces/does-not-exist")

    assert response.status_code == 404


def test_optional_api_key_protects_telemetry_routes(tmp_path):
    client = TestClient(
        create_app(
            tmp_path / "secure.db",
            api_key="secret-key",
        )
    )

    unauthorized = client.get("/api/v1/traces")
    assert unauthorized.status_code == 401

    headers = {"Authorization": "Bearer secret-key"}
    authorized = client.post(
        "/api/v1/traces",
        json=trace_payload(),
        headers=headers,
    )
    assert authorized.status_code == 201

    health = client.get("/health")
    assert health.status_code == 200
