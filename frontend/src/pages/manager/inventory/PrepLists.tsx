/**
 * PrepLists — Auto-generated mise-en-place from production plans
 * Apicbase parity: prep task lists, ingredient quantities, staff assignment, batch grouping
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '@/components/ui/tabs';
import PageContainer from '@/layouts/PageContainer';
import { cn } from '@/lib/utils';
import {
AlertTriangle,
CheckCircle2,
ChefHat,
Clock,
Download,
Flame,
Package,
Play,
Printer,
RefreshCw,
Search,
Snowflake,
Timer,
User,
Users,
Utensils
} from 'lucide-react';
import React,{ useCallback,useMemo,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/* ────────────────────── Types ────────────────── */
interface PrepTask {
    _id: string;
    recipeName: string;
    taskDescription: string;
    ingredients: { name: string; quantity: number; unit: string }[];
    batchSize: number;
    batchUnit: string;
    station: 'hot' | 'cold' | 'pastry' | 'prep' | 'garde-manger';
    priority: 'critical' | 'high' | 'normal' | 'low';
    estimatedMinutes: number;
    assignedTo: string;
    status: 'pending' | 'in-progress' | 'done' | 'skipped';
    dueTime: string;
    notes?: string;
    linkedProductionPlan: string;
}

/* ──────────────────── Demo Data ──────────────── */
const STATIONS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    hot: { label: 'Hot Station', icon: Flame, color: 'text-orange-400' },
    cold: { label: 'Cold Station', icon: Snowflake, color: 'text-blue-400' },
    pastry: { label: 'Pastry', icon: ChefHat, color: 'text-pink-400' },
    prep: { label: 'Prep Area', icon: Utensils, color: 'text-emerald-400' },
    'garde-manger': { label: 'Garde Manger', icon: Package, color: 'text-purple-400' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; border: string }> = {
    critical: { label: 'Critical', color: 'text-red-400', border: 'border-red-500/40' },
    high: { label: 'High', color: 'text-amber-400', border: 'border-amber-500/40' },
    normal: { label: 'Normal', color: 'text-blue-400', border: 'border-blue-500/40' },
    low: { label: 'Low', color: 'text-zinc-400', border: 'border-zinc-500/40' },
};

