import React, { useEffect, useState } from "react";
import { api } from "../api/client";

type Rule = {
  id?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type Schedule = {
  id: number;
  name: string;
  isDefault: boolean;
};

type Override = {
  id?: number;
  date: string; // YYYY-MM-DD
  isBlocked: boolean;
  startTime?: string;
  endTime?: string;
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
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState<number | null>(
    null
  );
  const [rules, setRules] = useState<Rule[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [timezone, setTimezone] = useState<string>("UTC");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAvailability()
      .then((data) => {
        setTimezone(data.timezone || "UTC");
        setSchedules(data.schedules);
        setActiveScheduleId(data.activeScheduleId);
        setRules(data.rules);
        setOverrides(
          data.overrides.map((o: any) => ({
            ...o,
            date: o.date.slice(0, 10),
          }))
        );
      })
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
    if (!activeScheduleId) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveAvailability({
        scheduleId: activeScheduleId,
        name:
          schedules.find((s) => s.id === activeScheduleId)?.name ||
          "Schedule",
        setDefault:
          schedules.find((s) => s.id === activeScheduleId)?.isDefault ??
          true,
        rules: rules.map(({ id, ...rest }) => rest),
        overrides: overrides.map(({ id, ...rest }) => rest),
      });
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
            Configure times when you are available for bookings.
          </p>
        </div>
      </div>
      <section className="card">
        <div className="schedule-row">
          <div className="schedule-left">
            <label className="field">
              <span>Schedule</span>
              <select
                value={activeScheduleId ?? ""}
                onChange={(e) =>
                  setActiveScheduleId(Number(e.target.value))
                }
              >
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
              <div className="muted-small" style={{ marginTop: 4 }}>
                Timezone: {timezone}
              </div>
            </label>
          </div>
          <div className="schedule-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                const active = schedules.find(
                  (s) => s.id === activeScheduleId
                );
                const created = await api.createSchedule({
                  name: active
                    ? `${active.name} copy`
                    : `Schedule ${schedules.length + 1}`,
                  cloneFromId: activeScheduleId,
                  setDefault: false,
                });
                setSchedules([
                  ...schedules,
                  created.schedule,
                ]);
                setActiveScheduleId(created.schedule.id);
                setRules(created.rules);
                setOverrides(
                  created.overrides.map((o: any) => ({
                    ...o,
                    date: o.date.slice(0, 10),
                  }))
                );
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                if (!activeScheduleId) return;
                if (
                  !confirm(
                    "Delete this schedule? At least one schedule must remain."
                  )
                )
                  return;
                await api.deleteSchedule(activeScheduleId);
                const fresh = await api.getAvailability();
                setTimezone(fresh.timezone || "UTC");
                setSchedules(fresh.schedules);
                setActiveScheduleId(fresh.activeScheduleId);
                setRules(fresh.rules);
                setOverrides(
                  fresh.overrides.map((o: any) => ({
                    ...o,
                    date: o.date.slice(0, 10),
                  }))
                );
              }}
            >
              Delete
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                const created = await api.createSchedule({
                  name: `Schedule ${schedules.length + 1}`,
                  setDefault: schedules.length === 0,
                });
                setSchedules([...schedules, created.schedule]);
                setActiveScheduleId(created.schedule.id);
                setRules(created.rules);
                setOverrides(
                  created.overrides.map((o: any) => ({
                    ...o,
                    date: o.date.slice(0, 10),
                  }))
                );
              }}
            >
              + New
            </button>
          </div>
        </div>

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
        <h3 className="card-title" style={{ marginTop: 14 }}>
          Date overrides
        </h3>
        <div className="overrides-grid">
          {overrides.map((o, idx) => (
            <div key={idx} className="override-row">
              <input
                type="date"
                value={o.date}
                onChange={(e) => {
                  const next = [...overrides];
                  next[idx] = { ...o, date: e.target.value };
                  setOverrides(next);
                }}
              />
              <label className="availability-label">
                <input
                  type="checkbox"
                  checked={o.isBlocked}
                  onChange={(e) => {
                    const next = [...overrides];
                    next[idx] = {
                      ...o,
                      isBlocked: e.target.checked,
                    };
                    setOverrides(next);
                  }}
                />
                <span>Block all day</span>
              </label>
              {!o.isBlocked && (
                <div className="availability-times">
                  <input
                    type="time"
                    value={o.startTime || "09:00"}
                    onChange={(e) => {
                      const next = [...overrides];
                      next[idx] = {
                        ...o,
                        startTime: e.target.value,
                      };
                      setOverrides(next);
                    }}
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={o.endTime || "17:00"}
                    onChange={(e) => {
                      const next = [...overrides];
                      next[idx] = {
                        ...o,
                        endTime: e.target.value,
                      };
                      setOverrides(next);
                    }}
                  />
                </div>
              )}
              <button
                type="button"
                className="link-button danger"
                onClick={() =>
                  setOverrides(overrides.filter((_, i) => i !== idx))
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-ghost"
            onClick={() =>
              setOverrides([
                ...overrides,
                {
                  date: new Date().toISOString().slice(0, 10),
                  isBlocked: true,
                },
              ])
            }
          >
            + Add override
          </button>
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

