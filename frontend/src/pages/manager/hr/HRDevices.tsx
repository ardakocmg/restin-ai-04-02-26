import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Cpu,
    Wifi,
    Battery,
    Signal,
    RefreshCcw,
    Settings2,
    CheckCircle2,
    AlertCircle,
    Activity,
    Shield,
    HardDrive,
    Terminal,
    ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HRDevices() {
    const navigate = useNavigate();

    const devices = [
        { id: "TERM-01", name: "Main Entrance Port", type: "Fixed Terminal", status: "Online", battery: "100%", lastPing: "2s ago", signal: "Strong" },
        { id: "TERM-02", name: "Staff Canteen", type: "Fixed Terminal", status: "Online", battery: "100%", lastPing: "1m ago", signal: "Good" },
        { id: "MOB-084", name: "Manager Handheld", type: "Mobile App", status: "Offline", battery: "14%", lastPing: "2h ago", signal: "None" },
        { id: "TERM-04", name: "Basement Parking", type: "Fixed Terminal", status: "Warning", battery: "85%", lastPing: "5s ago", signal: "Weak" },
    ];

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-foreground p-8">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">

                {/* Header */}
                <div className="flex items-end justify-between border-b border-border pb-8">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <Button
                                variant="outline"
                                size="icon" aria-label="Action"
                                onClick={() = aria-label="Action"> navigate('/manager/hr/summary')}
                                className="bg-card border-border rounded-xl"
                            >
                                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                            </Button>
                            <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter leading-none">Device Manager</h1>
                        </div>
                        <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px] ml-14">Infrastructure & Terminal Monitoring</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button className="bg-card border border-border hover:bg-secondary text-[10px] font-black uppercase px-6 py-6 rounded-xl gap-2">
                            <RefreshCcw className="w-4 h-4" />
                            Force Sync All
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase px-6 py-6 rounded-xl shadow-lg shadow-blue-600/20">
                            Provision New Device
                        </Button>
                    </div>
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Terminals', val: '24', icon: Terminal, color: 'blue' },
                        { label: 'Active Now', val: '22', icon: Activity, color: 'green' },
                        { label: 'Sync Failures', val: '2', icon: AlertCircle, color: 'red' },
                        { label: 'Security Status', val: 'Secure', icon: Shield, color: 'blue' },
                    ].map((stat, i) => (
                        <Card key={i} className="bg-card/30 border-border overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`p-2 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-500`}>
                                        <stat.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-black text-muted-foreground">LIVE</span>
                                </div>
                                <h3 className="text-2xl font-black text-foreground">{stat.val}</h3>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Device List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Connected Infrastructure ({devices.length})</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {devices.map((device, idx) => (
                            <Card key={idx} className="bg-card/40 border-border hover:border-border transition-all group overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex items-center justify-between p-6">
                                        <div className="flex items-center gap-6">
                                            <div className={`p-4 rounded-2xl ${device.status === 'Online' ? 'bg-secondary text-foreground' : 'bg-red-500/10 text-red-500'}`}>
                                                <Cpu className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-black text-foreground uppercase tracking-tighter leading-none">{device.name}</h3>
                                                    <Badge variant="outline" className={`text-[9px] font-black uppercase ${device.status === 'Online' ? 'border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/5' : 'border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/5'}`}>
                                                        {device.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 leading-none">
                                                        <Terminal className="w-3 h-3" />
                                                        ID: {device.id}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 leading-none">
                                                        <Settings2 className="w-3 h-3" />
                                                        {device.type}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-12">
                                            <div className="flex gap-8">
                                                <div className="text-center">
                                                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Signal</p>
                                                    <div className="flex items-center justify-center gap-1 text-secondary-foreground">
                                                        <Wifi className={`w-4 h-4 ${device.signal === 'None' ? 'text-zinc-700' : 'text-secondary-foreground'}`} />
                                                        <span className="text-[10px] font-black">{device.signal}</span>
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Battery</p>
                                                    <div className="flex items-center justify-center gap-1 text-secondary-foreground">
                                                        <Battery className={`w-4 h-4 ${parseInt(device.battery) < 20 ? 'text-red-500 animate-pulse' : 'text-secondary-foreground'}`} />
                                                        <span className="text-[10px] font-black">{device.battery}</span>
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Latency</p>
                                                    <span className="text-[10px] font-black text-secondary-foreground">{device.lastPing}</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button variant="outline" aria-label="Action" className="h-10 w-10 p-0 border-border bg-secondary/50 hover:bg-secondary text-muted-foreground">
                                                    <Settings2 className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" className="bg-zinc-100 text-black hover:bg-white font-bold uppercase text-[9px] tracking-widest h-10 px-4">
                                                    View Logs
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Info Bar */}
                                    <div className="px-6 py-3 bg-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                                            <span>Firmware: v2.4.1-stable</span>
                                            <span>•</span>
                                            <span>IP: 192.168.1.1{idx + 10}</span>
                                            <span>•</span>
                                            <span>Uptime: 247d 12h 4m</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Synchronized
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Maintenance Message */}
                <div className="flex items-center gap-4 p-6 rounded-2xl bg-blue-600/5 border border-blue-500/10">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <HardDrive className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-foreground uppercase tracking-tight">Operational Support</p>
                        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-widest mt-1 leading-snug">
                            Main terminals are configured for biometric and punch-card dual authentication. Ensure all devices are on the internal 'RESTIN-SECURE' VLAN.
                        </p>
                    </div>
                    <Button variant="link" className="text-blue-500 font-black uppercase text-[10px] tracking-tighter">
                        Download Driver Pack
                    </Button>
                </div>
            </div>
        </div>
    );
}
