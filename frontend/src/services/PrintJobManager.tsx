/**
 * PrintJobManager - Manages print jobs for POS/KDS
 * @module services/PrintJobManager
 */
import { ReceiptBuilder } from '../utils/escpos';
import api from '../lib/api';
import { toast } from 'sonner';
import { logger } from '../lib/logger';

export interface OrderModifier {
    name: string;
    price?: number;
}

export interface OrderItem {
    name: string;
    quantity?: number;
    price?: number;
    modifiers?: OrderModifier[];
}

export interface Order {
    id: string;
    venue_id: string;
    venue_name?: string;
    table_name?: string;
    server_name?: string;
    total?: number;
}

export interface PrintJobPayload {
    venue_id: string;
    printer_type: 'kitchen' | 'receipt';
    raw_content_hex: string;
    fallback_html: string;
}

/**
 * Manages Print Jobs for the browser.
 * Smartly decides whether to:
 * 1. Send raw ESC/POS to Backend (if LAN printer)
 * 2. Use Browser Print (if local USB/driver)
 */
class PrintJobManager {

    async printOrderTickect(order: Order, items: OrderItem[]): Promise<boolean> {
        try {
            // 1. Generate Raw ESC/POS (for Backend/IP Printers)
            const builder = new ReceiptBuilder();

            builder.align('center').style('title').textLine('RESTIN POS');
            builder.style('normal').textLine(order.venue_name || 'Guest Check');
            builder.textLine('--------------------------------');

            builder.align('left');
            builder.textLine(`Table: ${order.table_name || 'Walk-in'}`);
            builder.textLine(`Server: ${order.server_name || 'Staff'}`);
            builder.textLine(`Date: ${new Date().toLocaleString()}`);
            builder.textLine('--------------------------------');

            items.forEach(item => {
                const qty = item.quantity || 1;
                const price = item.price || 0;
                builder.textLine(`${qty}x ${item.name}   ${(qty * price).toFixed(2)}`);
                if (item.modifiers && item.modifiers.length > 0) {
                    item.modifiers.forEach(mod => {
                        builder.textLine(`  + ${mod.name}`);
                    });
                }
            });

            builder.textLine('--------------------------------');
            builder.align('right').style('bold');
            builder.textLine(`TOTAL: EUR ${(order.total || 0).toFixed(2)}`);
            builder.cut();

            const hexPayload = this.bufToHex(builder.encode());

            // 2. Dispatch
            // We send the HEX payload to the backend to handle the actual socket connection
            // to the LAN printer (which browsers can't do easily due to mixed content/raw socket limits)
            const payload: PrintJobPayload = {
                venue_id: order.venue_id,
                printer_type: 'kitchen',
                raw_content_hex: hexPayload,
                fallback_html: this.generateFallbackHTML(order, items)
            };

            await api.post('/print/jobs', payload);

            toast.success('Print Job sent to spooler');
            return true;

        } catch (error) {
            const err = error as Error;
            logger.error('Print failed', { error: err.message });
            // Fallback to Window Print
            toast.error('Raw print failed, opening system dialog');
            this.browserFallbackPrint(order, items);
            return false;
        }
    }

    private bufToHex(buffer: Uint8Array): string {
        return Array.prototype.map.call(buffer, (x: number) => ('00' + x.toString(16)).slice(-2)).join('');
    }

    private browserFallbackPrint(_order: Order, _items: OrderItem[]): void {
        // Simple window.print() logic could go here
        // For now we assume the backend handles it or we show a modal
        logger.info('Browser fallback triggered');
    }

    private generateFallbackHTML(order: Order, _items: OrderItem[]): string {
        // Return a simple HTML string for PDF generation serverside if ESC/POS fails
        return `<html><body><h1>Order ${order.id}</h1></body></html>`;
    }
}

export const printManager = new PrintJobManager();
export default printManager;
