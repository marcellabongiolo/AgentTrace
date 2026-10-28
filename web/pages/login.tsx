import React, { useState } from "react";
import type { GetServerSideProps } from "next";
import { verifySession } from "../lib/session";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  if (verifySession(req.cookies.agenttrace_session, process.env.AGENTTRACE_SESSION_SECRET)) {
    return { redirect: { destination: "/", permanent: false } };
  }
  return { props: {} };
};

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError(response.status === 401 ? "Invalid password" : "Login unavailable");
      } else {
        window.location.assign("/");
      }
    } catch {
      setError("Unable to connect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#070b14", color: "#f8fafc", fontFamily: "system-ui" }}>
      <form onSubmit={(event) => void login(event)} style={{ padding: 32, border: "1px solid #334155", borderRadius: 12, width: "min(360px, 90vw)" }}>
        <h1>AgentTrace</h1>
        <p>Private monitoring dashboard</p>
        <label htmlFor="password">Dashboard password</label>
        <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", padding: 12, margin: "12px 0", borderRadius: 6 }} />
        {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
        <button type="submit" disabled={busy} style={{ padding: "10px 18px" }}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </main>
  );
}
