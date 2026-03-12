import React from "react";
import { useSearchParams } from "react-router-dom";

export function BookingConfirmationPage() {
  const [params] = useSearchParams();
  const title = params.get("title") || "Meeting";
  const start = params.get("start");
  const end = params.get("end");

  const startStr = start
    ? new Date(start).toLocaleString()
    : "Scheduled time";
  const endStr = end ? new Date(end).toLocaleString() : "";

  return (
    <div className="public-shell">
      <div className="public-card">
        <h1 className="public-title">Booking confirmed</h1>
        <p className="page-subtitle">
          You&apos;re scheduled for <strong>{title}</strong>.
        </p>
        <div className="card confirmation-card">
          <div className="list-title">{startStr}</div>
          {endStr && <div className="list-meta">Ends at {endStr}</div>}
        </div>
        <p className="muted">
          A confirmation email would normally be sent here (out of scope for
          this demo).
        </p>
      </div>
    </div>
  );
}

