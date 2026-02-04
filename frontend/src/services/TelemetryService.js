import api from "../lib/api";

let lastSent = new Map();

const keyOf = (payload) => {
  const msg = (payload?.message || "").slice(0, 120);
  const name = payload?.name || "";
  const mode = payload?.appMode || "";
  return `${mode}:${name}:${msg}`;
};

export async function postUIError({ error, info, appMode }) {
  try {
    const payload = {
      app_mode: appMode || "UNKNOWN",
      name: error?.name || "Error",
      message: String(error?.message || error),
      stack: String(error?.stack || ""),
      component_stack: String(info?.componentStack || ""),
      url: window.location.href,
      user_agent: navigator.userAgent,
      ts: new Date().toISOString()
    };

    const k = keyOf(payload);
    const now = Date.now();
    const prev = lastSent.get(k) || 0;

    // DEDUPE: same error within 60s => skip
    if (now - prev < 60000) return;
    lastSent.set(k, now);

    // OFFLINE SAFE: don't loop if offline
    if (!navigator.onLine) return;

    await api.post("/incidents/ui-error", payload);
  } catch {
    // Never throw from telemetry
  }
}

export default { postUIError };
