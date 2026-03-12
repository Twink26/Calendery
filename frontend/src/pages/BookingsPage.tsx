import React, { useEffect, useState } from "react";
import { api } from "../api/client";

type Booking = {
  id: number;
  name: string;
  email: string;
  start: string;
  end: string;
  status: string;
  eventType: {
    title: string;
  };
};

type BookingsResponse = {
  upcoming: Booking[];
  past: Booking[];
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function BookingsPage() {
  const [data, setData] = useState<BookingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "unconfirmed" | "recurring" | "past" | "canceled"
  >("upcoming");

  async function load() {
    setLoading(true);
    const result = await api.getBookings();
    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const onCancel = async (id: number) => {
    if (!confirm("Cancel this booking?")) return;
    await api.cancelBooking(id);
    await load();
  };

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];
  const canceled = past.filter((b) => b.status === "CANCELLED");

  const renderList = (items: Booking[], emptyLabel: string) => {
    if (loading) return <div className="muted">Loading…</div>;
    if (!items.length)
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <span role="img" aria-hidden="true">
              📅
            </span>
          </div>
          <div className="empty-title">{emptyLabel}</div>
          <p className="muted-small">
            Your {emptyLabel.toLowerCase()} will show up here.
          </p>
        </div>
      );

    return (
      <ul className="list">
        {items.map((b) => (
          <li key={b.id} className="list-item">
            <div>
              <div className="list-title">{b.eventType.title}</div>
              <div className="list-meta">
                {b.name} · {b.email}
              </div>
              <div className="list-meta">
                {formatDateTime(b.start)} – {formatDateTime(b.end)}
              </div>
            </div>
            <div className="list-actions">
              {b.status === "CONFIRMED" && activeTab === "upcoming" && (
                <button
                  type="button"
                  className="link-button danger"
                  onClick={() => onCancel(b.id)}
                >
                  Cancel
                </button>
              )}
              {activeTab !== "upcoming" && (
                <span className="badge subtle">
                  {b.status === "CANCELLED" ? "Cancelled" : "Completed"}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Bookings</h2>
          <p className="page-subtitle">
            See upcoming and past meetings across all event types.
          </p>
        </div>
      </div>
      <section className="card">
        <div className="tabs-toolbar">
          <div className="tabs-row">
            <button
              type="button"
              className={`tab-pill ${
                activeTab === "upcoming" ? "active" : ""
              }`}
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming
            </button>
            <button
              type="button"
              className={`tab-pill ${
                activeTab === "unconfirmed" ? "active" : ""
              }`}
              onClick={() => setActiveTab("unconfirmed")}
            >
              Unconfirmed
            </button>
            <button
              type="button"
              className={`tab-pill ${
                activeTab === "recurring" ? "active" : ""
              }`}
              onClick={() => setActiveTab("recurring")}
            >
              Recurring
            </button>
            <button
              type="button"
              className={`tab-pill ${
                activeTab === "past" ? "active" : ""
              }`}
              onClick={() => setActiveTab("past")}
            >
              Past
            </button>
            <button
              type="button"
              className={`tab-pill ${
                activeTab === "canceled" ? "active" : ""
              }`}
              onClick={() => setActiveTab("canceled")}
            >
              Canceled
            </button>
          </div>
          <button type="button" className="btn-ghost filter-button">
            <span className="filter-icon">⚙️</span>
            <span>Saved filters</span>
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "upcoming" &&
            renderList(upcoming, "No upcoming bookings")}
          {activeTab === "past" &&
            renderList(past, "No past bookings")}
          {activeTab === "canceled" &&
            renderList(canceled, "No canceled bookings")}
          {activeTab === "unconfirmed" &&
            renderList([], "No unconfirmed bookings")}
          {activeTab === "recurring" &&
            renderList([], "No recurring bookings")}
        </div>
      </section>
    </div>
  );
}

