/**
 * useAuditLog — Fire-and-forget audit trail hook
 *
 * Sends structured audit entries to POST /venues/{venue_id}/audit-logs.
 * Non-blocking: failures are caught silently and never crash the UI.
 *
 * Usage:
 *   const { logAction } = useAuditLog();
 *
 *   // On settings save:
 *   logAction('SETTINGS_UPDATED', 'company_settings', settingsId);
 *
 *   // On payroll view:
 *   logAction('PAYROLL_VIEWED', 'payroll_run', runId);
 *
 *   // On AI content generation:
 *   logAction('AI_CONTENT_GENERATED', 'studio', contentId, { tokens: 1500 });
 */
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useVenue } from '../context/VenueContext';
import api from '../lib/api';
import { logger } from '../lib/logger';

interface AuditLogEntry {
    user_id: string;
    user_name: string;
    user_role: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    venue_id: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

interface UseAuditLogReturn {
    /** Log an action to the audit trail. Fire-and-forget. */
    logAction: (
        action: string,
        resourceType: string,
        resourceId?: string,
        metadata?: Record<string, unknown>
    ) => void;
}

export function useAuditLog(): UseAuditLogReturn {
    const { user } = useAuth();
    const { activeVenue } = useVenue();

    const logAction = useCallback(
        (
            action: string,
            resourceType: string,
            resourceId?: string,
            metadata?: Record<string, unknown>
        ) => {
            // Guard: need user + venue to log
            if (!user?.id || !activeVenue?.id) {
                logger.warn('useAuditLog: skipped — missing user or venue context');
                return;
            }

            const entry: AuditLogEntry = {
                user_id: user.id,
                user_name: user.name,
                user_role: user.role,
                action,
                resource_type: resourceType,
                resource_id: resourceId,
                venue_id: activeVenue.id,
                timestamp: new Date().toISOString(),
                metadata,
            };

            // Fire and forget — never block the UI
            api
                .post(`/venues/${activeVenue.id}/audit-logs`, entry)
                .catch((err: unknown) => {
                    logger.error('useAuditLog: failed to send audit entry', {
                        action,
                        resourceType,
                        error: err instanceof Error ? err.message : String(err),
                    });
                });
        },
        [user, activeVenue]
    );

    return { logAction };
}

export default useAuditLog;
