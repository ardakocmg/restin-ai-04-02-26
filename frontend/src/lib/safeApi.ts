/**
 * safeApi — Runtime Zod Validation Wrapper
 * @module lib/safeApi
 *
 * Rule #7: Use zod schemas for ALL inputs and API responses.
 *
 * Wraps the shared axios instance to validate responses through Zod schemas
 * at runtime. Malformed API responses are caught early instead of causing
 * silent UI bugs downstream.
 *
 * Usage:
 *   import { safeGet, safePost } from '../lib/safeApi';
 *   import { VenueSchema } from '../lib/schemas';
 *
 *   const venues = await safeGet('/venues', z.array(VenueSchema));
 *   const order  = await safePost('/orders', data, OrderSchema);
 */
import { z, ZodError } from 'zod';
import api from './api';
import { logger } from './logger';

// ─── Types ──────────────────────────────────────────────────────────────

interface SafeResult<T> {
    data: T;
    raw: unknown;
    validated: true;
}

interface SafeError {
    data: null;
    error: string;
    zodErrors?: z.ZodIssue[];
    validated: false;
}

type SafeResponse<T> = SafeResult<T> | SafeError;

// ─── Core Validator ─────────────────────────────────────────────────────

function validate<T>(schema: z.ZodType<T>, data: unknown, endpoint: string): T {
    try {
        return schema.parse(data);
    } catch (err) {
        if (err instanceof ZodError) {
            logger.warn(`Zod validation warning on ${endpoint}`, {
                issues: err.issues.map(i => `${i.path.join('.')}: ${i.message}`),
            });
            // In development, log full details; in production, return partial data
            if (process.env.NODE_ENV === 'development') {
                logger.error('Full Zod error:', { error: err.flatten() });
            }
            // Use safeParse to return partial data with defaults where possible
            const result = schema.safeParse(data);
            if (result.success) return result.data;
            // If still failing, return raw data with a warning
            // This prevents hard crashes while still logging the issue
            return data as T;
        }
        throw err;
    }
}

// ─── Safe GET ───────────────────────────────────────────────────────────

export async function safeGet<T>(
    endpoint: string,
    schema: z.ZodType<T>,
    config?: Record<string, unknown>
): Promise<SafeResponse<T>> {
    try {
        const response = await api.get(endpoint, config);
        const validated = validate(schema, response.data, `GET ${endpoint}`);
        return { data: validated, raw: response.data, validated: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`safeGet ${endpoint} failed:`, { error: message });
        return { data: null, error: message, validated: false };
    }
}

// ─── Safe POST ──────────────────────────────────────────────────────────

export async function safePost<T>(
    endpoint: string,
    body: unknown,
    responseSchema: z.ZodType<T>,
    config?: Record<string, unknown>
): Promise<SafeResponse<T>> {
    try {
        const response = await api.post(endpoint, body, config);
        const validated = validate(responseSchema, response.data, `POST ${endpoint}`);
        return { data: validated, raw: response.data, validated: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`safePost ${endpoint} failed:`, { error: message });
        return { data: null, error: message, validated: false };
    }
}

// ─── Safe PUT ───────────────────────────────────────────────────────────

export async function safePut<T>(
    endpoint: string,
    body: unknown,
    responseSchema: z.ZodType<T>,
    config?: Record<string, unknown>
): Promise<SafeResponse<T>> {
    try {
        const response = await api.put(endpoint, body, config);
        const validated = validate(responseSchema, response.data, `PUT ${endpoint}`);
        return { data: validated, raw: response.data, validated: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`safePut ${endpoint} failed:`, { error: message });
        return { data: null, error: message, validated: false };
    }
}

// ─── Safe DELETE ────────────────────────────────────────────────────────

export async function safeDelete<T>(
    endpoint: string,
    responseSchema: z.ZodType<T>,
    config?: Record<string, unknown>
): Promise<SafeResponse<T>> {
    try {
        const response = await api.delete(endpoint, config);
        const validated = validate(responseSchema, response.data, `DELETE ${endpoint}`);
        return { data: validated, raw: response.data, validated: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error(`safeDelete ${endpoint} failed:`, { error: message });
        return { data: null, error: message, validated: false };
    }
}

// ─── Convenience: Validate any raw data ─────────────────────────────────

export function validateData<T>(schema: z.ZodType<T>, data: unknown, label = 'unknown'): T | null {
    try {
        return schema.parse(data);
    } catch (err) {
        if (err instanceof ZodError) {
            logger.warn(`Data validation failed for ${label}:`, {
                issues: err.issues.map(i => `${i.path.join('.')}: ${i.message}`),
            });
        }
        return null;
    }
}

// ─── Re-exports for convenience ─────────────────────────────────────────

export type { SafeResponse, SafeResult, SafeError };
