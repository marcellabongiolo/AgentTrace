from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


class TraceStore:
    """SQLite persistence for AgentTrace telemetry."""

    def __init__(self, path: str | Path = "data/agenttrace.db") -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS traces (
                    trace_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    start_time REAL NOT NULL,
                    end_time REAL,
                    duration REAL,
                    status TEXT NOT NULL,
                    error TEXT,
                    span_count INTEGER NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_traces_status ON traces(status)"
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_traces_created_at ON traces(created_at)"
            )

    def save_trace(self, trace: dict[str, Any]) -> None:
        payload = json.dumps(trace, separators=(",", ":"), sort_keys=True)
        span_count = len(trace.get("spans", []))

        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO traces (
                    trace_id,
                    name,
                    start_time,
                    end_time,
                    duration,
                    status,
                    error,
                    span_count,
                    payload_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(trace_id) DO UPDATE SET
                    name = excluded.name,
                    start_time = excluded.start_time,
                    end_time = excluded.end_time,
                    duration = excluded.duration,
                    status = excluded.status,
                    error = excluded.error,
                    span_count = excluded.span_count,
                    payload_json = excluded.payload_json
                """,
                (
                    trace["trace_id"],
                    trace["name"],
                    trace["start_time"],
                    trace.get("end_time"),
                    trace.get("duration"),
                    trace["status"],
                    trace.get("error"),
                    span_count,
                    payload,
                ),
            )

    def list_traces(
        self,
        limit: int = 50,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        sql = """
            SELECT
                trace_id,
                name,
                start_time,
                end_time,
                duration,
                status,
                error,
                span_count,
                created_at
            FROM traces
        """
        params: list[Any] = []

        if status:
            sql += " WHERE status = ?"
            params.append(status)

        sql += " ORDER BY created_at DESC, rowid DESC LIMIT ?"
        params.append(limit)

        with self._connect() as connection:
            rows = connection.execute(sql, params).fetchall()
        return [dict(row) for row in rows]

    def get_trace(self, trace_id: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload_json FROM traces WHERE trace_id = ?",
                (trace_id,),
            ).fetchone()

        if row is None:
            return None
        return json.loads(row["payload_json"])

    def stats(self) -> dict[str, Any]:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT
                    COUNT(*) AS trace_count,
                    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_count,
                    COALESCE(AVG(duration), 0) AS avg_duration,
                    COALESCE(SUM(span_count), 0) AS span_count
                FROM traces
                """
            ).fetchone()

        trace_count = int(row["trace_count"])
        error_count = int(row["error_count"] or 0)
        error_rate = (error_count / trace_count) if trace_count else 0.0

        return {
            "trace_count": trace_count,
            "error_count": error_count,
            "error_rate": round(error_rate, 4),
            "avg_duration": round(float(row["avg_duration"] or 0.0), 6),
            "span_count": int(row["span_count"] or 0),
        }
