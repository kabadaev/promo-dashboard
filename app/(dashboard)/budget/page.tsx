"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { MonthlyBudget, BudgetTrackerRow } from "@/lib/sheets";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function BudgetPage() {
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [tracker, setTracker] = useState<BudgetTrackerRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [b, t] = await Promise.all([
        fetch("/api/budget").then((r) => r.json()),
        fetch("/api/budget-tracker").then((r) => r.json()),
      ]);
      if (b.error) throw new Error(b.error);
      if (t.error) throw new Error(t.error);
      setBudget(b.budget);
      setTracker(t.tracker);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !budget) return <div className="loading">Зареждане...</div>;
  if (error && !budget) return <div className="error-box">{error}</div>;
  if (!budget) return null;

  const yearlyTotal = budget.paidAds.reduce((s, v) => s + v, 0);
  const metaTotal = budget.meta.reduce((s, v) => s + v, 0);
  const googleTotal = budget.google.reduce((s, v) => s + v, 0);
  const youtubeTotal = budget.youtube.reduce((s, v) => s + v, 0);

  const trackerTotal = (tracker || []).reduce((s, r) => s + r.monthlyBudget, 0);
  const trackerPlanned = (tracker || []).reduce((s, r) => s + r.plannedMedia, 0);
  const trackerRemaining = (tracker || []).reduce((s, r) => s + r.remaining, 0);

  return (
    <>
      <div className="header">
        <div>
          <h1>Бюджет</h1>
          <div className="meta">
            Годишен Paid Ads: {Math.round(yearlyTotal).toLocaleString("bg-BG")} €
          </div>
        </div>
        <button className="refresh-btn" onClick={load} disabled={loading}>
          {loading ? "..." : "Обнови"}
        </button>
      </div>

      <div className="section">
        <h2>Разпределение по канали</h2>
        <div className="kpis">
          <div className="kpi">
            <div className="lbl">Meta Ads</div>
            <div className="val" style={{ color: "#7f77dd" }}>
              {Math.round(metaTotal).toLocaleString("bg-BG")} €
            </div>
            <div className="note">
              {yearlyTotal > 0 ? Math.round((100 * metaTotal) / yearlyTotal) : 0}% от общото
            </div>
          </div>
          <div className="kpi">
            <div className="lbl">Google Ads</div>
            <div className="val" style={{ color: "#378add" }}>
              {Math.round(googleTotal).toLocaleString("bg-BG")} €
            </div>
            <div className="note">
              {yearlyTotal > 0 ? Math.round((100 * googleTotal) / yearlyTotal) : 0}% от общото
            </div>
          </div>
          <div className="kpi">
            <div className="lbl">YouTube Ads</div>
            <div className="val" style={{ color: "#ef9f27" }}>
              {Math.round(youtubeTotal).toLocaleString("bg-BG")} €
            </div>
            <div className="note">
              {yearlyTotal > 0 ? Math.round((100 * youtubeTotal) / yearlyTotal) : 0}% от общото
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Месечно разпределение</h2>
        <p className="sub">Paid Ads бюджет по канали и месеци</p>
        <div className="card">
          <div className="legend">
            <span>
              <span className="swatch" style={{ background: "#7f77dd" }} />
              Meta
            </span>
            <span>
              <span className="swatch" style={{ background: "#378add" }} />
              Google
            </span>
            <span>
              <span className="swatch" style={{ background: "#ef9f27" }} />
              YouTube
            </span>
          </div>
          <div className="chart-box" style={{ height: 300 }}>
            <Bar
              data={{
                labels: budget.months,
                datasets: [
                  { label: "Meta", data: budget.meta, backgroundColor: "#7f77dd", stack: "s" },
                  { label: "Google", data: budget.google, backgroundColor: "#378add", stack: "s" },
                  { label: "YouTube", data: budget.youtube, backgroundColor: "#ef9f27", stack: "s" },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { stacked: true, grid: { display: false }, ticks: { color: "#888" } },
                  y: {
                    stacked: true,
                    beginAtZero: true,
                    grid: { color: "rgba(128,128,128,0.15)" },
                    ticks: {
                      color: "#888",
                      callback: (v) => `${(Number(v) / 1000).toFixed(0)}k`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Budget Tracker</h2>
        <p className="sub">
          Месечни бюджети vs планирани медийни разходи по марка (от таб BUDGET_TRACKER)
        </p>
        <div className="kpis">
          <div className="kpi">
            <div className="lbl">Месечен бюджет общо</div>
            <div className="val">{Math.round(trackerTotal).toLocaleString("bg-BG")} €</div>
          </div>
          <div className="kpi">
            <div className="lbl">Планирани разходи</div>
            <div className="val" style={{ color: trackerPlanned > 0 ? "var(--text)" : "var(--text-3)" }}>
              {Math.round(trackerPlanned).toLocaleString("bg-BG")} €
            </div>
            <div className="note">
              {trackerPlanned === 0 ? "Табът не се поддържа" : "От всички марки"}
            </div>
          </div>
          <div className="kpi">
            <div className="lbl">Остатъчен бюджет</div>
            <div className="val">{Math.round(trackerRemaining).toLocaleString("bg-BG")} €</div>
          </div>
        </div>

        {tracker && tracker.length > 0 && (
          <div className="card" style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Марка</th>
                  <th className="num">Месечен бюджет</th>
                  <th className="num">Планиран разход</th>
                  <th className="num">Остатък</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {tracker.map((r) => {
                  const used = r.monthlyBudget > 0 ? (r.plannedMedia / r.monthlyBudget) * 100 : 0;
                  return (
                    <tr key={r.brand}>
                      <td style={{ fontWeight: 500 }}>{r.brand}</td>
                      <td className="num">{Math.round(r.monthlyBudget).toLocaleString("bg-BG")} €</td>
                      <td className="num">
                        {r.plannedMedia === 0 ? (
                          <span className="muted">0</span>
                        ) : (
                          `${Math.round(r.plannedMedia).toLocaleString("bg-BG")} €`
                        )}
                      </td>
                      <td className="num">{Math.round(r.remaining).toLocaleString("bg-BG")} €</td>
                      <td>
                        {r.plannedMedia === 0 ? (
                          <span className="muted" style={{ fontSize: 11 }}>непопълнен</span>
                        ) : (
                          <span className="badge">{Math.round(used)}% планирано</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
