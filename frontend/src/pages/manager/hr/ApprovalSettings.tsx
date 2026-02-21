
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
    Settings, Shield, Clock, Timer, Calendar, FileText,
    Users, CheckCircle2, Loader2, ArrowLeft, AlertTriangle,
    Zap, UserCheck, Save
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ── Types ────────────────────────────────────────── */
interface ClockingApprovalConfig {
    staff_app_requires_approval: boolean;
    auto_clocking_requires_approval: boolean;
    shift_mismatch_requires_approval: boolean;
    shift_mismatch_tolerance_minutes: number;
    auto_approve_enabled: boolean;
    allowed_approvers: string[];
    specific_approver_ids: string[];
}

interface GenericApprovalConfig {
    requires_approval: boolean;
    auto_approve_enabled: boolean;
    allowed_approvers: string[];
    specific_approver_ids: string[];
}

interface ApprovalSettings {
    manual_clocking: ClockingApprovalConfig;
    leave: GenericApprovalConfig;
    expense: GenericApprovalConfig;
}

interface Employee {
    id: string;
    fullName?: string;
    name?: string;
    role?: string;
}

/* ── Constants ────────────────────────────────────── */
const APPROVER_ROLES = [
    { id: 'manager', label: 'Manager', icon: UserCheck },
    { id: 'owner', label: 'Owner', icon: Shield },
    { id: 'hr', label: 'HR', icon: Users },
];

const DEFAULTS: ApprovalSettings = {
    manual_clocking: {
        staff_app_requires_approval: true,
        auto_clocking_requires_approval: false,
        shift_mismatch_requires_approval: true,
        shift_mismatch_tolerance_minutes: 15,
        auto_approve_enabled: false,
        allowed_approvers: ['manager', 'owner', 'hr'],
        specific_approver_ids: [],
    },
    leave: {
        requires_approval: true,
        auto_approve_enabled: false,
        allowed_approvers: ['manager', 'owner', 'hr'],
        specific_approver_ids: [],
    },
    expense: {
        requires_approval: true,
        auto_approve_enabled: false,
        allowed_approvers: ['owner'],
        specific_approver_ids: [],
    },
};

