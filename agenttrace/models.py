from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class TraceEvent:
    """Structured application event attached to a span."""

    event_type: str
    message: str
    timestamp: float = field(default_factory=time.time)
    attributes: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_type": self.event_type,
            "message": self.message,
            "timestamp": self.timestamp,
            "attributes": self.attributes,
        }


@dataclass
class Span:
    """One timed operation inside an agent trace."""

    name: str
    trace_id: str | None = None
    parent_id: str | None = None
    span_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    start_time: float = field(default_factory=time.time)
    end_time: float | None = None
    status: str = "running"
    error: str | None = None
    events: list[TraceEvent] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)
    _on_enter: Callable[["Span"], None] | None = field(default=None, repr=False)
    _on_end: Callable[["Span"], None] | None = field(default=None, repr=False)
    _closed: bool = field(default=False, init=False, repr=False)

    @property
    def duration(self) -> float | None:
        if self.end_time is None:
            return None
        return round(self.end_time - self.start_time, 6)

    def log_event(
        self,
        event_type: str,
        message: str,
        **attributes: Any,
    ) -> TraceEvent:
        event = TraceEvent(
            event_type=event_type,
            message=message,
            attributes=attributes,
        )
        self.events.append(event)
        return event

    def log_thought(self, content: str) -> TraceEvent:
        """Backward-compatible alias for an application-provided decision summary.

        This method stores text supplied by the application. It is not intended
        to capture hidden model chain-of-thought.
        """
        return self.log_event("decision", content)

    def set_metric(self, key: str, value: Any) -> None:
        self.metrics[key] = value

    def end(self, status: str | None = None, error: str | None = None) -> None:
        if self._closed:
            return

        self.end_time = time.time()
        if status is not None:
            self.status = status
        elif self.status == "running":
            self.status = "ok"

        if error is not None:
            self.error = error
            self.status = "error"

        self._closed = True
        if self._on_end is not None:
            self._on_end(self)

    def to_dict(self) -> dict[str, Any]:
        return {
            "span_id": self.span_id,
            "trace_id": self.trace_id,
            "parent_id": self.parent_id,
            "name": self.name,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration,
            "status": self.status,
            "error": self.error,
            "events": [event.to_dict() for event in self.events],
            "metrics": self.metrics,
        }

    def __enter__(self) -> "Span":
        if self._on_enter is not None:
            self._on_enter(self)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        if exc_val is not None:
            self.log_event("error", str(exc_val), exception_type=exc_type.__name__)
            self.end(error=str(exc_val))
        else:
            self.end()
        return False


@dataclass
class Trace:
    """A complete agent execution containing zero or more spans."""

    name: str
    trace_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    start_time: float = field(default_factory=time.time)
    end_time: float | None = None
    status: str = "running"
    error: str | None = None
    spans: list[Span] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def duration(self) -> float | None:
        if self.end_time is None:
            return None
        return round(self.end_time - self.start_time, 6)

    def end(self, status: str | None = None, error: str | None = None) -> None:
        if self.end_time is not None:
            return

        self.end_time = time.time()
        if error is not None:
            self.error = error
            self.status = "error"
        elif status is not None:
            self.status = status
        elif self.status == "running":
            self.status = "ok"

    def to_dict(self) -> dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "name": self.name,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration": self.duration,
            "status": self.status,
            "error": self.error,
            "metadata": self.metadata,
            "spans": [span.to_dict() for span in self.spans],
        }
