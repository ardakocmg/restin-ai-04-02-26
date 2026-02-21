/**
 * Public Route Module
 * Login, Landing, Setup Wizard, Booking Widget, Payroll standalone
 */
import React from 'react';
import { Navigate,Route } from 'react-router-dom';

// ─── Eager Imports (critical path) ──────────────────────────────────────────────
import Login from '../features/auth/Login';
import MarketingLanding from '../pages/MarketingLanding';
import NotFound from '../pages/NotFound';

// ─── Lazy Imports ───────────────────────────────────────────────────────────────
const SetupWizard = React.lazy(() => import('../pages/SetupWizard'));
const BookingWidget = React.lazy(() => import('../pages/public/booking/BookingWidget'));
const TechnicalHub = React.lazy(() => import('../pages/TechnicalHub'));
const ModulesCatalog = React.lazy(() => import('../pages/ModulesCatalog'));
const PayrollPage = React.lazy(() => import('../pages/manager/hr/PayrollPage'));
const GuestOrderPage = React.lazy(() => import('../pages/public/GuestOrderPage'));

export const publicRoutes = (
    <>
        <Route path="/" element={<MarketingLanding />} />
        <Route path="/diag" element={<div>Router is working! Current Location: {window.location.pathname}</div>} />
        <Route path="/technic" element={<TechnicalHub />} />
        <Route path="/modules" element={<ModulesCatalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={
            <React.Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>}>
                <SetupWizard />
            </React.Suspense>
        } />
        <Route path="/profile" element={<Navigate to="/manager/profile" replace />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/book/:venueId" element={<BookingWidget />} />
        <Route path="/order/:venueId" element={<GuestOrderPage />} />
        <Route path="*" element={<NotFound />} />
    </>
);
