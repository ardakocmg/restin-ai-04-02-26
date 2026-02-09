import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import {
    Monitor, Smartphone, Tablet, Search, Plus,
    MoreVertical, ChevronRight, Settings, Info,
    Wifi, Shield, History, MapPin
} from 'lucide-react';

import PageContainer from '../../layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { Button } from '../../components/ui/button';

import { Input } from '../../components/ui/input';

import { Badge } from '../../components/ui/badge';

import { Switch } from '../../components/ui/switch';

import { Label } from '../../components/ui/label';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../../components/ui/select';

import { cn } from '../../lib/utils';

import DataTable from '../../components/shared/DataTable';

import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Devices() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
                const token = localStorage.getItem('restin_token');
                if (!token) return;

                const response = await axios.get(
                    `${API_URL}/api/devices?venue_id=${venueId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setDevices(response.data);
            } catch (error) {
                logger.error("Failed to fetch devices", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDevices();
    }, []);

    const renderDeviceList = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2 w-full max-w-md">
                    <Search className="w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search devices..."
                        className="bg-transparent border-none outline-none text-sm text-white w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Device
                </Button>
            </div>

            <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                <CardContent className="p-0">
                    <DataTable
                        columns={[
                            {
                                key: 'name',
                                label: 'Name / IP',
                                render: (row) => (
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            {row.type === 'ipad' ? <Tablet className="w-5 h-5 text-zinc-400" /> : <Monitor className="w-5 h-5 text-zinc-400" />}
                                            <div className={cn(
                                                "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-zinc-950",
                                                row.last_seen_at && new Date(row.last_seen_at) > new Date(Date.now() - 60000) ? "bg-emerald-500" : "bg-zinc-500"
                                            )} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{row.name}</div>
                                            <div className="text-xs text-zinc-500 font-mono">{row.ip_address || "No IP"}</div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: 'fingerprint',
                                label: 'Device Info',
                                render: (row) => (
                                    <div className="flex flex-col">
                                        <span className="text-xs text-zinc-300 font-medium">{row.model || "Unknown Model"}</span>
                                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                            <span>{row.os || "Unknown OS"}</span>
                                            <span>•</span>
                                            <span>{row.browser || "Unknown Browser"}</span>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: 'version',
                                label: 'Version',
                                render: (row) => (
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono">
                                        {row.version || "1.0.0"}
                                    </Badge>
                                )
                            },
                            { key: 'prefix', label: 'Prefix', render: (row) => <span className="text-zinc-400 font-mono">{row.prefix || "N/A"}</span> },
                            {
                                key: 'defaultFloor',
                                label: 'Default Floor',
                                render: (row) => (
                                    <Select defaultValue={row.defaultFloor || "Main Floor"}>
                                        <SelectTrigger className="w-[140px] bg-zinc-950 border-white/10 h-8 text-xs">
                                            <SelectValue placeholder="Select floor" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10">
                                            <SelectItem value="Main Floor">Main Floor</SelectItem>
                                            <SelectItem value="Kitchen">Kitchen</SelectItem>
                                            <SelectItem value="Bar">Bar</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )
                            },
                            {
                                key: 'actions',
                                label: '',
                                render: (row) => (
                                    <div className="flex justify-end pr-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-zinc-500 hover:text-white"
                                            onClick={() => setSelectedDevice(row)}
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </Button>
                                    </div>
                                )
                            }
                        ]}
                        data={devices.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                    />
                </CardContent>
            </Card>
        </div>
    );

    const renderDeviceDetail = (device) => (
        <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
            <div className="flex items-center gap-3 text-zinc-500 mb-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 hover:bg-transparent text-zinc-500"
                    onClick={() => setSelectedDevice(null)}
                >
                    Devices
                </Button>
                <ChevronRight className="w-4 h-4" />
                <span className="text-white font-bold">{device.name}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Profile Details */}
                    <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Info className="w-5 h-5 text-red-500" />
                                Profile Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Device Name</Label>
                                    <Input defaultValue={device.name} className="bg-zinc-950 border-white/10 h-10 ring-offset-red-500 transition-all focus-visible:ring-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Device Prefix</Label>
                                    <Input defaultValue={device.prefix} className="bg-zinc-950 border-white/10 h-10 ring-offset-red-500 focus-visible:ring-red-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Default Floor</Label>
                                <Select defaultValue={device.defaultFloor}>
                                    <SelectTrigger className="w-full bg-zinc-950 border-white/10 h-10">
                                        <SelectValue placeholder="Select floor" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10">
                                        <SelectItem value="Main Floor">Main Floor</SelectItem>
                                        <SelectItem value="Kitchen">Kitchen</SelectItem>
                                        <SelectItem value="Bar">Bar</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Settings */}
                    <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Settings className="w-5 h-5 text-red-500" />
                                System Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-white/5">
                                {[
                                    { label: 'Auto logoff on close', desc: 'Automatically logout user when shift ends', default: true },
                                    { label: 'Disable Device Sleep', desc: 'Prevent screen from turning off during service', default: true },
                                    { label: 'Use native POS', desc: 'Use local driver for printer communication', default: false },
                                    { label: 'Enable Offline Mode', desc: 'Buffer transactions when internet is lost', default: true },
                                    { label: 'Mirror Display', desc: 'Second screen mirroring for customers', default: false }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors">
                                        <div className="space-y-1">
                                            <div className="text-sm font-bold text-white">{item.label}</div>
                                            <div className="text-xs text-zinc-500">{item.desc}</div>
                                        </div>
                                        <Switch defaultChecked={item.default} className="data-[state=checked]:bg-red-600" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    {/* Device Type Selection */}
                    <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-500">Device Type</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-3 gap-3">
                            {[
                                { id: 'ipad', icon: Tablet, label: 'iPad' },
                                { id: 'phone', icon: Smartphone, label: 'Phone' },
                                { id: 'terminal', icon: Monitor, label: 'Terminal' }
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    className={cn(
                                        "flex flex-col items-center gap-3 p-4 rounded-xl border transition-all",
                                        device.type === type.id
                                            ? "bg-red-600 border-red-500 text-white shadow-[0_0_20px_rgba(229,57,53,0.3)]"
                                            : "bg-zinc-950 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300"
                                    )}
                                >
                                    <type.icon className="w-6 h-6" />
                                    <span className="text-[10px] font-bold uppercase">{type.label}</span>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <Wifi className="w-12 h-12 text-white" />
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Signal Strength</div>
                            <div className="text-2xl font-black text-white">94%</div>
                            <div className="mt-2 text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Excellent Connection
                            </div>
                        </div>

                        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <Shield className="w-12 h-12 text-white" />
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Security Score</div>
                            <div className="text-2xl font-black text-white">A+</div>
                            <div className="mt-2 text-[10px] text-zinc-500 font-bold">Updated {new Date().toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                <Button variant="outline" className="border-white/10 text-zinc-400 hover:bg-zinc-900 rounded-xl px-8" onClick={() => setSelectedDevice(null)}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8 font-bold">Save Device Changes</Button>
            </div>
        </div>
    );

    return (
        <PageContainer
            title="Device Management"
            description="Manage POS terminals, KDS screens, and handheld tablets across your venue."
            breadcrumb={[
                { label: 'Management', href: '#' },
                { label: 'Devices', href: '/admin/devices' }
            ]}
        >
            {selectedDevice ? renderDeviceDetail(selectedDevice) : renderDeviceList()}
        </PageContainer>
    );
}