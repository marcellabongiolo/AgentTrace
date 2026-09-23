from __future__ import annotations

import inspect
import os
from contextvars import ContextVar
from functools import wraps
from typing import Any, Callable, TypeVar, cast

import requests

from .models import Span, Trace

F = TypeVar("F", bound=Callable[..., Any])


class AgentTrace:
    """Small synchronous/async tracing client for instrumenting agent workflows."""

    def __init__(
        self,
        api_key: str | None = None,
        endpoint: str | None = None,
        timeout: float = 5.0,
        session: requests.Session | None = None,
        auto_export: bool = True,
    ) -> None:
        self.api_key = api_key or os.getenv("AGENTTRACE_API_KEY")
        self.endpoint = endpoint or os.getenv(
            "AGENTTRACE_ENDPOINT",
            "http://localhost:8000/api/v1/traces",
        )
        self.timeout = timeout
        self.session = session or requests.Session()
        self.auto_export = auto_export
        self.last_trace: Trace | None = None

        instance_id = id(self)
        self._current_trace: ContextVar[Trace | None] = ContextVar(
            f"agenttrace_current_trace_{instance_id}",
            default=None,
        )
        self._span_stack: ContextVar[tuple[Span, ...]] = ContextVar(
            f"agenttrace_span_stack_{instance_id}",
            default=(),
        )

    def _begin_trace(self, name: str) -> tuple[Trace, Any]:
        trace = Trace(name=name)
        token = self._current_trace.set(trace)
        self._span_stack.set(())
        return trace, token

    def _finish_trace(
        self,
        trace: Trace,
        token: Any,
        error: BaseException | None = None,
    ) -> None:
        if error is not None:
            trace.end(error=str(error))
        else:
            trace.end()

        self.last_trace = trace
        self._current_trace.reset(token)
        self._span_stack.set(())

        if self.auto_export:
            self.send_trace(trace.to_dict())

    def _on_span_enter(self, span: Span) -> None:
        stack = self._span_stack.get()
        self._span_stack.set((*stack, span))

    def _on_span_end(self, span: Span) -> None:
        trace = self._current_trace.get()
        if trace is not None and all(existing.span_id != span.span_id for existing in trace.spans):
            trace.spans.append(span)

        stack = self._span_stack.get()
        if stack and stack[-1].span_id == span.span_id:
            self._span_stack.set(stack[:-1])
        else:
            self._span_stack.set(tuple(item for item in stack if item.span_id != span.span_id))

    def span(self, name: str) -> Span:
        """Create a span attached to the current trace, when one is active."""
        trace = self._current_trace.get()
        stack = self._span_stack.get()
        parent_id = stack[-1].span_id if stack else None

        return Span(
            name=name,
            trace_id=trace.trace_id if trace else None,
            parent_id=parent_id,
            _on_enter=self._on_span_enter,
            _on_end=self._on_span_end,
        )

    def send_trace(self, trace_data: dict[str, Any]) -> bool:
        """Export telemetry to the configured ingestion endpoint.

        Export failures never crash the instrumented application. The method
        returns False when the backend cannot be reached.
        """
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            response = self.session.post(
                self.endpoint,
                json=trace_data,
                headers=headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
        except requests.RequestException:
            return False

        return True

    def trace_agent(self, name: str) -> Callable[[F], F]:
        """Decorator that records one trace around a sync or async function."""

        def decorator(func: F) -> F:
            if inspect.iscoroutinefunction(func):

                @wraps(func)
                async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                    trace, token = self._begin_trace(name)
                    error: BaseException | None = None
                    try:
                        return await func(*args, **kwargs)
                    except BaseException as exc:
                        error = exc
                        raise
                    finally:
                        self._finish_trace(trace, token, error)

                return cast(F, async_wrapper)

            @wraps(func)
            def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
                trace, token = self._begin_trace(name)
                error: BaseException | None = None
                try:
                    return func(*args, **kwargs)
                except BaseException as exc:
                    error = exc
                    raise
                finally:
                    self._finish_trace(trace, token, error)

            return cast(F, sync_wrapper)

        return decorator
