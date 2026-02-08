
/**
 * printer-service.ts - Hardware Bridge for Terminals (Rule #30)
 */

import { EscPosBuilder } from './escpos';

export interface PrinterDevice {
    id: string;
    name: string;
    ip?: string;
    port?: number;
    type: 'NETWORK' | 'USB' | 'BLUETOOTH';
}

export class PrinterService {
    private printers: Map<string, PrinterDevice> = new Map();

    register(printer: PrinterDevice) {
        this.printers.set(printer.id, printer);
    }

    async printJob(printerId: string, builder: EscPosBuilder): Promise<boolean> {
        const printer = this.printers.get(printerId);
        if (!printer) {
            console.error(`Printer ${printerId} not found`);
            return false;
        }

        const rawHex = builder.toHex();
        console.log(`[PrinterService] Sending ${rawHex.length} bytes to ${printer.name} (${printer.ip})`);

        // Rule #30: Edge Bridge - Send to backend API which handles TCP socket
        if (printer.ip && printer.type === 'NETWORK') {
            try {
                const response = await fetch('/api/print/raw', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ip: printer.ip,
                        port: printer.port || 9100,
                        data: rawHex
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    console.error(`[PrinterService] Print failed: ${error.detail}`);
                    return false;
                }

                const result = await response.json();
                console.log(`[PrinterService] Print success: ${result.bytes_sent} bytes sent`);
                return true;
            } catch (error) {
                console.error(`[PrinterService] Network error:`, error);
                return false;
            }
        }

        // Fallback: Simulation mode for USB/Bluetooth or when no IP
        console.log(`[PrinterService] Simulation mode - would print ${rawHex.length} bytes`);
        return true;
    }

    async discover(): Promise<PrinterDevice[]> {
        // Rule #33: Auto-Discovery (Simulated for Web)
        // In Electron/Capacitor, this would use 'bonjour' or 'mdns' packages.
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { id: "p1", name: "Epson TM-T88VI (Kitchen)", ip: "192.168.1.50", type: "NETWORK" },
                    { id: "p2", name: "Star TSP143 (Bar)", ip: "192.168.1.51", type: "NETWORK" }
                ]);
            }, 1500);
        });
    }
}

export const printerService = new PrinterService();
