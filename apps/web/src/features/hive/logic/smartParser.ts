// Rule #40 & #50: Context-Aware Chat

export interface SmartToken {
    type: 'TEXT' | 'ORDER_LINK' | 'TABLE_LINK' | 'ITEM_LINK';
    text: string;
    id?: string;
}

// Regex Patterns
const PATTERNS = {
    ORDER: /#Order([A-Za-z0-9-]+)/g,
    TABLE: /@Table([A-Za-z0-9-]+)/g,
    ITEM: /\$Item([A-Za-z0-9-]+)/g
};

export const parseSmartMessage = (message: string): SmartToken[] => {
    const tokens: SmartToken[] = [];
    let lastIndex = 0;

    // We need to match all patterns. For simplicity, we'll split by spaces/words and check.
    // Or strictly search for matches and slice the string. 
    // Let's use a tokenizer approach.

    // Combining regex is tricky for order. Let's do a replace-based approach or split.
    // Simplest: Split by space, verify if token matches. 
    // But "Hello #Order123!" has punctuation.

    // Better strategy: Match all occurrences and sort by index?
    // Let's stick to a robust simpler method: Global match and reconstruction.

    // Actually, lets assume space separation for MVP "Smart Chips" usage.
    const words = message.split(/\s+/);

    words.forEach((word, idx) => {
        if (idx > 0) tokens.push({ type: 'TEXT', text: ' ' }); // Restore spaces

        let matched = false;

        // Order Match
        const orderMatch = word.match(/^#([a-zA-Z0-9-]+)$/);
        // Note: Using #ID without "Order" prefix in strict regex above? 
        // Request said: "#Order[ID]". Let's match strict req.
        // If Regex is /#Order([A-Za-z0-9-]+)/

        if (word.startsWith('#Order')) {
            const id = word.replace('#Order', '');
            tokens.push({ type: 'ORDER_LINK', text: word, id });
            matched = true;
        } else if (word.startsWith('@Table')) {
            const id = word.replace('@Table', '');
            tokens.push({ type: 'TABLE_LINK', text: word, id });
            matched = true;
        } else if (word.startsWith('$Item')) {
            const id = word.replace('$Item', '');
            tokens.push({ type: 'ITEM_LINK', text: word, id });
            matched = true;
        }

        if (!matched) {
            tokens.push({ type: 'TEXT', text: word });
        }
    });

    return tokens;
};
