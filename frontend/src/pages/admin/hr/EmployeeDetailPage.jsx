/**
 * Admin Employee Detail Page — Full Management Hub
 * 8 Tabs: Overview, Employment, Fiscal, Documents, Leave, Payroll, Security, Notes
 * Connected to live API
 */
import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useParams, useNavigate } from 'react-router-dom';
import { useVenue } from '@/context/VenueContext';
import { useAuth } from '@/context/AuthContext';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';
import api from '@/lib/api';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import {
  ArrowLeft, User, Briefcase, CreditCard, MapPin, ShieldCheck,
  Clock, Mail, Phone, FileText, Printer, ChevronRight, Download,
  Calendar, Save, Loader2, Upload, Trash2, Eye, EyeOff, Shield,
  Key, History, StickyNote, AlertCircle, CheckCircle2,
  DollarSign, Building2, Lock, Unlock, RotateCcw, Plus,
  PanelLeft, KeyRound
} from 'lucide-react';

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Active' },
  on_leave: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'On Leave' },
  suspended: { color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', label: 'Suspended' },
  terminated: { color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', label: 'Terminated' },
};

const ROLES = [
  'owner', 'general_manager', 'manager', 'supervisor',
  'waiter', 'runner', 'bartender', 'kitchen', 'chef',
  'finance', 'it_admin', 'staff', 'host', 'barista',
];

// ─── Helper: Editable Info Field ──────────────────────────────────────────────
function EditableField({ label, value, field, onChange, type = 'text', disabled = false }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</Label>
      <Input
        type={type}
        value={value || ''}
        onChange={e => onChange(field, e.target.value)}
        disabled={disabled}
        className="bg-zinc-950 border-zinc-800 text-zinc-200 h-10 disabled:opacity-50"
      />
    </div>
  );
}

// ─── Helper: Read-only Info Field ─────────────────────────────────────────────
function InfoField({ label, value, highlight = false }) {
  return (
    <div className="bg-zinc-900/40 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 group-hover:text-zinc-400 transition-colors">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-blue-400' : 'text-zinc-100'}`}>
        {value === true ? 'Yes' : (value === false ? 'No' : (value || <span className="text-zinc-700 italic font-medium">N/A</span>))}
      </p>
    </div>
  );
}

