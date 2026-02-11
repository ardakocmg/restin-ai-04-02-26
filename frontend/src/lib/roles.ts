/**
 * Centralized Role Hierarchy & Helpers
 *
 * Single source of truth for role levels used by:
 *   - NewSidebar (menu filtering)
 *   - PermissionGate (UI gating)
 *   - RoleRoute (route-level guard)
 *
 * Higher number = more access. product_owner (super-admin) sees everything.
 */

export const ROLE_HIERARCHY: Record<string, number> = {
    // Staff-level
    STAFF: 1,
    staff: 1,

    // Manager-level
    MANAGER: 2,
    manager: 2,

    // General Manager (between manager and owner)
    GENERAL_MANAGER: 2.5,
    general_manager: 2.5,

    // Owner-level
    OWNER: 3,
    owner: 3,

    // Super-admin / Product Owner — sees everything, no restrictions
    PRODUCT_OWNER: 99,
    product_owner: 99,
};

/**
 * Check if a user role meets the minimum required role.
 * Returns true if userRole >= requiredRole in the hierarchy.
 * Returns false if userRole is undefined (not logged in).
 */
export function hasRoleAccess(
    userRole: string | undefined,
    requiredRole: string
): boolean {
    if (!userRole) return false;
    return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 99);
}

/**
 * Get the numeric level for a role string.
 * Returns 0 for unknown roles.
 */
export function getRoleLevel(role: string | undefined): number {
    if (!role) return 0;
    return ROLE_HIERARCHY[role] ?? 0;
}

// ─── Route Auth Level Mapping ─────────────────────────────────────
// Maps route prefixes to the minimum auth elevation needed.
// Routes not listed here only need base PIN login.
// 'password' = verify password (30 min TTL)
// 'elevated' = verify 2FA/TOTP (15 min TTL)

export type AuthLevel = 'pin' | 'password' | 'elevated';

export const ROUTE_AUTH_LEVELS: Record<string, AuthLevel> = {
    // ── Elevated (2FA) — Critical financial / system actions ──
    '/admin/finance': 'elevated',
    '/admin/payroll': 'elevated',
    '/admin/billing': 'elevated',
    '/admin/settings/system': 'elevated',
    '/admin/access-control': 'elevated',
    '/admin/roles-permissions': 'elevated',

    // ── Password — Sensitive management areas ──
    '/admin/hr': 'password',
    '/admin/settings': 'password',
    '/admin/inventory': 'password',
    '/admin/procurement': 'password',
    '/admin/compliance': 'password',
    '/admin/reports': 'password',
};

/**
 * Given a route path, find the highest auth level required.
 * Checks most-specific first (longest prefix match).
 */
export function getRouteAuthLevel(path: string): AuthLevel {
    let bestMatch: AuthLevel = 'pin';
    let bestLength = 0;

    for (const [prefix, level] of Object.entries(ROUTE_AUTH_LEVELS)) {
        if (path.startsWith(prefix) && prefix.length > bestLength) {
            bestMatch = level;
            bestLength = prefix.length;
        }
    }

    return bestMatch;
}
