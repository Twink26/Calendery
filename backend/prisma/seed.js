const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Default admin-like user
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Default Admin",
      email: "admin@example.com",
      timezone: "America/New_York",
    },
  });

  // Basic 30-min and 60-min event types
  const event30 = await prisma.eventType.upsert({
    where: { slug: "intro-call-30" },
    update: {},
    create: {
      userId: user.id,
      title: "Intro Call",
      description: "30-minute introduction call.",
      duration: 30,
      slug: "intro-call-30",
    },
  });

  const event60 = await prisma.eventType.upsert({
    where: { slug: "strategy-session-60" },
    update: {},
    create: {
      userId: user.id,
      title: "Strategy Session",
      description: "Deep dive strategy session.",
      duration: 60,
      slug: "strategy-session-60",
    },
  });

  // Default weekly availability schedule with weekday 9–5
  let schedule = await prisma.availabilitySchedule.findFirst({
    where: { userId: user.id },
  });

  if (!schedule) {
    schedule = await prisma.availabilitySchedule.create({
      data: {
        userId: user.id,
        name: "Default schedule",
        isDefault: true,
      },
    });

    const rules = [];
    for (let day = 1; day <= 5; day++) {
      rules.push({
        scheduleId: schedule.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "17:00",
      });
    }
    await prisma.availabilityRule.createMany({ data: rules });
  }

  // Sample booking tomorrow for 30-min event
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const existingBooking = await prisma.booking.findFirst({
    where: { eventTypeId: event30.id },
  });

  if (!existingBooking) {
    await prisma.booking.create({
      data: {
        eventTypeId: event30.id,
        name: "Jane Doe",
        email: "jane@example.com",
        start: tomorrow,
        end: new Date(tomorrow.getTime() + 30 * 60 * 1000),
        status: "CONFIRMED",
      },
    });
  }

  console.log("Seed data created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

