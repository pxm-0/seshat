"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiFetch } from "../workspace/web-api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ needsSetup: boolean }>("/api/auth/setup-status").then((status) => {
      if (status.needsSetup) {
        window.location.href = "/setup";
      }
    });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      window.location.href = "/workspace";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-box stack" onSubmit={submit}>
        <div>
          <h1>Welcome back</h1>
          <p>Log in to your Seshat workspace.</p>
        </div>
        <label className="stack">
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label className="stack">
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary" type="submit">
          Log in
        </button>
      </form>
    </main>
  );
}
