import { db } from '../db';

// Rule #66: Control Tower Telemetry

interface DeviceHealth {
    deviceId: string;
    appVersion: string;
    batteryLevel?: number;
    syncQueueDepth: number;
    lastActive: number;
    memoryUsage?: number;
}

const TELEMETRY_ENDPOINT = '/api/telemetry/heartbeat';
const INTERVAL_MS = 300000; // 5 Minutes

export class TelemetryService {
    private timer: NodeJS.Timeout | null = null;

    start() {
        if (this.timer) return;
        this.ping(); // Initial
        this.timer = setInterval(() => this.ping(), INTERVAL_MS);
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
    }

    private async ping() {
        try {
            // Gatther Vitals
            const queueCount = await db.syncQueue.count();

            let battery = 100;
            if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
                const b = await (navigator as any).getBattery();
                battery = b.level * 100;
            }

            const health: DeviceHealth = {
                deviceId: localStorage.getItem('DEVICE_ID') || 'unknown',
                appVersion: '17.0.0-beta', // Import from package.json in real app
                batteryLevel: Math.round(battery),
                syncQueueDepth: queueCount,
                lastActive: Date.now(),
                // @ts-ignore
                memoryUsage: performance?.memory?.usedJSHeapSize
            };

            // Fire and Forget (don't block UI)
            fetch(TELEMETRY_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(health),
                keepalive: true // Ensure it sends even if tab closes
            }).catch(e => console.warn("[TELEMETRY] Ping Failed", e));

        } catch (error) {
            console.error("[TELEMETRY] Internal Error", error);
        }
    }
}

export const telemetry = new TelemetryService();
