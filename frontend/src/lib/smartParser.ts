/**
 * Smart Message Parser — Context-Aware Chat
 * Rule #40 & #50: Parses #Order, @Table, $Item links in messages
 */

export interface SmartToken {
    type: 'TEXT' | 'ORDER_LINK' | 'TABLE_LINK' | 'ITEM_LINK';
    text: string;
    id?: string;
}

/**
 * Tokenizes a chat message into smart chips.
 * Examples:
 *   "Check #Order123 on @Table5" → [TEXT, ORDER_LINK, TEXT, TABLE_LINK]
 *   "Restock $ItemFlour" → [TEXT, ITEM_LINK]
 */
export const parseSmartMessage = (message: string): SmartToken[] => {
    const tokens: SmartToken[] = [];
    const words = message.split(/\s+/);

    words.forEach((word, idx) => {
        if (idx > 0) tokens.push({ type: 'TEXT', text: ' ' });

        if (word.startsWith('#Order') || word.startsWith('#order')) {
            const id = word.replace(/^#[Oo]rder/, '');
            tokens.push({ type: 'ORDER_LINK', text: word, id });
        } else if (word.startsWith('@Table') || word.startsWith('@table')) {
            const id = word.replace(/^@[Tt]able/, '');
            tokens.push({ type: 'TABLE_LINK', text: word, id });
        } else if (word.startsWith('$Item') || word.startsWith('$item')) {
            const id = word.replace(/^\$[Ii]tem/, '');
            tokens.push({ type: 'ITEM_LINK', text: word, id });
        } else {
            tokens.push({ type: 'TEXT', text: word });
        }
    });

    return tokens;
};

/**
 * Renders a SmartToken array back to plain text (for search indexing etc.)
 */
export const tokensToPlainText = (tokens: SmartToken[]): string => {
    return tokens.map(t => t.text).join('');
};
