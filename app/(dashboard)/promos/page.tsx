"use client";

import { useEffect, useMemo, useState } from "react";
import type { Promo } from "@/lib/sheets";

type SortKey = "start" | "end" | "brand" | "manager" | "duration" | "name";

export default function PromosPage() {
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mgrFilter, setMgrFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("start");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/promos");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPromos(data.promos);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const managers = useMemo(() => {
    if (!promos) return [];
    return Array.from(new Set(promos.map((p) => p.manager).filter(Boolean))).sort();
  }, [promos]);

  const brands = useMemo(() => {
    if (!promos) return [];
    return Array.from(new Set(promos.map((p) => p.brand).filter(Boolean))).sort();
  }, [promos]);

  const filtered = useMemo(() => {
    if (!promos) return [];
    const q = search.toLowerCase().trim();
    let list = promos.filter((p) => {
      if (mgrFilter && p.manager !== mgrFilter) return false;
      if (brandFilter && p.brand !== brandFilter) return false;
      if (q) {
        const hay = `${p.name} ${p.brand} ${p.manager} ${p.campaignType} ${p.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av || "");
      const bs = String(bv || "");
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return list;
  }, [promos, search, mgrFilter, brandFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function statusBadge(p: Promo): { text: string; cls: string } {
    const today = new Date().toISOString().slice(0, 10);
    if (!p.start || !p.end) return { text: "—", cls: "" };
    if (p.end < today) return { text: "приключи", cls: "" };
    if (p.start <= today) return { text: "активна", cls: "ok" };
    return { text: "предстои", cls: "warn" };
  }

  if (loading && !promos) return <div className="loading">Зареждане...</div>;
  if (error && !promos) return <div className="error-box">{error}</div>;

  return (
    <>
      <div className="header">
        <div>
          <h1>Промоции</h1>
          <div className="meta">
            {filtered.length} от {promos?.length || 0} реда
          </div>
        </div>
        <button className="refresh-btn" onClick={load} disabled={loading}>
          {loading ? "..." : "Обнови"}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Търсене..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 200px",
            padding: "8px 12px",
            fontSize: 13,
            border: "1px solid var(--border-strong)",
            borderRadius: 6,
            background: "var(--surface)",
            color: "var(--text)",
          }}
        />
        <select
          value={mgrFilter}
          onChange={(e) => setMgrFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: 13,
            border: "1px solid var(--border-strong)",
            borderRadius: 6,
            background: "var(--surface)",
            color: "var(--text)",
          }}
        >
          <option value="">Всички мениджъри</option>
          {managers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: 13,
            border: "1px solid var(--border-strong)",
            borderRadius: 6,
            background: "var(--surface)",
            color: "var(--text)",
          }}
        >
          <option value="">Всички марки</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("name")}>
                Кампания{sortKey === "name" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("brand")}>
                Марка{sortKey === "brand" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("manager")}>
                Мениджър{sortKey === "manager" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("start")}>
                Начало{sortKey === "start" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
              </th>
              <th style={{ cursor: "pointer" }} onClick={() => toggleSort("end")}>
                Край{sortKey === "end" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
              </th>
              <th className="num" style={{ cursor: "pointer" }} onClick={() => toggleSort("duration")}>
                Дни{sortKey === "duration" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
              </th>
              <th>Тип</th>
              <th>Статус</th>
              <th>Лендинг</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const status = statusBadge(p);
              return (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    {p.goal && (
                      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                        Цел: {p.goal}
                      </div>
                    )}
                  </td>
                  <td>{p.brand}</td>
                  <td>{p.manager}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{p.start}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{p.end}</td>
                  <td className="num">{p.duration}</td>
                  <td>
                    <span className="badge">{p.campaignType || "—"}</span>
                  </td>
                  <td>
                    <span className={`badge ${status.cls}`}>{status.text}</span>
                  </td>
                  <td>
                    {p.landing ? (
                      <a href={p.landing} target="_blank" rel="noopener noreferrer">
                        отвори
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--text-3)" }}>
                  Няма резултати с тези филтри.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
