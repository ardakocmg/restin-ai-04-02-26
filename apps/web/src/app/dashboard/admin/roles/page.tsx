'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Switch } from '@antigravity/ui';
import {
    Shield, Lock, User, Plus, Check, ChevronRight,
    Coffee, DollarSign, Printer, Settings
} from 'lucide-react';
import { toast } from 'sonner';

export default function RolesPage() {
    const [roles, setRoles] = useState([
        { id: 'manager', name: 'General Manager', type: 'ADMIN', count: 2 },
        { id: 'supervisor', name: 'Supervisor', type: 'ADMIN', count: 3 },
        { id: 'server', name: 'Server', type: 'STAFF', count: 12 },
        { id: 'chef', name: 'Head Chef', type: 'KITCHEN', count: 1 },
    ]);

    const [selectedRole, setSelectedRole] = useState(roles[0]);

    const permissions = [
        {
            category: 'Orders', items: [
                { id: 'create_order', label: 'Create Orders', enabled: true },
                { id: 'void_item', label: 'Void Items', enabled: true, critical: true },
                { id: 'split_bill', label: 'Split Bills', enabled: true },
            ]
        },
        {
            category: 'Payments', items: [
                { id: 'take_payment', label: 'Process Payment', enabled: true },
                { id: 'refund', label: 'Process Refund', enabled: false, critical: true },
            ]
        },
        {
            category: 'Admin', items: [
                { id: 'manage_users', label: 'Manage Users', enabled: true, critical: true },
                { id: 'view_reports', label: 'View Reports', enabled: true },
            ]
        }
    ];

    return (
        <PageContainer title="Roles & Permissions" description="Access Control Matrix">
            <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
                {/* Roles Sidebar */}
                <div className="w-full lg:w-80 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Defined Roles</span>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Plus className="h-4 w-4" /></Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {roles.map(role => (
                            <button
                                key={role.id}
                                onClick={() => setSelectedRole(role)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all ${selectedRole.id === role.id
                                        ? 'bg-red-900/10 text-red-400 border border-red-900/20'
                                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    {role.type === 'ADMIN' && <Shield className="h-4 w-4" />}
                                    {role.type === 'KITCHEN' && <Coffee className="h-4 w-4" />}
                                    {role.type === 'STAFF' && <User className="h-4 w-4" />}
                                    {role.name}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-600 font-mono bg-zinc-950 px-1.5 rounded">{role.count}</span>
                                    {selectedRole.id === role.id && <ChevronRight className="h-3 w-3" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Permissions Matrix */}
                <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-white">{selectedRole.name}</h2>
                            <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">{selectedRole.type}</Badge>
                        </div>
                        <p className="text-zinc-500 text-sm">Configure access control policies for this role group.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {permissions.map((group, idx) => (
                            <div key={idx}>
                                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    {group.category === 'Orders' && <Coffee className="h-4 w-4" />}
                                    {group.category === 'Payments' && <DollarSign className="h-4 w-4" />}
                                    {group.category === 'Admin' && <Shield className="h-4 w-4" />}
                                    {group.category}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {group.items.map(perm => (
                                        <div key={perm.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-zinc-200 flex items-center gap-2">
                                                    {perm.label}
                                                    {perm.critical && <Badge variant="outline" className="text-[9px] text-red-500 border-red-900 bg-red-900/10 h-4 px-1">CRITICAL</Badge>}
                                                </div>
                                                <div className="text-xs text-zinc-600 font-mono mt-1">{perm.id}</div>
                                            </div>
                                            <Switch defaultChecked={perm.enabled} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
