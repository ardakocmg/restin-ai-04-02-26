import crypto from 'crypto';

// Rule #21 & #25: The Vault (Encryption Service)
// Algorithm: AES-256-CBC

const ALGORITHM = 'aes-256-cbc';
// In Prod, this comes from ENV. Fallback for Dev.
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'antigravity-core-secret-key-32b!';
const IV_LENGTH = 16;

/**
 * Encrypts sensitive columns (e.g. guest_email, staff_salary).
 * Returns format: "iv:encryptedText"
 */
export const encryptColumn = (text: string): string => {
    if (!text) return text;

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);

    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Decrypts sensitive columns.
 */
export const decryptColumn = (text: string): string => {
    if (!text) return text;

    try {
        const textParts = text.split(':');
        if (textParts.length !== 2) return text; // Not encrypted or invalid format

        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);

        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    } catch (error) {
        console.error("[VAULT] Decryption failed", error);
        return "***ERROR***"; // Fail safe
    }
};
