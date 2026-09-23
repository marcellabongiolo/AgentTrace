from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class TraceEventPayload(BaseModel):
    event_type: str
    message: str
    timestamp: float
    attributes: dict[str, Any] = Field(default_factory=dict)


class SpanPayload(BaseModel):
    span_id: str
    trace_id: str | None = None
    parent_id: str | None = None
    name: str
    start_time: float
    end_time: float | None = None
    duration: float | None = None
    status: str
    error: str | None = None
    events: list[TraceEventPayload] = Field(default_factory=list)
    metrics: dict[str, Any] = Field(default_factory=dict)


class TracePayload(BaseModel):
    trace_id: str
    name: str
    start_time: float
    end_time: float | None = None
    duration: float | None = None
    status: str
    error: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    spans: list[SpanPayload] = Field(default_factory=list)
