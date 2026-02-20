/**
 * Telemetry Service - UI error reporting with deduplication
 * @module services/TelemetryService
 */
import api from '../lib/api';

interface UIErrorPayload {
    error: Error | string;
    info?: { componentStack?: string };
    appMode?: string;
}

interface TelemetryRecord {
    app_mode: string;
    name: string;
    message: string;
    stack: string;
    component_stack: string;
    url: string;
    user_agent: string;
    ts: string;
}

const lastSent = new Map<string, number>();

const keyOf = (payload: TelemetryRecord): string => {
    const msg = (payload.message || '').slice(0, 120);
    const name = payload.name || '';
    const mode = payload.app_mode || '';
    return `${mode}:${name}:${msg}`;
};

export async function postUIError({ error, info, appMode }: UIErrorPayload): Promise<void> {
    try {
        const errorObj = error instanceof Error ? error : new Error(String(error));

        const payload: TelemetryRecord = {
            app_mode: appMode || 'UNKNOWN',
            name: errorObj.name || 'Error',
            message: String(errorObj.message || error),
            stack: String(errorObj.stack || ''),
            component_stack: String(info?.componentStack || ''),
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

        await api.post('/incidents/ui-error', payload);
    } catch {
        // Never throw from telemetry
    }
}

export default { postUIError };
