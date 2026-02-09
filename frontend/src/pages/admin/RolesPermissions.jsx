import React, { useState, useEffect } from 'react';
import {
    Shield, User, Lock, Save, AlertTriangle, Check,
    ChevronRight, Search, Layout, Printer, Coffee,
    DollarSign, BarChart2, Users, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function RolesPermissions() {
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [permissionGroups, setPermissionGroups] = useState([]);

    const stations = [
        { id: "floor", label: "Floor" },
        { id: "bar", label: "Bar" },
        { id: "cashdesk", label: "Cash Desk" },
        { id: "kitchen", label: "Kitchen" },
        { id: "office", label: "Back Office" },
    ];

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await api.get('/admin/roles');
            const data = response.data;
            const fetchedRoles = data.roles || [];
            setRoles(fetchedRoles);
            setPermissionGroups(data.permissionGroups || []);
            if (fetchedRoles.length > 0) {
                setSelectedRole(fetchedRoles[0]);
            }
        } catch (error) {
            console.error("Failed to fetch roles:", error);
            toast.error("Failed to load roles");
        } finally {
            setLoading(false);
        }
    };

    const handleStationToggle = (stationId) => {
        if (!selectedRole) return;
        const currentStations = selectedRole.allowedStations || [];
        const newStations = currentStations.includes(stationId)
            ? currentStations.filter(id => id !== stationId)
            : [...currentStations, stationId];

        // Optimistic update
        const updatedRole = { ...selectedRole, allowedStations: newStations };
        setSelectedRole(updatedRole);
        setRoles(roles.map(r => r.id === selectedRole.id ? updatedRole : r));
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-black text-zinc-100 overflow-hidden">
            {/* Sidebar - Roles List */}
            <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
                <div className="p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-400" />
                        Roles & Permissions
                    </h2>
                    <div className="mt-4 relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search roles..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {["Management", "Service", "Kitchen", "Other"].map(category => (
                        <div key={category} className="mb-4">
                            <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                {category}
                            </div>
                            {roles.filter(r => r.category === category).map(role => (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRole(role)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${selectedRole?.id === role.id
                                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {category === "Management" && <Shield className="w-3 h-3" />}
                                        {category === "Service" && <User className="w-3 h-3" />}
                                        {category === "Kitchen" && <Coffee className="w-3 h-3" />}
                                        {category === "Other" && <Settings className="w-3 h-3" />}
                                        {role.label}
                                    </div>
                                    {selectedRole?.id === role.id && <ChevronRight className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content - Role Details & Matrix */}
            {selectedRole && (
                <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/30">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-white">{selectedRole.label}</h1>
                                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-xs font-medium text-zinc-400 border border-zinc-700">
                                    {selectedRole.category}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-xs font-medium text-blue-400 border border-blue-500/20">
                                    v1.2 (Latest)
                                </span>
                            </div>
                            <p className="text-zinc-400 mt-1 max-w-2xl">
                                Configure permissions, scopes, and station access for the {selectedRole.label} role.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors border border-zinc-700 flex items-center gap-2"
                                onClick={() => toast.info("Simulating role view...")}
                            >
                                <Layout className="w-4 h-4" />
                                Simulate View
                            </button>
                            <button
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                onClick={() => toast.success("Policy saved successfully")}
                            >
                                <Save className="w-4 h-4" />
                                Save Changes
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Allowed Stations Section */}
                        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-5">
                            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                                <Layout className="w-4 h-4 text-emerald-400" />
                                Allowed Operating Stations
                            </h3>
                            <div className="grid grid-cols-5 gap-4">
                                {stations.map(station => {
                                    const isAllowed = selectedRole.allowedStations?.includes(station.id);
                                    return (
                                        <button
                                            key={station.id}
                                            onClick={() => handleStationToggle(station.id)}
                                            className={`relative p-4 rounded-lg border text-left transition-all ${isAllowed
                                                ? "bg-emerald-500/10 border-emerald-500/30"
                                                : "bg-zinc-900 border-zinc-800 opacity-60 hover:opacity-100"
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-sm font-medium ${isAllowed ? "text-emerald-400" : "text-zinc-400"}`}>
                                                    {station.label}
                                                </span>
                                                {isAllowed && <Check className="w-4 h-4 text-emerald-400" />}
                                            </div>
                                            <p className="text-xs text-zinc-500">
                                                {isAllowed ? "Platform Access Granted" : "Access Restricted"}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Permissions Matrix */}
                        <div className="space-y-6">
                            <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                <Lock className="w-4 h-4 text-indigo-400" />
                                Permission Matrix
                            </h3>

                            {permissionGroups.map(group => (
                                <div key={group.id} className="bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-hidden">
                                    <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2">
                                        <group.icon className="w-4 h-4 text-zinc-400" />
                                        <span className="font-medium text-zinc-200">{group.title}</span>
                                    </div>
                                    <div className="divide-y divide-zinc-800/50">
                                        {group.permissions.map(perm => (
                                            <div key={perm.key} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-zinc-300">{perm.label}</span>
                                                        <span className="text-xs text-zinc-500 font-mono">{perm.key}</span>
                                                    </div>
                                                    {perm.risk === "HIGH" && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                                            HIGH RISK
                                                        </span>
                                                    )}
                                                    {perm.risk === "CRITICAL" && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                                                            CRITICAL
                                                        </span>
                                                    )}
                                                    {perm.gate && (
                                                        <span className="flex items-center gap-1 text-[10px] text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded bg-zinc-900">
                                                            <Lock className="w-3 h-3" />
                                                            Requires: {perm.gate}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <select className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50">
                                                        <option value="own_branch">This Branch Only</option>
                                                        <option value="own_shift">Own Shift Only</option>
                                                        <option value="own_section">Own Section Only</option>
                                                        <option value="all_branches">All Branches</option>
                                                    </select>

                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" defaultChecked={perm.risk !== "CRITICAL"} />
                                                        <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
