import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";

type EventType = {
  title: string;
  description?: string | null;
  duration: number;
  slug: string;
};

type Slot = {
  start: string;
  end: string;
};

export function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [date, setDate] = useState(
    searchParams.get("date") || new Date().toISOString().slice(0, 10)
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  useEffect(() => {
    if (!slug) return;
    api
      .getEventTypePublic(slug)
      .then(setEventType)
      .catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setError(null);
    setSearchParams({ date });
    api
      .getSlots(slug, date, timezone)
      .then((data) => setSlots(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingSlots(false));
  }, [slug, date, timezone, setSearchParams]);

  const onBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !selectedSlot) return;
    try {
      const booking = await api.createBooking(slug, {
        name,
        email,
        start: selectedSlot.start,
        end: selectedSlot.end,
      });
      navigate(
        `/confirm?slug=${slug}&id=${booking.id}&start=${booking.start}&end=${booking.end}&title=${encodeURIComponent(
          eventType?.title || ""
        )}`
      );
    } catch (e: any) {
      setError(e.message || "Failed to create booking");
    }
  };

  if (!eventType) {
    return (
      <div className="public-shell">
        <div className="public-card">
          {error ? <div className="alert-error">{error}</div> : "Loading…"}
        </div>
      </div>
    );
  }

  return (
    <div className="public-shell">
      <div className="public-card">
        <div className="public-header">
          <div className="avatar-circle">DA</div>
          <div>
            <div className="muted-small">Default Admin</div>
            <h1 className="public-title">{eventType.title}</h1>
            <div className="muted-small">
              {eventType.duration} min · {timezone}
            </div>
          </div>
        </div>
        <div className="public-layout">
          <div className="public-column">
            <h3 className="section-title">Select a date</h3>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="muted-small">
              Times shown in your timezone ({timezone}).
            </p>
          </div>
          <div className="public-column">
            <h3 className="section-title">Select a time</h3>
            {loadingSlots ? (
              <div className="muted">Loading time slots…</div>
            ) : slots.length === 0 ? (
              <div className="muted">No available times for this date.</div>
            ) : (
              <div className="slots-grid">
                {slots.map((slot) => {
                  const startLocal = new Date(slot.start).toLocaleTimeString(
                    [],
                    { hour: "2-digit", minute: "2-digit" }
                  );
                  const key = slot.start;
                  const isSelected =
                    selectedSlot && selectedSlot.start === slot.start;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`slot-button ${
                        isSelected ? "selected" : ""
                      }`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {startLocal}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="public-column">
            <h3 className="section-title">Enter details</h3>
            <form className="form" onSubmit={onBook}>
              <label className="field">
                <span>Name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              {error && <div className="alert-error">{error}</div>}
              <button
                className="btn-primary"
                type="submit"
                disabled={!selectedSlot}
              >
                Confirm booking
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

