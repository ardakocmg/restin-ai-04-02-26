/**
 * Hardware Bridge Service — ESC/POS Printing with Failover
 * Rule #30 & #64: Raw printing without PDF dialogs
 */

export interface TicketData {
    header: string;
    items: Array<{ name: string; qty: number; price: number }>;
    subtotal: number;
    tax: number;
    total: number;
    footer?: string;
    orderId?: string;
    tableId?: string;
    timestamp: string;
}

interface IHardwareAdapter {
    connect(ip: string): Promise<void>;
    print(data: Uint8Array): Promise<boolean>;
    disconnect(): Promise<void>;
}

/**
 * Web Bridge Adapter — sends ESC/POS data to localhost bridge
 */
class WebBridgeAdapter implements IHardwareAdapter {
    private bridgeUrl = 'http://localhost:9100';

    async connect(ip: string): Promise<void> {
        this.bridgeUrl = `http://${ip}`;
    }

    async print(data: Uint8Array): Promise<boolean> {
        try {
            const response = await fetch(`${this.bridgeUrl}/print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: data.buffer as ArrayBuffer,
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    async disconnect(): Promise<void> {
        // No-op for web bridge
    }
}

class HardwareService {
    private adapter: IHardwareAdapter;

    constructor() {
        this.adapter = new WebBridgeAdapter();
    }

    async printJob(printerIp: string, ticket: TicketData, backupPrinterIp?: string): Promise<boolean> {
        const payload = this.generateEscPos(ticket);

        // Attempt Primary
        const result = await this.tryPrint(printerIp, payload);
        if (result) return true;

        // Failover to backup
        if (backupPrinterIp) {
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
        } catch {
            return false;
        }
    }

    /**
     * Minimal ESC/POS command generation
     */
    private generateEscPos(ticket: TicketData): Uint8Array {
        const encoder = new TextEncoder();
        const ESC = '\x1B';
        const GS = '\x1D';
        const lines: string[] = [];

        // Init
        lines.push(`${ESC}@`);
        // Center + Bold
        lines.push(`${ESC}a\x01${ESC}E\x01`);
        lines.push(ticket.header);
        lines.push(`${ESC}E\x00${ESC}a\x00`);
        lines.push('--------------------------------');

        // Items
        for (const item of ticket.items) {
            const price = (item.price / 100).toFixed(2);
            const line = `${item.qty}x ${item.name}`.padEnd(24) + `€${price}`.padStart(8);
            lines.push(line);
        }

        lines.push('--------------------------------');
        lines.push(`SUBTOTAL`.padEnd(24) + `€${(ticket.subtotal / 100).toFixed(2)}`.padStart(8));
        lines.push(`TAX`.padEnd(24) + `€${(ticket.tax / 100).toFixed(2)}`.padStart(8));
        lines.push(`${ESC}E\x01`);
        lines.push(`TOTAL`.padEnd(24) + `€${(ticket.total / 100).toFixed(2)}`.padStart(8));
        lines.push(`${ESC}E\x00`);
        lines.push('');

        if (ticket.footer) {
            lines.push(`${ESC}a\x01`);
            lines.push(ticket.footer);
        }

        // Cut paper
        lines.push(`\n\n\n${GS}V\x00`);

        return encoder.encode(lines.join('\n'));
    }
}

export const hardwareService = new HardwareService();
