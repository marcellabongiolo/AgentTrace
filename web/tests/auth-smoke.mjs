import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";

const origin = "http://127.0.0.1:3100";
const password = "ci-only-dashboard-password";
let reads = 0;
const upstream = createServer((req, res) => {
  assert.equal(req.headers.authorization, "Bearer ci-only-api-key");
  reads++;
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ traces: [] }));
});
upstream.listen(0, "127.0.0.1");
await once(upstream, "listening");
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "3100"], {
  stdio: "inherit",
  env: { ...process.env, AGENTTRACE_DASHBOARD_PASSWORD: password, AGENTTRACE_SESSION_SECRET: "ci-only-session-secret-at-least-32-characters", AGENTTRACE_DASHBOARD_ORIGIN: origin, AGENTTRACE_API_KEY: "ci-only-api-key", AGENTTRACE_INTERNAL_API_URL: `http://127.0.0.1:${upstream.address().port}` },
});
const call = (path, options = {}) => fetch(origin + path, { redirect: "manual", ...options });
const post = (path, body, extra = {}) => call(path, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...extra }, body: JSON.stringify(body) });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error("Dashboard exited before startup");
    try { if ((await call("/login")).status === 200) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, "Production dashboard starts");
  assert.equal((await call("/")).headers.get("location"), "/login");
  assert.equal((await call("/api/telemetry/traces")).status, 401);
  assert.equal(reads, 0);
  assert.equal((await post("/api/login", { password }, { Origin: "https://other.example" })).status, 403);
  assert.equal((await post("/api/login", { password: "wrong" })).status, 401);
  const login = await post("/api/login", { password });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  const session = cookie.split(";")[0];
  const headers = { Cookie: session };
  assert.equal((await call("/", { headers })).status, 200, "SSR shares the login session");
  const data = await call("/api/telemetry/traces", { headers });
  assert.equal(data.status, 200, "Telemetry route shares the login session");
  assert.deepEqual(await data.json(), { traces: [] });
  assert.equal(reads, 1);
  assert.equal((await post("/api/logout", {}, { ...headers, Origin: "https://other.example" })).status, 403);
  assert.equal((await call("/api/telemetry/traces", { headers })).status, 200);
  assert.equal((await post("/api/logout", {}, headers)).status, 200);
  assert.equal((await call("/api/telemetry/traces", { headers })).status, 401, "Captured session cannot be replayed after logout");
  assert.equal((await call("/", { headers })).headers.get("location"), "/login");
  console.log("Production HTTP authentication smoke checks passed");
} finally {
  child.kill("SIGTERM");
  upstream.close();
}
