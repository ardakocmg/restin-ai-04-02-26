
/**
 * anonymizer.ts - GDPR Right to Vanish (Rule #58 & #21)
 */

import { createHash } from 'crypto';

interface PIISet {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
}

/**
 * Scrubs PII from a user record, replacing it with a secure hash or redaction.
 * Used when a user requests deletion or after a retention period expires.
 */
export function scrubPII(user: PIISet): PIISet {
    const salt = new Date().toISOString(); // Simple entropy for irreversible redaction in this context

    return {
        firstName: 'Redacted',
        lastName: 'User',
        email: user.email ? `anonymized-${hash(user.email + salt)}@deleted.local` : null,
        phone: null
    };
}

function hash(input: string): string {
    return createHash('sha256').update(input).digest('hex').substring(0, 12);
}
