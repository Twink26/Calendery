import React from "react";
import { Link, useLocation } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};

const navItems = [
  { to: "/", label: "Event Types" },
  { to: "/availability", label: "Availability" },
  { to: "/bookings", label: "Bookings" },
];

export function DashboardLayout({ children }: Props) {
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">cal-clone</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`sidebar-link ${isActive ? "active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="topbar-title">Scheduling</h1>
            <p className="topbar-subtitle">
              Manage event types, availability, and bookings.
            </p>
          </div>
          <div className="topbar-avatar">DA</div>
        </header>
        <section className="main-content">{children}</section>
      </main>
    </div>
  );
}

