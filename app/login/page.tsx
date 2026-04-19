"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/";
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(from);
      } else {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || "Грешна парола");
      }
    } catch {
      setErr("Възникна грешка при връзка със сървъра");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-box">
      <h1>Promo Dashboard</h1>
      <p>Въведи паролата за достъп</p>
      <form onSubmit={submit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Парола"
          autoFocus
          disabled={loading}
        />
        <button type="submit" disabled={loading || !password}>
          {loading ? "Изчакай..." : "Влез"}
        </button>
        <p className="err">{err}</p>
      </form>
    </div>
  );
}
