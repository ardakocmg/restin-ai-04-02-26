
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { AnimatePresence,motion } from 'framer-motion';
import {
AlertTriangle,
ArrowDown,
ArrowLeft,
ArrowUp,
ArrowUpDown,
Calendar,
CheckCircle2,
Clock,
FileText,
Filter,
Fingerprint,
Loader2,
MapPin,Monitor,
Search,
Shield,
Timer,
User,
XCircle
} from 'lucide-react';
import { useCallback,useEffect,useMemo,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/* ── Types ────────────────────────────────────────── */
interface ApprovalRequest {
    id: string;
    type: string;
    requester_id: string;
    requester_name: string;
    department?: string;
    status: string;
    priority: string;
    payload: /**/any;
    reason?: string;
    ip_address?: string;
    device_info?: /**/any;
    geolocation?: /**/any;
    reviewed_by_name?: string;
    reviewed_at?: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
}

interface ApprovalStats {
    total_pending: number;
    by_type: Record<string, Record<string, number>>;
    by_status: Record<string, number>;
}

interface ColumnFilters {
    requester: string;
    type: string;
    status: string;
    date: string;
    priority: string;
}

/* ── Constants ────────────────────────────────────── */
const TYPE_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
    manual_clocking: { label: 'Manual Clocking', icon: Timer, color: 'text-blue-400' },
    manual_clock_entry: { label: 'Clock Entry', icon: Clock, color: 'text-cyan-400' },
    leave: { label: 'Leave Request', icon: Calendar, color: 'text-emerald-400' },
    expense: { label: 'Expense', icon: FileText, color: 'text-amber-400' },
    schedule_change: { label: 'Schedule Change', icon: Clock, color: 'text-purple-400' },
    other: { label: 'Other', icon: FileText, color: 'text-muted-foreground' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    pending: { label: 'Pending', bg: 'bg-amber-500/15', text: 'text-amber-400' },
    approved: { label: 'Approved', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
    rejected: { label: 'Rejected', bg: 'bg-red-500/15', text: 'text-red-400' },
    cancelled: { label: 'Cancelled', bg: 'bg-zinc-500/15', text: 'text-muted-foreground' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    low: { label: 'Low', color: 'text-muted-foreground' },
    normal: { label: 'Normal', color: 'text-blue-400' },
    high: { label: 'High', color: 'text-amber-400' },
    urgent: { label: 'Urgent', color: 'text-red-400' },
};

const TABS = [
    { id: 'all', label: 'All Requests' },
    { id: 'manual_clocking', label: 'Manual Clocking' },
    { id: 'manual_clock_entry', label: 'Clock Entries' },
    { id: 'leave', label: 'Leave' },
    { id: 'other', label: 'Other' },
];

export default function ApprovalCenter() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isManager, isOwner } = useAuth();

    const canReview = Boolean(isManager) || Boolean(isOwner);

    /* ── Sort Types ─────────────────────────────────── */
    type SortField = 'requester_name' | 'type' | 'details' | 'priority' | 'status' | 'created_at';
    type SortDirection = 'asc' | 'desc';

    /* ── State ─────────────────────────────────────── */
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [stats, setStats] = useState<ApprovalStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [filters, setFilters] = useState<ColumnFilters>({
        requester: '',
        type: '',
        status: '',
        date: '',
        priority: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);

    /* ── Fetch ─────────────────────────────────────── */
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const endpoint = canReview ? 'approvals/all' : 'approvals/my-requests';
            const [reqRes, statsRes] = await Promise.all([
                api.get(endpoint),
                canReview ? api.get('approvals/stats') : Promise.resolve({ data: null }),
            ]);
            setRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
            if (statsRes.data) setStats(statsRes.data);
        } catch (err: unknown) {
            logger.error('Failed to fetch approvals', { error: String(err) });
        } finally {
            setLoading(false);
        }
    }, [canReview]);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── Handle stat card click ─────────────────────── */
    const handleStatCardClick = (statusKey: string) => {
        if (activeStatFilter === statusKey) {
            // Toggle off — clear filter
            setActiveStatFilter(null);
            setFilters(f => ({ ...f, status: '' }));
        } else {
            setActiveStatFilter(statusKey);
            setFilters(f => ({ ...f, status: statusKey === 'total' ? '' : statusKey }));
        }
    };

    /* ── Handle sort toggle ───────────────────────── */
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
        return sortDirection === 'asc'
            ? <ArrowUp className="h-3 w-3 text-blue-400" />
            : <ArrowDown className="h-3 w-3 text-blue-400" />;
    };

    /* ── Filtered & Sorted data ────────────────────── */
    const filtered = useMemo(() => {
        let result = [...requests];

        // Tab filter
        if (activeTab !== 'all') {
            if (activeTab === 'other') {
                result = result.filter(r => !['manual_clocking', 'leave'].includes(r.type));
            } else {
                result = result.filter(r => r.type === activeTab);
            }
        }

        // Column filters
        if (filters.requester) {
            result = result.filter(r =>
                r.requester_name.toLowerCase().includes(filters.requester.toLowerCase())
            );
        }
        if (filters.type) {
            result = result.filter(r => r.type === filters.type);
        }
        if (filters.status) {
            result = result.filter(r => r.status === filters.status);
        }
        if (filters.priority) {
            result = result.filter(r => r.priority === filters.priority);
        }
        if (filters.date) {
            result = result.filter(r => r.created_at.startsWith(filters.date));
        }

        // Sorting
        const priorityOrder: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
        const statusOrder: Record<string, number> = { pending: 4, approved: 3, rejected: 2, cancelled: 1 };

        result.sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'requester_name':
                    cmp = a.requester_name.localeCompare(b.requester_name);
                    break;
                case 'type':
                    cmp = a.type.localeCompare(b.type);
                    break;
                case 'details':
                    cmp = (getPayloadSummary(a)).localeCompare(getPayloadSummary(b));
                    break;
                case 'priority':
                    cmp = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
                    break;
                case 'status':
                    cmp = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
                    break;
                case 'created_at':
                    cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
            }
            return sortDirection === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [requests, activeTab, filters, sortField, sortDirection]);

    /* ── Actions ───────────────────────────────────── */
    const handleApprove = async (id: string) => {
        setProcessing(id);
        try {
            await api.post(`approvals/${id}/approve`);
            toast.success(t('Request approved'));
            await fetchData();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Approval failed';
            toast.error(msg);
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest) return;
        setProcessing(selectedRequest);
        try {
            await api.post(`approvals/${selectedRequest}/reject`, {
                rejection_reason: rejectionReason || 'No reason provided',
            });
            toast.success(t('Request rejected'));
            setRejectModalOpen(false);
            setRejectionReason('');
            setSelectedRequest(null);
            await fetchData();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Rejection failed';
            toast.error(msg);
        } finally {
            setProcessing(null);
        }
    };

    const openRejectModal = (id: string) => {
        setSelectedRequest(id);
        setRejectionReason('');
        setRejectModalOpen(true);
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            });
        } catch { return iso; }
    };

    const getPayloadSummary = (req: ApprovalRequest) => {
        const p = req.payload;
        if (!p) return req.reason || 'No details';
        if (req.type === 'manual_clocking') {
            return `${p.date || 'N/A'} • ${p.time_in || '?'} → ${p.time_out || '?'} • ${p.work_area || ''}`;
        }
        if (req.type === 'leave') {
            return `${p.leave_type || ''} • ${p.start_date || ''} → ${p.end_date || ''} • ${p.days || 0} days`;
        }
        return req.reason || 'No details';
    };

    /* ── Loading ───────────────────────────────────── */
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-card hover:bg-muted transition-colors" title="Go back">
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Shield className="h-6 w-6 text-blue-500" />
                            {t('Approval Center')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {canReview ? t('Review and manage all pending requests') : t('Track your submitted requests')}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}
                >
                    <Filter className="h-4 w-4" />
                    {t('Filters')}
                </button>
            </div>

            {/* Stats Cards (managers only) — Clickable to filter */}
            {canReview && stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { key: 'pending', label: 'Pending', value: stats.by_status.pending || 0, color: 'text-amber-400', bg: 'bg-amber-500/10', activeBorder: 'border-amber-500' },
                        { key: 'approved', label: 'Approved', value: stats.by_status.approved || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10', activeBorder: 'border-emerald-500' },
                        { key: 'rejected', label: 'Rejected', value: stats.by_status.rejected || 0, color: 'text-red-400', bg: 'bg-red-500/10', activeBorder: 'border-red-500' },
                        { key: 'total', label: 'Total', value: Object.values(stats.by_status).reduce((a, b) => a + b, 0), color: 'text-blue-400', bg: 'bg-blue-500/10', activeBorder: 'border-blue-500' },
                    ].map(card => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => handleStatCardClick(card.key)}
                            className={`${card.bg} rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${activeStatFilter === card.key
                                ? `${card.activeBorder} ring-1 ring-offset-0 ring-current shadow-lg`
                                : 'border-border hover:border-muted-foreground/30'
                                }`}
                        >
                            <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                {t(card.label)}
                                {activeStatFilter === card.key && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-foreground">✕ {t('Clear')}</span>
                                )}
                            </p>
                            <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                {TABS.map(tab => {
                    const count = tab.id === 'all'
                        ? requests.length
                        : tab.id === 'other'
                            ? requests.filter(r => !['manual_clocking', 'leave'].includes(r.type)).length
                            : requests.filter(r => r.type === tab.id).length;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${activeTab === tab.id
                                ? 'text-blue-400'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {t(tab.label)}
                            {count > 0 && (
                                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-500/20 text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                                    {count}
                                </span>
                            )}
                            {activeTab === tab.id && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Column Filters */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-card rounded-xl border border-border">
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{t('Requester')}</label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <input aria-label="Input"
                                        type="text"
                                        value={filters.requester}
                                        onChange={e => setFilters(f => ({ ...f, requester: e.target.value }))}
                                        placeholder={t('Search name...')}
                                        className="w-full pl-8 pr-3 py-2 bg-muted rounded-lg border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{t('Type')}</label>
                                <select aria-label="Input"
                                    value={filters.type}
                                    onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                                    title="Filter by Type"
                                    className="w-full px-3 py-2 bg-muted rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">{t('All Types')}</option>
                                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{t('Status')}</label>
                                <select aria-label="Input"
                                    value={filters.status}
                                    onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                                    title="Filter by Status"
                                    className="w-full px-3 py-2 bg-muted rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">{t('All Statuses')}</option>
                                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{t('Priority')}</label>
                                <select aria-label="Input"
                                    value={filters.priority}
                                    onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
                                    title="Filter by Priority"
                                    className="w-full px-3 py-2 bg-muted rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">{t('All Priorities')}</option>
                                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">{t('Date')}</label>
                                <input aria-label="Input"
                                    type="date"
                                    value={filters.date}
                                    onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
                                    title="Filter by Date"
                                    className="w-full px-3 py-2 bg-muted rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <FileText className="h-12 w-12 mb-3 opacity-40" />
                        <p className="text-lg font-medium">{t('No requests found')}</p>
                        <p className="text-sm mt-1">{t('Adjust filters or check back later')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    {[
                                        { field: 'requester_name' as SortField, label: 'Requester' },
                                        { field: 'type' as SortField, label: 'Type' },
                                        { field: 'details' as SortField, label: 'Details' },
                                        { field: 'priority' as SortField, label: 'Priority' },
                                        { field: 'status' as SortField, label: 'Status' },
                                        { field: 'created_at' as SortField, label: 'Submitted' },
                                    ].map(col => (
                                        <th
                                            key={col.field}
                                            onClick={() => handleSort(col.field)}
                                            className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none group"
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                {t(col.label)}
                                                <SortIcon field={col.field} />
                                            </span>
                                        </th>
                                    ))}
                                    {canReview && <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('Actions')}</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((req, idx) => {
                                    const typeConf = TYPE_CONFIG[req.type] || TYPE_CONFIG.other;
                                    const statusConf = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                                    const prioConf = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG.normal;
                                    const TypeIcon = typeConf.icon;
                                    const isExpanded = expandedRow === req.id;

                                    return (
                                        <motion.tr
                                            key={req.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                                            onClick={() => setExpandedRow(isExpanded ? null : req.id)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-blue-500/15 flex items-center justify-center">
                                                        <User className="h-4 w-4 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{req.requester_name}</p>
                                                        {req.department && <p className="text-xs text-muted-foreground">{req.department}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <TypeIcon className={`h-4 w-4 ${typeConf.color}`} />
                                                    <span className={`text-sm ${typeConf.color}`}>{t(typeConf.label)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-foreground max-w-xs truncate">{getPayloadSummary(req)}</p>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        className="mt-2 p-3 bg-muted/50 rounded-lg space-y-2"
                                                    >
                                                        {req.reason && (
                                                            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{t('Reason')}:</span> {req.reason}</p>
                                                        )}
                                                        {req.ip_address && (
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" /> IP: {req.ip_address}
                                                            </p>
                                                        )}
                                                        {req.device_info && (
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Monitor className="h-3 w-3" /> {String(req.device_info.browser || '')} / {String(req.device_info.os || '')}
                                                            </p>
                                                        )}
                                                        {req.geolocation && (
                                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Fingerprint className="h-3 w-3" /> {Number(req.geolocation.latitude).toFixed(4)}, {Number(req.geolocation.longitude).toFixed(4)}
                                                            </p>
                                                        )}
                                                        {req.reviewed_by_name && (
                                                            <p className="text-xs text-muted-foreground">
                                                                <span className="font-medium text-foreground">{req.status === 'rejected' ? t('Rejected by') : t('Approved by')}:</span> {req.reviewed_by_name}
                                                                {req.reviewed_at && ` • ${formatDate(req.reviewed_at)}`}
                                                            </p>
                                                        )}
                                                        {req.rejection_reason && (
                                                            <p className="text-xs text-red-400">
                                                                <span className="font-medium">{t('Reason')}:</span> {req.rejection_reason}
                                                            </p>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-sm font-medium ${prioConf.color}`}>{t(prioConf.label)}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConf.bg} ${statusConf.text}`}>
                                                    {req.status === 'pending' && <AlertTriangle className="h-3 w-3" />}
                                                    {req.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                                                    {req.status === 'rejected' && <XCircle className="h-3 w-3" />}
                                                    {t(statusConf.label)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-muted-foreground">{formatDate(req.created_at)}</p>
                                            </td>
                                            {canReview && (
                                                <td className="px-4 py-3 text-right">
                                                    {req.status === 'pending' && (
                                                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => handleApprove(req.id)}
                                                                disabled={processing === req.id}
                                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors text-xs font-medium disabled:opacity-50"
                                                                title={t('Approve')}
                                                            >
                                                                {processing === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                                                {t('Approve')}
                                                            </button>
                                                            <button
                                                                onClick={() => openRejectModal(req.id)}
                                                                disabled={processing === req.id}
                                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors text-xs font-medium disabled:opacity-50"
                                                                title={t('Reject')}
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" />
                                                                {t('Reject')}
                                                            </button>
                                                        </div>
                                                    )}
                                                    {req.status !== 'pending' && (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </td>
                                            )}
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            <AnimatePresence>
                {rejectModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                        onClick={() => setRejectModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                                    <XCircle className="h-5 w-5 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">{t('Reject Request')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('Provide a reason for rejection')}</p>
                                </div>
                            </div>

                            <textarea aria-label="Input"
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                placeholder={t('Enter rejection reason...')}
                                rows={4}
                                className="w-full px-4 py-3 bg-muted rounded-xl border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                            />

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setRejectModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-colors text-sm font-medium"
                                >
                                    {t('Cancel')}
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={processing !== null}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                    {t('Reject')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