const PREP_TASKS: PrepTask[] = [
    {
        _id: 'pt1', recipeName: 'Tomato Sauce (Base)', taskDescription: 'Dice onions, crush garlic, blanch & peel tomatoes. Cook down for 45 mins.',
        ingredients: [{ name: 'San Marzano Tomatoes', quantity: 5, unit: 'kg' }, { name: 'White Onions', quantity: 1.5, unit: 'kg' }, { name: 'Garlic Cloves', quantity: 200, unit: 'g' }, { name: 'Olive Oil', quantity: 300, unit: 'ml' }, { name: 'Fresh Basil', quantity: 80, unit: 'g' }],
        batchSize: 8, batchUnit: 'L', station: 'hot', priority: 'critical', estimatedMinutes: 60,
        assignedTo: 'Chef Marco', status: 'in-progress', dueTime: '10:00', linkedProductionPlan: 'PP-2025-0220',
    },
    {
        _id: 'pt2', recipeName: 'Caesar Dressing', taskDescription: 'Blend anchovy paste, parmesan, garlic, lemon juice, dijon. Emulsify with olive oil.',
        ingredients: [{ name: 'Anchovy Paste', quantity: 100, unit: 'g' }, { name: 'Parmesan', quantity: 200, unit: 'g' }, { name: 'Egg Yolks', quantity: 8, unit: 'pcs' }, { name: 'Lemon Juice', quantity: 150, unit: 'ml' }, { name: 'Olive Oil', quantity: 500, unit: 'ml' }],
        batchSize: 2, batchUnit: 'L', station: 'cold', priority: 'high', estimatedMinutes: 20,
        assignedTo: 'Maria C.', status: 'pending', dueTime: '09:30', linkedProductionPlan: 'PP-2025-0220',
    },
    {
        _id: 'pt3', recipeName: 'Pizza Dough', taskDescription: 'Mix flour, yeast, salt, water. Knead 10 mins. Proof 2 hrs. Portion into 250g balls.',
        ingredients: [{ name: 'Tipo 00 Flour', quantity: 10, unit: 'kg' }, { name: 'Fresh Yeast', quantity: 60, unit: 'g' }, { name: 'Salt', quantity: 200, unit: 'g' }, { name: 'Water (warm)', quantity: 6.5, unit: 'L' }, { name: 'Olive Oil', quantity: 200, unit: 'ml' }],
        batchSize: 40, batchUnit: 'portions', station: 'prep', priority: 'critical', estimatedMinutes: 150,
        assignedTo: 'John D.', status: 'pending', dueTime: '07:00', linkedProductionPlan: 'PP-2025-0220',
    },
    {
        _id: 'pt4', recipeName: 'Tiramisu', taskDescription: 'Whip mascarpone with eggs & sugar. Layer with espresso-soaked ladyfingers. Chill 4hrs.',
        ingredients: [{ name: 'Mascarpone', quantity: 2, unit: 'kg' }, { name: 'Eggs', quantity: 12, unit: 'pcs' }, { name: 'Sugar', quantity: 400, unit: 'g' }, { name: 'Ladyfingers', quantity: 3, unit: 'packs' }, { name: 'Espresso', quantity: 1, unit: 'L' }],
        batchSize: 24, batchUnit: 'portions', station: 'pastry', priority: 'high', estimatedMinutes: 45,
        assignedTo: 'Anna P.', status: 'done', dueTime: '08:00', linkedProductionPlan: 'PP-2025-0220',
    },
    {
        _id: 'pt5', recipeName: 'Beef Stock', taskDescription: 'Roast bones 45min. Simmer with mirepoix, bouquet garni for 8 hours. Strain & reduce.',
        ingredients: [{ name: 'Beef Bones', quantity: 5, unit: 'kg' }, { name: 'Carrots', quantity: 500, unit: 'g' }, { name: 'Celery', quantity: 300, unit: 'g' }, { name: 'Onions', quantity: 500, unit: 'g' }, { name: 'Tomato Paste', quantity: 100, unit: 'g' }],
        batchSize: 10, batchUnit: 'L', station: 'hot', priority: 'normal', estimatedMinutes: 540,
        assignedTo: 'Chef Marco', status: 'pending', dueTime: '06:00', linkedProductionPlan: 'PP-2025-0220',
    },
    {
        _id: 'pt6', recipeName: 'Herb Butter', taskDescription: 'Soften butter. Mix in chopped parsley, chives, garlic, lemon zest. Roll in cling film. Chill.',
        ingredients: [{ name: 'Butter', quantity: 2, unit: 'kg' }, { name: 'Fresh Parsley', quantity: 100, unit: 'g' }, { name: 'Chives', quantity: 50, unit: 'g' }, { name: 'Garlic', quantity: 40, unit: 'g' }, { name: 'Lemon Zest', quantity: 20, unit: 'g' }],
        batchSize: 2, batchUnit: 'kg', station: 'garde-manger', priority: 'low', estimatedMinutes: 15,
        assignedTo: 'Maria C.', status: 'done', dueTime: '09:00', linkedProductionPlan: 'PP-2025-0220',
    },
    {
        _id: 'pt7', recipeName: 'Marinated Chicken', taskDescription: 'Butterfly whole chicken. Marinate in yogurt, lemon, oregano, paprika. Refrigerate 12hrs.',
        ingredients: [{ name: 'Whole Chicken', quantity: 10, unit: 'pcs' }, { name: 'Greek Yogurt', quantity: 1.5, unit: 'kg' }, { name: 'Lemon Juice', quantity: 300, unit: 'ml' }, { name: 'Paprika', quantity: 60, unit: 'g' }, { name: 'Dried Oregano', quantity: 40, unit: 'g' }],
        batchSize: 10, batchUnit: 'chickens', station: 'cold', priority: 'high', estimatedMinutes: 30,
        assignedTo: 'John D.', status: 'pending', dueTime: '14:00', linkedProductionPlan: 'PP-2025-0220',
    },
    {
        _id: 'pt8', recipeName: 'Chocolate Ganache', taskDescription: 'Heat cream to simmer. Pour over chopped dark chocolate. Stir until smooth. Cool to room temp.',
        ingredients: [{ name: 'Dark Chocolate 70%', quantity: 1, unit: 'kg' }, { name: 'Heavy Cream', quantity: 1, unit: 'L' }, { name: 'Butter', quantity: 50, unit: 'g' }],
        batchSize: 2, batchUnit: 'kg', station: 'pastry', priority: 'normal', estimatedMinutes: 20,
        assignedTo: 'Anna P.', status: 'skipped', dueTime: '11:00', linkedProductionPlan: 'PP-2025-0220',
        notes: 'Skipped — stock sufficient from yesterday',
    },
];

