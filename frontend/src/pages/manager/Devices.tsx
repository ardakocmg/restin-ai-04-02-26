import { logger } from '@/lib/logger';
import { useEffect,useState } from 'react';

import {
ChevronRight,
Info,
Monitor,
Plus,
Search,
Settings,
Shield,
Smartphone,Tablet,
Wifi
} from 'lucide-react';

import PageContainer from '../../layouts/PageContainer';

import { Card,CardContent,CardHeader,CardTitle } from '../../components/ui/card';

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
import PermissionGate from '../../components/shared/PermissionGate';
import { useAuth } from '../../context/AuthContext';
import { useAuditLog } from '../../hooks/useAuditLog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Devices() {
    const { user } = useAuth();
    const { logAction } = useAuditLog();
    const [devices, setDevices] = useState([]);
    const [_loading, setLoading] = useState(true);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Audit: log device management access
    useEffect(() => {
        if (user?.id) logAction('DEVICES_VIEWED', 'device_management');
    }, [user?.id]);

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
                <div className="flex items-center gap-4 bg-card/50 border border-border rounded-xl px-4 py-2 w-full max-w-md">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input aria-label="Input"
                        type="text"
                        placeholder="Search devices..."
                        className="bg-transparent border-none outline-none text-sm text-foreground w-full"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button className="bg-red-600 hover:bg-red-700 text-foreground rounded-xl px-6">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Device
                </Button>
            </div>

            <Card className="border-border bg-card/50 backdrop-blur-xl">
                <CardContent className="p-0">
                    <DataTable
                        columns={[
                            {
                                key: 'name',
                                label: 'Name / IP',
                                render: (row) => (
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            {row.type === 'ipad' ? <Tablet className="w-5 h-5 text-muted-foreground" /> : <Monitor className="w-5 h-5 text-muted-foreground" />}
                                            <div className={cn(
                                                "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-zinc-950",
                                                row.last_seen_at && new Date(row.last_seen_at) > new Date(Date.now() - 60000) ? "bg-emerald-500" : "bg-zinc-500"
                                            )} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-foreground">{row.name}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{row.ip_address || "No IP"}</div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: 'fingerprint',
                                label: 'Device Info',
                                render: (row) => (
                                    <div className="flex flex-col">
                                        <span className="text-xs text-secondary-foreground font-medium">{row.model || "Unknown Model"}</span>
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
                            { key: 'prefix', label: 'Prefix', render: (row) => <span className="text-muted-foreground font-mono">{row.prefix || "N/A"}</span> },
                            {
                                key: 'defaultFloor',
                                label: 'Default Floor',
                                render: (row) => (
                                    <Select aria-label="Select option" defaultValue={row.defaultFloor || "Main Floor"}>
                                        <SelectTrigger aria-label="Select option" className="w-[140px] bg-background border-border h-8 text-xs">
                                            <SelectValue placeholder="Select floor" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border">
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
                                            className="text-muted-foreground hover:text-foreground"
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
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 hover:bg-transparent text-muted-foreground"
                    onClick={() => setSelectedDevice(null)}
                >
                    Devices
                </Button>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-bold">{device.name}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Profile Details */}
                    <Card className="border-border bg-card/50 backdrop-blur-xl">
                        <CardHeader className="border-b border-border">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Info className="w-5 h-5 text-red-500" />
                                Profile Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Device Name</Label>
                                    <Input aria-label="Input field" defaultValue={device.name} className="bg-background border-border h-10 ring-offset-red-500 transition-all focus-visible:ring-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Device Prefix</Label>
                                    <Input aria-label="Input field" defaultValue={device.prefix} className="bg-background border-border h-10 ring-offset-red-500 focus-visible:ring-red-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Default Floor</Label>
                                <Select aria-label="Select option" defaultValue={device.defaultFloor}>
                                    <SelectTrigger aria-label="Select option" className="w-full bg-background border-border h-10">
                                        <SelectValue placeholder="Select floor" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="Main Floor">Main Floor</SelectItem>
                                        <SelectItem value="Kitchen">Kitchen</SelectItem>
                                        <SelectItem value="Bar">Bar</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Settings */}
                    <Card className="border-border bg-card/50 backdrop-blur-xl">
                        <CardHeader className="border-b border-border">
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
                                            <div className="text-sm font-bold text-foreground">{item.label}</div>
                                            <div className="text-xs text-muted-foreground">{item.desc}</div>
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
                    <Card className="border-border bg-card/50 backdrop-blur-xl">
                        <CardHeader className="border-b border-border">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Device Type</CardTitle>
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
                                            ? "bg-red-600 border-red-500 text-foreground shadow-[0_0_20px_rgba(229,57,53,0.3)]"
                                            : "bg-background border-border text-muted-foreground hover:border-border hover:text-secondary-foreground"
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
                        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <Wifi className="w-12 h-12 text-foreground" />
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Signal Strength</div>
                            <div className="text-2xl font-black text-foreground">94%</div>
                            <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Excellent Connection
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <Shield className="w-12 h-12 text-foreground" />
                            </div>
                            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Security Score</div>
                            <div className="text-2xl font-black text-foreground">A+</div>
                            <div className="mt-2 text-[10px] text-muted-foreground font-bold">Updated {new Date().toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <Button variant="outline" className="border-border text-muted-foreground hover:bg-card rounded-xl px-8" onClick={() => setSelectedDevice(null)}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700 text-foreground rounded-xl px-8 font-bold">{"Save "}Device Changes</Button>
            </div>
        </div>
    );

    return (
        <PermissionGate requiredRole="MANAGER">
            <PageContainer
                title="Device Management"
                description="Manage POS terminals, KDS screens, and handheld tablets across your venue."
                breadcrumb={[
                    { label: 'Management', href: '#' },
                    { label: 'Devices', href: '/manager/devices' }
                ]}
            >
                {selectedDevice ? renderDeviceDetail(selectedDevice) : renderDeviceList()}
            </PageContainer>
        </PermissionGate>
    );
}