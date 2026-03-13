const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");
const { addMinutes, isBefore } = require("date-fns");
const { utcToZonedTime, zonedTimeToUtc } = require("date-fns-tz");

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const DEFAULT_USER_ID = 1;

// Event Types CRUD
app.get("/api/event-types", async (req, res) => {
  try {
    const eventTypes = await prisma.eventType.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { createdAt: "desc" },
    });
    res.json(eventTypes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch event types" });
  }
});

app.post("/api/event-types", async (req, res) => {
  const { title, description, duration, slug } = req.body;
  if (!title || !duration || !slug) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const created = await prisma.eventType.create({
      data: {
        title,
        description,
        duration,
        slug,
        userId: DEFAULT_USER_ID,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Slug already in use" });
    }
    res.status(500).json({ message: "Failed to create event type" });
  }
});

app.put("/api/event-types/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, description, duration, slug } = req.body;
  try {
    const updated = await prisma.eventType.update({
      where: { id },
      data: { title, description, duration, slug },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update event type" });
  }
});

app.delete("/api/event-types/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.eventType.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete event type" });
  }
});

// Availability: multiple schedules + overrides
app.get("/api/availability", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: DEFAULT_USER_ID },
    });

    let schedules = await prisma.availabilitySchedule.findMany({
      where: { userId: DEFAULT_USER_ID },
      orderBy: { id: "asc" },
    });

    let active =
      schedules.find((s) => s.isDefault) || schedules[0] || null;

    // If no schedules exist yet, create a default one without rules.
    if (!active) {
      active = await prisma.availabilitySchedule.create({
        data: {
          userId: DEFAULT_USER_ID,
          name: "Working hours",
          isDefault: true,
        },
      });
      // Ensure the newly created schedule is included in the list we return
      schedules = [active];
    }

    const [rules, overrides] = await Promise.all([
      prisma.availabilityRule.findMany({
        where: { scheduleId: active.id },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.dateOverride.findMany({
        where: { scheduleId: active.id },
        orderBy: { date: "asc" },
      }),
    ]);

    res.json({
      timezone: user?.timezone || "UTC",
      schedules: schedules.map((s) => ({
        id: s.id,
        name: s.name,
        isDefault: s.isDefault,
      })),
      activeScheduleId: active.id,
      rules,
      overrides,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch availability" });
  }
});

app.post("/api/availability", async (req, res) => {
  const { scheduleId, name, setDefault, rules, overrides } = req.body;
  if (!Array.isArray(rules)) {
    return res.status(400).json({ message: "rules must be an array" });
  }
  if (!Array.isArray(overrides)) {
    return res.status(400).json({ message: "overrides must be an array" });
  }

  try {
    let schedule = null;

    if (scheduleId) {
      schedule = await prisma.availabilitySchedule.update({
        where: { id: scheduleId },
        data: {
          name: name || undefined,
          isDefault: setDefault === true ? true : undefined,
        },
      });
    } else {
      schedule = await prisma.availabilitySchedule.create({
        data: {
          userId: DEFAULT_USER_ID,
          name: name || "New schedule",
          isDefault: true,
        },
      });
    }

    if (setDefault === true) {
      await prisma.availabilitySchedule.updateMany({
        where: {
          userId: DEFAULT_USER_ID,
          id: { not: schedule.id },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    await prisma.$transaction([
      prisma.availabilityRule.deleteMany({
        where: { scheduleId: schedule.id },
      }),
      prisma.dateOverride.deleteMany({
        where: { scheduleId: schedule.id },
      }),
      prisma.availabilityRule.createMany({
        data: rules.map((r) => ({
          scheduleId: schedule.id,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
      }),
      prisma.dateOverride.createMany({
        data: overrides.map((o) => ({
          scheduleId: schedule.id,
          date: new Date(`${o.date}T00:00:00.000Z`),
          isBlocked: o.isBlocked,
          startTime: o.startTime || null,
          endTime: o.endTime || null,
        })),
      }),
    ]);

    const [updatedRules, updatedOverrides] = await Promise.all([
      prisma.availabilityRule.findMany({
        where: { scheduleId: schedule.id },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.dateOverride.findMany({
        where: { scheduleId: schedule.id },
        orderBy: { date: "asc" },
      }),
    ]);

    res.json({
      scheduleId: schedule.id,
      rules: updatedRules,
      overrides: updatedOverrides,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update availability" });
  }
});

// Create / duplicate schedules
app.post("/api/availability/schedules", async (req, res) => {
  const { name, cloneFromId, setDefault } = req.body;

  try {
    const schedule = await prisma.availabilitySchedule.create({
      data: {
        userId: DEFAULT_USER_ID,
        name: name || "Working hours",
        isDefault: !!setDefault,
      },
    });

    if (setDefault) {
      await prisma.availabilitySchedule.updateMany({
        where: {
          userId: DEFAULT_USER_ID,
          id: { not: schedule.id },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    if (cloneFromId) {
      const [rules, overrides] = await Promise.all([
        prisma.availabilityRule.findMany({
          where: { scheduleId: cloneFromId },
        }),
        prisma.dateOverride.findMany({
          where: { scheduleId: cloneFromId },
        }),
      ]);

      await prisma.$transaction([
        prisma.availabilityRule.createMany({
          data: rules.map((r) => ({
            scheduleId: schedule.id,
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
          })),
        }),
        prisma.dateOverride.createMany({
          data: overrides.map((o) => ({
            scheduleId: schedule.id,
            date: o.date,
            isBlocked: o.isBlocked,
            startTime: o.startTime,
            endTime: o.endTime,
          })),
        }),
      ]);
    }

    const [newRules, newOverrides] = await Promise.all([
      prisma.availabilityRule.findMany({
        where: { scheduleId: schedule.id },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
      prisma.dateOverride.findMany({
        where: { scheduleId: schedule.id },
        orderBy: { date: "asc" },
      }),
    ]);

    res.status(201).json({
      schedule: {
        id: schedule.id,
        name: schedule.name,
        isDefault: schedule.isDefault,
      },
      rules: newRules,
      overrides: newOverrides,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create schedule" });
  }
});

// Delete schedule
app.delete("/api/availability/schedules/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const schedules = await prisma.availabilitySchedule.findMany({
      where: { userId: DEFAULT_USER_ID },
    });

    if (schedules.length <= 1) {
      return res
        .status(400)
        .json({ message: "At least one schedule is required" });
    }

    const toDelete = schedules.find((s) => s.id === id);
    if (!toDelete) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    await prisma.availabilitySchedule.delete({ where: { id } });

    // Ensure there is still a default schedule
    const remaining = await prisma.availabilitySchedule.findMany({
      where: { userId: DEFAULT_USER_ID },
    });
    const hasDefault = remaining.some((s) => s.isDefault);
    if (!hasDefault && remaining[0]) {
      await prisma.availabilitySchedule.update({
        where: { id: remaining[0].id },
        data: { isDefault: true },
      });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete schedule" });
  }
});

// Bookings dashboard
app.get("/api/bookings", async (req, res) => {
  const now = new Date();
  try {
    const upcoming = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        start: { gte: now },
        eventType: { userId: DEFAULT_USER_ID },
      },
      include: { eventType: true },
      orderBy: { start: "asc" },
    });
    const past = await prisma.booking.findMany({
      where: {
        start: { lt: now },
        eventType: { userId: DEFAULT_USER_ID },
      },
      include: { eventType: true },
      orderBy: { start: "desc" },
    });
    res.json({ upcoming, past });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

app.post("/api/bookings/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});

// Public endpoints
app.get("/api/public/event-types/:slug", async (req, res) => {
  const { slug } = req.params;
  try {
    const eventType = await prisma.eventType.findUnique({ where: { slug } });
    if (!eventType) return res.status(404).json({ message: "Event type not found" });
    res.json(eventType);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch event type" });
  }
});

// Generate available slots for a date
app.get("/api/public/event-types/:slug/slots", async (req, res) => {
  const { slug } = req.params;
  const { date, timezone = "UTC" } = req.query;

  if (!date) {
    return res.status(400).json({ message: "date query param required (YYYY-MM-DD)" });
  }

  try {
    const eventType = await prisma.eventType.findUnique({
      where: { slug },
      include: { user: true },
    });
    if (!eventType) return res.status(404).json({ message: "Event type not found" });

    const schedules = await prisma.availabilitySchedule.findMany({
      where: { userId: eventType.userId },
    });

    const activeSchedule =
      schedules.find((s) => s.isDefault) || schedules[0];
    if (!activeSchedule) return res.json([]);

    const [rules, overrides] = await Promise.all([
      prisma.availabilityRule.findMany({
        where: { scheduleId: activeSchedule.id },
      }),
      prisma.dateOverride.findMany({
        where: {
          scheduleId: activeSchedule.id,
          date: {
            equals: new Date(`${date}T00:00:00.000Z`),
          },
        },
      }),
    ]);

    const targetDate = new Date(`${date}T00:00:00.000Z`);
    const zoned = utcToZonedTime(targetDate, timezone);
    const dayOfWeek = zoned.getDay();

    const dayRules = rules.filter((r) => r.dayOfWeek === dayOfWeek);
    const override = overrides[0] || null;

    if (override && override.isBlocked) {
      return res.json([]);
    }

    let windows = dayRules;

    if (override && override.startTime && override.endTime) {
      windows = [
        {
          startTime: override.startTime,
          endTime: override.endTime,
        },
      ];
    }
    if (!windows.length) return res.json([]);

    const slots = [];
    for (const rule of windows) {
      const [startH, startM] = rule.startTime.split(":").map(Number);
      const [endH, endM] = rule.endTime.split(":").map(Number);

      let cursor = new Date(zoned);
      cursor.setHours(startH, startM, 0, 0);
      const end = new Date(zoned);
      end.setHours(endH, endM, 0, 0);

      while (isBefore(addMinutes(cursor, eventType.duration), end) || +addMinutes(cursor, eventType.duration) === +end) {
        const slotStartUtc = zonedTimeToUtc(cursor, timezone);
        const slotEndUtc = zonedTimeToUtc(addMinutes(cursor, eventType.duration), timezone);

        const overlapping = await prisma.booking.findFirst({
          where: {
            eventTypeId: eventType.id,
            status: "CONFIRMED",
            OR: [
              { start: { lt: slotEndUtc }, end: { gt: slotStartUtc } },
            ],
          },
        });
        if (!overlapping) {
          slots.push({
            start: slotStartUtc.toISOString(),
            end: slotEndUtc.toISOString(),
          });
        }

        cursor = addMinutes(cursor, eventType.duration);
      }
    }

    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to compute slots" });
  }
});

// Create booking
app.post("/api/public/event-types/:slug/book", async (req, res) => {
  const { slug } = req.params;
  const { name, email, start, end } = req.body;
  if (!name || !email || !start || !end) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const eventType = await prisma.eventType.findUnique({ where: { slug } });
    if (!eventType) return res.status(404).json({ message: "Event type not found" });

    const startDate = new Date(start);
    const endDate = new Date(end);

    const overlapping = await prisma.booking.findFirst({
      where: {
        eventTypeId: eventType.id,
        status: "CONFIRMED",
        OR: [{ start: { lt: endDate }, end: { gt: startDate } }],
      },
    });
    if (overlapping) {
      return res.status(409).json({ message: "Time slot already booked" });
    }

    const booking = await prisma.booking.create({
      data: {
        eventTypeId: eventType.id,
        name,
        email,
        start: startDate,
        end: endDate,
      },
    });
    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

app.get("/", (req, res) => {
  res.send("Booking API is running");
});

app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});

