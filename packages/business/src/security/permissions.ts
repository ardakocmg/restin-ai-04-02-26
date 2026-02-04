import type { AppConfig } from '@antigravity/config';
import type { User, UserRole } from '@prisma/client';

// Rule #47: SaaS Gating + Rule #21: RBAC

type Permission =
    | 'inventory.view'
    | 'inventory.edit'
    | 'pos.access'
    | 'kds.access'
    | 'reports.view'
    | 'settings.manage';

// Role Definitions (Base capabilities)
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    'SUPER_ADMIN': ['inventory.view', 'inventory.edit', 'pos.access', 'kds.access', 'reports.view', 'settings.manage'],
    'ORG_ADMIN': ['inventory.view', 'inventory.edit', 'pos.access', 'kds.access', 'reports.view', 'settings.manage'],
    'BRAND_MANAGER': ['inventory.view', 'inventory.edit', 'pos.access', 'reports.view'],
    'BRANCH_MANAGER': ['inventory.view', 'pos.access', 'reports.view'],
    'STAFF': ['pos.access'],
    'KITCHEN': ['kds.access'],
};

/**
 * The Guard: Checks if a user can perform an action based on Role AND SaaS Config.
 */
export const hasPermission = (user: User, permission: Permission, config: AppConfig): boolean => {
    // 1. Check SaaS Plan / Feature Flags (The Hard Gate)
    if (permission.startsWith('pos.') && !config.features.pos) return false;
    if (permission.startsWith('inventory.') && !config.features.inventory_complex) return false;
    if (permission.startsWith('kds.') && !config.features.kds_voice) return false; // Example: KDS guarded by feature

    // 2. Check User Role (The Soft Gate)
    const allowed = ROLE_PERMISSIONS[user.role]?.includes(permission);

    // 3. Check Custom Permissions (Rule #21 - JSON array override)
    // if (user.permissions?.includes(permission)) return true;

    return !!allowed;
};

/**
 * Creates a "Guarded Context" for API calls.
 * Injects strict tenant filtering.
 */
export const createSecureContext = (user: User) => {
    return {
        user,
        tenantFilter: { organizationId: user.organizationId }, // Strict Scope
        isSystemAdmin: user.role === 'SUPER_ADMIN'
    };
};
