
import { Button } from '@/components/ui/button';
import { Card,CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import {
Activity,
ArrowLeft,
BookOpen,
CheckCircle2,
Clock,
Coffee,
Crosshair,Fingerprint,
GlassWater,
Loader2,
LogIn,LogOut,
MapPin,
Monitor,
Navigation,Plus,
Search,
Users,
Utensils,
Wifi,WifiOff
} from 'lucide-react';
import React,{ useCallback,useEffect,useRef,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/* ── Device & Location Helpers ──────────────────────── */
interface DeviceInfoPayload {
    browser: string;
    os: string;
    platform: string;
    user_agent: string;
    screen_resolution: string;
    language: string;
}

interface GeoPayload {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
}

function collectDeviceInfo(): DeviceInfoPayload {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Firefox/')) browser = 'Firefox ' + (ua.match(/Firefox\/(\d+)/)?.[1] || '');
    else if (ua.includes('Edg/')) browser = 'Edge ' + (ua.match(/Edg\/(\d+)/)?.[1] || '');
    else if (ua.includes('Chrome/')) browser = 'Chrome ' + (ua.match(/Chrome\/(\d+)/)?.[1] || '');
    else if (ua.includes('Safari/')) browser = 'Safari ' + (ua.match(/Version\/(\d+)/)?.[1] || '');

    let os = 'Unknown';
    if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
    else if (ua.includes('Mac OS X')) os = 'macOS ' + (ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '');
    else if (ua.includes('Android')) os = 'Android ' + (ua.match(/Android ([\d.]+)/)?.[1] || '');
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS ' + (ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || '');
    else if (ua.includes('Linux')) os = 'Linux';

    let platform: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';
    if (/Mobi|Android.*Mobile/i.test(ua)) platform = 'Mobile';
    else if (/iPad|Android(?!.*Mobile)/i.test(ua)) platform = 'Tablet';

    return {
        browser,
        os,
        platform,
        user_agent: ua.substring(0, 200),
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language || 'en',
    };
}

function getGeolocation(): Promise<GeoPayload | null> {
    return new Promise(resolve => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
            pos => resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: Math.round(pos.coords.accuracy),
                timestamp: new Date(pos.timestamp).toISOString(),
            }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
    });
}

/* ── Work area icon map ─────────────────────────────── */
const AREA_ICONS: Record<string, React.ReactNode> = {
    FOH: <Utensils className="h-4 w-4" />,
    BOH: <Coffee className="h-4 w-4" />,
    BAR: <GlassWater className="h-4 w-4" />,
    KITCHEN: <Utensils className="h-4 w-4" />,
    ADMIN: <BookOpen className="h-4 w-4" />,
};

interface WorkArea {
    id: string;
    name: string;
    code: string;
}

interface ActiveSession {
    id: string;
    employee_id: string;
    employee_name: string;
    clocking_in: string;
    date: string;
    work_area?: string;
    cost_centre?: string;
    source_device?: string;
    device_name?: string;
    ip_address?: string;
    device_info?: Record<string, string>;
    geolocation?: { latitude?: number; longitude?: number; accuracy?: number };
}

interface MyStatus {
    clocked_in: boolean;
    record_id?: string;
    clocking_in?: string;
    date?: string;
    work_area?: string;
    cost_centre?: string;
    last_session?: {
        date: string;
        clocking_in: string;
        clocking_out: string;
        hours_worked: number;
    };
}

interface Employee {
    id: string;
    full_name?: string;
    name?: string;
    department?: string;
    occupation?: string;
    cost_centre?: string;
}

