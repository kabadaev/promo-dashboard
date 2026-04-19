"use client";

import { useEffect, useMemo, useState } from "react";
import type { Promo } from "@/lib/sheets";

const COLORS = [
  "#7f77dd", "#1d9e75", "#d85a30", "#378add", "#ef9f27",
  "#d4537e", "#5dcaa5", "#f0997b", "#85b7eb", "#c0dd97",
  "#afa9ec", "#9fe1cb", "#f5c4b3", "#b5d4f4", "#fac775",
];

function colorForBrand(brand: string): string {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) {
    hash = (hash * 31 + brand.charCodeAt(i)) & 0xffffffff;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

const MONTHS_BG = [
  "януари", "февруари", "март", "април", "май", "юни",
  "юли", "август", "септември", "октомври", "ноември", "декември",
];

export default function CalendarPage() {
  const [promos, setPromos] = useState<Promo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/promos");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPromos(data.promos);
      // Default month = first promo's month
      if (data.promos?.length && !currentMonth) {
        const first = data.promos.reduce((m: string, p: Promo) =>
          !m || (p.start && p.start < m) ? p.start : m, "");
        if (first) setCurrentMonth(first.slice(0, 7));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Available months from promos
  const availableMonths = useMemo(() => {
    if (!promos) return [];
    const set = new Set<string>();
    for (const p of promos) {
      if (!p.start || !p.end) continue;
      const start = new Date(p.start + "T00:00:00Z");
      const end = new Date(p.end + "T00:00:00Z");
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        set.add(d.toISOString().slice(0, 7));
      }
    }
    return Array.from(set).sort();
  }, [promos]);

  // Promos that overlap the current month
  const monthPromos = useMemo(() => {
    if (!promos || !currentMonth) return [];
    const [y, m] = currentMonth.split("-").map(Number);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd = new Date(Date.UTC(y, m, 0));
    return promos.filter((p) => {
      if (!p.start || !p.end) return false;
      const pStart = new Date(p.start + "T00:00:00Z");
      const pEnd = new Date(p.end + "T00:00:00Z");
      return pEnd >= monthStart && pStart <= monthEnd;
    });
  }, [promos, currentMonth]);

  const daysInMonth = useMemo(() => {
    if (!currentMonth) return 30;
    const [y, m] = currentMonth.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }, [currentMonth]);

  const today = new Date().toISOString().slice(0, 10);

  if (loading && !promos) return <div className="loading">Зареждане...</div>;
  if (error && !promos) return <div className="error-box">{error}</div>;

  const [yr, mn] = currentMonth.split("-").map(Number);
  const monthLabel = currentMonth ? `${MONTHS_BG[mn - 1]} ${yr}` : "";

  return (
    <>
      <div className="header">
        <div>
          <h1>Календар</h1>
          <div className="meta">{monthPromos.length} кампании през {monthLabel}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            style={{
              padding: "8px 12px",
              fontSize: 13,
              border: "1px solid var(--border-strong)",
              borderRadius: 6,
              background: "var(--surface)",
              color: "var(--text)",
            }}
          >
            {availableMonths.map((ym) => {
              const [y, m] = ym.split("-").map(Number);
              return (
                <option key={ym} value={ym}>
                  {MONTHS_BG[m - 1]} {y}
                </option>
              );
            })}
          </select>
          <button className="refresh-btn" onClick={load} disabled={loading}>
            {loading ? "..." : "Обнови"}
          </button>
        </div>
      </div>

      {monthPromos.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0, textAlign: "center" }}>
            Няма активни кампании през {monthLabel}.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto", padding: "0.5rem" }}>
          <div style={{ minWidth: 800 }}>
            {/* Day numbers header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `180px repeat(${daysInMonth}, 1fr)`,
                borderBottom: "1px solid var(--border)",
                marginBottom: 8,
                paddingBottom: 4,
              }}
            >
              <div style={{ fontSize: 11, color: "var(--text-3)", padding: "4px 8px" }}>
                Кампания
              </div>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayStr = `${currentMonth}-${String(i + 1).padStart(2, "0")}`;
                const isToday = dayStr === today;
                const isWeekend = (() => {
                  const d = new Date(dayStr + "T00:00:00Z").getUTCDay();
                  return d === 0 || d === 6;
                })();
                return (
                  <div
                    key={i}
                    style={{
                      fontSize: 10,
                      textAlign: "center",
                      color: isToday ? "var(--accent)" : isWeekend ? "var(--text-3)" : "var(--text-2)",
                      fontWeight: isToday ? 500 : 400,
                      padding: "2px 0",
                    }}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>

            {/* Campaign rows */}
            {monthPromos.map((p, i) => {
              const pStart = new Date(p.start + "T00:00:00Z");
              const pEnd = new Date(p.end + "T00:00:00Z");
              const [y, m] = currentMonth.split("-").map(Number);
              const monthStart = new Date(Date.UTC(y, m - 1, 1));
              const monthEnd = new Date(Date.UTC(y, m, 0));
              const startDay = pStart < monthStart ? 1 : pStart.getUTCDate();
              const endDay = pEnd > monthEnd ? daysInMonth : pEnd.getUTCDate();
              const color = colorForBrand(p.brand);

              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: `180px repeat(${daysInMonth}, 1fr)`,
                    alignItems: "center",
                    padding: "3px 0",
                  }}
                  title={`${p.name} • ${p.brand} • ${p.start} → ${p.end}`}
                >
                  <div
                    style={{
                      padding: "4px 8px",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{p.brand}</span>
                    <span className="muted" style={{ marginLeft: 4, fontSize: 11 }}>
                      {p.manager}
                    </span>
                  </div>
                  {Array.from({ length: daysInMonth }, (_, d) => {
                    const day = d + 1;
                    const active = day >= startDay && day <= endDay;
                    const dayStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
                    const isToday = dayStr === today;
                    return (
                      <div
                        key={d}
                        style={{
                          height: 20,
                          background: active ? color : "transparent",
                          borderRight: isToday ? "1px solid var(--accent)" : "none",
                          borderRadius: active && day === startDay ? "4px 0 0 4px" : active && day === endDay ? "0 4px 4px 0" : 0,
                          marginRight: 1,
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: "1rem",
          fontSize: 12,
          color: "var(--text-3)",
        }}
      >
        Цвят = марка. Вертикалната линия маркира днешна дата. Скролирай за месеци с много кампании.
      </div>
    </>
  );
}
