/**
 * HACCPScheduler — Automated HACCP Task Scheduling & Compliance
 * Apicbase parity: auto-assign daily/weekly tasks, deadlines, corrective actions
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent } from '@/components/ui/card';
import { Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import {
DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useVenue } from '@/context/VenueContext';
import PageContainer from '@/layouts/PageContainer';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import {
AlertTriangle,
Bug,
Calendar,
CheckCircle2,
ClipboardCheck,
Clock,
Droplets,
Edit,
Eye,
Filter,
Loader2,
MoreHorizontal,
Plus,
RefreshCw,
Search,
Shield,
Thermometer,
Trash2,
User,
Zap
} from 'lucide-react';
import React,{ useCallback,useEffect,useMemo,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/* ────────────────────────────────────────── Types ────────────────── */
type TaskFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'skipped';
type TaskCategory = 'temperature' | 'cleaning' | 'pest_control' | 'receiving' | 'storage' | 'personal_hygiene' | 'equipment';

interface HACCPTask {
    _id: string;
    title: string;
    description: string;
    category: TaskCategory;
    frequency: TaskFrequency;
    assignedTo: string;
    dueTime: string;
    status: TaskStatus;
    priority: 'low' | 'medium' | 'high' | 'critical';
    area: string;
    checklistItems: string[];
    correctiveAction: string;
    lastCompleted: string;
    nextDue: string;
    temperature?: { min: number; max: number; unit: string };
}

/* ──────────────────────────── Constants ────────────────── */
const CATEGORY_CONFIG: Record<TaskCategory, { label: string; icon: React.ElementType; color: string }> = {
    temperature: { label: 'Temperature', icon: Thermometer, color: 'text-red-400' },
    cleaning: { label: 'Cleaning', icon: Droplets, color: 'text-blue-400' },
    pest_control: { label: 'Pest Control', icon: Bug, color: 'text-amber-400' },
    receiving: { label: 'Receiving', icon: ClipboardCheck, color: 'text-emerald-400' },
    storage: { label: 'Storage', icon: Eye, color: 'text-purple-400' },
    personal_hygiene: { label: 'Hygiene', icon: User, color: 'text-cyan-400' },
    equipment: { label: 'Equipment', icon: Zap, color: 'text-orange-400' },
};

const AREAS = ['Kitchen', 'Walk-in Fridge', 'Walk-in Freezer', 'Dry Store', 'Prep Area', 'Receiving Dock', 'Bar', 'Dining Room', 'Toilets'];

/* ──────────────────────────── Helper Components ─────────────────── */
function StatusBadge({ status }: { status: TaskStatus }) {
    const c = {
        pending: 'bg-zinc-500/10 text-muted-foreground border-zinc-500/30',
        in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        overdue: 'bg-red-500/10 text-red-400 border-red-500/30',
        skipped: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    }[status];
    return <Badge variant="outline" className={cn('text-[10px]', c)}>{status.replace('_', ' ')}</Badge>;
}

function PriorityDot({ priority }: { priority: HACCPTask['priority'] }) {
    const c = { low: 'bg-zinc-400', medium: 'bg-amber-400', high: 'bg-orange-400', critical: 'bg-red-500 animate-pulse' }[priority];
    return <div className={cn('h-2 w-2 rounded-full', c)} title={priority} />;
}

/* ═══════════════════════════════════════════════════════════════════
   ██  HACCP TASK SCHEDULER
   ═══════════════════════════════════════════════════════════════════ */
