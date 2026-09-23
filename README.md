# AgentTrace

AgentTrace is a portfolio-scale observability platform for AI-agent applications. It provides a Python tracing SDK, a FastAPI ingestion/query service, SQLite persistence and a Next.js dashboard for inspecting structured execution telemetry.

The project records **application-provided events, tool calls, metrics and errors**. It does not attempt to capture hidden model chain-of-thought.

## What is implemented

- Python SDK with `@trace_agent`, nested spans and sync/async support.
- Structured span events, metrics, durations and error capture.
- HTTP telemetry export that does not crash the instrumented application when the backend is unavailable.
- FastAPI ingestion and query API.
- SQLite persistence for trace payloads.
- Trace list, detail and aggregate statistics endpoints.
- Optional bearer API-key protection.
- Next.js + TypeScript dashboard connected to the live API.
- Trace/span tree with events, metrics, status and latency.
- Python unit, API, persistence and end-to-end integration tests.
- Ruff linting, pytest coverage gate and GitHub Actions CI.
- Docker images for the API and dashboard plus Docker Compose for local development.

## Architecture

```text
Instrumented Python agent
        |
        | HTTP telemetry
        v
+-----------------------+
| AgentTrace FastAPI    |
| ingestion/query API   |
+-----------+-----------+
            |
            v
+-----------------------+
| SQLite trace store    |
+-----------+-----------+
            |
            | REST API
            v
+-----------------------+
| Next.js dashboard     |
+-----------------------+
```

The SDK, storage layer, API and dashboard are kept separate so each layer can be replaced or scaled independently.

## Quick start with Docker

Requirements: Docker and Docker Compose.

```bash
git clone https://github.com/marcellabongiolo/AgentTrace.git
cd AgentTrace
docker compose up --build
```

Then open:

- Dashboard: `http://localhost:3000`
- API health: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`

The Compose stack stores SQLite data in a named Docker volume.

## Local development

AgentTrace requires Python 3.10+.

### Backend and SDK

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn agenttrace.api:app --reload
```

### Dashboard

In another terminal:

```bash
cd web
npm install
npm run dev
```

The dashboard expects the API at `http://localhost:8000` unless
`NEXT_PUBLIC_AGENTTRACE_API_URL` is configured differently.

## Instrument an agent

```python
from agenttrace import AgentTrace

tracer = AgentTrace()

@tracer.trace_agent("research-agent")
def run_agent(query: str) -> str:
    with tracer.span("search") as span:
        span.log_event(
            "tool_call",
            "Fetched documents from the search tool",
            query=query,
            result_count=4,
        )
        span.set_metric("tokens_used", 128)

    with tracer.span("summarize") as span:
        span.log_event(
            "decision",
            "Application selected the highest-ranked documents for summarization",
        )

    return "complete"

run_agent("Swiss enterprise statistics")
```

By default, the SDK exports completed traces to
`http://localhost:8000/api/v1/traces`.

Useful environment variables are documented in `.env.example`.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Service health check |
| POST | `/api/v1/traces` | Store or update a trace |
| GET | `/api/v1/traces` | List recent trace summaries |
| GET | `/api/v1/traces/{trace_id}` | Retrieve a full trace |
| GET | `/api/v1/stats` | Aggregate trace statistics |

If `AGENTTRACE_API_KEY` is set on the API, telemetry routes require:

```text
Authorization: Bearer <key>
```

The health endpoint remains public.

## Telemetry model

A **trace** represents one complete agent execution. A trace contains **spans**, and spans can contain:

- structured events such as `tool_call`, `decision` and `error`;
- arbitrary metrics such as token usage, latency or item counts;
- parent/child relationships for nested operations;
- status, duration and error information.

The SDK keeps a backward-compatible `log_thought()` method, but it is only an alias for an application-provided decision event. It should not be used to store hidden model reasoning.

## Tests and quality

Run the Python checks locally with:

```bash
ruff check .
pytest -q --cov=agenttrace --cov-report=term-missing
```

The repository enforces an 80% coverage threshold through the coverage configuration.

Validate the frontend with:

```bash
cd web
npm install
npm run typecheck
npm run build
```

GitHub Actions runs the Python matrix on 3.10, 3.11 and 3.12, validates the Next.js build and builds both Docker images.

## Security and deployment notes

This repository is designed as a strong local/self-hosted MVP, not a multi-tenant production observability service.

- API-key authentication is optional and intentionally simple.
- SQLite is appropriate for the local MVP; a production deployment would normally use a server database.
- The browser dashboard does not send API secrets. For authenticated production deployments, place the dashboard behind a server-side proxy or another authentication layer.
- No provider-specific OpenAI, Anthropic, LangChain, CrewAI or AutoGen integration is claimed yet.
- Prompt replay, distributed tracing backends, retention policies and automated guardrails are future extensions rather than implemented features.

## Project structure

```text
agenttrace/
  api.py          FastAPI service
  models.py       Trace, span and event models
  schemas.py      API validation models
  sdk.py          Instrumentation SDK
  storage.py      SQLite persistence
  examples/
    basic_agent.py

tests/
  test_sdk.py
  test_api.py
  test_storage.py
  test_end_to_end.py

web/
  components/
  lib/
  pages/
  Dockerfile

.github/workflows/
  ci.yml

Dockerfile
docker-compose.yml
```

## Roadmap

Possible next steps include PostgreSQL storage, OpenTelemetry adapters, retention controls, server-side dashboard authentication and optional framework integrations.

## License

The package metadata currently declares Apache-2.0. A production open-source release should include the full license file and release process before publishing to a package registry.
