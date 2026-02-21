/**
 * 🔐 Door Access Control — Nuki Smart Lock Admin Panel
 *
 * Server-authoritative: all decisions are backend-only.
 * This component is UI-only — no business logic.
 *
 * Tabs:
 *  1. Connection Setup    — OAuth2 or API token onboarding
 *  2. Door Management     — List doors, rename, battery/status
 *  3. Quick Actions       — Unlock/Lock/Unlatch per door
 *  4. Permissions         — Role × Door matrix
 *  5. Audit Trail         — Immutable access history
 *  6. Bridge              — Health indicator, LAN/WEB routing
 *  7. Reporting           — Analytics, heatmap, timeline
 *  8. Keypad PINs         — Time-limited PIN lifecycle
 */
import PermissionGate from '@/components/shared/PermissionGate';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { BarChart3,DoorOpen,Eye,Keyboard,Lock,Router,Shield,Wifi } from 'lucide-react';
import React from 'react';

// ─── Lazy-loaded tab components (code-split per tab) ──────────────────────
const ConnectionTab = React.lazy(() => import('./tabs/ConnectionTab'));
const DoorsTab = React.lazy(() => import('./tabs/DoorsTab'));
const PermissionsTab = React.lazy(() => import('./tabs/PermissionsTab'));
const AuditTab = React.lazy(() => import('./tabs/AuditTab'));
const BridgeTab = React.lazy(() => import('./tabs/BridgeTab'));
const ReportsTab = React.lazy(() => import('./tabs/ReportsTab'));
const KeypadTab = React.lazy(() => import('./tabs/KeypadTab'));

// ─── Tab Fallback ─────────────────────────────────────────────────────────
function TabLoading() {
    return (
        <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function DoorAccessControl() {
    const { user } = useAuth();
    const { logAction } = useAuditLog();

    React.useEffect(() => {
        logAction('DOOR_ACCESS_VIEWED', 'door_access', undefined, { user_id: user?.id });
    }, []);

    return (
        <PermissionGate requiredRole="OWNER">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center">
                        <Lock className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Door Access Control</h1>
                        <p className="text-sm text-muted-foreground">Nuki Smart Lock integration — server-authoritative access management</p>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="doors" className="space-y-6">
                    <TabsList className="bg-card border border-border p-1 flex-wrap">
                        <TabsTrigger value="connection" className="data-[state=active]:bg-secondary text-muted-foreground data-[state=active]:text-foreground">
                            <Wifi className="h-4 w-4 mr-1.5" /> Connection
                        </TabsTrigger>
                        <TabsTrigger value="doors" className="data-[state=active]:bg-secondary text-muted-foreground data-[state=active]:text-foreground">
                            <DoorOpen className="h-4 w-4 mr-1.5" /> Doors
                        </TabsTrigger>
                        <TabsTrigger value="permissions" className="data-[state=active]:bg-secondary text-muted-foreground data-[state=active]:text-foreground">
                            <Shield className="h-4 w-4 mr-1.5" /> Permissions
                        </TabsTrigger>
                        <TabsTrigger value="audit" className="data-[state=active]:bg-secondary text-muted-foreground data-[state=active]:text-foreground">
                            <Eye className="h-4 w-4 mr-1.5" /> Audit Trail
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="data-[state=active]:bg-secondary text-muted-foreground data-[state=active]:text-foreground">
                            <BarChart3 className="h-4 w-4 mr-1.5" /> Reports
                        </TabsTrigger>
                        <TabsTrigger value="keypad" className="data-[state=active]:bg-secondary text-muted-foreground data-[state=active]:text-foreground">
                            <Keyboard className="h-4 w-4 mr-1.5" /> Keypad
                        </TabsTrigger>
                        <TabsTrigger value="bridge" className="data-[state=active]:bg-secondary text-muted-foreground data-[state=active]:text-foreground">
                            <Router className="h-4 w-4 mr-1.5" /> Bridge
                        </TabsTrigger>
                    </TabsList>

                    <React.Suspense fallback={<TabLoading />}>
                        <TabsContent value="connection"><ConnectionTab /></TabsContent>
                        <TabsContent value="doors"><DoorsTab /></TabsContent>
                        <TabsContent value="permissions"><PermissionsTab /></TabsContent>
                        <TabsContent value="audit"><AuditTab /></TabsContent>
                        <TabsContent value="reports"><ReportsTab /></TabsContent>
                        <TabsContent value="keypad"><KeypadTab /></TabsContent>
                        <TabsContent value="bridge"><BridgeTab /></TabsContent>
                    </React.Suspense>
                </Tabs>
            </div>
        </PermissionGate>
    );
}
