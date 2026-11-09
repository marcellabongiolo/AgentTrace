# Deployment security

AgentTrace is a single-instance, self-hosted portfolio MVP. Do not expose the API directly to the internet.

## Protected local setup

Copy `.env.example` to `.env` and configure:

- `AGENTTRACE_API_KEY`: a random API credential used by the SDK and dashboard server.
- `AGENTTRACE_DASHBOARD_PASSWORD`: a unique password of 12–256 characters.
- `AGENTTRACE_SESSION_SECRET`: at least 32 random characters. Generate each secret independently, for example with `python -c "import secrets; print(secrets.token_urlsafe(32))"`.
- `AGENTTRACE_DASHBOARD_ORIGIN`: exactly `http://localhost:3000` locally, or the exact HTTPS origin when hosted. No trailing slash. Other HTTP origins fail closed.

Run `docker compose up --build`. Both Compose files bind API and dashboard ports to 127.0.0.1, require credentials and keep API credentials on the server. Sign in at http://localhost:3000. The SDK terminal must separately export the same API key; Python does not automatically load Compose's `.env`.

For development without Docker, configure dashboard variables in `web/.env.local`, plus `AGENTTRACE_INTERNAL_API_URL=http://localhost:8000` and the API key. Configure the API environment independently. Direct API execution still supports keyless trusted local use; always set the key before sharing a service.

## Session and request protections

The dashboard, its server-rendered data and every telemetry proxy request require a session. Missing configuration denies access. Login and logout accept POST only and check the exact configured Origin. Login accepts JSON with a 1 KiB body limit and a maximum 256-character password. Password comparisons use fixed-length hashes and constant-time comparison.

Sessions use 32 random bytes. The process stores only hashes bound to the session secret, with an eight-hour lifetime. Cookies are HttpOnly, SameSite=Lax, host-only and scoped to /. HTTPS origins enable Secure cookies; loopback HTTP works for local Docker. Logout revokes the server-side session, so a copied cookie no longer works. Restarting the server invalidates all sessions. Never log passwords, API keys or cookies.

The in-memory session store is limited to 1,000 active sessions and supports one Node process only. Do not use multiple replicas or independent workers without a shared session store. Login permits five attempts per minute per socket address, with a bounded address map; it intentionally does not trust forwarded IP headers. A reverse proxy may make all visitors share one address. Configure gateway rate limits for public traffic; application limits alone are insufficient for distributed abuse.

## Before public hosting

1. Serve the dashboard through HTTPS. Set its exact external origin, preserve the browser Origin header, and forward only to the private dashboard port.
2. Keep the upstream API private. Do not publicly map port 8000. Use a separate private ingestion path and protect its credentials; the API key authorizes both reads and writes.
3. Apply gateway request-size, connection and rate limits. CORS is not authentication. Keep dashboard hosting to a single process until sessions use a shared store.
4. Store credentials in the host secret manager; never use NEXT_PUBLIC variables for secrets. Back up SQLite, restrict volume access and define telemetry retention. Use synthetic demo traces.
5. Test login, rejected unauthenticated reads, logout/replay rejection and HTTPS cookie behavior at the actual hosted origin.

Shared-password login does not provide individual identities, password recovery, MFA, audit trails or tenant isolation. A publicly shared demo password allows all visitors to inspect the same telemetry. Use a dedicated synthetic-data instance or an identity-aware gateway for broader access.

## Validation

CI runs Python tests, frontend unit and interaction tests, type checking, production build, dependency audit, Docker builds and both Compose configurations. The production HTTP smoke check starts the built Next.js application and verifies login, SSR protection, authenticated proxy access, origin checks, logout and captured-cookie rejection. This check does not replace real-browser or hosted HTTPS verification.

Session design reference: [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). This reference is guidance, not a security certification.
