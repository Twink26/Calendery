import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { EventTypesPage } from "./pages/EventTypesPage";
import { AvailabilityPage } from "./pages/AvailabilityPage";
import { BookingsPage } from "./pages/BookingsPage";
import { PublicBookingPage } from "./pages/PublicBookingPage";
import { BookingConfirmationPage } from "./pages/BookingConfirmationPage";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <DashboardLayout>
            <EventTypesPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/availability"
        element={
          <DashboardLayout>
            <AvailabilityPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/bookings"
        element={
          <DashboardLayout>
            <BookingsPage />
          </DashboardLayout>
        }
      />
      <Route path="/book/:slug" element={<PublicBookingPage />} />
      <Route path="/confirm" element={<BookingConfirmationPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

