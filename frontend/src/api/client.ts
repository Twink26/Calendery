const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json();
}

export const api = {
  // Event types
  getEventTypes: () => request("/api/event-types"),
  createEventType: (body: any) =>
    request("/api/event-types", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateEventType: (id: number, body: any) =>
    request(`/api/event-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteEventType: (id: number) =>
    request(`/api/event-types/${id}`, { method: "DELETE" }),

  // Availability
  getAvailability: () => request("/api/availability"),
  saveAvailability: (rules: any[]) =>
    request("/api/availability", {
      method: "POST",
      body: JSON.stringify({ rules }),
    }),

  // Bookings dashboard
  getBookings: () => request("/api/bookings"),
  cancelBooking: (id: number) =>
    request(`/api/bookings/${id}/cancel`, { method: "POST" }),

  // Public booking
  getEventTypePublic: (slug: string) =>
    request(`/api/public/event-types/${slug}`),
  getSlots: (slug: string, date: string, timezone: string) =>
    request(
      `/api/public/event-types/${slug}/slots?date=${date}&timezone=${encodeURIComponent(
        timezone
      )}`
    ),
  createBooking: (slug: string, body: any) =>
    request(`/api/public/event-types/${slug}/book`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