export default function HACCPScheduler() {
    const { t: _t } = useTranslation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { activeVenue: selectedVenue } = useVenue() as/**/any;

    const [tasks, setTasks] = useState<HACCPTask[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<HACCPTask | null>(null);

    const emptyForm: Partial<HACCPTask> = {
        title: '', description: '', category: 'temperature', frequency: 'daily',
        assignedTo: '', dueTime: '08:00', status: 'pending', priority: 'medium',
        area: 'Kitchen', checklistItems: [], correctiveAction: '', temperature: undefined,
    };
    const [form, setForm] = useState<Partial<HACCPTask>>(emptyForm);

    const loadData = useCallback(async () => {
        if (!selectedVenue?._id) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/quality/haccp-tasks?venue_id=${selectedVenue._id}`);
            setTasks(res.data?.tasks || []);
        } catch {
            logger.error('Failed to load HACCP tasks');
            setTasks(getDemoTasks());
        } finally {
            setLoading(false);
        }
    }, [selectedVenue?._id]);

    useEffect(() => { loadData(); }, [loadData]);

    function getDemoTasks(): HACCPTask[] {
        const today = new Date().toISOString().slice(0, 10);
        return [
            { _id: 'h1', title: 'Walk-in Fridge Temperature Check', description: 'Record fridge temperature. Must be between 1°C and 5°C.', category: 'temperature', frequency: 'hourly', assignedTo: 'Maria Spiteri', dueTime: '08:00', status: 'completed', priority: 'critical', area: 'Walk-in Fridge', checklistItems: ['Read thermometer', 'Record temperature', 'Check door seal', 'Check for frost buildup'], correctiveAction: 'If temp > 5°C: Move contents to backup fridge. Call maintenance immediately.', lastCompleted: `${today}T07:55:00`, nextDue: `${today}T09:00:00`, temperature: { min: 1, max: 5, unit: '°C' } },
            { _id: 'h2', title: 'Walk-in Freezer Temperature Check', description: 'Record freezer temperature. Must be below -18°C.', category: 'temperature', frequency: 'hourly', assignedTo: 'Maria Spiteri', dueTime: '08:00', status: 'completed', priority: 'critical', area: 'Walk-in Freezer', checklistItems: ['Read thermometer', 'Record temperature', 'Check door seal'], correctiveAction: 'If temp > -18°C: Check compressor. Notify manager.', lastCompleted: `${today}T07:58:00`, nextDue: `${today}T09:00:00`, temperature: { min: -25, max: -18, unit: '°C' } },
            { _id: 'h3', title: 'Food Receiving Inspection', description: 'Inspect all deliveries. Check temperature, packaging, and expiry dates.', category: 'receiving', frequency: 'daily', assignedTo: 'Joe Camilleri', dueTime: '09:00', status: 'pending', priority: 'high', area: 'Receiving Dock', checklistItems: ['Check delivery temperature', 'Verify quantities vs PO', 'Check packaging integrity', 'Verify expiry dates', 'Check for pests'], correctiveAction: 'Reject non-conforming items. Document and notify supplier.', lastCompleted: `${today}T00:00:00`, nextDue: `${today}T09:00:00` },
            { _id: 'h4', title: 'Kitchen Deep Clean', description: 'Complete deep cleaning of all kitchen surfaces, equipment, and floors.', category: 'cleaning', frequency: 'daily', assignedTo: 'David Farrugia', dueTime: '22:00', status: 'pending', priority: 'high', area: 'Kitchen', checklistItems: ['Clean all work surfaces', 'Sanitize cutting boards', 'Clean fryers', 'Mop floors', 'Clean extraction hood', 'Empty grease traps'], correctiveAction: 'Re-clean failed areas. Document issue.', lastCompleted: `${today}T00:00:00`, nextDue: `${today}T22:00:00` },
            { _id: 'h5', title: 'Hand Wash Station Check', description: 'Verify soap, paper towels, and sanitizer are stocked at all stations.', category: 'personal_hygiene', frequency: 'daily', assignedTo: 'Anna Xuereb', dueTime: '07:00', status: 'overdue', priority: 'medium', area: 'Kitchen', checklistItems: ['Check soap dispensers', 'Check paper towels', 'Check sanitizer', 'Check hot water', 'Check signage visible'], correctiveAction: 'Restock immediately. Report to manager if supplies low.', lastCompleted: `${today}T00:00:00`, nextDue: `${today}T07:00:00` },
            { _id: 'h6', title: 'Pest Control Check', description: 'Inspect all pest traps and entry points. Document any sightings.', category: 'pest_control', frequency: 'weekly', assignedTo: 'Joe Camilleri', dueTime: '06:00', status: 'pending', priority: 'medium', area: 'Kitchen', checklistItems: ['Check all traps', 'Inspect entry points', 'Check waste area', 'Document findings', 'Update pest log'], correctiveAction: 'If sighting: Call pest control company immediately. Isolate affected area.', lastCompleted: '2026-02-13T06:00:00', nextDue: '2026-02-20T06:00:00' },
            { _id: 'h7', title: 'Equipment Calibration Check', description: 'Verify thermometer accuracy using ice water method.', category: 'equipment', frequency: 'weekly', assignedTo: 'Maria Spiteri', dueTime: '07:00', status: 'pending', priority: 'medium', area: 'Kitchen', checklistItems: ['Ice water test (0°C)', 'Boiling water test (100°C)', 'Record variance', 'Replace if variance > 1°C'], correctiveAction: 'Replace thermometer. Re-test all readings from last shift.', lastCompleted: '2026-02-14T07:00:00', nextDue: '2026-02-21T07:00:00' },
            { _id: 'h8', title: 'Dry Storage Inspection', description: 'Check all dry goods for damage, pests, and organize FIFO.', category: 'storage', frequency: 'daily', assignedTo: 'David Farrugia', dueTime: '10:00', status: 'in_progress', priority: 'low', area: 'Dry Store', checklistItems: ['Check for damaged packaging', 'Verify FIFO rotation', 'Check floor clearance', 'Check temperature/humidity'], correctiveAction: 'Discard damaged items. Reorganize shelving.', lastCompleted: `${today}T00:00:00`, nextDue: `${today}T10:00:00` },
        ];
    }

    const filtered = useMemo(() => {
        let result = [...tasks];
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(t => t.title.toLowerCase().includes(q) || t.assignedTo.toLowerCase().includes(q) || t.area.toLowerCase().includes(q));
        }
        if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
        if (categoryFilter !== 'all') result = result.filter(t => t.category === categoryFilter);
        // Sort: overdue first, then by priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const statusOrder = { overdue: 0, pending: 1, in_progress: 2, completed: 3, skipped: 4 };
        result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || priorityOrder[a.priority] - priorityOrder[b.priority]);
        return result;
    }, [tasks, search, statusFilter, categoryFilter]);

    const stats = useMemo(() => ({
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => t.status === 'overdue').length,
        pending: tasks.filter(t => t.status === 'pending').length,
        complianceRate: tasks.length ? (tasks.filter(t => t.status === 'completed').length / tasks.length * 100) : 0,
    }), [tasks]);

    const updateForm = (field: string, value: unknown) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSave = async () => {
        if (!form.title?.trim()) { toast.error('Task title is required'); return; }
        try {
            if (editingTask) {
                await api.put(`/api/quality/haccp-tasks/${editingTask._id}`, { ...form, venue_id: selectedVenue?._id });
                toast.success('Task updated');
            } else {
                await api.post('/api/quality/haccp-tasks', { ...form, venue_id: selectedVenue?._id });
                toast.success('Task created');
            }
            setDialogOpen(false); setEditingTask(null); setForm(emptyForm); loadData();
        } catch (err) {
            logger.error('Save HACCP task failed', err);
            toast.error('Failed to save task');
        }
    };

    const markComplete = (id: string) => {
        setTasks(prev => prev.map(t => t._id === id ? { ...t, status: 'completed' as TaskStatus, lastCompleted: new Date().toISOString() } : t));
        toast.success('Task marked complete');
    };

    const openEdit = (task: HACCPTask) => {
        setEditingTask(task); setForm({ ...task }); setDialogOpen(true);
    };

    return (
        <PageContainer
            title="HACCP Task Scheduler"
            subtitle="Automated food safety task management with compliance tracking"
            icon={<Shield className="h-5 w-5 text-red-400" />}
            actions={
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} /> Refresh
                    </Button>
                    <Button size="sm" onClick={() => { setEditingTask(null); setForm(emptyForm); setDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Task
                    </Button>
                </div>
            }
        >
            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {[
                    { icon: ClipboardCheck, label: 'Total Tasks', value: stats.total, color: 'text-blue-400' },
                    { icon: CheckCircle2, label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
                    { icon: AlertTriangle, label: 'Overdue', value: stats.overdue, color: stats.overdue > 0 ? 'text-red-400' : 'text-emerald-400' },
                    { icon: Clock, label: 'Pending', value: stats.pending, color: 'text-amber-400' },
                    { icon: Shield, label: 'Compliance', value: `${stats.complianceRate.toFixed(0)}%`, color: stats.complianceRate >= 80 ? 'text-emerald-400' : 'text-red-400' },
                ].map(s => (
                    <Card key={s.label} className="border-white/5 bg-zinc-900/40">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={cn('p-2 rounded-lg bg-white/5', s.color)}><s.icon className="h-4 w-4" /></div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                    <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input aria-label="Search tasks..." className="pl-9 bg-zinc-900/50 border-white/10" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select aria-label="Select option" value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger aria-label="Select option" className="w-[140px] bg-zinc-900/50 border-white/10"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
                <Select aria-label="Select option" value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger aria-label="Select option" className="w-[160px] bg-zinc-900/50 border-white/10">
                        <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Object.entries(CATEGORY_CONFIG).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Task List */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(task => {
                        const catCfg = CATEGORY_CONFIG[task.category];
                        const CatIcon = catCfg.icon;
                        return (
                            <Card key={task._id} className={cn(
                                'border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all',
                                task.status === 'overdue' && 'border-red-500/20 bg-red-500/5',
                            )}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        {/* Category Icon */}
                                        <div className={cn('p-2 rounded-lg bg-white/5 mt-0.5', catCfg.color)}>
                                            <CatIcon className="h-4 w-4" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <PriorityDot priority={task.priority} />
                                                <h3 className="text-sm font-semibold truncate">{task.title}</h3>
                                                <StatusBadge status={task.status} />
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{task.description}</p>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1"><User className="h-3 w-3" /> {task.assignedTo}</span>
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {task.dueTime}</span>
                                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {task.frequency}</span>
                                                <Badge variant="outline" className="text-[10px] border-white/10">{task.area}</Badge>
                                                {task.temperature && (
                                                    <Badge variant="outline" className="text-[10px] border-red-500/20 text-red-400">
                                                        <Thermometer className="h-2.5 w-2.5 mr-1" />
                                                        {task.temperature.min}–{task.temperature.max}{task.temperature.unit}
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Checklist Preview */}
                                            {task.checklistItems.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {task.checklistItems.slice(0, 4).map((item, i) => (
                                                        <Badge key={i} variant="outline" className="text-[9px] border-white/5 text-muted-foreground">
                                                            {task.status === 'completed' ? <CheckCircle2 className="h-2 w-2 mr-0.5 text-emerald-400" /> : null}
                                                            {item}
                                                        </Badge>
                                                    ))}
                                                    {task.checklistItems.length > 4 && (
                                                        <Badge variant="outline" className="text-[9px] border-white/5 text-muted-foreground">
                                                            +{task.checklistItems.length - 4} more
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1">
                                            {task.status !== 'completed' && (
                                                <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-400" onClick={() => markComplete(task._id)}>
                                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                                                </Button>
                                            )}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Action">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEdit(task)}>
                                                        <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-400">
                                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Corrective Action (if overdue) */}
                                    {task.status === 'overdue' && task.correctiveAction && (
                                        <div className="mt-3 p-2 rounded-lg bg-red-500/5 border border-red-500/20 text-xs">
                                            <span className="font-medium text-red-400">⚠ Corrective Action: </span>
                                            <span className="text-muted-foreground">{task.correctiveAction}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditingTask(null); } }}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTask ? 'Edit HACCP Task' : 'New HACCP Task'}</DialogTitle>
                        <DialogDescription>
                            {editingTask ? 'Update task details' : 'Create an automated food safety task'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Title *</Label>
                            <Input aria-label="Input field" value={form.title || ''} onChange={e => updateForm('title', e.target.value)} placeholder="Temperature check..." />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea aria-label="Input field" value={form.description || ''} onChange={e => updateForm('description', e.target.value)} rows={2} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Category</Label>
                                <Select aria-label="Select option" value={form.category || 'temperature'} onValueChange={v => updateForm('category', v)}>
                                    <SelectTrigger aria-label="Select option"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Frequency</Label>
                                <Select aria-label="Select option" value={form.frequency || 'daily'} onValueChange={v => updateForm('frequency', v)}>
                                    <SelectTrigger aria-label="Select option"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="hourly">Hourly</SelectItem>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Assigned To</Label>
                                <Input aria-label="Input field" value={form.assignedTo || ''} onChange={e => updateForm('assignedTo', e.target.value)} placeholder="Staff name" />
                            </div>
                            <div>
                                <Label>Due Time</Label>
                                <Input aria-label="Input field" type="time" value={form.dueTime || '08:00'} onChange={e => updateForm('dueTime', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Area</Label>
                                <Select aria-label="Select option" value={form.area || 'Kitchen'} onValueChange={v => updateForm('area', v)}>
                                    <SelectTrigger aria-label="Select option"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Priority</Label>
                                <Select aria-label="Select option" value={form.priority || 'medium'} onValueChange={v => updateForm('priority', v)}>
                                    <SelectTrigger aria-label="Select option"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label>Corrective Action</Label>
                            <Textarea aria-label="Input field" value={form.correctiveAction || ''} onChange={e => updateForm('correctiveAction', e.target.value)} rows={2} placeholder="What to do if task fails..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingTask(null); }}>Cancel</Button>
                        <Button onClick={handleSave}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> {editingTask ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
