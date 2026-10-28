# Deployment and security checklist

AgentTrace is a local/self-hosted MVP. **Do not expose the default Docker
Compose stack directly to the public internet.** The default configuration
does not require authentication and exposes the API on port 8000.

## Prerequisites for a public deployment

1. Select a hosting provider and a domain with HTTPS/TLS.
2. Configure a reverse proxy or gateway with authentication and authorization
   for **both** dashboard access and API requests. The browser currently makes
   direct, unauthenticated calls to the API; setting `AGENTTRACE_API_KEY`
   without adding a server-side proxy will break dashboard API access.
3. Store API keys and other credentials in the hosting provider's secrets
   manager. Never commit secrets or pass them through `NEXT_PUBLIC_*` values.
4. Restrict CORS to the deployed dashboard origin. CORS is **not** an
   authentication mechanism.
5. Mount a persistent volume for SQLite or migrate to a server database.
   Configure backups and a telemetry retention policy.
6. Add rate limits and request-size limits at the ingress proxy.
7. Protect against sensitive data in telemetry: log only application-provided
   non-secret event attributes, and use synthetic fixtures for public demos.
8. Verify the full deployment with an authenticated ingestion request,
   a trace-list request and the browser dashboard before announcing a URL.

## Safer private-host deployment

For private access on a machine where you control the network, the provided
`docker-compose.private.yml` override binds API and dashboard ports to
loopback only and requires a non-empty API key. It is intended for SSH tunnels
or a trusted authenticated gateway, **not** public exposure.

Set the required key locally (do not commit the value):

```bash
export AGENTTRACE_API_KEY="replace-with-a-long-random-secret"
docker compose -f docker-compose.yml -f docker-compose.private.yml up --build
```

The API then requires `Authorization: Bearer <key>` for telemetry routes.
`/health` remains unauthenticated. The dashboard will not be able to read
protected telemetry until you add a trusted server-side authenticated proxy;
that is an explicit limitation of this intermediate configuration.

## Recommended public architecture

```text
Browser -- HTTPS --> authenticated gateway --> Next.js dashboard
                          |
                          +--> authenticated API proxy --> FastAPI --> SQLite/PostgreSQL
Python SDK -- HTTPS + secret bearer token ------------------^
```

Do not put the ingestion API key in frontend JavaScript. A complete public
deployment should separate write-only ingestion credentials from browser
read permissions, and use user sessions for dashboard access.

## Verification

```bash
ruff check .
pytest -q --cov=agenttrace --cov-report=term-missing
docker compose -f docker-compose.yml -f docker-compose.private.yml config
```

The Docker Compose override is a hardening step, not evidence of a live
deployment. Publishing the service requires external hosting configuration
and a security review.
