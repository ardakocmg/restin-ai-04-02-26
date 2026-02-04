// Rule #30: ESC/POS Raw Generator (Speed & Silence)
// No PDF allowed.

export interface TicketData {
    title: string;
    items: { params: string; qty: number; price: string }[];
    total: string;
    fiscalSignature?: string;
}

export const EscPosGenerator = {
    // ESC/POS Commands (Hex)
    CMD: {
        INIT: '\x1B\x40',
        CUT: '\x1D\x56\x41\x10', // Cut Full
        CENTER: '\x1B\x61\x01',
        LEFT: '\x1B\x61\x00',
        BOLD_ON: '\x1B\x45\x01',
        BOLD_OFF: '\x1B\x45\x00',
        LF: '\x0A'
    },

    generate: (ticket: TicketData): Uint8Array => {
        let buffer = '';
        const { CMD } = EscPosGenerator;

        // Header
        buffer += CMD.INIT;
        buffer += CMD.CENTER;
        buffer += CMD.BOLD_ON + ticket.title + CMD.BOLD_OFF + CMD.LF;
        buffer += "--------------------------------" + CMD.LF;

        buffer += CMD.LEFT;

        // Items
        ticket.items.forEach(item => {
            // Simple column layout logic would go here
            buffer += `${item.qty}x ${item.params} ${item.price}` + CMD.LF;
        });

        buffer += "--------------------------------" + CMD.LF;

        // Total
        buffer += CMD.CENTER + CMD.BOLD_ON + `TOTAL: ${ticket.total}` + CMD.BOLD_OFF + CMD.LF;

        // Fiscal Footer (Rule #17)
        if (ticket.fiscalSignature) {
            buffer += CMD.LF + `Fiscal Sig: ${ticket.fiscalSignature.slice(0, 10)}...` + CMD.LF;
        }

        buffer += CMD.LF + CMD.LF + CMD.LF; // Feed
        buffer += CMD.CUT;

        // Convert string to Uint8Array for TCP/Bluetooth
        const encoder = new TextEncoder();
        return encoder.encode(buffer);
    }
};
