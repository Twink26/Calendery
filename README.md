## Cal.com-style Scheduling App

This is a full-stack scheduling/booking web application inspired by the design and UX of Cal.com.  
It lets a (default) admin user configure event types and weekly availability, and exposes a public booking page others can use to schedule meetings.

### Tech Stack

- **Frontend**: React + TypeScript (Vite SPA, React Router)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **ORM**: Prisma 7

### Features

- **Event types management**
  - Create/edit/delete event types with title, description, duration, and URL slug
  - Each event type gets a **public booking URL** like `/book/intro-call-30`
- **Availability**
  - Weekly hours by weekday (e.g. Mon–Fri 9:00–17:00)
  - Timezone-aware booking slots
- **Public booking flow**
  - Cal.com-style 3-column layout: **date → time → details**
  - Shows available slots for the selected date
  - Prevents double booking of a slot
  - Simple confirmation page
- **Admin bookings dashboard**
  - Upcoming and past bookings
  - Cancel an upcoming booking

### Project Structure

- `backend/` – Express API + Prisma schema and migrations
  - `src/index.js` – main API server
  - `prisma/schema.prisma` – database models
  - `prisma/seed.js` – seed script (default user, event types, availability, sample booking)
- `frontend/` – React SPA
  - `src/App.tsx` – routing
  - `src/components/layout/DashboardLayout.tsx` – Cal.com-style shell
  - `src/pages/*.tsx` – dashboard pages and public booking flow

---

## Local Setup

### 1. Prerequisites

- Node.js 18+ and npm
- PostgreSQL instance you can connect to

### 2. Configure the database (backend)

In `backend/.env`, set a valid `DATABASE_URL`, e.g.:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/calclone?schema=public"
```

Create the database (`calclone` in this example) in Postgres if it does not exist.

### 3. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 4. Run Prisma migrations and seed data

From `backend/`:

```bash
npx prisma migrate dev --name init
node prisma/seed.js
```

This will:

- Create tables for `User`, `EventType`, `AvailabilityRule`, `Booking`
- Insert a default user (`admin@example.com`)
- Insert two sample event types (`intro-call-30`, `strategy-session-60`)
- Insert weekday availability (Mon–Fri 09:00–17:00)
- Insert one sample booking for tomorrow

> Note: Prisma 7 uses `prisma.config.ts` for datasource configuration; this project already has it wired to `process.env.DATABASE_URL`.

### 5. Run the backend

From `backend/`:

```bash
npm run dev
```

API runs on `http://localhost:4000` by default.

Key endpoints:

- `GET /api/event-types`
- `POST /api/event-types`
- `GET /api/availability`
- `POST /api/availability`
- `GET /api/bookings`
- `POST /api/bookings/:id/cancel`
- `GET /api/public/event-types/:slug`
- `GET /api/public/event-types/:slug/slots?date=YYYY-MM-DD&timezone=Area/City`
- `POST /api/public/event-types/:slug/book`

### 6. Run the frontend

From `frontend/`:

```bash
npm run dev
```

Create a `.env` file in `frontend/` to point the SPA at your backend:

```env
VITE_API_URL="http://localhost:4000"
```

Open the app at the URL Vite prints (usually `http://localhost:5173`).

---

## Usage

- **Admin dashboard (no auth in this demo)**
  - `/` – Event Types
  - `/availability` – Weekly availability editor
  - `/bookings` – Upcoming + past bookings
- **Public booking**
  - For a given event type slug `intro-call-30`, open `/book/intro-call-30`
  - Choose a date, select a slot, fill in name + email, and confirm

The dashboard assumes the default admin user (ID 1) is “logged in”.

---

## Deployment Notes

- **Backend**
  - Deploy `backend/` to a Node-friendly platform (Render, Railway, Fly.io, etc.)
  - Provision a managed PostgreSQL database and set `DATABASE_URL` as an environment variable
- **Frontend**
  - Deploy `frontend/` to Vercel/Netlify as a static SPA
  - Set `VITE_API_URL` environment variable to your deployed backend URL

---

## Assumptions & Limitations

- Single default user; no authentication in this version
- No email sending implemented (confirmation page simulates this)
- No advanced features like rescheduling, buffers, or question templates yet, but the schema and API are organized so you can extend them.

