from __future__ import annotations

import hmac
import os
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from .schemas import TracePayload
from .storage import TraceStore


def create_app(
    database_path: str | Path | None = None,
    api_key: str | None = None,
) -> FastAPI:
    app = FastAPI(
        title="AgentTrace API",
        version="0.1.0",
        description="Ingestion and query API for structured AI-agent execution traces.",
    )

    configured_key = api_key
    if configured_key is None:
        configured_key = os.getenv("AGENTTRACE_API_KEY")

    database = database_path or os.getenv("AGENTTRACE_DATABASE", "data/agenttrace.db")
    app.state.store = TraceStore(database)

    origins = [
        item.strip()
        for item in os.getenv(
            "AGENTTRACE_CORS_ORIGINS",
            "http://localhost:3000",
        ).split(",")
        if item.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def require_api_key(
        authorization: Annotated[str | None, Header()] = None,
    ) -> None:
        if not configured_key:
            return

        expected = f"Bearer {configured_key}"
        if authorization is None or not hmac.compare_digest(authorization, expected):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing API key",
            )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post(
        "/api/v1/traces",
        status_code=status.HTTP_201_CREATED,
        dependencies=[Depends(require_api_key)],
    )
    def ingest_trace(trace: TracePayload) -> dict[str, str]:
        app.state.store.save_trace(trace.model_dump())
        return {"trace_id": trace.trace_id, "status": "stored"}

    @app.get(
        "/api/v1/traces",
        dependencies=[Depends(require_api_key)],
    )
    def list_traces(
        limit: Annotated[int, Query(ge=1, le=200)] = 50,
        trace_status: Annotated[str | None, Query(alias="status")] = None,
    ) -> list[dict]:
        return app.state.store.list_traces(limit=limit, status=trace_status)

    @app.get(
        "/api/v1/traces/{trace_id}",
        dependencies=[Depends(require_api_key)],
    )
    def trace_detail(trace_id: str) -> dict:
        trace = app.state.store.get_trace(trace_id)
        if trace is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trace not found",
            )
        return trace

    @app.get(
        "/api/v1/stats",
        dependencies=[Depends(require_api_key)],
    )
    def stats() -> dict:
        return app.state.store.stats()

    return app


app = create_app()