export default function ManualClocking() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user: _user, isManager, isOwner } = useAuth();
    const { activeVenueId } = useVenue();
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [myStatus, setMyStatus] = useState<MyStatus | null>(null);
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [workAreas, setWorkAreas] = useState<WorkArea[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [empSearch, setEmpSearch] = useState('');
    const [showEmpDropdown, setShowEmpDropdown] = useState(false);
    const [loading, setLoading] = useState(true);
    const [clocking, setClocking] = useState(false);
    const [elapsed, setElapsed] = useState('00:00:00');
    const [geoStatus, setGeoStatus] = useState<'idle' | 'acquiring' | 'granted' | 'denied'>('idle');
    const [currentDeviceInfo, setCurrentDeviceInfo] = useState<DeviceInfoPayload | null>(null);
    const [currentGeo, setCurrentGeo] = useState<GeoPayload | null>(null);

    const canManageOthers = Boolean(isManager) || Boolean(isOwner);

    /* ── Collect device info on mount ─────────────────── */
    useEffect(() => {
        setCurrentDeviceInfo(collectDeviceInfo());
        // Pre-request geolocation
        setGeoStatus('acquiring');
        getGeolocation().then(geo => {
            setCurrentGeo(geo);
            setGeoStatus(geo ? 'granted' : 'denied');
        });
    }, []);

    /* ── Fetch Data ────────────────────────────────────── */
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [statusRes, activeRes, areasRes] = await Promise.allSettled([
                api.get('clocking/my-status'),
                api.get('clocking/active'),
                api.get('clocking/work-areas'),
            ]);

            if (statusRes.status === 'fulfilled') setMyStatus(statusRes.value.data);
            if (activeRes.status === 'fulfilled') setActiveSessions(Array.isArray(activeRes.value.data) ? activeRes.value.data : []);
            if (areasRes.status === 'fulfilled') setWorkAreas(Array.isArray(areasRes.value.data) ? areasRes.value.data : []);

            if (canManageOthers && activeVenueId) {
                try {
                    const empRes = await api.get(`/venues/${activeVenueId}/hr/employees`);
                    const empData = empRes.data;
                    setEmployees(Array.isArray(empData) ? empData : Array.isArray(empData?.employees) ? empData.employees : []);
                } catch { setEmployees([]); }
            }
        } catch (err: unknown) {
            logger.error('Failed to fetch clocking data', { error: String(err) });
        } finally {
            setLoading(false);
        }
    }, [canManageOthers]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    /* ── Timer ─────────────────────────────────────────── */
    useEffect(() => {
        if (myStatus?.clocked_in && myStatus.clocking_in) {
            const updateTimer = () => {
                const [h, m] = (myStatus.clocking_in || '0:0').split(':').map(Number);
                const now = new Date();
                const start = new Date();
                start.setHours(h, m, 0, 0);
                let diff = Math.floor((now.getTime() - start.getTime()) / 1000);
                if (diff < 0) diff += 86400;
                const hh = String(Math.floor(diff / 3600)).padStart(2, '0');
                const mm = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
                const ss = String(diff % 60).padStart(2, '0');
                setElapsed(`${hh}:${mm}:${ss}`);
            };
            updateTimer();
            timerRef.current = setInterval(updateTimer, 1000);
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        } else {
            setElapsed('00:00:00');
        }
    }, [myStatus]);

    /* ── Handlers ──────────────────────────────────────── */
    const handleClockIn = async () => {
        setClocking(true);
        try {
            // Collect fresh location at clock-in time
            setGeoStatus('acquiring');
            const geo = await getGeolocation();
            setCurrentGeo(geo);
            setGeoStatus(geo ? 'granted' : 'denied');

            const deviceInfo = collectDeviceInfo();
            setCurrentDeviceInfo(deviceInfo);

            const response = await api.post('clocking/clock-in', {
                employee_id: selectedEmployee || undefined,
                work_area: selectedArea || undefined,
                cost_centre: selectedArea || undefined,
                device_name: `${deviceInfo.browser} / ${deviceInfo.os}`,
                device_info: deviceInfo,
                geolocation: geo || undefined,
            });

            if (response.data.requires_approval) {
                toast.info(t('Clock-in submitted for approval') + ': ' + (response.data.message || ''));
            } else {
                toast.success(t('Clocked In Successfully'));
            }

            setSelectedEmployee('');
            await fetchAll();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Clock-in failed';
            toast.error(msg);
        } finally {
            setClocking(false);
        }
    };

    const handleClockOut = async (recordId?: string, employeeId?: string) => {
        setClocking(true);
        try {
            // Capture exit location
            const exitGeo = await getGeolocation();

            await api.post('clocking/clock-out', {
                record_id: recordId || undefined,
                employee_id: employeeId || undefined,
                geolocation: exitGeo || undefined,
            });
            toast.success(t('Clocked Out Successfully'));
            await fetchAll();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Clock-out failed';
            toast.error(msg);
        } finally {
            setClocking(false);
        }
    };

    const filteredEmployees = employees.filter(e => {
        const name = (e.full_name || e.name || '').toLowerCase();
        return name.includes(empSearch.toLowerCase());
    });

    const getElapsedForSession = (clockIn: string) => {
        const [h, m] = (clockIn || '0:0').split(':').map(Number);
        const now = new Date();
        const start = new Date();
        start.setHours(h, m, 0, 0);
        let diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        if (diff < 0) diff += 86400;
        const hh = Math.floor(diff / 3600);
        const mm = Math.floor((diff % 3600) / 60);
        return `${hh}h ${mm}m`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const isClockedIn = myStatus?.clocked_in;

    return (
        <div className="p-4 md:p-6 bg-[#09090b] min-h-screen text-foreground font-sans">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/manager/hr/clocking')}
                    className="text-muted-foreground hover:text-secondary-foreground h-9 w-9 p-0"
                    title={t('Back')}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tighter">
                        {t('Manual Clocking')}
                    </h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                        {t('Clock In/Out • Track Hours • Flow to Payroll')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── LEFT: Main Clock Card ─────────────────── */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Card */}
                    <Card className={`border-2 overflow-hidden transition-all duration-500 ${isClockedIn
                        ? 'bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.1)]'
                        : 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-border shadow-2xl'
                        }`}>
                        <CardContent className="p-6 md:p-8">
                            {/* Live Clock */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl ${isClockedIn ? 'bg-emerald-500/20' : 'bg-secondary'}`}>
                                        <Clock className={`h-6 w-6 ${isClockedIn ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            {isClockedIn ? t('Currently Working') : t('Not Clocked In')}
                                        </p>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isClockedIn ? (
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
                                        </span>
                                    ) : (
                                        <WifiOff className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className={`text-xs font-bold uppercase tracking-wider ${isClockedIn ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                        {isClockedIn ? 'ONLINE' : 'OFFLINE'}
                                    </span>
                                </div>
                            </div>

                            {/* Timer Display */}
                            <div className="text-center mb-8">
                                <div className={`text-5xl md:text-7xl font-black tracking-tighter font-mono transition-colors ${isClockedIn ? 'text-emerald-400' : 'text-zinc-700'
                                    }`}>
                                    {elapsed}
                                </div>
                                {isClockedIn && myStatus?.clocking_in && (
                                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                                        {t('Started at')} <span className="text-emerald-400 font-bold">{myStatus.clocking_in}</span>
                                        {myStatus.work_area && (
                                            <> · <span className="text-violet-400">{myStatus.work_area}</span></>
                                        )}
                                    </p>
                                )}
                                {!isClockedIn && myStatus?.last_session && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {t('Last session')}: {myStatus.last_session.date} · {myStatus.last_session.clocking_in}-{myStatus.last_session.clocking_out} · {myStatus.last_session.hours_worked}h
                                    </p>
                                )}
                            </div>

                            {/* Work Area Selector (only when clocking in) */}
                            {!isClockedIn && (
                                <div className="mb-6">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                                        {t('Select Work Area')}
                                    </label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                        {workAreas.map(area => (
                                            <button
                                                key={area.id}
                                                onClick={() => setSelectedArea(selectedArea === area.code ? '' : area.code)}
                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${selectedArea === area.code
                                                    ? 'border-violet-500/50 bg-violet-500/10 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                                                    : 'border-border bg-card/50 text-muted-foreground hover:border-border hover:text-muted-foreground'
                                                    }`}
                                            >
                                                {AREA_ICONS[area.code] || <MapPin className="h-4 w-4" />}
                                                <span className="text-[10px] font-bold uppercase tracking-wider">{area.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Employee Selector (Managers Only) */}
                            {canManageOthers && !isClockedIn && (
                                <div className="mb-6">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                                        {t('Clock In On Behalf Of')} <span className="text-zinc-700">({t('optional')})</span>
                                    </label>
                                    <div className="relative">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input aria-label="Input field"
                                                placeholder={t('Search employee...')}
                                                className="pl-9 bg-card/50 border-border text-xs h-10 focus:ring-1 focus:ring-violet-500/50"
                                                value={empSearch}
                                                onChange={e => { setEmpSearch(e.target.value); setShowEmpDropdown(true); }}
                                                onFocus={() => setShowEmpDropdown(true)}
                                            />
                                            {selectedEmployee && (
                                                <button
                                                    onClick={() => { setSelectedEmployee(''); setEmpSearch(''); }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-red-400 font-bold uppercase hover:text-red-300"
                                                >
                                                    {t('Clear')}
                                                </button>
                                            )}
                                        </div>
                                        {showEmpDropdown && empSearch.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 max-h-48 overflow-auto bg-card border border-border rounded-lg shadow-xl">
                                                {filteredEmployees.slice(0, 10).map(emp => (
                                                    <button
                                                        key={emp.id}
                                                        onClick={() => {
                                                            setSelectedEmployee(emp.id);
                                                            setEmpSearch(emp.full_name || emp.name || '');
                                                            setShowEmpDropdown(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 hover:bg-secondary transition-colors border-b border-border/50 last:border-0 ${selectedEmployee === emp.id ? 'bg-violet-500/10' : ''
                                                            }`}
                                                    >
                                                        <div className="text-xs font-bold text-secondary-foreground uppercase tracking-tight">{emp.full_name || emp.name}</div>
                                                        <div className="text-[10px] text-muted-foreground">{emp.department || emp.occupation || '—'}</div>
                                                    </button>
                                                ))}
                                                {filteredEmployees.length === 0 && (
                                                    <div className="px-4 py-3 text-xs text-muted-foreground text-center">{t('No employees found')}</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Clock In/Out Button */}
                            <button
                                onClick={() => isClockedIn ? handleClockOut(myStatus?.record_id) : handleClockIn()}
                                disabled={clocking}
                                className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-3 border-2 ${clocking ? 'opacity-50 cursor-not-allowed border-border bg-secondary text-muted-foreground' :
                                    isClockedIn
                                        ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-foreground border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:shadow-[0_0_40px_rgba(239,68,68,0.3)]'
                                        : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-foreground border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]'
                                    }`}
                            >
                                {clocking ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : isClockedIn ? (
                                    <>
                                        <LogOut className="h-6 w-6" />
                                        {t('Clock Out')}
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="h-6 w-6" />
                                        {t('Clock In')}
                                    </>
                                )}
                            </button>
                        </CardContent>
                    </Card>

                    {/* Last Session Info (when not clocked in) */}
                    {!isClockedIn && myStatus?.last_session && (
                        <Card className="bg-card border-border">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-secondary"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /></div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('Last Completed Session')}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {myStatus.last_session.date} · {myStatus.last_session.clocking_in} → {myStatus.last_session.clocking_out}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-secondary-foreground font-mono">{myStatus.last_session.hours_worked}h</p>
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase">{t('Total Hours')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ── RIGHT: Active Sessions Panel ──────────── */}
                <div className="space-y-6">
                    {/* Active Sessions */}
                    <Card className="bg-card border-border">
                        <CardContent className="p-0">
                            <div className="p-4 border-b border-border/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-emerald-400" />
                                    <span className="text-xs font-bold text-secondary-foreground uppercase tracking-wider">{t('Active Now')}</span>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                    {activeSessions.length}
                                </span>
                            </div>
                            <div className="max-h-[400px] overflow-auto">
                                {activeSessions.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <WifiOff className="h-8 w-8 text-foreground mx-auto mb-2" />
                                        <p className="text-xs text-muted-foreground font-medium">{t('No active sessions')}</p>
                                    </div>
                                ) : (
                                    activeSessions.map((session) => (
                                        <div key={session.id} className="px-4 py-3 border-b border-border/30 hover:bg-secondary/20 transition-colors group">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-bold text-secondary-foreground uppercase tracking-tight">{session.employee_name}</span>
                                                <span className="text-[10px] font-bold text-emerald-400 font-mono">{getElapsedForSession(session.clocking_in)}</span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="text-[9px] text-muted-foreground">{t('In')}: {session.clocking_in}</span>
                                                {session.work_area && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-500/10 text-[8px] font-bold text-violet-400 uppercase border border-violet-500/20">
                                                        <MapPin className="h-2 w-2" />{session.work_area}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Device & Location Info */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {session.ip_address && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/10 text-[8px] font-medium text-blue-400 border border-blue-500/20">
                                                        <Wifi className="h-2 w-2" />{session.ip_address}
                                                    </span>
                                                )}
                                                {session.device_info?.browser && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-[8px] font-medium text-amber-400 border border-amber-500/20">
                                                        <Fingerprint className="h-2 w-2" />{session.device_info.browser} · {session.device_info.platform}
                                                    </span>
                                                )}
                                                {session.geolocation?.latitude && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-[8px] font-medium text-emerald-400 border border-emerald-500/20">
                                                        <Navigation className="h-2 w-2" />{session.geolocation.latitude.toFixed(4)}, {session.geolocation.longitude?.toFixed(4)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-end mt-1">
                                                {canManageOthers && (
                                                    <button
                                                        onClick={() => handleClockOut(session.id, session.employee_id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider px-2 py-1 rounded bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
                                                    >
                                                        {t('Clock Out')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <Card className="bg-card border-border">
                            <CardContent className="p-4 text-center">
                                <Users className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                                <p className="text-xl font-black text-secondary-foreground">{activeSessions.length}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{t('Clocked In')}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card border-border">
                            <CardContent className="p-4 text-center">
                                <Monitor className="h-5 w-5 text-violet-400 mx-auto mb-2" />
                                <p className="text-xl font-black text-secondary-foreground">{workAreas.length}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{t('Work Areas')}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Device & Location Status */}
                    <Card className="bg-card border-border">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3 justify-between">
                                <div className="flex items-center gap-2">
                                    <Fingerprint className="h-4 w-4 text-amber-400" />
                                    <span className="text-xs font-bold text-secondary-foreground uppercase tracking-wider">{t('Device & Location')}</span>
                                </div>
                                {canManageOthers && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate('/manager/hr/clocking/add')}
                                        className="h-6 text-[9px] px-2 bg-secondary border-border hover:bg-secondary/80 text-muted-foreground hover:text-foreground uppercase tracking-wider font-bold"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />{t('Add Past Entry')}
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {/* Device Info */}
                                {currentDeviceInfo && (
                                    <div className="flex items-start gap-2">
                                        <Monitor className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-secondary-foreground font-medium">{currentDeviceInfo.browser} · {currentDeviceInfo.os}</p>
                                            <p className="text-[9px] text-muted-foreground">{currentDeviceInfo.platform} · {currentDeviceInfo.screen_resolution} · {currentDeviceInfo.language}</p>
                                        </div>
                                    </div>
                                )}
                                {/* Geolocation */}
                                <div className="flex items-start gap-2">
                                    <Crosshair className={`h-3 w-3 mt-0.5 flex-shrink-0 ${geoStatus === 'granted' ? 'text-emerald-400' :
                                        geoStatus === 'acquiring' ? 'text-amber-400 animate-pulse' :
                                            geoStatus === 'denied' ? 'text-red-400' : 'text-muted-foreground'
                                        }`} />
                                    <div>
                                        {geoStatus === 'granted' && currentGeo ? (
                                            <>
                                                <p className="text-[10px] text-emerald-400 font-medium">{t('Location Captured')}</p>
                                                <p className="text-[9px] text-muted-foreground">
                                                    {currentGeo.latitude.toFixed(5)}, {currentGeo.longitude.toFixed(5)} · ±{currentGeo.accuracy}m
                                                </p>
                                            </>
                                        ) : geoStatus === 'acquiring' ? (
                                            <p className="text-[10px] text-amber-400 font-medium">{t('Acquiring GPS...')}</p>
                                        ) : geoStatus === 'denied' ? (
                                            <>
                                                <p className="text-[10px] text-red-400 font-medium">{t('Location Denied')}</p>
                                                <p className="text-[9px] text-muted-foreground">{t('Enable browser location for tracking')}</p>
                                            </>
                                        ) : (
                                            <p className="text-[10px] text-muted-foreground">{t('Location not requested')}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
