/**
 * scanner-service.ts - Native Camera Bridge (Rule #31)
 */

export interface ScanResult {
    hasContent: boolean;
    content: string;
}

export class ScannerService {
    private isNative: boolean;

    constructor() {
        // Detect if running in Capacitor
        this.isNative = typeof window !== 'undefined' && !!(window as any).Capacitor;
    }

    async scan(): Promise<ScanResult> {
        if (this.isNative) {
            console.log("[Scanner] Starting Native Camera...");
            // In a real implementation:
            // const { Camera } = await import('@capacitor/camera');
            // const image = await Camera.getPhoto(...);
            // return { hasContent: true, content: "SKU-123456" };
            return { hasContent: true, content: "NATIVE-SCAN-MOCK" };
        } else {
            console.log("[Scanner] Web Simulation...");
            // Simulate waiting for user to point camera
            return new Promise((resolve) => {
                setTimeout(() => {
                    const mockSKUs = ["SKU-1001", "SKU-1002", "LOYALTY-888"];
                    const random = mockSKUs[Math.floor(Math.random() * mockSKUs.length)];
                    resolve({ hasContent: true, content: random });
                }, 1000);
            });
        }
    }

    async vibrate() {
        if (this.isNative) {
            // await Haptics.vibrate();
            console.log("[Haptics] Bzzz!");
        }
    }
}

export const scannerService = new ScannerService();
