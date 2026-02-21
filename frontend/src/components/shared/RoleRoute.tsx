/**
 * RoleRoute — Route-level role + auth-elevation guard
 *
 * Wraps <Route> elements to enforce:
 *   1. Role-based access (user role >= required role)
 *   2. Progressive auth elevation (PIN → Google Authenticator based on route)
 *
 * product_owner bypasses ALL checks (role + elevation).
 *
 * Usage in App.tsx:
 *   <Route path="finance" element={<RoleRoute requiredRole="OWNER"><FinanceDashboard /></RoleRoute>} />
 */
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROLE_HIERARCHY } from '../../lib/roles';
import { getRouteAuthLevel, AuthLevel } from '../../lib/roles';
import { useAuthElevation } from '../../hooks/useAuthElevation';

type RoleLevel = 'STAFF' | 'MANAGER' | 'OWNER' | 'PRODUCT_OWNER';

interface RoleRouteProps {
    requiredRole: RoleLevel;
    /** Override the auth level required for this route (defaults to route-based mapping) */
    authLevel?: AuthLevel;
    children: React.ReactNode;
}

export default function RoleRoute({ requiredRole, authLevel, children }: RoleRouteProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { isElevated, requireElevation, isSuperAdmin } = useAuthElevation();
    const [elevationChecked, setElevationChecked] = useState(false);
    const [elevationDenied, setElevationDenied] = useState(false);

    // ─── Role Check ─────────────────────────────────────────────
    const userRole = user?.role;
    const userHierarchy = ROLE_HIERARCHY[userRole ?? ''] ?? 0;
    const requiredHierarchy = ROLE_HIERARCHY[requiredRole] ?? 99;
    const roleGranted = userHierarchy >= requiredHierarchy;

    // ─── Auth Level Check ───────────────────────────────────────
    const neededLevel = authLevel || getRouteAuthLevel(location.pathname);

    useEffect(() => {
        // Reset on route change
        setElevationChecked(false);
        setElevationDenied(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!roleGranted) return; // Role denied — no need to check elevation
        if (elevationChecked) return; // Already handled
        if (isSuperAdmin) {
            // Super admin — skip elevation entirely
            setElevationChecked(true);
            return;
        }
        if (neededLevel === 'pin') {
            // No elevation needed for this route
            setElevationChecked(true);
            return;
        }

        // Check if already elevated
        if (isElevated(neededLevel)) {
            setElevationChecked(true);
            return;
        }

        // Trigger elevation modal
        requireElevation(neededLevel).then((granted) => {
            setElevationChecked(true);
            if (!granted) {
                setElevationDenied(true);
            }
        });
    }, [roleGranted, neededLevel, isSuperAdmin, isElevated, requireElevation, elevationChecked]);

    // ─── Role Denied ────────────────────────────────────────────
    if (!roleGranted) {
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
                        onClick={() => navigate('/manager/dashboard')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ─── Elevation in progress ──────────────────────────────────
    if (!elevationChecked) {
        // Show loading state while elevation modal is open
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto animate-pulse">
                        <Lock className="w-6 h-6 text-amber-400" />
                    </div>
                    <p className="text-sm text-muted-foreground">Verifying access level...</p>
                </div>
            </div>
        );
    }

    // ─── Elevation Denied ───────────────────────────────────────
    if (elevationDenied) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-6">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="mx-auto w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Lock className="w-10 h-10 text-amber-400" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-foreground">
                            Verification Required
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            This area requires {neededLevel === 'elevated' ? 'Google Authenticator' : 'password'} verification.
                        </p>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => navigate('/manager/dashboard')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        <button
                            onClick={() => {
                                setElevationChecked(false);
                                setElevationDenied(false);
                            }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-600/30 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── All checks passed ──────────────────────────────────────
    return <>{children}</>;
}
