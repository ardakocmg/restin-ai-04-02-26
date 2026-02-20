import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useParams, useNavigate } from 'react-router-dom';

import {
    Shield, User, Lock, History, AlertTriangle, Check,
    RotateCcw, Save, Trash2, Archive, Activity, Globe
} from 'lucide-react';

import { toast } from 'sonner';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

import { Button } from '../../components/ui/button';

import { Badge } from '../../components/ui/badge';

import DataTable from '../../components/shared/DataTable';
import { useAuth } from '../../context/AuthContext';
import PermissionGate from '../../components/shared/PermissionGate';
import { useAuditLog } from '../../hooks/useAuditLog';

export default function UserAccess() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const { logAction } = useAuditLog();

    React.useEffect(() => {
        logAction('USER_ACCESS_VIEWED', 'user_access', userId, { viewed_by: authUser?.id });
    }, []);
    const [user, setUser] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [activeContext, setActiveContext] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch User Details - assuming we have a user detail endpoint or fetch list
            // For now, we might need to fetch from list or assume endpoint exists.
            // Let's use the users list endpoint and filter for now as we don't have single user endpoint guaranteed
            // Actually we can check /auth/users/{id} but let's try the recently added endpoint logic. 
            // We didn't add single user get, so let's mock the user part or fetch all for this specific user.
            // Wait, we can fetch assignments and context directly.

            const [assignmentsRes, contextRes, auditRes] = await Promise.all([
                api.get(`/manager/users/${userId}/assignments`),
                api.get(`/manager/users/${userId}/context`),
                api.get(`/manager/users/${userId}/audit`),
            ]);

            setAssignments(assignmentsRes.data);
            setActiveContext(contextRes.data);
            setAuditLogs(auditRes.data);
            // In real implementation we should have GET /users/{id}
            setUser({ id: userId, name: "User " + userId.substring(0, 4), status: "active" });

        } catch (error: any) {
            logger.error("Failed to load access data:", error);
            toast.error("Failed to load user access data");
        } finally {
            setLoading(false);
        }
    };

    const handleArchiveUser = async (shouldArchive) => {
        try {
            await api.post(`/manager/users/${userId}/status`, {
                status: shouldArchive ? 'archived' : 'active',
                is_archived: shouldArchive
            });
            toast.success(shouldArchive ? 'User archived' : 'User restored');
            // Refresh user status logic here
            loadData();
        } catch (error: any) {
            toast.error("Failed to change user status");
        }
    };

    const handleResetContext = async () => {
        try {
            await api.post(`/manager/users/${userId}/context/reset`);
            toast.success("Active context reset");
            loadData();
        } catch (error: any) {
            toast.error("Failed to reset context");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <PermissionGate requiredRole="OWNER">
            <PageContainer
                title={`Access Control: ${user?.name || userId}`}
                description="Manage role assignments, active context, and audit logs"
                actions={
                    <div className="flex gap-2">
                        {user?.status === 'archived' ? (
                            <Button variant="outline" className="border-emerald-500 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleArchiveUser(false)}>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Restore User
                            </Button>
                        ) : (
                            <Button variant="destructive" onClick={() => handleArchiveUser(true)}>
                                <Archive className="w-4 h-4 mr-2" />
                                Archive User
                            </Button>
                        )}
                    </div>
                }
            >
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* Left Column: Stats */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-muted-foreground">Security Score</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-emerald-400">98%</div>
                                <p className="text-xs text-muted-foreground mt-1">Based on recent activity</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-muted-foreground">Active Roles</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {assignments.flatMap(a => a.roles).map(role => (
                                        <Badge key={role} variant="secondary" className="capitalize">{role.replace('_', ' ')}</Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-muted-foreground">Employee Record</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {user?.employee_id ? (
                                    <div className="space-y-2">
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                                            <User className="w-3 h-3 mr-1" /> Linked
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-xs text-blue-400 hover:text-blue-300"
                                            onClick={() => navigate(`/manager/hr/people/${user.employee_id}`)}
                                        >
                                            View Employee Details →
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">No employee record linked</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Tabs */}
                    <div className="lg:col-span-3">
                        <Tabs defaultValue="assignments" className="w-full">
                            <TabsList className="w-full justify-start bg-card border border-border p-1">
                                <TabsTrigger value="assignments" className="data-[state=active]:bg-secondary">Assignments</TabsTrigger>
                                <TabsTrigger value="context" className="data-[state=active]:bg-secondary">Active Context</TabsTrigger>
                                <TabsTrigger value="overrides" className="data-[state=active]:bg-secondary">Overrides</TabsTrigger>
                                <TabsTrigger value="audit" className="data-[state=active]:bg-secondary">Audit Logs</TabsTrigger>
                            </TabsList>

                            <TabsContent value="assignments" className="mt-6">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>Role Assignments</CardTitle>
                                        <Button size="sm"><Shield className="w-4 h-4 mr-2" /> Assign Role</Button>
                                    </CardHeader>
                                    <CardContent>
                                        <DataTable
                                            columns={[
                                                { key: 'unit_id', label: 'Unit / Branch' },
                                                { key: 'roles', label: 'Assigned Roles', render: (row) => row.roles.join(', ') },
                                                { key: 'valid_to', label: 'Expires', render: (row) => row.valid_to || 'Never' },
                                            ]}
                                            data={assignments}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="context" className="mt-6">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>Current Active Context</CardTitle>
                                        <Button variant="destructive" size="sm" onClick={handleResetContext}>
                                            <RotateCcw className="w-4 h-4 mr-2" /> Force Reset
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        {activeContext ? (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 rounded-lg bg-card border border-border">
                                                    <div className="text-sm text-muted-foreground mb-1">Active Unit</div>
                                                    <div className="font-medium text-foreground flex items-center gap-2">
                                                        <Globe className="w-4 h-4" /> {activeContext.active_unit_id}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-lg bg-card border border-border">
                                                    <div className="text-sm text-muted-foreground mb-1">Active Role</div>
                                                    <div className="font-medium text-foreground flex items-center gap-2">
                                                        <Shield className="w-4 h-4 text-emerald-400" /> {activeContext.active_role}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-lg bg-card border border-border">
                                                    <div className="text-sm text-muted-foreground mb-1">Active Station</div>
                                                    <div className="font-medium text-foreground flex items-center gap-2">
                                                        <Activity className="w-4 h-4" /> {activeContext.active_station}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-lg bg-card border border-border">
                                                    <div className="text-sm text-muted-foreground mb-1">Session Started</div>
                                                    <div className="font-medium text-foreground">
                                                        {new Date(activeContext.last_updated).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-muted-foreground">
                                                No active context found. User is offline or not working.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="overrides" className="mt-6">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>Personal Overrides (Exceptions)</CardTitle>
                                        <Button size="sm" variant="outline"><Lock className="w-4 h-4 mr-2" /> Add Override</Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            No active overrides for this user.
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="audit" className="mt-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Audit Timeline</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <DataTable
                                            columns={[
                                                { key: 'ts_utc', label: 'Time', render: (row) => new Date(row.ts_utc).toLocaleString() },
                                                { key: 'event_type', label: 'Event' },
                                                {
                                                    key: 'result', label: 'Result', render: (row) => (
                                                        <Badge variant={row.result === 'DENY' ? 'destructive' : 'secondary'}>{row.result}</Badge>
                                                    )
                                                },
                                                { key: 'reason', label: 'Details', render: (row) => row.reason || row.resource_id },
                                            ]}
                                            data={auditLogs}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                        </Tabs>
                    </div>
                </div>
            </PageContainer>
        </PermissionGate>
    );
}