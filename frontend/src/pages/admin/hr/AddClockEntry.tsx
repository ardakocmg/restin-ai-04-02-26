import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    Clock, Calendar, User, MapPin, ArrowLeft, Send,
    CheckCircle2, AlertCircle, Loader2, ChevronDown, Building2
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────── */
interface WorkArea {
    id: string;
    name: string;
    code: string;
}

interface Employee {
    id: string;
    full_name?: string;
    name?: string;
    employee_code?: string;
    department?: string;
    occupation?: string;
}

/* ── Component ──────────────────────────────────────── */
export default function AddClockEntry() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeVenue } = useVenue();

    const isManager = ['OWNER', 'MANAGER', 'PRODUCT_OWNER'].includes(
        (user?.role || '').toUpperCase()
    );

    // Form state
    const [date, setDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [clockIn, setClockIn] = useState('09:00');
    const [clockOut, setClockOut] = useState('17:00');
    const [workArea, setWorkArea] = useState('');
    const [costCentre, setCostCentre] = useState('');
    const [reason, setReason] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

    // Data
    const [workAreas, setWorkAreas] = useState<WorkArea[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    // UI state
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitResult, setSubmitResult] = useState<{
        requires_approval: boolean;
        message: string;
    } | null>(null);

    // Calculate hours
    const calcHours = () => {
        try {
            const [ih, im] = clockIn.split(':').map(Number);
            const [oh, om] = clockOut.split(':').map(Number);
            const diff = (oh * 60 + om) - (ih * 60 + im);
            return diff > 0 ? (diff / 60).toFixed(1) : '0.0';
        } catch {
            return '0.0';
        }
    };

    // Fetch work areas
    useEffect(() => {
        const fetchWorkAreas = async () => {
            try {
                const res = await api.get('/api/clocking/work-areas');
                setWorkAreas(res.data || []);
                if (res.data?.length > 0 && !workArea) {
                    setWorkArea(res.data[0].code);
                }
            } catch (err) {
                logger.error('Failed to fetch work areas', err);
                // Use defaults
                setWorkAreas([
                    { id: 'FOH', name: 'Front of House', code: 'FOH' },
                    { id: 'BOH', name: 'Back of House', code: 'BOH' },
                    { id: 'BAR', name: 'Bar', code: 'BAR' },
                    { id: 'KITCHEN', name: 'Kitchen', code: 'KITCHEN' },
                    { id: 'ADMIN', name: 'Administration', code: 'ADMIN' },
                ]);
                setWorkArea('FOH');
            }
        };
        fetchWorkAreas();
    }, []);

    // Fetch employees if manager
    useEffect(() => {
        if (!isManager || !activeVenue?.id) return;
        const fetchEmployees = async () => {
            try {
                const res = await api.get(`/api/venues/${activeVenue.id}/hr/employees`);
                setEmployees(res.data || []);
            } catch (err) {
                logger.error('Failed to fetch employees', err);
            }
        };
        fetchEmployees();
    }, [isManager, activeVenue?.id]);

    // Submit
    const handleSubmit = async () => {
        if (!date || !clockIn || !clockOut) {
            toast.error('Please fill in date, clock in, and clock out times');
            return;
        }

        // Validate clock out > clock in
        const [ih, im] = clockIn.split(':').map(Number);
        const [oh, om] = clockOut.split(':').map(Number);
        if ((oh * 60 + om) <= (ih * 60 + im)) {
            toast.error('Clock out time must be after clock in time');
            return;
        }

        setSubmitting(true);
        try {
            const payload: Record<string, string | undefined> = {
                date,
                clock_in: clockIn,
                clock_out: clockOut,
                work_area: workArea || undefined,
                cost_centre: costCentre || workArea || undefined,
                reason: reason || undefined,
            };

            if (isManager && selectedEmployeeId) {
                payload.employee_id = selectedEmployeeId;
            }

            const res = await api.post('/api/clocking/add-entry', payload);
            setSubmitResult(res.data);
            setSubmitted(true);

            if (res.data.requires_approval) {
                toast.success('Clock entry sent for approval');
            } else {
                toast.success('Clock entry added successfully');
            }
        } catch (err: unknown) {
            const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to add clock entry';
            toast.error(errorMsg);
            logger.error('Failed to submit clock entry', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Success state
    if (submitted && submitResult) {
        return (
            <div className="p-6 bg-[#09090b] min-h-screen text-zinc-100 font-sans">
                <div className="max-w-lg mx-auto mt-16">
                    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                        <CardContent className="p-8 text-center">
                            <div className={cn(
                                "w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center",
                                submitResult.requires_approval
                                    ? "bg-amber-500/15 border border-amber-500/20"
                                    : "bg-emerald-500/15 border border-emerald-500/20"
                            )}>
                                {submitResult.requires_approval ? (
                                    <AlertCircle className="h-8 w-8 text-amber-400" />
                                ) : (
                                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                                )}
                            </div>

                            <h2 className="text-xl font-bold text-white mb-2">
                                {submitResult.requires_approval ? 'Sent for Approval' : 'Entry Added'}
                            </h2>
                            <p className="text-sm text-zinc-400 mb-8">
                                {submitResult.message}
                            </p>

                            <div className="flex gap-3 justify-center">
                                <Button
                                    onClick={() => {
                                        setSubmitted(false);
                                        setSubmitResult(null);
                                        setReason('');
                                    }}
                                    className="bg-blue-600 hover:bg-blue-500 text-white"
                                >
                                    Add Another Entry
                                </Button>
                                <Button
                                    onClick={() => navigate('/admin/hr/clocking')}
                                    variant="outline"
                                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                >
                                    Back to Clocking
                                </Button>
                                {submitResult.requires_approval && (
                                    <Button
                                        onClick={() => navigate('/admin/hr/approvals')}
                                        variant="outline"
                                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                    >
                                        View Approvals
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-[#09090b] min-h-screen text-zinc-100 font-sans">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/admin/hr/clocking')}
                    className="text-zinc-400 hover:text-white hover:bg-white/5"
                    title="Back to Clocking Data"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
                        Add Clock Entry
                    </h1>
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                        Manual time entry • {isManager ? 'HR Mode' : 'Self-Service'}
                    </p>
                </div>
            </div>

            <div className="max-w-2xl">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="border-b border-zinc-800/50">
                        <CardTitle className="text-base font-bold text-zinc-200 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-400" />
                            Clock Entry Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">

                        {/* Employee Selector (HR/Manager only) */}
                        {isManager && employees.length > 0 && (
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                    <User className="inline h-3 w-3 mr-1 mb-0.5" />
                                    Employee
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedEmployeeId}
                                        onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 outline-none transition-all"
                                    >
                                        <option value="">Myself ({user?.name || 'Current User'})</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.full_name || emp.name || emp.id}
                                                {emp.occupation ? ` — ${emp.occupation}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {/* Date Picker */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                <Calendar className="inline h-3 w-3 mr-1 mb-0.5" />
                                Work Date
                            </label>
                            <Input
                                type="date"
                                value={date}
                                max={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setDate(e.target.value)}
                                className="bg-zinc-800/50 border-zinc-700 text-zinc-200 h-12 text-sm [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.5]"
                            />
                        </div>

                        {/* Time Pickers Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                    Clock In
                                </label>
                                <Input
                                    type="time"
                                    value={clockIn}
                                    onChange={(e) => setClockIn(e.target.value)}
                                    className="bg-zinc-800/50 border-zinc-700 text-zinc-200 h-12 text-sm [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.5]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                    Clock Out
                                </label>
                                <Input
                                    type="time"
                                    value={clockOut}
                                    onChange={(e) => setClockOut(e.target.value)}
                                    className="bg-zinc-800/50 border-zinc-700 text-zinc-200 h-12 text-sm [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.5]"
                                />
                            </div>
                        </div>

                        {/* Duration preview */}
                        <div className="bg-zinc-800/30 rounded-lg border border-zinc-800 px-4 py-3 flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Duration</span>
                            <span className="text-lg font-black text-white tabular-nums">{calcHours()}h</span>
                        </div>

                        {/* Work Area */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                <MapPin className="inline h-3 w-3 mr-1 mb-0.5" />
                                Work Area
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {workAreas.map((area) => (
                                    <button
                                        key={area.code}
                                        type="button"
                                        onClick={() => {
                                            setWorkArea(area.code);
                                            setCostCentre(area.code);
                                        }}
                                        className={cn(
                                            "px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all text-center",
                                            workArea === area.code
                                                ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                                                : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                                        )}
                                    >
                                        {area.code}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Venue Display */}
                        {activeVenue && (
                            <div className="flex items-center gap-3 bg-zinc-800/30 rounded-lg border border-zinc-800 px-4 py-3">
                                <Building2 className="h-4 w-4 text-zinc-500" />
                                <div>
                                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Venue</div>
                                    <div className="text-sm font-bold text-zinc-200">{activeVenue.name}</div>
                                </div>
                            </div>
                        )}

                        {/* Reason */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                Reason for Manual Entry
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Forgot to clock in, system was down, working remotely..."
                                rows={3}
                                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 resize-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 outline-none transition-all"
                            />
                        </div>

                        {/* Info Banner */}
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg px-4 py-3">
                            <p className="text-xs text-amber-400/80 font-medium">
                                <AlertCircle className="inline h-3 w-3 mr-1 mb-0.5" />
                                {isManager
                                    ? 'As a manager, this entry may be auto-approved based on your venue settings.'
                                    : 'This entry will be sent to your manager for approval before it appears in the official records.'
                                }
                            </p>
                        </div>

                        {/* Submit */}
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || !date || !clockIn || !clockOut}
                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm uppercase tracking-widest disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Submit Clock Entry
                                </>
                            )}
                        </Button>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