const STAFF = ['Chef Marco', 'Maria C.', 'John D.', 'Anna P.'];

/* ═══════════════════════════════════════════════════════════════════
   ██  PREP LISTS
   ═══════════════════════════════════════════════════════════════════ */
export default function PrepLists() {
    const { t: _t } = useTranslation();

    /* ── State ── */
    const [tasks, setTasks] = useState<PrepTask[]>(PREP_TASKS);
    const [stationFilter, setStationFilter] = useState('all');
    const [staffFilter, setStaffFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('tasks');

    /* ── Filtered Tasks ── */
    const filtered = useMemo(() => {
        return tasks.filter(t => {
            if (stationFilter !== 'all' && t.station !== stationFilter) return false;
            if (staffFilter !== 'all' && t.assignedTo !== staffFilter) return false;
            if (statusFilter !== 'all' && t.status !== statusFilter) return false;
            if (search) return t.recipeName.toLowerCase().includes(search.toLowerCase());
            return true;
        });
    }, [tasks, stationFilter, staffFilter, statusFilter, search]);

    /* ── Toggle Status ── */
    const toggleStatus = useCallback((id: string) => {
        setTasks(prev => prev.map(t => {
            if (t._id !== id) return t;
            const next = t.status === 'pending' ? 'in-progress' : t.status === 'in-progress' ? 'done' : t.status;
            if (next !== t.status) toast.success(`"${t.recipeName}" → ${next}`);
            return { ...t, status: next };
        }));
    }, []);

    /* ── KPIs ── */
    const kpis = useMemo(() => {
        const total = tasks.length;
        const done = tasks.filter(t => t.status === 'done').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        const pending = tasks.filter(t => t.status === 'pending').length;
        const totalMinutes = tasks.filter(t => t.status !== 'done' && t.status !== 'skipped').reduce((s, t) => s + t.estimatedMinutes, 0);
        const completion = total > 0 ? Math.round(((done) / total) * 100) : 0;
        return { total, done, inProgress, pending, totalMinutes, completion };
    }, [tasks]);

    /* ── Station Summary ── */
    const stationSummary = useMemo(() => {
        const map: Record<string, { total: number; done: number; minutes: number }> = {};
        for (const t of tasks) {
            if (!map[t.station]) map[t.station] = { total: 0, done: 0, minutes: 0 };
            map[t.station].total++;
            if (t.status === 'done') map[t.station].done++;
            if (t.status !== 'done' && t.status !== 'skipped') map[t.station].minutes += t.estimatedMinutes;
        }
        return map;
    }, [tasks]);

    const fmtTime = (mins: number) => {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    return (
        <PageContainer
            title="Prep Lists"
            description="Auto-generated mise-en-place tasks from production plans"
            actions={
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toast.success('Refreshed from Production Plan PP-2025-0220')}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Sync Plan
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.info('Printing prep list...')}>
                        <Printer className="h-4 w-4 mr-1" /> Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.info('Exported to CSV')}>
                        <Download className="h-4 w-4 mr-1" /> Export
                    </Button>
                </div>
            }
        >
            {/* ── KPI Strip ── */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                {[
                    { label: 'Total Tasks', value: kpis.total, color: 'text-blue-400' },
                    { label: 'Completed', value: kpis.done, color: 'text-emerald-400' },
                    { label: 'In Progress', value: kpis.inProgress, color: 'text-amber-400' },
                    { label: 'Pending', value: kpis.pending, color: 'text-zinc-400' },
                    { label: 'Est. Time Left', value: fmtTime(kpis.totalMinutes), color: 'text-purple-400' },
                    { label: 'Completion', value: `${kpis.completion}%`, color: kpis.completion >= 75 ? 'text-emerald-400' : kpis.completion >= 50 ? 'text-amber-400' : 'text-red-400' },
                ].map(k => (
                    <Card key={k.label} className="border-white/5 bg-zinc-900/40">
                        <CardContent className="p-3">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
                            <p className={cn('text-xl font-bold mt-0.5', k.color)}>{k.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Progress Bar ── */}
            <div className="mb-6">
                <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Overall Progress — Plan PP-2025-0220</span>
                    <span className="font-medium">{kpis.completion}%</span>
                </div>
                <Progress value={kpis.completion} className="h-2" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-zinc-900/60 border border-white/5 mb-4">
                    <TabsTrigger value="tasks" className="text-xs">Task List</TabsTrigger>
                    <TabsTrigger value="by-station" className="text-xs">By Station</TabsTrigger>
                    <TabsTrigger value="by-staff" className="text-xs">By Staff</TabsTrigger>
                </TabsList>

                {/* ═══ TAB: TASK LIST ═══ */}
                <TabsContent value="tasks">
                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input aria-label="Search recipes..." className="pl-9 h-8 text-xs" placeholder="Search recipes..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <Select aria-label="Select option" value={stationFilter} onValueChange={setStationFilter}>
                            <SelectTrigger aria-label="Select option" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stations</SelectItem>
                                {Object.entries(STATIONS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select aria-label="Select option" value={staffFilter} onValueChange={setStaffFilter}>
                            <SelectTrigger aria-label="Select option" className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Staff</SelectItem>
                                {STAFF.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select aria-label="Select option" value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger aria-label="Select option" className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                                <SelectItem value="skipped">Skipped</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Task Cards */}
                    <div className="space-y-3">
                        {filtered.map(task => {
                            const stationCfg = STATIONS[task.station];
                            const priorityCfg = PRIORITY_CONFIG[task.priority];
                            const StationIcon = stationCfg.icon;
                            const isDone = task.status === 'done';
                            const isSkipped = task.status === 'skipped';

                            return (
                                <Card key={task._id} className={cn('border-white/5 bg-zinc-900/40 transition-all', isDone && 'opacity-60', priorityCfg.border, 'border-l-2')}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            {/* Checkbox */}
                                            <div className="pt-0.5">
                                                <Checkbox
                                                    checked={isDone}
                                                    disabled={isDone || isSkipped}
                                                    onCheckedChange={() => toggleStatus(task._id)}
                                                />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className={cn('text-sm font-medium', isDone && 'line-through')}>{task.recipeName}</p>
                                                    <Badge variant="outline" className={cn('text-[9px]', priorityCfg.color)}>{priorityCfg.label}</Badge>
                                                    <Badge variant="outline" className={cn('text-[9px]', stationCfg.color)}>
                                                        <StationIcon className="h-2.5 w-2.5 mr-0.5" /> {stationCfg.label}
                                                    </Badge>
                                                    <Badge variant="outline" className={cn('text-[9px]',
                                                        task.status === 'done' ? 'text-emerald-400 border-emerald-500/30' :
                                                            task.status === 'in-progress' ? 'text-amber-400 border-amber-500/30' :
                                                                task.status === 'skipped' ? 'text-zinc-500 border-zinc-500/30' :
                                                                    'text-zinc-400 border-zinc-500/30'
                                                    )}>
                                                        {task.status}
                                                    </Badge>
                                                </div>

                                                <p className="text-xs text-muted-foreground mb-2">{task.taskDescription}</p>

                                                {task.notes && (
                                                    <p className="text-xs text-amber-400/80 mb-2 flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3" /> {task.notes}
                                                    </p>
                                                )}

                                                {/* Ingredients */}
                                                <div className="flex flex-wrap gap-1 mb-2">
                                                    {task.ingredients.map((ing, i) => (
                                                        <Badge key={i} variant="secondary" className="text-[9px]">
                                                            {ing.quantity}{ing.unit} {ing.name}
                                                        </Badge>
                                                    ))}
                                                </div>

                                                {/* Meta */}
                                                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                                                    <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {task.batchSize} {task.batchUnit}</span>
                                                    <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {fmtTime(task.estimatedMinutes)}</span>
                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due {task.dueTime}</span>
                                                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {task.assignedTo}</span>
                                                </div>
                                            </div>

                                            {/* Start Button */}
                                            {task.status === 'pending' && (
                                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleStatus(task._id)}>
                                                    <Play className="h-3 w-3 mr-1" /> Start
                                                </Button>
                                            )}
                                            {task.status === 'in-progress' && (
                                                <Button variant="default" size="sm" className="h-7 text-xs" onClick={() => toggleStatus(task._id)}>
                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* ═══ TAB: BY STATION ═══ */}
                <TabsContent value="by-station">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Object.entries(STATIONS).map(([key, cfg]) => {
                            const Icon = cfg.icon;
                            const summary = stationSummary[key] || { total: 0, done: 0, minutes: 0 };
                            const pct = summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;
                            const stationTasks = tasks.filter(t => t.station === key);

                            return (
                                <Card key={key} className="border-white/5 bg-zinc-900/40">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Icon className={cn('h-4 w-4', cfg.color)} />
                                            {cfg.label}
                                            <Badge variant="outline" className="ml-auto text-[9px]">{summary.done}/{summary.total}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Progress value={pct} className="h-1.5 mb-3" />
                                        <div className="space-y-1.5">
                                            {stationTasks.map(t => (
                                                <div key={t._id} className="flex items-center gap-2 text-xs">
                                                    <Checkbox checked={t.status === 'done'} disabled className="h-3.5 w-3.5" />
                                                    <span className={cn(t.status === 'done' && 'line-through text-muted-foreground')}>{t.recipeName}</span>
                                                    <span className="ml-auto text-[10px] text-muted-foreground">{fmtTime(t.estimatedMinutes)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-2">Est. remaining: {fmtTime(summary.minutes)}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* ═══ TAB: BY STAFF ═══ */}
                <TabsContent value="by-staff">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {STAFF.map(name => {
                            const staffTasks = tasks.filter(t => t.assignedTo === name);
                            const done = staffTasks.filter(t => t.status === 'done').length;
                            const remaining = staffTasks.filter(t => t.status !== 'done' && t.status !== 'skipped');
                            const minsLeft = remaining.reduce((s, t) => s + t.estimatedMinutes, 0);

                            return (
                                <Card key={name} className="border-white/5 bg-zinc-900/40">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Users className="h-4 w-4 text-blue-400" />
                                            {name}
                                            <Badge variant="outline" className="ml-auto text-[9px]">{done}/{staffTasks.length} done</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-1.5">
                                            {staffTasks.map(t => (
                                                <div key={t._id} className="flex items-center gap-2 text-xs">
                                                    <Badge variant="outline" className={cn('text-[8px] w-14 justify-center', PRIORITY_CONFIG[t.priority].color)}>
                                                        {PRIORITY_CONFIG[t.priority].label}
                                                    </Badge>
                                                    <span className={cn(t.status === 'done' && 'line-through text-muted-foreground')}>{t.recipeName}</span>
                                                    <Badge variant="outline" className={cn('ml-auto text-[8px]', STATIONS[t.station].color)}>
                                                        {STATIONS[t.station].label}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-2">Workload remaining: {fmtTime(minsLeft)}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>
        </PageContainer>
    );
}
