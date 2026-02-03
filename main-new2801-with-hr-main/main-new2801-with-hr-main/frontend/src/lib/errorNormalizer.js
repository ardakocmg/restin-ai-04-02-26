// Error Normalizer - Standardize All Errors
import { UI_MSG } from "./uiMessages";

export function normalizeAxiosError(err) {
  // Default normalized error
  const out = {
    kind: "GENERIC",       // GENERIC | NETWORK | AUTH | SERVER
    status: null,
    code: null,
    title: UI_MSG.generic.title,
    body: UI_MSG.generic.body,
    retryable: true
  };

  if (!err) return out;

  // Axios-style checks
  const status = err?.response?.status ?? null;
  const data = err?.response?.data ?? null;

  out.status = status;

  // Offline / timeout / no response
  if (!err.response) {
    const msg = String(err?.message || "");
    if (msg.toLowerCase().includes("timeout") || err?.code === "ECONNABORTED") {
      out.kind = "NETWORK";
      out.code = "TIMEOUT";
      out.title = UI_MSG.network.title;
      out.body = "Request timed out. Please try again.";
      return out;
    }
    out.kind = "NETWORK";
    out.code = "NO_RESPONSE";
    out.title = UI_MSG.network.title;
    out.body = UI_MSG.network.body;
    return out;
  }

  // Auth errors
  if (status === 401 || status === 403) {
    out.kind = "AUTH";
    out.code = "AUTH";
    out.title = UI_MSG.auth.title;
    out.body = UI_MSG.auth.body;
    out.retryable = true;
    return out;
  }

  // Cloudflare / proxy 520
  if (status === 520) {
    out.kind = "SERVER";
    out.code = "CF_520";
    out.title = UI_MSG.server.title;
    out.body = "Server proxy error (520). Please retry in a moment.";
    return out;
  }

  // 5xx server errors
  if (status >= 500) {
    out.kind = "SERVER";
    out.code = `HTTP_${status}`;
    out.title = UI_MSG.server.title;
    out.body = `Server error (${status}). Please try again.`;
    return out;
  }

  // 4xx client errors (non-auth)
  if (status >= 400) {
    out.kind = "GENERIC";
    out.code = `HTTP_${status}`;
    out.title = UI_MSG.generic.title;
    
    // Extract backend detail message
    const detail = data?.detail?.message || data?.detail || data?.message || null;
    out.body = detail ? String(detail).slice(0, 140) : UI_MSG.generic.body;
    out.retryable = status !== 404; // 404 usually not retryable
    return out;
  }

  return out;
}

export default normalizeAxiosError;
