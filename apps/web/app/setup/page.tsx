"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiFetch } from "../workspace/web-api";

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ needsSetup: boolean }>("/api/auth/setup-status").then((status) => {
      if (!status.needsSetup) {
        window.location.href = "/login";
      }
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await apiFetch("/api/auth/setup", {
        method: "POST",
        body: JSON.stringify({ email, displayName, password }),
      });
      window.location.href = "/workspace";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Setup failed.");
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-box stack" onSubmit={submit}>
        <div>
          <h1>Set up Seshat</h1>
          <p>Create the single admin account for this self-hosted workspace.</p>
        </div>
        <label className="stack">
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label className="stack">
          Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <label className="stack">
          Password
          <input
            value={password}
            minLength={10}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" type="submit">
          Create admin
        </button>
      </form>
    </main>
  );
}
