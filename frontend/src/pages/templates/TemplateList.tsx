import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    FileText, Plus, Copy, Archive, Eye, ChevronRight, Search,
    Filter, LayoutTemplate, Receipt, UtensilsCrossed, FileSpreadsheet,
    Sparkles, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

/* ────────────────────────────────────────────────────────── */
/* STATUS CONFIG                                               */
/* ────────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    draft: {
        label: 'Draft',
        icon: <Clock className="w-3 h-3" />,
        className: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    },
    active: {
        label: 'Active',
        icon: <CheckCircle className="w-3 h-3" />,
        className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    },
    archived: {
        label: 'Archived',
        icon: <XCircle className="w-3 h-3" />,
        className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
    }
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
    receipt: <Receipt className="w-4 h-4" />,
    kot: <UtensilsCrossed className="w-4 h-4" />,
    invoice: <FileSpreadsheet className="w-4 h-4" />,
    report: <FileText className="w-4 h-4" />,
    custom: <LayoutTemplate className="w-4 h-4" />
};

/* ────────────────────────────────────────────────────────── */
/* TEMPLATE LIST PAGE                                         */
/* ────────────────────────────────────────────────────────── */
export default function TemplateList() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');

    const venueId = user?.venueId || '';

    // Check permissions
    const userRole = (user?.role || '').toLowerCase();
    const canEdit = ['product_owner', 'owner', 'general_manager', 'manager'].includes(userRole);
    const canPublish = ['product_owner', 'owner', 'general_manager'].includes(userRole);
    const canDelete = ['product_owner', 'owner'].includes(userRole);

    const fetchTemplates = useCallback(async () => {
        if (!venueId) return;
        try {
            setLoading(true);
            const params: Record<string, string> = { venue_id: venueId };
            if (filterStatus) params.status = filterStatus;
            if (filterType) params.template_type = filterType;

            const response = await api.get('/templates', { params });
            setTemplates(response.data || []);
        } catch (err) {
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    }, [venueId, filterStatus, filterType]);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const handleDuplicate = async (templateId: string) => {
        try {
            await api.post(`/templates/${templateId}/duplicate`);
            toast.success('Template duplicated');
            fetchTemplates();
        } catch {
            toast.error('Failed to duplicate template');
        }
    };

    const handleArchive = async (templateId: string) => {
        try {
            await api.post(`/templates/${templateId}/archive`);
            toast.success('Template archived');
            fetchTemplates();
        } catch {
            toast.error('Failed to archive template');
        }
    };

    // Filter by search query
    const filtered = templates.filter(t =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <LayoutTemplate className="w-7 h-7 text-violet-400" />
                        {t('Template Studio')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('Design, preview, and publish receipt & ticket templates')}
                    </p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => navigate('/admin/templates/new')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-violet-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        {t('New Template')}
                    </button>
                )}
            </div>

            {/* ── Filter Strip ───────────────────────────────── */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={t('Search templates...')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
                    />
                </div>

                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 appearance-none cursor-pointer"
                >
                    <option value="">{t('All Status')}</option>
                    <option value="draft">{t('Draft')}</option>
                    <option value="active">{t('Active')}</option>
                    <option value="archived">{t('Archived')}</option>
                </select>

                <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="px-3 py-2.5 rounded-xl bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 appearance-none cursor-pointer"
                >
                    <option value="">{t('All Types')}</option>
                    <option value="receipt">{t('Receipt')}</option>
                    <option value="kot">{t('Kitchen Order')}</option>
                    <option value="invoice">{t('Invoice')}</option>
                    <option value="report">{t('Report')}</option>
                    <option value="custom">{t('Custom')}</option>
                </select>
            </div>

            {/* ── Template Grid ──────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div
                            key={i}
                            className="h-48 rounded-2xl bg-card border border-border animate-pulse"
                        />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                        <LayoutTemplate className="w-10 h-10 text-violet-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{t('No templates yet')}</h3>
                    <p className="text-muted-foreground text-sm max-w-md mb-6">
                        {t('Create your first template to design receipts, kitchen tickets, and invoices.')}
                    </p>
                    {canEdit && (
                        <button
                            onClick={() => navigate('/admin/templates/new')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            {t('Create Template')}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(template => {
                        const statusConfig = STATUS_CONFIG[template.status] || STATUS_CONFIG.draft;
                        const typeIcon = TYPE_ICONS[template.type] || TYPE_ICONS.custom;

                        return (
                            <div
                                key={template.id}
                                className="group relative bg-card border border-border rounded-2xl p-5 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 cursor-pointer"
                                onClick={() => navigate(`/admin/templates/${template.id}`)}
                            >
                                {/* Type & Status */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        {typeIcon}
                                        <span className="text-xs font-medium uppercase tracking-wider">
                                            {template.type}
                                        </span>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.className}`}>
                                        {statusConfig.icon}
                                        {statusConfig.label}
                                    </span>
                                </div>

                                {/* Name & Description */}
                                <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-violet-400 transition-colors">
                                    {template.name}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                    {template.description || 'No description'}
                                </p>

                                {/* Meta */}
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        v{template.current_version || 0}
                                    </span>
                                    <span>
                                        {template.updated_at
                                            ? new Date(template.updated_at).toLocaleDateString()
                                            : '—'
                                        }
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    {canEdit && (
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDuplicate(template.id); }}
                                            className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                            title="Duplicate"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {canDelete && template.status !== 'archived' && (
                                        <button
                                            onClick={e => { e.stopPropagation(); handleArchive(template.id); }}
                                            className="p-1.5 rounded-lg bg-card border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                            title="Archive"
                                        >
                                            <Archive className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Arrow */}
                                <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight className="w-5 h-5 text-violet-400" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
