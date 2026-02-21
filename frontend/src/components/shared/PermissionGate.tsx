/**
 * PermissionGate — Declarative role-based UI gating
 * Wraps content that should only be visible to users with sufficient role.
 * 
 * Role hierarchy: OWNER > MANAGER > STAFF
 * 
 * Usage:
 *   <PermissionGate requiredRole="MANAGER">
 *     <SensitiveContent />
 *   </PermissionGate>
 *
 *   <PermissionGate requiredRole="OWNER" fallback={<UpgradeCTA />}>
 *     <BillingSettings />
 *   </PermissionGate>
 *
 *   <PermissionGate requiredRole="MANAGER" silent>
 *     <DeleteButton />  // Just hidden for non-managers
 *   </PermissionGate>
 */
import { ShieldOff } from 'lucide-react';
import { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../lib/logger';
import { hasRoleAccess } from '../../lib/roles';

type RoleLevel = 'OWNER' | 'MANAGER' | 'STAFF' | 'PRODUCT_OWNER';

interface PermissionGateProps {
    /** Minimum role required to view children */
    requiredRole: RoleLevel;
    /** Content to show when authorized */
    children: ReactNode;
    /** Custom fallback UI for denied state. Defaults to built-in "Access Denied" panel. */
    fallback?: ReactNode;
    /** If true, renders nothing (instead of "Access Denied") when unauthorized */
    silent?: boolean;
}

export default function PermissionGate({
    requiredRole,
    children,
    fallback,
    silent = false,
}: PermissionGateProps) {
    const { user } = useAuth();
    const userRole = user?.role as RoleLevel | undefined;

    if (hasRoleAccess(userRole, requiredRole)) {
        return <>{children}</>;
    }

    // If user is not logged in yet (null/undefined), don't show "Access Denied"
    // — the auth flow will redirect to login. This prevents flash of denied UI
    // during initial page load or when auth is being restored.
    if (!user) {
        return null;
    }

    // Log denied access attempt (only when user IS logged in but lacks role)
    logger.warn('PermissionGate: access denied', {
        userId: user?.id,
        userName: user?.name,
        userRole,
        requiredRole,
        page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    });

    // Silent mode: render nothing
    if (silent) {
        return null;
    }

    // Custom fallback
    if (fallback) {
        return <>{fallback}</>;
    }

    // Default "Access Denied" UI
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="h-16 w-16 rounded-2xl bg-secondary/80 border border-border/50 flex items-center justify-center mb-4">
                <ShieldOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-secondary-foreground mb-1">Access Restricted</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
                This section requires <span className="text-secondary-foreground font-medium">{requiredRole}</span> level access.
                Contact your administrator for permission.
            </p>
        </div>
    );
}

/**
 * Helper: usePermission — check role without rendering
 * 
 * Usage:
 *   const canEdit = usePermission('MANAGER');
 *   <Button disabled={!canEdit}>Edit Settings</Button>
 */
export function usePermission(requiredRole: RoleLevel): boolean {
    const { user } = useAuth();
    return hasRoleAccess(user?.role as RoleLevel | undefined, requiredRole);
}
