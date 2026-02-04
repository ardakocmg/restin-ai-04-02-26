
/**
 * escpos.ts - Raw Hex Generator for Thermal Printers (Rule #30)
 * Implements standard ESC/POS commands.
 */

export const ESC = '\x1B';
export const GS = '\x1D';
export const LF = '\x0A';

export const COMMANDS = {
    INIT: `${ESC}@`,
    CUT: `${GS}V\x41\x00`,

    // Formatting
    BOLD_ON: `${ESC}E\x01`,
    BOLD_OFF: `${ESC}E\x00`,
    CENTER: `${ESC}a\x01`,
    LEFT: `${ESC}a\x00`,
    RIGHT: `${ESC}a\x02`,

    // Text Size
    SIZE_NORMAL: `${GS}!\x00`,
    SIZE_DOUBLE: `${GS}!\x11`, // Double width & height

    // Cash Drawer
    KICK_DRAWER: `${ESC}p\x00\x19\xFA`
};

export class EscPosBuilder {
    private buffer: string = '';

    constructor() {
        this.buffer = COMMANDS.INIT;
    }

    text(content: string) {
        this.buffer += content;
        return this;
    }

    newLine() {
        this.buffer += LF;
        return this;
    }

    bold(enabled: boolean) {
        this.buffer += enabled ? COMMANDS.BOLD_ON : COMMANDS.BOLD_OFF;
        return this;
    }

    align(alignment: 'left' | 'center' | 'right') {
        switch (alignment) {
            case 'center': this.buffer += COMMANDS.CENTER; break;
            case 'right': this.buffer += COMMANDS.RIGHT; break;
            default: this.buffer += COMMANDS.LEFT; break;
        }
        return this;
    }

    size(size: 'normal' | 'large') {
        this.buffer += size === 'large' ? COMMANDS.SIZE_DOUBLE : COMMANDS.SIZE_NORMAL;
        return this;
    }

    cut() {
        this.buffer += COMMANDS.CUT;
        return this;
    }

    kickDrawer() {
        this.buffer += COMMANDS.KICK_DRAWER;
        return this;
    }

    getRaw(): string {
        return this.buffer;
    }

    toHex(): string {
        let hex = '';
        for (let i = 0; i < this.buffer.length; i++) {
            hex += this.buffer.charCodeAt(i).toString(16).padStart(2, '0');
        }
        return hex.toUpperCase();
    }
}