// ─── Helper: Section ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, actions }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-1">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Icon className="h-4 w-4 text-blue-400" />
          </div>
          <h3 className="font-black text-white uppercase tracking-widest text-xs">{title}</h3>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function EmployeeDetailPage() {
  const { employeeCode } = useParams();
  const navigate = useNavigate();
  const { activeVenue } = useVenue();
  const venueId = activeVenue?.id;
  useAuditLog('EMPLOYEE_DETAIL_VIEWED', { resource: 'employee-detail', employeeCode });

  // Core state
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

  // Sub-data states
  const [documents, setDocuments] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Password management state
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwShowCurrent, setPwShowCurrent] = useState(false);
  const [pwShowNew, setPwShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  // ─── Load Employee Data ─────────────────────────────────────────────────────
  const fetchEmployee = useCallback(async () => {
    if (!venueId || !employeeCode) return;
    setLoading(true);
    try {
      const response = await api.get(`/venues/${venueId}/hr/employees/${employeeCode}`);
      const emp = response.data;
      setData(emp);
      setEditForm({
        first_name: emp.first_name || '',
        last_name: emp.last_name || '',
        email: emp.email || '',
        phone: emp.phone || '',
        role: emp.role || 'staff',
        department: emp.department || '',
        occupation: emp.occupation || '',
        start_date: emp.start_date ? emp.start_date.split('T')[0] : '',
        id_card_number: emp.id_card_number || '',
        ss_number: emp.ss_number || '',
        fss_tax_status: emp.fss_tax_status || '',
        cola_eligible: emp.cola_eligible ?? true,
        gross_salary_cents: emp.gross_salary_cents || 0,
        hourly_rate_cents: emp.hourly_rate_cents || 0,
        bank_iban: emp.bank_iban || '',
        status: emp.status || emp.employment_status || 'active',
      });
    } catch (error) {
      logger.error('Failed to fetch employee:', error);
      toast.error('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  }, [venueId, employeeCode]);

  // ─── Load Sub-resources ─────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    if (!venueId || !employeeCode) return;
    try {
      const res = await api.get(`/venues/${venueId}/hr/documents?employee_code=${employeeCode}`);
      setDocuments(res.data || []);
    } catch {
      setDocuments([]);
    }
  }, [venueId, employeeCode]);

  const fetchLeave = useCallback(async () => {
    if (!venueId || !employeeCode) return;
    try {
      const [reqRes, balRes] = await Promise.all([
        api.get(`/venues/${venueId}/hr/leave-requests?employee_code=${employeeCode}`).catch(() => ({ data: [] })),
        api.get(`/venues/${venueId}/hr/leave-balances?employee_code=${employeeCode}`).catch(() => ({ data: [] })),
      ]);
      setLeaveRequests(reqRes.data || []);
      setLeaveBalances(balRes.data || []);
    } catch {
      setLeaveRequests([]);
      setLeaveBalances([]);
    }
  }, [venueId, employeeCode]);

  const fetchPayroll = useCallback(async () => {
    if (!venueId) return;
    try {
      const res = await api.get(`/venues/${venueId}/hr/payroll-runs`);
      setPayrollRuns(res.data || []);
    } catch {
      setPayrollRuns([]);
    }
  }, [venueId]);

  const fetchNotes = useCallback(async () => {
    if (!venueId || !employeeCode) return;
    try {
      const res = await api.get(`/venues/${venueId}/hr/employees/${employeeCode}/notes`);
      setNotes(res.data || []);
    } catch {
      setNotes([]);
    }
  }, [venueId, employeeCode]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  // Lazy-load tab data
  useEffect(() => {
    if (activeTab === 'documents') fetchDocuments();
    if (activeTab === 'leave') fetchLeave();
    if (activeTab === 'payroll') fetchPayroll();
    if (activeTab === 'notes') fetchNotes();
  }, [activeTab, fetchDocuments, fetchLeave, fetchPayroll, fetchNotes]);

  // ─── Save Employee ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/venues/${venueId}/hr/employees/${employeeCode}`, editForm);
      toast.success('Employee record updated');
      fetchEmployee();
    } catch (error) {
      logger.error('Failed to save employee:', error);
      toast.error('Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // ─── Add Note ───────────────────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await api.post(`/venues/${venueId}/hr/employees/${employeeCode}/notes`, {
        content: newNote,
        created_at: new Date().toISOString(),
      });
      toast.success('Note added');
      setNewNote('');
      fetchNotes();
    } catch {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  // ─── Handle Leave Action ────────────────────────────────────────────────────
  const handleLeaveAction = async (requestId, action) => {
    try {
      await api.patch(`/venues/${venueId}/hr/leave-requests/${requestId}`, { status: action });
      toast.success(`Leave request ${action}`);
      fetchLeave();
    } catch {
      toast.error(`Failed to ${action} leave request`);
    }
  };

  // ─── Pin Reset ──────────────────────────────────────────────────────────────
  const handlePinReset = async () => {
    try {
      await api.post(`/venues/${venueId}/hr/employees/${employeeCode}/reset-pin`);
      toast.success('PIN reset to default (1111). Employee must change on next login.');
    } catch {
      toast.error('Failed to reset PIN');
    }
  };

  // ─── Password Set/Change ──────────────────────────────────────────────────
  const handlePasswordSave = async () => {
    if (!pwNew || pwNew.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (pwNew !== pwConfirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (hasPassword && !pwCurrent) {
      toast.error('Current password is required');
      return;
    }
    setPwSaving(true);
    try {
      // If admin is setting password for another user via their employee record
      if (data.user_id) {
        await api.post('/auth/admin/set-password', {
          user_id: data.user_id,
          new_password: pwNew,
        });
      } else {
        // Self-service (unlikely from admin page, but supported)
        await api.post('/auth/set-password', {
          current_password: pwCurrent,
          new_password: pwNew,
        });
      }
      toast.success(hasPassword ? 'Password changed successfully' : 'Password set successfully');
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
      setHasPassword(true);
    } catch (error) {
      const msg = error?.response?.data?.detail || 'Failed to set password';
      toast.error(msg);
    } finally {
      setPwSaving(false);
    }
  };

  // ═══ RENDER ═══════════════════════════════════════════════════════════════════
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0A0B]">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Retrieving Personnel File...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="p-8 text-center text-zinc-500 bg-[#0A0A0B] min-h-screen flex flex-col items-center justify-center gap-4">
      <AlertCircle className="h-12 w-12 text-zinc-700" />
      <p className="text-lg font-bold">Record not found</p>
      <Button onClick={() => navigate(-1)} variant="ghost">Go Back</Button>
    </div>
  );

  const statusCfg = STATUS_CONFIG[editForm.status] || STATUS_CONFIG.active;

  return (
    <PermissionGate requiredRole="MANAGER">
      <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ─── Header & Navigation ──────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/admin/hr/people')}
                className="p-2 hover:bg-white/5 rounded-full"
              >
                <ArrowLeft className="h-5 w-5 text-zinc-400" />
              </Button>
              <div>
                <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">
                  <span>Directory</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-zinc-300">Personnel File</span>
                </div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                  {data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : data.full_name || data.name || 'Unknown'}
                </h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-zinc-800 bg-zinc-900/50 hover:bg-white/5 text-xs font-bold uppercase tracking-widest h-10"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest h-10 rounded-xl shadow-lg shadow-blue-500/20"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>

          {/* ─── Profile Summary Card ─────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-white/5 rounded-3xl p-8 relative overflow-hidden backdrop-blur-3xl">
            {/* Status Badge */}
            <div className="absolute top-6 right-6">
              <Select value={editForm.status} onValueChange={val => updateField('status', val)}>
                <SelectTrigger className={`${statusCfg.color} border text-[10px] uppercase font-bold tracking-widest px-3 py-1 h-8 w-auto min-w-[120px]`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key} className="text-xs uppercase font-bold">
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="h-28 w-28 rounded-3xl bg-zinc-800 border-2 border-white/10 flex items-center justify-center text-4xl font-black text-zinc-500 shadow-2xl overflow-hidden relative group">
                {(data.first_name || data.full_name || data.name || '?').charAt(0)}{(data.last_name || '').charAt(0)}
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors" />
              </div>
              <div className="space-y-3 text-center md:text-left flex-1">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-1">
                    {data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : data.full_name || data.name || 'Unknown'}
                  </h2>
                  <p className="text-blue-400 font-bold uppercase tracking-widest text-sm italic">
                    {data.role || data.occupation}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-zinc-500 text-xs">
                  {data.email && <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {data.email}</span>}
                  {data.phone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {data.phone}</span>}
                  {data.start_date && <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Started {new Date(data.start_date).toLocaleDateString()}</span>}
                  {data.id_card_number && <span className="flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> {data.id_card_number}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Tab Navigation ───────────────────────────────────────────── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-zinc-900/50 border border-white/5 p-1 rounded-2xl h-auto backdrop-blur-xl flex flex-wrap gap-1">
              {[
                { id: 'overview', icon: User, label: 'Overview' },
                { id: 'employment', icon: Briefcase, label: 'Employment' },
                { id: 'fiscal', icon: DollarSign, label: 'Fiscal' },
                { id: 'documents', icon: FileText, label: 'Documents' },
                { id: 'leave', icon: Calendar, label: 'Leave' },
                { id: 'payroll', icon: CreditCard, label: 'Payroll' },
                { id: 'security', icon: Shield, label: 'Security' },
                { id: 'notes', icon: StickyNote, label: 'Notes' },
              ].map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-xl px-4 py-2.5 data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ═══ TAB 1: OVERVIEW ═══ */}
            <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-300">
              <Section title="Personal Information" icon={User}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <EditableField label="First Name" value={editForm.first_name} field="first_name" onChange={updateField} />
                  <EditableField label="Last Name" value={editForm.last_name} field="last_name" onChange={updateField} />
                  <EditableField label="Email" value={editForm.email} field="email" onChange={updateField} type="email" />
                  <EditableField label="Phone" value={editForm.phone} field="phone" onChange={updateField} type="tel" />
                  <EditableField label="Malta ID Card" value={editForm.id_card_number} field="id_card_number" onChange={updateField} />
                  <EditableField label="Social Security No." value={editForm.ss_number} field="ss_number" onChange={updateField} />
                </div>
              </Section>
              <Section title="Quick Actions" icon={ChevronRight}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { icon: Clock, label: 'Clocking History', desc: 'View clock-in/out records', path: '/admin/hr/clocking' },
                    { icon: FileText, label: 'Timesheets', desc: 'Weekly timesheet summaries', path: '/admin/hr/timesheets' },
                    { icon: Calendar, label: 'Leave Management', desc: 'Requests & balances', path: '/admin/hr/leave' },
                    { icon: CreditCard, label: 'Payroll', desc: 'Pay runs & payslips', path: '/admin/hr/payroll' },
                    { icon: Briefcase, label: 'Schedule', desc: 'Shift assignments', path: '/admin/hr/scheduler' },
                    { icon: FileText, label: 'Documents', desc: 'Contracts & files', path: '/admin/hr/documents' },
                    { icon: Shield, label: 'User Account', desc: 'Login & permissions', path: `/admin/users` },
                  ].map((action, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => navigate(action.path)}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-left"
                    >
                      <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors shrink-0">
                        <action.icon className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-white group-hover:text-blue-400 transition-colors truncate">{action.label}</div>
                        <div className="text-[9px] text-zinc-500 truncate">{action.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </Section>
            </TabsContent>

            {/* ═══ TAB 2: EMPLOYMENT ═══ */}
            <TabsContent value="employment" className="space-y-8 animate-in fade-in duration-300">
              <Section title="Employment Details" icon={Briefcase}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Role</Label>
                    <Select value={editForm.role} onValueChange={val => updateField('role', val)}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200 h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        {ROLES.map(r => (
                          <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <EditableField label="Department" value={editForm.department} field="department" onChange={updateField} />
                  <EditableField label="Occupation" value={editForm.occupation} field="occupation" onChange={updateField} />
                  <EditableField label="Start Date" value={editForm.start_date} field="start_date" onChange={updateField} type="date" />
                </div>
              </Section>

              <Section title="Quick Stats" icon={Clock}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoField label="Leave Balance" value={data.leave_balance_hours ? `${data.leave_balance_hours} hrs` : 'N/A'} highlight />
                  <InfoField label="Tenure" value={data.start_date ? `${Math.floor((Date.now() - new Date(data.start_date).getTime()) / (86400000 * 365))} years` : 'N/A'} />
                  <InfoField label="Venue" value={data.venueId || activeVenue?.name} />
                  <InfoField label="Employee Code" value={employeeCode} highlight />
                </div>
              </Section>
            </TabsContent>

            {/* ═══ TAB 3: FISCAL ═══ */}
            <TabsContent value="fiscal" className="space-y-8 animate-in fade-in duration-300">
              <Section title="Malta Fiscal Compliance" icon={ShieldCheck}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">FSS Tax Status</Label>
                    <Select value={editForm.fss_tax_status} onValueChange={val => updateField('fss_tax_status', val)}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200 h-10">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">COLA Eligible</Label>
                    <Select value={String(editForm.cola_eligible)} onValueChange={val => updateField('cola_eligible', val === 'true')}>
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-200 h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Section>

              <Section title="Compensation" icon={DollarSign}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Gross Salary (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(editForm.gross_salary_cents / 100).toFixed(2)}
                      onChange={e => updateField('gross_salary_cents', Math.round(parseFloat(e.target.value || 0) * 100))}
                      className="bg-zinc-950 border-zinc-800 text-zinc-200 h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Hourly Rate (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(editForm.hourly_rate_cents / 100).toFixed(2)}
                      onChange={e => updateField('hourly_rate_cents', Math.round(parseFloat(e.target.value || 0) * 100))}
                      className="bg-zinc-950 border-zinc-800 text-zinc-200 h-10"
                    />
                  </div>
                  <EditableField label="Bank IBAN" value={editForm.bank_iban} field="bank_iban" onChange={updateField} />
                </div>
              </Section>
            </TabsContent>

            {/* ═══ TAB 4: DOCUMENTS ═══ */}
            <TabsContent value="documents" className="space-y-8 animate-in fade-in duration-300">
              <Section
                title="Employee Documents"
                icon={FileText}
                actions={
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-bold tracking-widest h-8">
                    <Upload className="h-3 w-3 mr-1.5" /> Upload
                  </Button>
                }
              >
                {documents.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
                    <FileText className="h-10 w-10 mx-auto text-zinc-700 mb-3" />
                    <p className="text-zinc-500 font-medium">No documents on file</p>
                    <p className="text-zinc-600 text-xs mt-1">Upload contracts, certificates, or other files</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-200">{doc.name || doc.filename}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                              {doc.category || 'General'} • {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-rose-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </TabsContent>

            {/* ═══ TAB 5: LEAVE ═══ */}
            <TabsContent value="leave" className="space-y-8 animate-in fade-in duration-300">
              <Section title="Leave Balances" icon={Calendar}>
                {leaveBalances.length === 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoField label="Annual Leave" value={data.leave_balance_hours ? `${data.leave_balance_hours} hrs` : '0 hrs'} highlight />
                    <InfoField label="Sick Leave" value="N/A" />
                    <InfoField label="Personal" value="N/A" />
                    <InfoField label="Unpaid" value="N/A" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {leaveBalances.map((bal, i) => (
                      <InfoField key={i} label={bal.leave_type} value={`${bal.remaining || 0} / ${bal.total || 0} days`} highlight />
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Leave Requests" icon={Clock}>
                {leaveRequests.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-zinc-800 rounded-2xl">
                    <Calendar className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
                    <p className="text-zinc-500 text-sm">No leave requests found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaveRequests.map((req, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-white/5">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {req.leave_type}
                          </Badge>
                          <span className="text-sm text-zinc-300">
                            {req.start_date && new Date(req.start_date).toLocaleDateString()} — {req.end_date && new Date(req.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                              req.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' :
                                'bg-amber-500/20 text-amber-400'
                          }>
                            {req.status}
                          </Badge>
                          {req.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 text-emerald-400 hover:bg-emerald-500/10 text-[10px]"
                                onClick={() => handleLeaveAction(req.id || req._id, 'approved')}>
                                Approve
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-rose-400 hover:bg-rose-500/10 text-[10px]"
                                onClick={() => handleLeaveAction(req.id || req._id, 'rejected')}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </TabsContent>

            {/* ═══ TAB 6: PAYROLL ═══ */}
            <TabsContent value="payroll" className="space-y-8 animate-in fade-in duration-300">
              <Section title="Compensation Summary" icon={DollarSign}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <InfoField label="Gross Salary" value={data.gross_salary_cents ? `€${(data.gross_salary_cents / 100).toLocaleString()}` : 'N/A'} highlight />
                  <InfoField label="Hourly Rate" value={data.hourly_rate_cents ? `€${(data.hourly_rate_cents / 100).toFixed(2)}/hr` : 'Salaried'} />
                  <InfoField label="COLA" value={data.cola_eligible ? 'Eligible' : 'Not Eligible'} />
                  <InfoField label="Tax Status" value={data.fss_tax_status || 'N/A'} />
                </div>
              </Section>

              <Section title="Payroll History" icon={History}>
                {payrollRuns.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-zinc-800 rounded-2xl">
                    <CreditCard className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
                    <p className="text-zinc-500 text-sm">No payroll runs found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payrollRuns.slice(0, 12).map((run, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-200">{run.period || run.name}</p>
                            <p className="text-[10px] text-zinc-500">{run.created_at ? new Date(run.created_at).toLocaleDateString() : ''}</p>
                          </div>
                        </div>
                        <Badge className={
                          run.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                            run.status === 'processing' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-zinc-500/20 text-zinc-400'
                        }>
                          {run.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </TabsContent>

            {/* ═══ TAB 7: SECURITY ═══ */}
            <TabsContent value="security" className="space-y-8 animate-in fade-in duration-300">
              <Section title="Access Controls" icon={Shield}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-zinc-900/40 border-white/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <Key className="h-4 w-4 text-amber-400" /> PIN Reset
                      </CardTitle>
                      <CardDescription className="text-zinc-500 text-xs">
                        Reset this employee's POS PIN to default (1111)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={handlePinReset}
                        variant="outline"
                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs font-bold uppercase"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reset PIN
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Password Management Card */}
                  <Card className="bg-zinc-900/40 border-white/5 md:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-violet-400" />
                        {hasPassword ? 'Change Password' : 'Set Password'}
                      </CardTitle>
                      <CardDescription className="text-zinc-500 text-xs">
                        {data.user_id
                          ? 'Admin: Set a password for this employee\'s linked user account (used for elevation to sensitive areas)'
                          : 'No user account linked — link one first to enable password management'}
                      </CardDescription>
                    </CardHeader>
                    {data.user_id ? (
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {hasPassword && (
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Current Password</Label>
                              <div className="relative">
                                <Input
                                  type={pwShowCurrent ? 'text' : 'password'}
                                  value={pwCurrent}
                                  onChange={e => setPwCurrent(e.target.value)}
                                  className="bg-zinc-950 border-zinc-800 text-zinc-200 pr-10"
                                  placeholder="••••••••"
                                />
                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-500 hover:text-white" onClick={() => setPwShowCurrent(!pwShowCurrent)}>
                                  {pwShowCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>
                              </div>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">New Password</Label>
                            <div className="relative">
                              <Input
                                type={pwShowNew ? 'text' : 'password'}
                                value={pwNew}
                                onChange={e => setPwNew(e.target.value)}
                                className="bg-zinc-950 border-zinc-800 text-zinc-200 pr-10"
                                placeholder="Min. 6 chars"
                              />
                              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-500 hover:text-white" onClick={() => setPwShowNew(!pwShowNew)}>
                                {pwShowNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Confirm Password</Label>
                            <Input
                              type="password"
                              value={pwConfirm}
                              onChange={e => setPwConfirm(e.target.value)}
                              className="bg-zinc-950 border-zinc-800 text-zinc-200"
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                        {pwNew && pwConfirm && pwNew !== pwConfirm && (
                          <p className="text-rose-400 text-xs mt-2 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Passwords do not match
                          </p>
                        )}
                        {pwNew && pwNew.length > 0 && pwNew.length < 6 && (
                          <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Password must be at least 6 characters
                          </p>
                        )}
                        <div className="flex justify-end mt-4">
                          <Button
                            onClick={handlePasswordSave}
                            disabled={pwSaving || !pwNew || pwNew.length < 6 || pwNew !== pwConfirm || (hasPassword && !pwCurrent)}
                            className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold uppercase tracking-widest"
                          >
                            {pwSaving ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Saving...</> : <><KeyRound className="h-3.5 w-3.5 mr-2" /> {hasPassword ? 'Change Password' : 'Set Password'}</>}
                          </Button>
                        </div>
                      </CardContent>
                    ) : (
                      <CardContent>
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-950/50 border border-dashed border-zinc-800">
                          <AlertCircle className="h-5 w-5 text-zinc-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-zinc-400">No linked user account</p>
                            <p className="text-[10px] text-zinc-600">Go to User Accounts to create and link a user account first</p>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  <Card className="bg-zinc-900/40 border-white/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                        <Lock className="h-4 w-4 text-blue-400" /> Account Status
                      </CardTitle>
                      <CardDescription className="text-zinc-500 text-xs">
                        Lock or unlock employee system access
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold uppercase"
                          onClick={() => updateField('status', 'suspended')}
                        >
                          <Lock className="h-3.5 w-3.5 mr-2" /> Suspend
                        </Button>
                        <Button
                          variant="outline"
                          className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold uppercase"
                          onClick={() => updateField('status', 'active')}
                        >
                          <Unlock className="h-3.5 w-3.5 mr-2" /> Activate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </Section>

              <Section title="Linked User Account" icon={User}>
                <Card className="bg-zinc-900/40 border-white/5">
                  <CardContent className="pt-6">
                    {data.user_id ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <ShieldCheck className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-200">User account linked</p>
                            <p className="text-[10px] text-zinc-500">ID: {data.user_id}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs font-bold uppercase"
                          onClick={() => navigate(`/admin/users/${data.user_id}/access`)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-2" /> View User Account
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-zinc-500/10 flex items-center justify-center border border-zinc-500/20">
                            <AlertCircle className="h-5 w-5 text-zinc-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-400">No user account linked</p>
                            <p className="text-[10px] text-zinc-500">This employee cannot log in to the system</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold uppercase"
                          onClick={() => navigate('/admin/users')}
                        >
                          <Plus className="h-3.5 w-3.5 mr-2" /> Create User Account
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Section>

              <Section title="Login History" icon={History}>
                <div className="text-center py-8 border border-dashed border-zinc-800 rounded-2xl">
                  <History className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
                  <p className="text-zinc-500 text-sm">Login history will be available once audit logging is enabled</p>
                </div>
              </Section>
            </TabsContent>

            {/* ═══ TAB 8: NOTES ═══ */}
            <TabsContent value="notes" className="space-y-8 animate-in fade-in duration-300">
              <Section title="Admin Notes" icon={StickyNote}>
                <div className="space-y-4">
                  {/* Add Note */}
                  <div className="flex gap-3">
                    <Textarea
                      placeholder="Add an admin note about this employee..."
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-zinc-200 min-h-[80px] flex-1 resize-none"
                    />
                    <Button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || addingNote}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-6 self-end h-10"
                    >
                      {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                  </div>

                  {/* Notes List */}
                  {notes.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-zinc-800 rounded-2xl">
                      <StickyNote className="h-8 w-8 mx-auto text-zinc-700 mb-2" />
                      <p className="text-zinc-500 text-sm">No admin notes yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notes.map((note, i) => (
                        <div key={i} className="p-4 rounded-xl bg-zinc-900/40 border border-white/5">
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{note.content}</p>
                          <div className="flex items-center gap-3 mt-3 text-[10px] text-zinc-600 uppercase tracking-wider">
                            <span>{note.author || 'Admin'}</span>
                            <span>•</span>
                            <span>{note.created_at ? new Date(note.created_at).toLocaleString() : 'Just now'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PermissionGate>
  );
}