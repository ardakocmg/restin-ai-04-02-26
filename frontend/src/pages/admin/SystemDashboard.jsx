import { useState, useEffect } from "react";
import api from "../../lib/api";
import { Loader2, Activity, ShieldAlert, DollarSign, Users, Wifi } from "lucide-react";
import SalesChart from "../../components/analytics/SalesChart";
import { format } from "date-fns";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Badge } from "../../components/ui/badge";

export default function SystemDashboard() {
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboardData = async () => {
        try {
            // In a real scenario, this endpoint aggregates data.
            // We will simulate the response structure based on our mock capabilities.
            // const res = await api.get('/admin/dashboard-stats'); 

            // Simulating data for now based on what we know exists
            setStats({
                revenue: 1450.50,
                activeOrders: 5,
                onlineDevices: 3,
                syncHealth: "100%"
            });

            setLogs([
                { id: 1, action: "VOID_ITEM", user: "Manager", details: "Voided Coca Cola (Table 5)", time: new Date() },
                { id: 2, action: "DISCOUNT", user: "Admin", details: "Applied 10% Staff Disc", time: new Date(Date.now() - 1000 * 60 * 15) },
                { id: 3, action: "SYNC_ERROR", user: "System", details: "KDS-01 failed to ack", time: new Date(Date.now() - 1000 * 60 * 45) },
            ]);

            setLoading(false);
        } catch (error) {
            console.error("Dashboard load failed", error);
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>;
    }

    return (
        <div className="p-6 space-y-6 bg-zinc-950 min-h-screen">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Activity className="text-red-500" />
                    System Control Tower
                </h1>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    System Operational
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <div className="text-zinc-500 text-sm">Today's Revenue</div>
                        <div className="text-2xl font-bold text-white">€{stats.revenue.toFixed(2)}</div>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500 opacity-50" />
                </div>
                <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <div className="text-zinc-500 text-sm">Active Orders</div>
                        <div className="text-2xl font-bold text-white">{stats.activeOrders}</div>
                    </div>
                    <Users className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
                <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <div className="text-zinc-500 text-sm">Online Devices</div>
                        <div className="text-2xl font-bold text-white">{stats.onlineDevices}</div>
                    </div>
                    <Wifi className="w-8 h-8 text-indigo-500 opacity-50" />
                </div>
                <div className="bg-zinc-900 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                    <div>
                        <div className="text-zinc-500 text-sm">System Health</div>
                        <div className="text-2xl font-bold text-green-400">GOOD</div>
                    </div>
                    <ShieldAlert className="w-8 h-8 text-green-500 opacity-50" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
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
                            {logs.map((log, i) => (
                                <div key={i} className="flex gap-3 items-start">
                                    <div className={`mt-1 w-2 h-2 rounded-full ${log.action.includes('ERROR') ? 'bg-red-500' : 'bg-blue-500'}`} />
                                    <div>
                                        <div className="text-sm text-white font-medium flex items-center gap-2">
                                            {log.action}
                                            <span className="text-zinc-500 text-xs font-normal">by {log.user}</span>
                                        </div>
                                        <div className="text-xs text-zinc-400">{log.details}</div>
                                        <div className="text-[10px] text-zinc-600 mt-1">{format(log.time, 'HH:mm:ss')}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
