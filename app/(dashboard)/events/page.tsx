"use client";

import { useEffect, useState } from "react";
import type { Event } from "@/lib/sheets";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEvents(data.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading && !events) return <div className="loading">Зареждане...</div>;
  if (error && !events) return <div className="error-box">{error}</div>;

  const list = events || [];

  return (
    <>
      <div className="header">
        <div>
          <h1>Събития</h1>
          <div className="meta">{list.length} записа</div>
        </div>
        <button className="refresh-btn" onClick={load} disabled={loading}>
          {loading ? "..." : "Обнови"}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0, textAlign: "center" }}>
            Няма регистрирани събития. Table Events в Google Sheets е празен.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Име</th>
                <th>Тип</th>
                <th>Марка</th>
                <th>Мениджър</th>
                <th>Начало</th>
                <th>Край</th>
                <th>Място</th>
                <th>Бюджет</th>
                <th>Реален разход</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>
                    {e.name}
                    {e.notes && (
                      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                        {e.notes}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge">{e.type || "—"}</span>
                  </td>
                  <td>{e.brand}</td>
                  <td>{e.manager}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{e.start || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{e.end || "—"}</td>
                  <td>{e.location || <span className="muted">—</span>}</td>
                  <td>{e.budget || <span className="muted">—</span>}</td>
                  <td>{e.actualCost || <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
