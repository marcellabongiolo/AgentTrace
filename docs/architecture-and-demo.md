# AgentTrace architecture and reproducible demo

AgentTrace is a **self-hosted observability MVP** for instrumented Python
applications. It collects application-provided telemetry; it does **not**
capture hidden chain-of-thought or automatically instrument external LLMs.

## Data flow

```mermaid
flowchart LR
  A[Python application] -->|SDK spans and events| B[HTTP POST /api/v1/traces]
  B --> C[FastAPI validation]
  C --> D[(SQLite)]
  D --> E[GET traces and stats]
  E --> F[Next.js dashboard]
```

### Component responsibilities

| Component | Responsibility |
| --- | --- |
| `agenttrace/sdk.py` | Decorator, span context, error capture and optional HTTP export |
| `agenttrace/models.py` | Trace, span and event representation |
| `agenttrace/api.py` | HTTP ingestion, queries and optional bearer key |
| `agenttrace/storage.py` | SQLite persistence and aggregate statistics |
| `web/pages/index.tsx` | Browser dashboard, filtering, refresh and trace inspection |

**Data boundaries:** The application decides which event messages and attributes
are logged. Do not log credentials, personal data or sensitive prompts. The
example below uses fixed, non-sensitive strings.

## Five-minute local demo

Copy `.env.example` to `.env` and configure the API key, dashboard password and session secret using the [security guide](deployment-security.md). Start the API and dashboard with Docker Compose from the repository root:

```bash
docker compose up --build
```

In another terminal, export `AGENTTRACE_API_KEY` with the same value as `.env`, install the Python SDK and run the demonstration:

```bash
python -m pip install -e .
python -m agenttrace.examples.monitoring_demo --export --runs 3
```

Open `http://localhost:3000`, sign in with the configured password and click **Refresh data**. You should see
`Document Research Agent` executions with nested `retrieve_documents`,
`rank_results` and `prepare_summary` spans. The third run intentionally
raises an exception to show how failures are represented.

To generate telemetry **without sending it anywhere**:

```bash
python -m agenttrace.examples.monitoring_demo --runs 3
```

To point the SDK to another ingestion endpoint:

```bash
python -m agenttrace.examples.monitoring_demo --export \
  --endpoint http://localhost:8000/api/v1/traces
```

Compose requires `AGENTTRACE_API_KEY`; set the same key in the SDK environment. **Do not commit secrets.** The Next.js server authenticates dashboard sessions and proxies approved read-only requests with the API key. The browser never receives this key.

### What is real vs. simulated?

- **Real:** Python SDK instrumentation, span nesting, event and metric capture,
  error propagation, HTTP ingestion, SQLite storage and dashboard queries.
- **Simulated:** The demo's document retrieval, ranking and failure condition.
  It uses a deterministic local fixture; no model inference, paid API, external
  search engine or provider-specific integration is involved.

## Quality checks

```bash
ruff check .
pytest -q --cov=agenttrace --cov-report=term-missing
cd web
npm ci
npm test
npm run typecheck
npm run build
```

The repository CI also builds the API and dashboard Docker images.

## Design trade-offs and next steps

- **SQLite** is simple for local evaluation; concurrent production workloads
  may need a server database, retention policies and migrations.
- **HTTP export** is easy to integrate but is not a durable delivery queue.
  The SDK intentionally does not crash applications when export fails.
- **Optional API key** is a starting point, not full user authentication or
  authorization. Protect the deployment before exposing real telemetry.
- **Manual refresh** is not streaming or real-time push monitoring.
- **Dashboard login** uses shared-password, revocable in-memory sessions and bounded login attempts. It supports one process and has no individual identities. Public hosting still requires HTTPS, a private API and gateway limits.
- Future improvements: OpenTelemetry adapters, role-based access, shared session storage and deployment automation.

For the full repository overview, see [README](../README.md).
