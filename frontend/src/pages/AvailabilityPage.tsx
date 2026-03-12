import React, { useEffect, useState } from "react";
import { api } from "../api/client";

type Rule = {
  id?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function AvailabilityPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAvailability()
      .then((data) => setRules(data))
      .catch((e) => setError(e.message));
  }, []);

  const toggleDay = (dayIndex: number) => {
    const existing = rules.filter((r) => r.dayOfWeek === dayIndex);
    if (existing.length === 0) {
      setRules([
        ...rules,
        {
          dayOfWeek: dayIndex,
          startTime: "09:00",
          endTime: "17:00",
        },
      ]);
    } else {
      setRules(rules.filter((r) => r.dayOfWeek !== dayIndex));
    }
  };

  const updateRule = (
    dayIndex: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setRules(
      rules.map((r) =>
        r.dayOfWeek === dayIndex ? { ...r, [field]: value } : r
      )
    );
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.saveAvailability(
        rules.map(({ id, ...rest }) => rest) // server recreates rules
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Availability</h2>
          <p className="page-subtitle">
            Set when you are available for meetings.
          </p>
        </div>
      </div>
      <section className="card">
        <h3 className="card-title">Weekly hours</h3>
        {error && <div className="alert-error">{error}</div>}
        <div className="availability-grid">
          {days.map((day, index) => {
            const rule = rules.find((r) => r.dayOfWeek === index);
            const enabled = !!rule;
            return (
              <div key={day} className="availability-row">
                <label className="availability-label">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleDay(index)}
                  />
                  <span>{day}</span>
                </label>
                {enabled ? (
                  <div className="availability-times">
                    <input
                      type="time"
                      value={rule!.startTime}
                      onChange={(e) =>
                        updateRule(index, "startTime", e.target.value)
                      }
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={rule!.endTime}
                      onChange={(e) =>
                        updateRule(index, "endTime", e.target.value)
                      }
                    />
                  </div>
                ) : (
                  <span className="muted">Unavailable</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="form-actions">
          <button
            className="btn-primary"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save availability"}
          </button>
        </div>
      </section>
    </div>
  );
}

