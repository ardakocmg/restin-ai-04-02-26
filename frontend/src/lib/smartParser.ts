/**
 * Smart Message Parser — Context-Aware Chat
 * Rule #40 & #50: Parses contextual links in messages
 * 
 * Supported formats:
 *   #Order123   → Order detail page
 *   #Res456     → Reservation detail
 *   @Table5     → Table/floorplan view
 *   @Marco      → Staff/employee profile
 *   $ItemFlour  → Inventory item
 *   $RecipePasta → Recipe detail
 *   %Guest:Smith → Guest profile
 */

export type SmartTokenType =
    | 'TEXT'
    | 'ORDER_LINK'
    | 'TABLE_LINK'
    | 'ITEM_LINK'
    | 'RECIPE_LINK'
    | 'RESERVATION_LINK'
    | 'STAFF_MENTION'
    | 'GUEST_LINK';

export interface SmartToken {
    type: SmartTokenType;
    text: string;
    id?: string;
    /** The route to navigate to when clicked */
    route?: string;
}

/**
 * Tokenizes a chat message into smart chips with navigation routes.
 * 
 * Examples:
 *   "Check #Order123 on @Table5" → [TEXT, ORDER_LINK, TEXT, TABLE_LINK]
 *   "Restock $ItemFlour" → [TEXT, ITEM_LINK]
 *   "#Res789 needs attention" → [RESERVATION_LINK, TEXT]
 *   "Hey @Marco check $RecipeBolognese" → [TEXT, STAFF_MENTION, TEXT, RECIPE_LINK]
 */
export const parseSmartMessage = (message: string): SmartToken[] => {
    const tokens: SmartToken[] = [];
    const words = message.split(/\s+/);

    words.forEach((word, idx) => {
        if (idx > 0) tokens.push({ type: 'TEXT', text: ' ' });

        // #Order123 → Order link
        if (/^#[Oo]rder\d*/i.test(word)) {
            const id = word.replace(/^#[Oo]rder/i, '');
            tokens.push({ type: 'ORDER_LINK', text: word, id, route: `/manager/orders${id ? `?id=${id}` : ''}` });
        }
        // #Res123 or #Reservation123 → Reservation link
        else if (/^#[Rr]es(ervation)?\d*/i.test(word)) {
            const id = word.replace(/^#[Rr]es(ervation)?/i, '');
            tokens.push({ type: 'RESERVATION_LINK', text: word, id, route: `/manager/reservations${id ? `?id=${id}` : ''}` });
        }
        // @Table5 → Table/floorplan
        else if (/^@[Tt]able\d*/i.test(word)) {
            const id = word.replace(/^@[Tt]able/i, '');
            tokens.push({ type: 'TABLE_LINK', text: word, id, route: `/manager/tables${id ? `?table=${id}` : ''}` });
        }
        // @Name → Staff mention (any @word that isn't @Table)
        else if (/^@[A-Z][a-zA-Z]+/.test(word)) {
            const name = word.replace(/^@/, '');
            tokens.push({ type: 'STAFF_MENTION', text: word, id: name, route: `/manager/hr/personnel?search=${name}` });
        }
        // $Recipe → Recipe link
        else if (/^\$[Rr]ecipe/i.test(word)) {
            const id = word.replace(/^\$[Rr]ecipe/i, '');
            tokens.push({ type: 'RECIPE_LINK', text: word, id, route: `/manager/recipes${id ? `?search=${id}` : ''}` });
        }
        // $Item or $Stock → Inventory item
        else if (/^\$[Ii]tem|\$[Ss]tock/i.test(word)) {
            const id = word.replace(/^\$([Ii]tem|[Ss]tock)/i, '');
            tokens.push({ type: 'ITEM_LINK', text: word, id, route: `/manager/inventory${id ? `?search=${id}` : ''}` });
        }
        // %Guest:Name → Guest profile
        else if (/^%[Gg]uest:?/i.test(word)) {
            const name = word.replace(/^%[Gg]uest:?/i, '');
            tokens.push({ type: 'GUEST_LINK', text: word, id: name, route: `/manager/crm/guests?search=${name}` });
        }
        // Plain text
        else {
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
