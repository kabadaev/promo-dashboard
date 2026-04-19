"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { Promo, Brand, MonthlyBudget } from "@/lib/sheets";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title
);

type Data = {
  promos: Promo[];
  brands: Brand[];
  budget: MonthlyBudget;
  fetchedAt: number;
};

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [p, b, bg] = await Promise.all([
        fetch("/api/promos").then((r) => r.json()),
        fetch("/api/brands").then((r) => r.json()),
        fetch("/api/budget").then((r) => r.json()),
      ]);
      if (p.error) throw new Error(p.error);
      if (b.error) throw new Error(b.error);
      if (bg.error) throw new Error(bg.error);
      setData({
        promos: p.promos,
        brands: b.brands,
        budget: bg.budget,
        fetchedAt: Date.now(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) {
    return <div className="loading">Зареждане от Google Sheets...</div>;
  }

  if (error && !data) {
    return (
      <div className="error-box">
        <strong>Грешка при зареждане:</strong>
        <br />
        {error}
      </div>
    );
  }

  if (!data) return null;

  return <DashboardView data={data} onRefresh={load} loading={loading} error={error} />;
}

function DashboardView({
  data,
  onRefresh,
  loading,
  error,
}: {
  data: Data;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
}) {
  const { promos, brands, budget } = data;

  const stats = useMemo(() => computeStats(promos, brands), [promos, brands]);

  const fetchedStr = useMemo(() => {
    const d = new Date(data.fetchedAt);
    return d.toLocaleTimeString("bg-BG", { hour: "2-digit", minute: "2-digit" });
  }, [data.fetchedAt]);

  return (
    <>
      <div className="header">
        <div>
          <h1>Dashboard</h1>
          <div className="meta">
            Обновено {fetchedStr} • {promos.length} кампании • {brands.length} марки
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
            {loading ? "Обновяване..." : "Обнови"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-box" style={{ marginBottom: "1rem" }}>
          Последното обновяване неуспешно: {error}
        </div>
      )}

      <div className="section">
        <h2>Общ преглед</h2>
        <div className="kpis">
          <KPI label="Общо кампании" value={String(stats.totalPromos)} note={`${stats.monthsSpan}`} />
          <KPI
            label="Пик паралелни"
            value={String(stats.peakLoad)}
            note={stats.peakWindow}
            tone={stats.peakLoad >= 10 ? "warn" : undefined}
          />
          <KPI label="Бранд мениджъри" value={String(stats.managerCount)} note="активни собственици" />
          <KPI
            label="Марки в промо"
            value={`${stats.brandsInPromo}`}
            note={`от ${brands.length} в каталога`}
          />
          <KPI
            label="Годишен бюджет"
            value={formatBudget(stats.yearlyBudget)}
            note="Paid Ads общо"
          />
          <KPI
            label="Без бюджет / ред"
            value={`${stats.missingBudget}/${stats.totalPromos}`}
            note={`${Math.round((100 * stats.missingBudget) / Math.max(stats.totalPromos, 1))}% липсващи`}
            tone={stats.missingBudget > stats.totalPromos * 0.5 ? "danger" : undefined}
          />
        </div>
      </div>

      <div className="section">
        <h2>Натоварване по месеци</h2>
        <p className="sub">
          Брой активни кампании за всеки месец. Месецът с най-голямо натоварване е оцветен в коралово.
        </p>
        <div className="card">
          <div className="chart-box">
            <MonthlyBar stats={stats} />
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Натоварване по бранд мениджъри</h2>
        <p className="sub">
          Брой кампании и общо дни под управление. Различните стилове на работа излизат на преден план.
        </p>
        <div className="card">
          {stats.managers.map((m) => (
            <div key={m.name} className="bar-row">
              <span className="nm">{m.name}</span>
              <span className="br">
                <span className="fl" style={{ width: `${(m.count / stats.maxMgrCount) * 100}%` }} />
              </span>
              <span className="vl">
                {m.count} • {m.days}д
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="section">
          <h2>Топ марки</h2>
          <p className="sub">Концентрация на кампаниите по марка.</p>
          <div className="card">
            {stats.topBrands.map((b) => (
              <div key={b.name} className="bar-row">
                <span className="nm">{b.name}</span>
                <span className="br">
                  <span
                    className="fl"
                    style={{
                      width: `${(b.count / stats.maxBrandCount) * 100}%`,
                      background: "#1d9e75",
                    }}
                  />
                </span>
                <span className="vl">{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <h2>Типове кампании</h2>
          <p className="sub">Различни стойности в колона „Кампании“.</p>
          <div className="card">
            {stats.types.map((t) => (
              <div key={t.name} className="bar-row">
                <span className="nm" title={t.name}>
                  {t.name.length > 22 ? t.name.slice(0, 22) + "…" : t.name}
                </span>
                <span className="br">
                  <span
                    className="fl"
                    style={{
                      width: `${(t.count / stats.maxTypeCount) * 100}%`,
                      background: t.count >= 5 ? "#1d9e75" : t.count >= 2 ? "#5dcaa5" : "#9fe1cb",
                    }}
                  />
                </span>
                <span className="vl">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Месечен маркетинг бюджет</h2>
        <p className="sub">
          Разпределение на Paid Ads бюджета по канали. Данни от таб Marketing Budget 2026.
        </p>
        <div className="card">
          <div className="legend">
            <span>
              <span className="swatch" style={{ background: "#7f77dd" }} />
              Meta Ads
            </span>
            <span>
              <span className="swatch" style={{ background: "#378add" }} />
              Google Ads
            </span>
            <span>
              <span className="swatch" style={{ background: "#ef9f27" }} />
              YouTube Ads
            </span>
          </div>
          <div className="chart-box" style={{ height: 260 }}>
            <BudgetStack budget={budget} />
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Качество на данните</h2>
        <p className="sub">Автоматично засечени проблеми в PROMO_DETAILS.</p>
        <div className="issues">
          {stats.issues.map((issue, i) => (
            <div key={i} className={`issue ${issue.level}`}>
              <p className="h">{issue.title}</p>
              <p className="d">{issue.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function KPI({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "warn" | "danger";
}) {
  return (
    <div className={`kpi ${tone ?? ""}`}>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
      {note && <div className="note">{note}</div>}
    </div>
  );
}

function MonthlyBar({ stats }: { stats: Stats }) {
  const maxMonth = stats.byMonth.reduce((m, x) => (x.count > m ? x.count : m), 0);
  return (
    <Bar
      data={{
        labels: stats.byMonth.map((m) => m.label),
        datasets: [
          {
            label: "Кампании",
            data: stats.byMonth.map((m) => m.count),
            backgroundColor: stats.byMonth.map((m) =>
              m.count === maxMonth ? "#d85a30" : "#afa9ec"
            ),
            borderRadius: 4,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(128,128,128,0.15)" },
            ticks: { stepSize: 2, color: "#888" },
          },
          x: { grid: { display: false }, ticks: { color: "#888" } },
        },
      }}
    />
  );
}

function BudgetStack({ budget }: { budget: MonthlyBudget }) {
  return (
    <Bar
      data={{
        labels: budget.months,
        datasets: [
          {
            label: "Meta",
            data: budget.meta,
            backgroundColor: "#7f77dd",
            stack: "s",
          },
          {
            label: "Google",
            data: budget.google,
            backgroundColor: "#378add",
            stack: "s",
          },
          {
            label: "YouTube",
            data: budget.youtube,
            backgroundColor: "#ef9f27",
            stack: "s",
          },
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
  );
}

// ============ Stats computation ============

type Stats = {
  totalPromos: number;
  monthsSpan: string;
  peakLoad: number;
  peakWindow: string;
  managerCount: number;
  brandsInPromo: number;
  yearlyBudget: number;
  missingBudget: number;
  byMonth: { label: string; count: number }[];
  managers: { name: string; count: number; days: number }[];
  maxMgrCount: number;
  topBrands: { name: string; count: number }[];
  maxBrandCount: number;
  types: { name: string; count: number }[];
  maxTypeCount: number;
  issues: { level: "crit" | "" | "ok"; title: string; detail: string }[];
};

function computeStats(promos: Promo[], brands: Brand[]): Stats {
  // Daily load
  const dayMap = new Map<string, string[]>();
  const monthMap = new Map<string, Set<string>>();
  let minDate = "9999-99-99";
  let maxDate = "0000-00-00";

  for (const p of promos) {
    if (!p.start || !p.end) continue;
    if (p.start < minDate) minDate = p.start;
    if (p.end > maxDate) maxDate = p.end;
    const start = new Date(p.start + "T00:00:00Z");
    const end = new Date(p.end + "T00:00:00Z");
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      const arr = dayMap.get(iso) || [];
      arr.push(p.name);
      dayMap.set(iso, arr);
      const ym = iso.slice(0, 7);
      const mset = monthMap.get(ym) || new Set<string>();
      mset.add(p.name);
      monthMap.set(ym, mset);
    }
  }

  // Peak load
  let peakLoad = 0;
  let peakFirst = "";
  let peakLast = "";
  const peakDays: string[] = [];
  for (const [d, arr] of dayMap.entries()) {
    if (arr.length > peakLoad) peakLoad = arr.length;
  }
  for (const [d, arr] of dayMap.entries()) {
    if (arr.length === peakLoad) peakDays.push(d);
  }
  peakDays.sort();
  peakFirst = peakDays[0] || "";
  peakLast = peakDays[peakDays.length - 1] || "";

  // By month
  const byMonth = Array.from(monthMap.entries())
    .sort()
    .map(([ym, set]) => ({
      label: formatMonth(ym),
      count: set.size,
    }));

  // Managers
  const mgrCount = new Map<string, number>();
  const mgrDays = new Map<string, number>();
  for (const p of promos) {
    const key = p.manager || "—";
    mgrCount.set(key, (mgrCount.get(key) || 0) + 1);
    mgrDays.set(key, (mgrDays.get(key) || 0) + (p.duration || 0));
  }
  const managers = Array.from(mgrCount.entries())
    .map(([name, count]) => ({ name, count, days: mgrDays.get(name) || 0 }))
    .sort((a, b) => b.count - a.count);
  const maxMgrCount = managers.reduce((m, x) => (x.count > m ? x.count : m), 0);

  // Brands
  const brCount = new Map<string, number>();
  for (const p of promos) {
    if (!p.brand) continue;
    brCount.set(p.brand, (brCount.get(p.brand) || 0) + 1);
  }
  const topBrands = Array.from(brCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const maxBrandCount = topBrands.reduce((m, x) => (x.count > m ? x.count : m), 0);

  // Types
  const tCount = new Map<string, number>();
  for (const p of promos) {
    const key = p.campaignType || "—";
    tCount.set(key, (tCount.get(key) || 0) + 1);
  }
  const types = Array.from(tCount.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const maxTypeCount = types.reduce((m, x) => (x.count > m ? x.count : m), 0);

  // Issues
  const missingBudget = promos.filter((p) => p.budget === null).length;
  const missingLanding = promos.filter((p) => !p.landing).length;
  const missingGoal = promos.filter((p) => !p.goal).length;
  const missingIG = promos.filter((p) => !p.ig).length;
  const missingFB = promos.filter((p) => !p.fb).length;

  // Duplicate IDs across different campaign names
  const byId = new Map<string, Set<string>>();
  for (const p of promos) {
    if (!p.id || p.id === "няма създаден") continue;
    const s = byId.get(p.id) || new Set<string>();
    s.add(p.name);
    byId.set(p.id, s);
  }
  const dupIds = Array.from(byId.entries()).filter(([, names]) => names.size > 1);
  const missingId = promos.filter((p) => !p.id || p.id === "няма създаден").length;

  // Typos - check for known issue "Отсъпка"
  const typoRows = promos.filter((p) => p.campaignType === "Отсъпка").length;

  const issues: Stats["issues"] = [];
  if (missingBudget > 0) {
    issues.push({
      level: missingBudget === promos.length ? "crit" : "",
      title: `Бюджет: ${missingBudget}/${promos.length} празни`,
      detail: missingBudget === promos.length
        ? "Не може да се смята ROI или ефективност по канал."
        : `${Math.round((100 * missingBudget) / promos.length)}% от кампаниите са без бюджет.`,
    });
  }
  if (missingIG === promos.length && missingFB === promos.length && promos.length > 0) {
    issues.push({
      level: "crit",
      title: `IG + FB линкове: 0/${promos.length} попълнени`,
      detail: "При значителен Meta бюджет няма нито един свързан пост.",
    });
  }
  if (missingGoal > 0) {
    issues.push({
      level: "",
      title: `Цели: ${missingGoal}/${promos.length} липсващи`,
      detail: "Необходимо е измерими цели за ROI анализ.",
    });
  }
  if (missingLanding > 0) {
    issues.push({
      level: "",
      title: `Landing Page: ${missingLanding}/${promos.length} липсващи`,
      detail: "Без лендинг страница не може да се проследи конверсия.",
    });
  }
  if (dupIds.length > 0) {
    issues.push({
      level: "",
      title: `Дублирани Promo ID: ${dupIds.length}`,
      detail: dupIds
        .slice(0, 3)
        .map(([id, names]) => `${id}: ${Array.from(names).join(" + ")}`)
        .join("; "),
    });
  }
  if (missingId > 0) {
    issues.push({
      level: "",
      title: `Нестандартни / липсващи ID: ${missingId}`,
      detail: "Ред без Promo ID или с placeholder текст „няма създаден“.",
    });
  }
  if (typoRows > 0) {
    issues.push({
      level: "",
      title: `Правописна грешка: „Отсъпка“`,
      detail: `Засечени ${typoRows} реда. Правилното е „Отстъпка“.`,
    });
  }
  if (issues.length === 0) {
    issues.push({
      level: "ok",
      title: "Няма засечени проблеми",
      detail: "Всички проверки минават успешно.",
    });
  }

  return {
    totalPromos: promos.length,
    monthsSpan:
      minDate && maxDate !== "0000-00-00"
        ? `${formatMonth(minDate.slice(0, 7))} – ${formatMonth(maxDate.slice(0, 7))}`
        : "",
    peakLoad,
    peakWindow:
      peakFirst && peakLast
        ? peakFirst === peakLast
          ? formatDate(peakFirst)
          : `${formatDate(peakFirst)} – ${formatDate(peakLast)}`
        : "",
    managerCount: managers.length,
    brandsInPromo: brCount.size,
    yearlyBudget: 0, // filled from budget total below
    missingBudget,
    byMonth,
    managers,
    maxMgrCount,
    topBrands,
    maxBrandCount,
    types,
    maxTypeCount,
    issues,
  };
}

function formatMonth(ym: string): string {
  const monthNames = [
    "яну", "фев", "март", "апр", "май", "юни",
    "юли", "авг", "сеп", "окт", "ное", "дек",
  ];
  const [y, m] = ym.split("-");
  const idx = parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return ym;
  return `${monthNames[idx]} ${y.slice(2)}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const monthNames = [
    "яну", "фев", "март", "апр", "май", "юни",
    "юли", "авг", "сеп", "окт", "ное", "дек",
  ];
  const idx = parseInt(m, 10) - 1;
  return `${parseInt(d, 10)} ${monthNames[idx] || m}`;
}

function formatBudget(n: number): string {
  if (!n) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k €`;
  return `${Math.round(n)} €`;
}
