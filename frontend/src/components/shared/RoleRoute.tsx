/**
 * RoleRoute — Route-level role guard wrapper
 *
 * Wraps <Route> elements to enforce role-based access at the routing layer.
 * If user lacks the required role, they see an "Access Restricted" panel
 * instead of the target page.
 *
 * Usage in App.tsx:
 *   <Route path="finance" element={<RoleRoute requiredRole="OWNER"><FinanceDashboard /></RoleRoute>} />
 */
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type RoleLevel = 'STAFF' | 'MANAGER' | 'OWNER';

const ROLE_HIERARCHY: Record<string, number> = {
    STAFF: 1,
    staff: 1,
    MANAGER: 2,
    manager: 2,
    OWNER: 3,
    owner: 3,
    product_owner: 99,
    PRODUCT_OWNER: 99,
    admin: 99,
    ADMIN: 99,
};

function hasAccess(userRole: string | undefined, requiredRole: RoleLevel): boolean {
    if (!userRole) return false;
    return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 99);
}

interface RoleRouteProps {
    requiredRole: RoleLevel;
    children: React.ReactNode;
}

export default function RoleRoute({ requiredRole, children }: RoleRouteProps) {
    const { user } = useAuth();
    const navigate = useNavigate();

    if (hasAccess(user?.role, requiredRole)) {
        return <>{children}</>;
    }

    return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <Shield className="w-10 h-10 text-red-400" />
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-foreground">
                        Access Restricted
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        This section requires <span className="font-medium text-amber-400">{requiredRole}</span> privileges or higher.
                    </p>
                </div>

                {/* Info Card */}
                <div className="bg-card/50 border border-border rounded-xl p-4 text-left space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>Your current role: <span className="font-medium text-foreground">{user?.role ?? 'Unknown'}</span></span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 pl-6">
                        Contact your administrator to request elevated access.
                    </p>
                </div>

                {/* Back Button */}
                <button
                    onClick={() => navigate('/admin/dashboard')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
}
