import { useState, useEffect, useRef } from "react";
import { logger } from '@/lib/logger';
import api from "../../../lib/api";
import { useVenue } from "../../../context/VenueContext";
import { useAuth } from '../../../features/auth/AuthContext';
import PermissionGate from '../../../components/shared/PermissionGate';
import { useAuditLog } from '../../../hooks/useAuditLog';
import { Loader2 } from "lucide-react";

// Tech Dashboard Components
import TechSidebar from "../components/TechSidebar";
import TechTopBar from "../components/TechTopBar";
import RealTimeEfficiency from "../components/RealTimeEfficiency";
import SentimentNodeGraph from "../components/SentimentNodeGraph";
import { DemandForecast, InventoryStatus } from "../components/RightSidePanels";

export default function AIOSDashboard() {
    const { activeVenue } = useVenue();
    const { user } = useAuth();
    const { logAction } = useAuditLog();
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchingRef = useRef(false);
    const auditedRef = useRef(false);

    // Audit: log system dashboard access (once only)
    useEffect(() => {
        if (user?.id && !auditedRef.current) {
            auditedRef.current = true;
            logAction('SYSTEM_DASHBOARD_VIEWED', 'system_dashboard');
        }
    }, [user?.id]);

    useEffect(() => {
        loadDashboardData();
        // PERF: Visibility-aware polling
        let interval = setInterval(loadDashboardData, 30000);
        const handleVisibility = () => {
            clearInterval(interval);
            if (document.visibilityState === 'visible') {
                loadDashboardData();
                interval = setInterval(loadDashboardData, 30000);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [activeVenue?.id]);

    const loadDashboardData = async () => {
        if (fetchingRef.current) return; // Dedup: skip if already fetching
        fetchingRef.current = true;
        try {
            const params = activeVenue?.id ? { venue_id: activeVenue.id } : {};
            const res = await api.get('/manager/ai-os-stats', { params });
            if (res.data) {
                setStats(res.data);
                // AI-OS Stats endpoint doesn't return logs currently, so ignore them for now.
                setLogs([]);
            }
        } catch (error) {
            logger.warn("Dashboard load failed, using defaults", error);
            setStats(null); // Let the components use their own safe fallbacks
            setLogs([]);
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#FF0000]" /></div>;
    }

    return (
        <PermissionGate requiredRole="OWNER">
            {/* Global override for the body background so the edges don't show the default tailwind dark mode colors */}
            <style dangerouslySetInnerHTML={{ __html: `body, html { background-color: #010308 !important; }` }} />

            {/* Full-bleed container bridging over the standard padding */}
            <div className="fixed inset-0 bg-[#010308] text-white overflow-hidden flex font-sans" style={{ zIndex: 9999  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>

                {/* Massive Ambient Background Glows */}
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-[#00FFFF]/5 blur-[150px] pointer-events-none z-0"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#00FFFF]/5 blur-[120px] pointer-events-none z-0"></div>

                {/* Global Grid Overlay for that tech feel */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00FFFF_1px,transparent_1px),linear-gradient(to_bottom,#00FFFF_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.03] pointer-events-none z-0"></div>

                <TechSidebar />

                <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
                    <TechTopBar />

                    {/* Main Content Area */}
                    <div className="flex-1 p-6 overflow-hidden flex flex-col">
                        <div className="grid grid-cols-12 gap-6 h-full">

                            {/* Left Column (Core Visualization & Sentiment) */}
                            <div className="col-span-8 flex flex-col gap-6">
                                <div className="flex-1 relative">
                                    <RealTimeEfficiency data={stats?.efficiency} />
                                </div>

                                <div className="h-64 relative">
                                    <SentimentNodeGraph data={stats?.sentiment} />
                                </div>
                            </div>

                            {/* Right Column (Side Panels) */}
                            <div className="col-span-4 flex flex-col">
                                <DemandForecast data={stats?.forecast} />
                                <InventoryStatus data={stats?.inventory} />
                            </div>

                        </div>

                        {/* System Ticker (Bottom footer for the dashboard) */}
                        <div className="mt-6 border border-[#FF0000]/50 bg-[#1C0000]/50 p-2 flex items-center justify-between rounded shadow-[0_0_15px_rgba(255,0,0,0.2)]">
                            <div className="flex items-center gap-4">
                                <span className="font-mono text-[10px] text-[#FF0000] tracking-widest uppercase bg-[#FF0000]/20 px-2 py-1">System Alerts & Notifications</span>
                                <div className="flex gap-4 overflow-hidden whitespace-nowrap mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)">
                                    <span className="font-mono text-xs text-[#FF3333] animate-[pulse_2s_infinite]">» FREEZER 2 TEMP DEVIATING</span>
                                    <span className="font-mono text-xs text-[#00FFFF]">» OVEN SENSOR THREAD OK</span>
                                    <span className="font-mono text-xs text-[#00FF00]">» INVENTORY RESTOCK CONFIRMED</span>
                                </div>
                            </div>
                            <span className="font-mono text-[8px] text-[#FF3333]/50">4012 MINUTE RUNTIME BATTERY LIFE</span>
                        </div>
                    </div>
                </div>

                {/* Close button to get back to standard layout (optional, but good for testing) */}
                <button
                    onClick={() => window.location.href = '/manager/theme-engine'}
                    className="absolute top-4 right-4 z-[60] bg-[#FF0000]/20 border border-[#FF0000] text-[#FF0000] px-3 py-1 text-xs font-mono hover:bg-[#FF0000] hover:text-white transition-colors">
                    EXIT AI-OS
                </button>
            </div>
        </PermissionGate>
    );
}