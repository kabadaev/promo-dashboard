"use client";

import { useEffect, useMemo, useState } from "react";
import type { Brand } from "@/lib/sheets";

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segmentFilter, setSegmentFilter] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brands");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBrands(data.brands);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const segments = useMemo(() => {
    if (!brands) return [];
    return Array.from(new Set(brands.map((b) => b.segment).filter(Boolean))).sort();
  }, [brands]);

  const filtered = useMemo(() => {
    if (!brands) return [];
    const list = segmentFilter ? brands.filter((b) => b.segment === segmentFilter) : brands;
    return [...list].sort((a, b) => b.annualBudget - a.annualBudget);
  }, [brands, segmentFilter]);

  const totalAnnual = useMemo(
    () => filtered.reduce((sum, b) => sum + b.annualBudget, 0),
    [filtered]
  );

  const maxBudget = useMemo(
    () => filtered.reduce((m, b) => (b.annualBudget > m ? b.annualBudget : m), 0),
    [filtered]
  );

  if (loading && !brands) return <div className="loading">Зареждане...</div>;
  if (error && !brands) return <div className="error-box">{error}</div>;

  return (
    <>
      <div className="header">
        <div>
          <h1>Марки</h1>
          <div className="meta">
            {filtered.length} марки • общо {Math.round(totalAnnual).toLocaleString("bg-BG")} €
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              border: "1px solid var(--border-strong)",
              borderRadius: 6,
              background: "var(--surface)",
              color: "var(--text)",
            }}
          >
            <option value="">Всички сегменти</option>
            {segments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="refresh-btn" onClick={load} disabled={loading}>
            {loading ? "..." : "Обнови"}
          </button>
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Марка</th>
              <th>Мениджър</th>
              <th>Сегмент</th>
              <th>Роля</th>
              <th className="num">Годишен бюджет</th>
              <th className="num">Месечен</th>
              <th>Дял</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const share = totalAnnual > 0 ? (b.annualBudget / totalAnnual) * 100 : 0;
              const barPct = maxBudget > 0 ? (b.annualBudget / maxBudget) * 100 : 0;
              return (
                <tr key={b.brand}>
                  <td style={{ fontWeight: 500 }}>{b.brand}</td>
                  <td>{b.manager}</td>
                  <td>
                    {b.segment ? <span className="badge">{b.segment}</span> : <span className="muted">—</span>}
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {b.role || "—"}
                  </td>
                  <td className="num">{Math.round(b.annualBudget).toLocaleString("bg-BG")} €</td>
                  <td className="num">{Math.round(b.monthlyBudget).toLocaleString("bg-BG")} €</td>
                  <td style={{ minWidth: 120 }}>
                    <div
                      style={{
                        height: 6,
                        background: "var(--surface-2)",
                        borderRadius: 3,
                        overflow: "hidden",
                        marginBottom: 2,
                      }}
                    >
                      <div
                        style={{
                          width: `${barPct}%`,
                          height: "100%",
                          background: "var(--accent)",
                        }}
                      />
                    </div>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {share.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
