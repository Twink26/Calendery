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

// SVG icons
const IconBack = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 4L6 8l4 4" />
  </svg>
);

const IconPencil = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M11 2l3 3-8 8H3v-3L11 2z" />
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 4h10M6 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M6 7v5M10 7v5" />
    <rect x="2" y="4" width="12" height="10" rx="1.5" stroke="currentColor" />
  </svg>
);

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="5" y="4" width="8" height="10" rx="1.5" />
    <path d="M3 2h7a1 1 0 011 1v1" />
  </svg>
);

const IconInfo = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 7v4M8 5.5v.5" />
  </svg>
);

function fmt12(val: string): string {
  if (!val) return "";
  const [h, m] = val.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function AvailabilityPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeScheduleId, setActiveScheduleId] = useState<number | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [timezone, setTimezone] = useState<string>("Europe/London");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing schedule name inline
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");

  useEffect(() => {
    api
      .getAvailability()
      .then((data) => {
        setTimezone(data.timezone || "Europe/London");
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

  const activeSchedule = schedules.find((s) => s.id === activeScheduleId);

  // Subtitle: show active day range + times
  const activeDays = rules
    .filter((r) => r)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const subtitle = activeDays.length
    ? `${activeDays.map((r) => dayAbbr[r.dayOfWeek]).join(", ")}, ${fmt12(activeDays[0].startTime)} - ${fmt12(activeDays[0].endTime)}`
    : "No days configured";

  const toggleDay = (dayIndex: number) => {
    const existing = rules.filter((r) => r.dayOfWeek === dayIndex);
    if (existing.length === 0) {
      setRules([...rules, { dayOfWeek: dayIndex, startTime: "09:00", endTime: "17:00" }]);
    } else {
      setRules(rules.filter((r) => r.dayOfWeek !== dayIndex));
    }
  };

  const updateRule = (dayIndex: number, field: "startTime" | "endTime", value: string) => {
    setRules(rules.map((r) => (r.dayOfWeek === dayIndex ? { ...r, [field]: value } : r)));
  };

  const copyTimesToAll = (dayIndex: number) => {
    const src = rules.find((r) => r.dayOfWeek === dayIndex);
    if (!src) return;
    setRules(
      rules.map((r) =>
        r.dayOfWeek !== dayIndex ? { ...r, startTime: src.startTime, endTime: src.endTime } : r
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
        name: activeSchedule?.name || "Schedule",
        setDefault: activeSchedule?.isDefault ?? true,
        rules: rules.map(({ id, ...rest }) => rest),
        overrides: overrides.map(({ id, ...rest }) => rest),
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const createNewSchedule = async () => {
    const created = await api.createSchedule({
      name: `Schedule ${schedules.length + 1}`,
      setDefault: schedules.length === 0,
    });
    setSchedules([...schedules, created.schedule]);
    setActiveScheduleId(created.schedule.id);
    setRules(created.rules);
    setOverrides(
      created.overrides.map((o: any) => ({ ...o, date: o.date.slice(0, 10) }))
    );
  };

  const deleteSchedule = async () => {
    if (!activeScheduleId) return;
    if (!confirm("Delete this schedule? At least one schedule must remain.")) return;
    await api.deleteSchedule(activeScheduleId);
    const fresh = await api.getAvailability();
    setTimezone(fresh.timezone || "UTC");
    setSchedules(fresh.schedules);
    setActiveScheduleId(fresh.activeScheduleId);
    setRules(fresh.rules);
    setOverrides(fresh.overrides.map((o: any) => ({ ...o, date: o.date.slice(0, 10) })));
  };

  const toggleDefault = async () => {
    if (!activeScheduleId) return;
    const updated = schedules.map((s) =>
      s.id === activeScheduleId ? { ...s, isDefault: !s.isDefault } : s
    );
    setSchedules(updated);
  };

  return (
    <div>
      {/* ── TOP BAR ── */}
      <div className="availability-topbar">
        <button className="availability-back" title="Back">
          <IconBack />
        </button>

        <div className="availability-name-block">
          {editingName ? (
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={() => {
                if (draftName.trim() && activeScheduleId) {
                  setSchedules(
                    schedules.map((s) =>
                      s.id === activeScheduleId ? { ...s, name: draftName.trim() } : s
                    )
                  );
                }
                setEditingName(false);
              }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              style={{ fontSize: 15, fontWeight: 600, background: "transparent", border: "none", borderBottom: "1px solid #4f46e5", color: "#f1f5f9", outline: "none", width: 200 }}
            />
          ) : (
            <div className="availability-name-row">
              <span>{activeSchedule?.name || "Schedule"}</span>
              <button
                title="Edit name"
                onClick={() => {
                  setDraftName(activeSchedule?.name || "");
                  setEditingName(true);
                }}
              >
                <IconPencil />
              </button>
            </div>
          )}
          <div className="availability-name-sub">{subtitle}</div>
        </div>

        <div className="availability-header-actions">
          {/* Set as default toggle */}
          <label className="default-toggle-row">
            <span>Set as default</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={activeSchedule?.isDefault ?? false}
                onChange={toggleDefault}
              />
              <span className="switch-slider" />
            </label>
          </label>

          <div className="avail-divider" />

          {/* Delete */}
          <button className="btn-icon-topbar" title="Delete schedule" onClick={deleteSchedule}>
            <IconTrash />
          </button>

          <div className="avail-divider" />

          {/* Save */}
          <button className="btn-save-topbar" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="availability-layout">

        {/* LEFT: weekly hours + overrides */}
        <div>
          {/* Schedule selector row (if multiple schedules) */}
          {schedules.length > 1 && (
            <div className="schedule-row" style={{ marginBottom: 16 }}>
              <div className="schedule-left">
                <label className="field">
                  <span>Schedule</span>
                  <select
                    value={activeScheduleId ?? ""}
                    onChange={(e) => setActiveScheduleId(Number(e.target.value))}
                  >
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.isDefault ? " (default)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="schedule-actions">
                <button type="button" className="btn-ghost" onClick={createNewSchedule}>
                  + New
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && <div className="alert-error">{error}</div>}

          {/* Weekly hours card */}
          <div className="weekly-card">
            <div className="weekly-card-inner">
              {days.map((day, index) => {
                const rule = rules.find((r) => r.dayOfWeek === index);
                const enabled = !!rule;
                return (
                  <div key={day} className="day-availability-row">
                    {/* Toggle + day name */}
                    <label className="day-switch-label">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleDay(index)}
                        />
                        <span className="switch-slider" />
                      </label>
                      <span className={`day-name-text${enabled ? "" : " off"}`}>{day}</span>
                    </label>

                    {/* Time inputs or unavailable */}
                    {enabled ? (
                      <>
                        <div className="day-time-inputs">
                          <input
                            type="time"
                            className="time-box"
                            value={rule!.startTime}
                            onChange={(e) => updateRule(index, "startTime", e.target.value)}
                          />
                          <span className="time-sep">-</span>
                          <input
                            type="time"
                            className="time-box"
                            value={rule!.endTime}
                            onChange={(e) => updateRule(index, "endTime", e.target.value)}
                          />
                        </div>

                        {/* + and copy buttons */}
                        <div className="day-row-actions">
                          <button
                            type="button"
                            className="day-row-btn"
                            title="Add another time slot"
                            onClick={() => {
                              // extend: add a second rule slot (UI hint)
                              alert(`Add another slot for ${day}`);
                            }}
                          >
                            <IconPlus />
                          </button>
                          <button
                            type="button"
                            className="day-row-btn"
                            title="Copy times to all active days"
                            onClick={() => copyTimesToAll(index)}
                          >
                            <IconCopy />
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="day-unavailable-text">Unavailable</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Date overrides */}
            <div className="date-overrides-section">
              <div className="date-overrides-title">
                Date overrides
                <span style={{ color: "#475569", cursor: "help" }} title="Add specific dates where availability differs from your weekly schedule">
                  <IconInfo />
                </span>
              </div>
              <div className="date-overrides-sub">
                Add dates when your availability changes from your daily hours.
              </div>

              <div className="overrides-grid">
                {overrides.map((o, idx) => (
                  <div key={idx} className="override-item">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" }}>
                      <input
                        type="date"
                        value={o.date}
                        onChange={(e) => {
                          const next = [...overrides];
                          next[idx] = { ...o, date: e.target.value };
                          setOverrides(next);
                        }}
                        style={{ background: "transparent", border: "none", color: "#e2e8f0", fontSize: 13, padding: 0 }}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={o.isBlocked}
                          onChange={(e) => {
                            const next = [...overrides];
                            next[idx] = { ...o, isBlocked: e.target.checked };
                            setOverrides(next);
                          }}
                        />
                        Block all day
                      </label>
                      {!o.isBlocked && (
                        <div className="availability-times">
                          <input
                            type="time"
                            value={o.startTime || "09:00"}
                            onChange={(e) => {
                              const next = [...overrides];
                              next[idx] = { ...o, startTime: e.target.value };
                              setOverrides(next);
                            }}
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={o.endTime || "17:00"}
                            onChange={(e) => {
                              const next = [...overrides];
                              next[idx] = { ...o, endTime: e.target.value };
                              setOverrides(next);
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="link-button danger"
                      onClick={() => setOverrides(overrides.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn-add-override"
                  onClick={() =>
                    setOverrides([
                      ...overrides,
                      { date: new Date().toISOString().slice(0, 10), isBlocked: true },
                    ])
                  }
                >
                  <IconPlus />
                  Add an override
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="avail-sidebar">
          {/* Timezone */}
          <div className="avail-sidebar-card">
            <div className="avail-sidebar-card-title">Timezone</div>
            <select
              className="tz-select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="Europe/London">Europe/London</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="Australia/Sydney">Australia/Sydney</option>
              <option value="Pacific/Auckland">Pacific/Auckland</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          {/* Troubleshooter */}
          <div className="avail-sidebar-card">
            <div className="troubleshoot-title">Something doesn't look right?</div>
            <div className="troubleshoot-sub">
              Use the troubleshooter to diagnose and resolve issues with your availability settings.
            </div>
            <button type="button" className="btn-troubleshoot">
              Launch troubleshooter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}