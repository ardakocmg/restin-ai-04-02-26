import React, { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import systemService from "./services/SystemService";
import axios from "axios";
import api from "./lib/api";
import { logger } from "./lib/logger";

// ─── EAGER: Critical path only (Login, Layout, Landing, NotFound) ─────────────
import ManagerLayout from "./pages/manager/ManagerLayout";

// ─── Route Modules (domain-based, code-split) ────────────────────────────────
import {
  hrRoutes,
  inventoryRoutes,
  aiRoutes,
  posKdsManagerRoutes,
  posKdsStandaloneRoutes,
  reportsRoutes,
  procurementRoutes,
  systemRoutes,
  collabRoutes,
  publicRoutes,
  legacyRedirects,
} from "./routes";

// ─── Lazy Loading Fallback ─────────────────────────────────────────────────────
function PageLoader() {
  const [showEscape, setShowEscape] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowEscape(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      {showEscape && (
        <div className="flex gap-3 animate-in fade-in">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border transition-colors"
          >
            ← Go Back
          </button>
          <button
            onClick={() => { window.location.href = '/manager/dashboard'; }}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-foreground transition-colors"
          >
            Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Context Providers (consolidated) ─────────────────────────────────────────
import { AppProviders, RuntimeProvider, SafeModeProvider } from "./context/AppProviders";
import { useUI } from "./context/UIContext";

// ─── Components (keep eager — used at root level) ─────────────────────────────
import LoadingOverlay from "./components/LoadingOverlay";
import ErrorModal from "./components/ErrorModal";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthExpiredModal from "./components/AuthExpiredModal";
import GlobalSearch from "./components/shared/GlobalSearch";

// ─── Hey Rin Voice Assistant (lazy) ───────────────────────────────────────────
const HeyRin = React.lazy(() => import("./components/voice/HeyRin"));

// ─── Root Overlays ────────────────────────────────────────────────────────────
function RootOverlays() {
  const { loading, modalError, hideErrorModal, hideLoading, authExpiredModalOpen, openAuthExpiredModal, closeAuthExpiredModal } = useUI();
  const [showVersionWarning, setShowVersionWarning] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let mounted = true;
    const clearSessionHard = () => {
      localStorage.removeItem("restin_token");
      localStorage.removeItem("restin_user");
      try { delete axios.defaults.headers.common.Authorization; } catch { /* header may not exist */ }
      try { delete api.defaults.headers.common.Authorization; } catch { /* header may not exist */ }
    };

    (async () => {
      try {
        const v = await systemService.getVersion();
        const serverBuild = v?.build_id || "";
        const lastBuild = localStorage.getItem("last_build_id") || "";
        if (lastBuild && serverBuild && lastBuild !== serverBuild) {
          // clearSessionHard(); // DISABLED: Causing loop
          if (!mounted) return;
          // setShowVersionWarning(true); // DISABLED: Causing confusion
          // openAuthExpiredModal({ reason: "DEPLOYMENT_CHANGED" });
          logger.warn('Version mismatch detected (ignored for dev)');
        }
        if (serverBuild) localStorage.setItem("last_build_id", serverBuild);
      } catch (e: any) {
        logger.warn('Version check failed', { error: (e as Error).message });
      }
    })();

    const onAuthExpired = (e: CustomEvent) => {
      if (!mounted) return;
      logger.debug('Auth expired event received (ignored)', { detail: e.detail });
      // openAuthExpiredModal({ reason: e.detail?.reason || "AUTH_EXPIRED" }); // DISABLED
    };
    window.addEventListener("auth-expired", onAuthExpired as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener("auth-expired", onAuthExpired as EventListener);
    };
  }, [openAuthExpiredModal]);

  return (
    <>
      {showVersionWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
          <div className="mx-auto max-w-4xl h-12 flex items-center justify-between px-4 bg-yellow-600 text-black">
            <div className="truncate"><strong>Warning:</strong> System version changed. Refresh required.</div>
            <button className="pointer-events-auto px-3 py-1 bg-black text-foreground rounded hover:bg-secondary transition-colors" onClick={() => window.location.reload()}>Refresh Now</button>
          </div>
        </div>
      )}
      <LoadingOverlay open={loading.open} title={loading.title} body={loading.body} onCancel={() => hideLoading()} />
      <ErrorModal open={!!modalError} title={modalError?.title} body={modalError?.body} onClose={hideErrorModal} onRetry={modalError?.onRetry} />
      <AuthExpiredModal open={authExpiredModalOpen} onClose={closeAuthExpiredModal} />
      <GlobalSearch open={globalSearchOpen} onOpenChange={setGlobalSearchOpen} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════════
// APP — Main Component
// Route definitions are split into domain modules under src/routes/
// ═════════════════════════════════════════════════════════════════════════════════
function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <RuntimeProvider>
            <SafeModeProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* ─── Manager Routes (with sidebar layout) ────── */}
                  <Route path="/manager" element={<ManagerLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    {systemRoutes}
                    {hrRoutes}
                    {inventoryRoutes}
                    {aiRoutes}
                    {posKdsManagerRoutes}
                    {reportsRoutes}
                    {procurementRoutes}
                    {collabRoutes}
                    {legacyRedirects}
                  </Route>

                  {/* ─── Standalone Routes (no sidebar) ──────────── */}
                  {posKdsStandaloneRoutes}

                  {/* ─── Admin Backward Compat ──────────────────── */}
                  <Route path="/admin/*" element={<AdminRedirect />} />

                  {/* ─── Public Routes (login, landing, 404) ─────── */}
                  {publicRoutes}
                </Routes>
              </Suspense>
              <LogRoute />
              <RootOverlays />
              <Suspense fallback={null}><HeyRin /></Suspense>
            </SafeModeProvider>
          </RuntimeProvider>
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  );
}

// ─── Helper Components ────────────────────────────────────────────────────────
const AdminRedirect = () => {
  const location = useLocation();
  const newPath = location.pathname.replace(/^\/admin/, '/manager');
  return <Navigate to={newPath + location.search + location.hash} replace />;
};

const LogRoute = () => {
  const location = useLocation();
  useEffect(() => {
    logger.debug('No internal match for route', { path: location.pathname, search: location.search, hash: location.hash });
  }, [location]);
  return null;
};

export default App;
