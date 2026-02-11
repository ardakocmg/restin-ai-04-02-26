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
import { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldOff } from 'lucide-react';
import { logger } from '../../lib/logger';

type RoleLevel = 'OWNER' | 'MANAGER' | 'STAFF';

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

const ROLE_HIERARCHY: Record<string, number> = {
    STAFF: 1,
    staff: 1,
    MANAGER: 2,
    manager: 2,
    OWNER: 3,
    owner: 3,
    product_owner: 99,
    PRODUCT_OWNER: 99,
};

function hasAccess(userRole: RoleLevel | undefined, requiredRole: RoleLevel): boolean {
    if (!userRole) return false;
    return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 99);
}

export default function PermissionGate({
    requiredRole,
    children,
    fallback,
    silent = false,
}: PermissionGateProps) {
    const { user } = useAuth();
    const userRole = user?.role as RoleLevel | undefined;

    if (hasAccess(userRole, requiredRole)) {
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
            <div className="h-16 w-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-4">
                <ShieldOff className="h-8 w-8 text-zinc-500" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-1">Access Restricted</h3>
            <p className="text-sm text-zinc-500 text-center max-w-xs">
                This section requires <span className="text-zinc-300 font-medium">{requiredRole}</span> level access.
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
    return hasAccess(user?.role as RoleLevel | undefined, requiredRole);
}
