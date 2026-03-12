import React, { useEffect, useState } from "react";
import { api } from "../api/client";

type EventType = {
  id: number;
  title: string;
  description?: string | null;
  duration: number;
  slug: string;
};

const emptyForm: Omit<EventType, "id"> = {
  title: "",
  description: "",
  duration: 30,
  slug: "",
};

export function EventTypesPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getEventTypes();
      setEventTypes(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await api.updateEventType(editingId, form);
      } else {
        await api.createEventType(form);
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const onEdit = (et: EventType) => {
    setEditingId(et.id);
    setForm({
      title: et.title,
      description: et.description ?? "",
      duration: et.duration,
      slug: et.slug,
    });
  };

  const onDelete = async (id: number) => {
    if (!confirm("Delete this event type?")) return;
    await api.deleteEventType(id);
    await load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Event types</h2>
          <p className="page-subtitle">
            Create different meeting types with custom durations and URLs.
          </p>
        </div>
      </div>
      <div className="page-grid">
        <section className="card">
          <h3 className="card-title">
            {editingId ? "Edit event type" : "New event type"}
          </h3>
          {error && <div className="alert-error">{error}</div>}
          <form className="form" onSubmit={onSubmit}>
            <label className="field">
              <span>Title</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Duration (minutes)</span>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={form.duration}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      duration: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="field">
                <span>URL slug</span>
                <div className="input-with-prefix">
                  <span className="input-prefix">/book/</span>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) =>
                      setForm({ ...form, slug: e.target.value })
                    }
                  />
                </div>
              </label>
            </div>
            <div className="form-actions">
              {editingId && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  Cancel
                </button>
              )}
              <button type="submit" className="btn-primary">
                {editingId ? "Save changes" : "Create"}
              </button>
            </div>
          </form>
        </section>
        <section className="card">
          <h3 className="card-title">Your event types</h3>
          {loading ? (
            <div className="muted">Loading…</div>
          ) : eventTypes.length === 0 ? (
            <div className="muted">No event types yet.</div>
          ) : (
            <ul className="list">
              {eventTypes.map((et) => (
                <li key={et.id} className="list-item">
                  <div>
                    <div className="list-title">{et.title}</div>
                    <div className="list-meta">
                      {et.duration} min ·{" "}
                      <span className="mono">
                        {window.location.origin}/book/{et.slug}
                      </span>
                    </div>
                  </div>
                  <div className="list-actions">
                    <button
                      className="link-button"
                      type="button"
                      onClick={() => onEdit(et)}
                    >
                      Edit
                    </button>
                    <button
                      className="link-button danger"
                      type="button"
                      onClick={() => onDelete(et.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