export default function ApprovalSettings() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeVenueId: venueId } = useVenue();

    const [settings, setSettings] = useState<ApprovalSettings>(DEFAULTS);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    /* ── Fetch ─────────────────────────────────────── */
    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            const [settingsRes, employeesRes] = await Promise.all([
                api.get(`config/venues/${venueId}/approval-settings`),
                api.get(`/venues/${venueId}/hr/employees`).catch(() => ({ data: [] })),
            ]);

            const data = settingsRes.data?.data || settingsRes.data;
            if (data) {
                setSettings({
                    manual_clocking: { ...DEFAULTS.manual_clocking, ...(data.manual_clocking || {}) },
                    leave: { ...DEFAULTS.leave, ...(data.leave || {}) },
                    expense: { ...DEFAULTS.expense, ...(data.expense || {}) },
                });
            }

            const empList = Array.isArray(employeesRes.data) ? employeesRes.data
                : Array.isArray(employeesRes.data?.data) ? employeesRes.data.data : [];
            setEmployees(empList);
        } catch (err: unknown) {
            logger.error('Failed to fetch approval settings', { error: String(err) });
        } finally {
            setLoading(false);
        }
    }, [venueId]);

    useEffect(() => { if (venueId) fetchSettings(); }, [fetchSettings, venueId]);

    /* ── Save ──────────────────────────────────────── */
    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`config/venues/${venueId}/approval-settings`, settings);
            toast.success(t('Approval settings saved'));
            setDirty(false);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Save failed';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    /* ── Update helpers ────────────────────────────── */
    const updateClocking = (key: keyof ClockingApprovalConfig, value: unknown) => {
        setSettings(s => ({
            ...s,
            manual_clocking: { ...s.manual_clocking, [key]: value },
        }));
        setDirty(true);
    };

    const updateGeneric = (type: 'leave' | 'expense', key: keyof GenericApprovalConfig, value: unknown) => {
        setSettings(s => ({
            ...s,
            [type]: { ...s[type], [key]: value },
        }));
        setDirty(true);
    };

    const toggleApproverRole = (type: keyof ApprovalSettings, role: string) => {
        setSettings(s => {
            const current = s[type].allowed_approvers;
            const updated = current.includes(role)
                ? current.filter(r => r !== role)
                : [...current, role];
            return { ...s, [type]: { ...s[type], allowed_approvers: updated } };
        });
        setDirty(true);
    };

    const toggleSpecificApprover = (type: keyof ApprovalSettings, employeeId: string) => {
        setSettings(s => {
            const current = s[type].specific_approver_ids;
            const updated = current.includes(employeeId)
                ? current.filter(id => id !== employeeId)
                : [...current, employeeId];
            return { ...s, [type]: { ...s[type], specific_approver_ids: updated } };
        });
        setDirty(true);
    };

    /* ── Loading ───────────────────────────────────── */
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    /* ── Reusable Toggle ───────────────────────────── */
    const Toggle = ({ checked, onChange, label, description, icon: Icon, danger }: {
        checked: boolean;
        onChange: (v: boolean) => void;
        label: string;
        description?: string;
        icon: typeof Clock;
        danger?: boolean;
    }) => (
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border hover:border-border/80 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${danger ? 'bg-red-500/15' : 'bg-blue-500/15'}`}>
                    <Icon className={`h-4.5 w-4.5 ${danger ? 'text-red-400' : 'text-blue-400'}`} />
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">{t(label)}</p>
                    {description && <p className="text-xs text-muted-foreground mt-0.5">{t(description)}</p>}
                </div>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? (danger ? 'bg-red-500' : 'bg-blue-500') : 'bg-zinc-600'}`}
                title={label}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
                />
            </button>
        </div>
    );

    /* ── Approver Section ──────────────────────────── */
    const ApproverSection = ({ type }: { type: keyof ApprovalSettings }) => (
        <div className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('Who Can Approve')}</p>

            {/* Role checkboxes */}
            <div className="grid grid-cols-3 gap-2">
                {APPROVER_ROLES.map(role => {
                    const RoleIcon = role.icon;
                    const isActive = settings[type].allowed_approvers.includes(role.id);
                    return (
                        <button
                            key={role.id}
                            onClick={() => toggleApproverRole(type, role.id)}
                            className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${isActive
                                ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                                : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                                }`}
                            title={role.label}
                        >
                            <RoleIcon className="h-4 w-4" />
                            {t(role.label)}
                            {isActive && <CheckCircle2 className="h-3.5 w-3.5 ml-auto" />}
                        </button>
                    );
                })}
            </div>

            {/* Specific employees */}
            {employees.length > 0 && (
                <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('Specific Employees (Optional)')}</p>
                    <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-border p-2 bg-muted/20">
                        {employees
                            .filter(e => ['manager', 'owner', 'hr', 'admin', 'product_owner'].includes((e.role || '').toLowerCase()))
                            .map(emp => {
                                const empName = emp.fullName || emp.name || emp.id;
                                const isSelected = settings[type].specific_approver_ids.includes(emp.id);
                                return (
                                    <button
                                        key={emp.id}
                                        onClick={() => toggleSpecificApprover(type, emp.id)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isSelected
                                            ? 'bg-blue-500/15 text-blue-400'
                                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                            }`}
                                        title={empName}
                                    >
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-blue-500/30 text-blue-300' : 'bg-muted text-muted-foreground'}`}>
                                            {empName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="truncate">{empName}</span>
                                        <span className="text-xs opacity-60 ml-auto">{emp.role}</span>
                                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />}
                                    </button>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-background p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-lg bg-card hover:bg-muted transition-colors" title="Go back">
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Settings className="h-6 w-6 text-blue-500" />
                            {t('Approval Settings')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('Configure approval rules for your venue')}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={!dirty || saving}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${dirty
                        ? 'bg-blue-500 text-foreground hover:bg-blue-600 shadow-lg shadow-blue-500/25'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                        } disabled:opacity-50`}
                    title={t('Save')}
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {t('Save Settings')}
                </button>
            </div>

            {/* ── Manual Clocking Section ───────── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border p-6 space-y-4"
            >
                <div className="flex items-center gap-2 mb-2">
                    <Timer className="h-5 w-5 text-blue-400" />
                    <h2 className="text-lg font-semibold text-foreground">{t('Manual Clocking')}</h2>
                </div>

                <Toggle
                    checked={settings.manual_clocking.staff_app_requires_approval}
                    onChange={v => updateClocking('staff_app_requires_approval', v)}
                    label="Staff App Requires Approval"
                    description="Clock-ins from the staff app go to approval queue"
                    icon={Users}
                />

                <Toggle
                    checked={settings.manual_clocking.auto_clocking_requires_approval}
                    onChange={v => updateClocking('auto_clocking_requires_approval', v)}
                    label="Auto Clock Requires Approval"
                    description="System-generated clockings also need approval"
                    icon={Zap}
                />

                <Toggle
                    checked={settings.manual_clocking.shift_mismatch_requires_approval}
                    onChange={v => updateClocking('shift_mismatch_requires_approval', v)}
                    label="Shift Mismatch Triggers Approval"
                    description="Clockings outside the scheduled shift go to approval"
                    icon={AlertTriangle}
                    danger={true}
                />

                {settings.manual_clocking.shift_mismatch_requires_approval && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="pl-12 space-y-2"
                    >
                        <label className="text-xs text-muted-foreground">{t('Tolerance (minutes)')}</label>
                        <input aria-label="Input"
                            type="number"
                            min={0}
                            max={120}
                            value={settings.manual_clocking.shift_mismatch_tolerance_minutes}
                            onChange={e = aria-label="Input field"> updateClocking('shift_mismatch_tolerance_minutes', parseInt(e.target.value) || 15)}
                            title="Tolerance minutes"
                            className="w-24 px-3 py-2 bg-muted rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="text-xs text-muted-foreground">{t('Clock-ins within this window of the scheduled shift are accepted')}</p>
                    </motion.div>
                )}

                <div className="border-t border-border pt-4">
                    <Toggle
                        checked={settings.manual_clocking.auto_approve_enabled}
                        onChange={v => updateClocking('auto_approve_enabled', v)}
                        label="Auto-Approve (Skip Queue)"
                        description="Bypass approval queue — clockings are accepted immediately"
                        icon={Zap}
                        danger={true}
                    />
                </div>

                <ApproverSection type="manual_clocking" />
            </motion.div>

            {/* ── Leave Section ─────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-2xl border border-border p-6 space-y-4"
            >
                <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-emerald-400" />
                    <h2 className="text-lg font-semibold text-foreground">{t('Leave Requests')}</h2>
                </div>

                <Toggle
                    checked={settings.leave.requires_approval}
                    onChange={v => updateGeneric('leave', 'requires_approval', v)}
                    label="Requires Approval"
                    description="Leave requests need manager/HR approval"
                    icon={Shield}
                />

                <Toggle
                    checked={settings.leave.auto_approve_enabled}
                    onChange={v => updateGeneric('leave', 'auto_approve_enabled', v)}
                    label="Auto-Approve"
                    description="Automatically approve all leave requests"
                    icon={Zap}
                    danger={true}
                />

                <ApproverSection type="leave" />
            </motion.div>

            {/* ── Expense Section ───────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-2xl border border-border p-6 space-y-4"
            >
                <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-amber-400" />
                    <h2 className="text-lg font-semibold text-foreground">{t('Expense Claims')}</h2>
                </div>

                <Toggle
                    checked={settings.expense.requires_approval}
                    onChange={v => updateGeneric('expense', 'requires_approval', v)}
                    label="Requires Approval"
                    description="Expense claims need owner approval"
                    icon={Shield}
                />

                <Toggle
                    checked={settings.expense.auto_approve_enabled}
                    onChange={v => updateGeneric('expense', 'auto_approve_enabled', v)}
                    label="Auto-Approve"
                    description="Automatically approve all expense claims"
                    icon={Zap}
                    danger={true}
                />

                <ApproverSection type="expense" />
            </motion.div>
        </div>
    );
}
