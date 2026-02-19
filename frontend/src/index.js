import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://c8948ba4809a8afc56aaac4380bcae56@o4510853881921536.ingest.de.sentry.io/4510853958467664",
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './lib/i18n/config'; // Initialize i18n
import "./index.css";
import App from "./App";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60_000,   // 2 min — config/menu data rarely changes mid-session
      gcTime: 10 * 60_000,     // 10 min — keep cache warm across navigations
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

serviceWorkerRegistration.unregister();
