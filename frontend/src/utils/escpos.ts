// @ts-nocheck
/**
 * ESC/POS Command Builder
 * Generates raw byte arrays for standard thermal printers (Epson/Star)
 */

const ESC = 0x1B;
const GS = 0x1D;

export const PrinterCommands = {
    INIT: [ESC, 0x40],
    CUT_FULL: [GS, 0x56, 0x00],
    CUT_PARTIAL: [GS, 0x56, 0x01],

    // Text Format
    TXT_NORMAL: [ESC, 0x21, 0x00],
    TXT_2HEIGHT: [ESC, 0x21, 0x10],
    TXT_2WIDTH: [ESC, 0x21, 0x20],
    TXT_4SQUARE: [ESC, 0x21, 0x30],

    TXT_BOLD_ON: [ESC, 0x45, 0x01],
    TXT_BOLD_OFF: [ESC, 0x45, 0x00],

    // Alignment
    TXT_ALIGN_LT: [ESC, 0x61, 0x00],
    TXT_ALIGN_CT: [ESC, 0x61, 0x01],
    TXT_ALIGN_RT: [ESC, 0x61, 0x02],
};

export class ReceiptBuilder {
    constructor() {
        this.buffer = [];
        this.add(PrinterCommands.INIT);
    }

    add(commands) {
        this.buffer.push(...commands);
        return this;
    }

    text(text, encoding = 'utf-8') {
        // Basic text encoder
        const encoder = new TextEncoder();
        // For real ESC/POS, sometimes we need Codepage 437 or 1252.
        // Assuming UTF-8 printer support or ASCII for now.
        const encoded = encoder.encode(text);
        this.buffer.push(...encoded);
        return this;
    }

    textLine(text) {
        this.text(text);
        this.buffer.push(0x0A); // Newline
        return this;
    }

    align(align) {
        switch (align) {
            case 'center': this.add(PrinterCommands.TXT_ALIGN_CT); break;
            case 'right': this.add(PrinterCommands.TXT_ALIGN_RT); break;
            default: this.add(PrinterCommands.TXT_ALIGN_LT); break;
        }
        return this;
    }

    style(style) {
        if (style === 'bold') this.add(PrinterCommands.TXT_BOLD_ON);
        if (style === 'normal') this.add(PrinterCommands.TXT_NORMAL);
        if (style === 'title') this.add(PrinterCommands.TXT_2HEIGHT);
        return this;
    }

    feed(lines = 1) {
        for (let i = 0; i < lines; i++) this.buffer.push(0x0A);
        return this;
    }

    cut() {
        this.feed(3);
        this.add(PrinterCommands.CUT_PARTIAL);
        return this;
    }

    /**
     * Returns the raw Uint8Array for the printer
     */
    encode() {
        return new Uint8Array(this.buffer);
    }
}
