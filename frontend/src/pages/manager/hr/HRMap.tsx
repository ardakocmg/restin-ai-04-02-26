import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useNavigate } from 'react-router-dom';

import {
    MapPin,
    Navigation,
    Navigation2,
    Layers,
    Filter,
    Calendar,
    Users,
    Info,
    Smartphone,
    Search,
    ChevronLeft
} from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';

import api from '@/lib/api';

export default function HRMap() {
    const navigate = useNavigate();
    const [markers, setMarkers] = useState([]);
    const [stats, setStats] = useState({ total_check_ins: 0, currently_in: 0, mobile_users: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAttendance = async () => {
            try {
                const res = await api.get('/hr/attendance/live');
                const data = res.data;
                setMarkers(data.markers || []);
                setStats(data.stats || { total_check_ins: 0, currently_in: 0, mobile_users: 0 });
            } catch (err) {
                logger.error('Failed to load attendance data:', err);
            } finally {
                setLoading(false);
            }
        };
        loadAttendance();
        const interval = setInterval(loadAttendance, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-foreground flex flex-col">

            {/* Control Bar Overlay */}
            <div className="absolute top-8 left-8 right-8 z-20 flex items-start justify-between pointer-events-none">
                <div className="flex flex-col gap-4 pointer-events-auto">
                    {/* Brand/Nav */}
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="icon" aria-label="Action"
                            onClick={() => navigate('/manager/hr/summary')}
                            className="bg-black/40 backdrop-blur-md border-border rounded-xl w-12 h-12"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <div className="bg-black/40 backdrop-blur-md border border-border rounded-xl px-6 py-3">
                            <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-red-500" />
                                Clocking Map
                            </h1>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-2">
                        <Card className="bg-black/40 backdrop-blur-md border-border rounded-xl">
                            <CardContent className="p-4 flex flex-col">
                                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Active Check-ins</span>
                                <span className="text-xl font-black text-green-400 leading-none mt-1">{stats.total_check_ins.toLocaleString()}</span>
                            </CardContent>
                        </Card>
                        <Card className="bg-black/40 backdrop-blur-md border-border rounded-xl">
                            <CardContent className="p-4 flex flex-col">
                                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Mobile Users</span>
                                <span className="text-xl font-black text-blue-400 leading-none mt-1">{stats.mobile_users.toLocaleString()}</span>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex flex-col gap-2 pointer-events-auto">
                    <Button className="bg-blue-600 hover:bg-blue-500 rounded-xl font-bold uppercase tracking-widest text-[10px] h-12 px-6">
                        Export Geo-Logs
                    </Button>
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-border rounded-xl p-1">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" aria-label="Action"><Layers className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" aria-label="Action"><Filter className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" aria-label="Action"><Calendar className="w-4 h-4" /></Button>
                    </div>
                </div>
            </div>

            {/* Sidebar View */}
            <div className="absolute top-48 bottom-8 left-8 w-80 z-20 pointer-events-none">
                <Card className="h-full bg-black/40 backdrop-blur-xl border-border shadow-2xl overflow-hidden pointer-events-auto flex flex-col">
                    <div className="p-4 border-b border-border bg-white/5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input aria-label="Input"
                                className="w-full bg-black/50 border border-border rounded-lg pl-10 pr-4 py-2 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-blue-500/50"
                                placeholder="Search live check-ins..."
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {markers.map(m => (
                            <div key={m.id} className="p-3 bg-card/50 border border-border rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer group">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-foreground uppercase tracking-tight leading-none truncate w-40">{m.name}</span>
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-1">
                                            <Navigation2 className="w-2 h-2" />
                                            {m.loc}
                                        </span>
                                    </div>
                                    <span className="text-[8px] font-black text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded uppercase">Live</span>
                                </div>
                                <div className="flex items-center justify-between text-[9px] font-bold">
                                    <span className="text-muted-foreground">{m.time}</span>
                                    <span className="text-blue-400 uppercase tracking-widest flex items-center gap-1">
                                        <Smartphone className="w-3 h-3" />
                                        Mobile APP
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Map Canvas - Mocking with a stylized gradient and pattern to match Restin aesthetics */}
            <div className="flex-1 relative bg-[#0d0d0f] overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, #3b82f6 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }} />

                {/* SVG Route lines mock */}
                <svg className="absolute inset-0 w-full h-full opacity-10">
                    <path d="M 200 200 L 400 500 L 800 300" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="10,5" />
                    <path d="M 100 600 L 600 800 L 1000 600" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="10,5" />
                </svg>

                {/* Markers */}
                {([] as/**/any[]).map((m, i) => (
                    <div
                        key={m.id}
                        className="absolute cursor-pointer group"
                        style={{
                            left: `${20 + i * 15}%`,
                            top: `${30 + i * 12}%`
                        }}
                    >
                        <div className="relative flex flex-col items-center">
                            {/* Marker Popup */}
                            <div className="absolute bottom-full mb-3 hidden group-hover:block w-48 bg-black/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <p className="text-[10px] font-black text-foreground uppercase truncate">{m.name}</p>
                                <p className="text-[8px] text-muted-foreground font-bold uppercase mt-1">{m.loc} • {m.time}</p>
                            </div>
                            {/* Pin */}
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-4 border-black shadow-[0_0_20px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform">
                                <MapPin className="w-5 h-5 text-foreground" />
                            </div>
                            <div className="mt-2 text-[8px] font-black text-muted-foreground uppercase tracking-tighter bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm border border-border">
                                {m.name.split(' ')[0]}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Legend Overlay */}
                <div className="absolute bottom-8 right-8 bg-black/40 backdrop-blur-md border border-border p-4 rounded-xl space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Mobile App Clocking</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Fixed Terminal Clocking</span>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}