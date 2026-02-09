import { useState, useEffect } from "react";
import api from "../../lib/api";
import { useVenue } from "../../context/VenueContext";
import { Loader2, Activity, ShieldAlert, DollarSign, Users, Wifi, Calendar, Monitor } from "lucide-react";
import { Button } from "../../components/ui/button";
import SalesChart from "../../components/analytics/SalesChart";
import { format } from "date-fns";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Badge } from "../../components/ui/badge";

export default function SystemDashboard() {
    const { activeVenue } = useVenue();
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 30000);
        return () => clearInterval(interval);
    }, [activeVenue?.id]);

    const loadDashboardData = async () => {
        try {
            const params = activeVenue?.id ? { venue_id: activeVenue.id } : {};
            const res = await api.get('/admin/dashboard-stats', { params });
            setStats(res.data.stats || { revenue: 0, activeOrders: 0, onlineDevices: 0, syncHealth: '100%' });
            setLogs((res.data.logs || []).map((log, i) => ({
                ...log,
                id: log.id || i,
                time: log.created_at ? new Date(log.created_at) : new Date()
            })));
        } catch (error) {
            console.warn("Dashboard load failed, using defaults");
            setStats({ revenue: 0, activeOrders: 0, onlineDevices: 0, syncHealth: '100%' });
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>;
    }

    return (
        <>
            <div className="p-6 space-y-6 bg-zinc-950 min-h-screen">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity className="text-red-500" />
                        System Control Tower
                    </h1>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-lg p-1">
                            <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-white">
                                Today
                            </Button>
                            <div className="h-4 w-[1px] bg-white/10" />
                            <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-white">
                                Yesterday
                            </Button>
                            <div className="h-4 w-[1px] bg-white/10" />
                            <Button variant="outline" size="sm" className="h-8 border-white/10 bg-black text-white gap-2">
                                <Calendar className="w-3 h-3" />
                                <span>Custom Range</span>
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-zinc-400 px-3 py-1 bg-zinc-900 rounded-full border border-white/5">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="hidden md:inline">System Operational</span>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div onClick={() => window.location.href = '/admin/reports/sales?type=revenue'} className="bg-zinc-900 border border-white/10 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-green-500/50 transition-colors group">
                        <div>
                            <div className="text-zinc-500 text-sm group-hover:text-white transition-colors">Today's Revenue</div>
                            <div className="text-2xl font-bold text-white">€{(stats?.revenue || 0).toFixed(2)}</div>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div onClick={() => window.location.href = '/kds'} className="bg-zinc-900 border border-white/10 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-colors group">
                        <div>
                            <div className="text-zinc-500 text-sm group-hover:text-white transition-colors">Active Orders</div>
                            <div className="text-2xl font-bold text-white">{stats?.activeOrders || 0}</div>
                        </div>
                        <Users className="w-8 h-8 text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div onClick={() => window.location.href = '/admin/devices'} className="bg-zinc-900 border border-white/10 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-indigo-500/50 transition-colors group">
                        <div>
                            <div className="text-zinc-500 text-sm group-hover:text-white transition-colors">Online Devices</div>
                            <div className="text-2xl font-bold text-white">{stats?.onlineDevices || 0}</div>
                        </div>
                        <Wifi className="w-8 h-8 text-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                        <div className="text-zinc-500 text-sm group-hover:text-white transition-colors">System Health</div>
                        <div className="text-2xl font-bold text-green-400">GOOD</div>
                    </div>
                    <ShieldAlert className="w-8 h-8 text-green-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>

            {/* RESTORED LEGACY: Quick Actions & Config */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-zinc-500" />
                        Venue Configuration
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-zinc-500 text-sm">Course Pacing</span>
                            <span className="text-white font-mono text-sm">Enabled (15m)</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-white/5">
                            <span className="text-zinc-500 text-sm">Review Policy</span>
                            <span className="text-white font-mono text-sm">Strict (4.5+)</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-zinc-500 text-sm">Operation Mode</span>
                            <span className="text-green-500 font-bold text-xs bg-green-500/10 px-2 py-1 rounded">LIVE SERVICE</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-900/20 to-zinc-900 border border-red-500/20 rounded-xl p-6">
                    <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                        <Monitor className="w-5 h-5" />
                        Point of Sale
                    </h3>
                    <p className="text-zinc-500 text-sm mb-4">Launch the main POS terminal interface.</p>
                    <Button onClick={() => window.location.href = '/pos/setup'} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
                        Open POS
                    </Button>
                </div>

                <div className="bg-gradient-to-br from-blue-900/20 to-zinc-900 border border-blue-500/20 rounded-xl p-6">
                    <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                        <Wifi className="w-5 h-5" />
                        Kitchen Display
                    </h3>
                    <p className="text-zinc-500 text-sm mb-4">Launch KDS station interface.</p>
                    <Button onClick={() => window.location.href = '/kds/setup'} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold">
                        Open KDS
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SalesChart title="Real-time Sales Activity" />
                </div>

                {/* Audit Log Stream */}
                <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden flex flex-col h-[300px] lg:h-auto">
                    <div className="p-4 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center">
                        <h3 className="font-bold text-white">Live Audit Stream</h3>
                        <Badge variant="outline" className="text-xs">Live</Badge>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {logs.length === 0 ? (
                                <p className="text-center text-zinc-500 text-sm py-4">No audit events yet</p>
                            ) : logs.map((log, i) => (
                                <div key={log.id || i} className="flex gap-3 items-start">
                                    <div className={`mt-1 w-2 h-2 rounded-full ${(log.action || '').includes('ERROR') ? 'bg-red-500' : 'bg-blue-500'}`} />
                                    <div>
                                        <div className="text-sm text-white font-medium flex items-center gap-2">
                                            {log.action}
                                            <span className="text-zinc-500 text-xs font-normal">by {log.user}</span>
                                        </div>
                                        <div className="text-xs text-zinc-400">{log.details}</div>
                                        <div className="text-[10px] text-zinc-600 mt-1">{log.time ? format(log.time, 'HH:mm:ss') : ''}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </>
    );
}
