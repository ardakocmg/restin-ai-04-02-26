import { EscPosGenerator, type TicketData } from './logic/escpos';
import { NativeAdapter, WebBridgeAdapter, type IHardwareAdapter } from './adapters';
import { Capacitor } from '@capacitor/core';

// Rule #30 & Rule #64: Hardware Bridge & Failover

class HardwareService {
    private adapter: IHardwareAdapter;

    constructor() {
        // Strategy Selection
        if (Capacitor.isNativePlatform()) {
            this.adapter = new NativeAdapter();
        } else {
            this.adapter = new WebBridgeAdapter();
        }
    }

    async printJob(printerIp: string, ticket: TicketData, backupPrinterIp?: string): Promise<boolean> {
        const payload = EscPosGenerator.generate(ticket);

        // Attempt Primary
        console.log(`[HARDWARE] Printing to ${printerIp}...`);
        const result = await this.tryPrint(printerIp, payload);

        if (result) return true;

        // Failover Logic
        if (backupPrinterIp) {
            console.warn(`[HARDWARE] Primary failed. Failing over to ${backupPrinterIp}`);
            return await this.tryPrint(backupPrinterIp, payload);
        }

        return false;
    }

    private async tryPrint(ip: string, data: Uint8Array): Promise<boolean> {
        try {
            await this.adapter.connect(ip);
            const success = await this.adapter.print(data);
            await this.adapter.disconnect();
            return success;
        } catch (e) {
            return false;
        }
    }
}

export const hardwareService = new HardwareService();
