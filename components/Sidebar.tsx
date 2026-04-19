"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    group: "Преглед",
    items: [{ href: "/", label: "Dashboard" }],
  },
  {
    group: "Данни",
    items: [
      { href: "/promos", label: "Промоции" },
      { href: "/calendar", label: "Календар" },
      { href: "/events", label: "Събития" },
    ],
  },
  {
    group: "Бюджети",
    items: [
      { href: "/brands", label: "Марки" },
      { href: "/budget", label: "Месечен бюджет" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <p className="title">Promo Dashboard</p>
        <p className="sub">ANOMALY & DYNAPHOS</p>
      </div>
      <nav>
        {NAV.map((group) => (
          <div key={group.group}>
            <div className="group-label">{group.group}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href ? "active" : ""}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="foot">
        <button onClick={logout}>Изход</button>
      </div>
    </aside>
  );
}
