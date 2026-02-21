import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    Clock,
    UserX,
    CheckCircle2,
    ArrowRight,
    Search,
    Filter,
    Calendar,
    ChevronLeft,
    MoreHorizontal,
    Mail,
    Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HRExceptions() {
    const navigate = useNavigate();

    const exceptions = [
        { id: 1, name: "DONALD AGIUS", type: "Missed Clock-out", date: "28/01/2026", time: "17:00 (Expected)", status: "Pending" },
        { id: 2, name: "MARAM BEN ARBIA", type: "Late Arrival", date: "28/01/2026", time: "09:45 (Actual)", status: "Flagged" },
        { id: 3, name: "BRANKO ANASTASOV", type: "Early Departure", date: "27/01/2026", time: "15:30 (Actual)", status: "Resolved" },
        { id: 4, name: "HEMIDA (HAMU)", type: "Double Clock-in", date: "27/01/2026", time: "08:05, 08:12", status: "Pending" },
    ];

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-foreground p-8">
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header */}
                <div className="flex items-end justify-between border-b border-border pb-8">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => navigate('/manager/hr/summary')}
                                className="bg-card border-border rounded-xl"
                            >
                                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                            </Button>
                            <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter leading-none">Attendance Exceptions</h1>
                        </div>
                        <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px] ml-14">Action Required for Discrepancies</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button className="bg-card border border-border hover:bg-secondary text-[10px] font-black uppercase px-6 py-6 rounded-xl gap-2">
                            <Mail className="w-4 h-4" />
                            Notify Employees
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase px-6 py-6 rounded-xl shadow-lg shadow-blue-600/20">
                            Auto-Resolve Bulk
                        </Button>
                    </div>
                </div>

                {/* Exception Feed */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Active Discrepancies ({exceptions.length})</h2>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase text-muted-foreground">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Pending</span>
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Flagged</span>
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /> Resolved</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {exceptions.map((exc, idx) => (
                            <Card key={idx} className="bg-card/40 border-border hover:border-border transition-all group overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex items-center justify-between p-6">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${exc.status === 'Resolved' ? 'bg-green-500/10 text-green-500' :
                                                    exc.status === 'Flagged' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
                                                }`}>
                                                {exc.type.includes('Clock') ? <Clock className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-black text-foreground uppercase tracking-tighter leading-none">{exc.name}</h3>
                                                    <span className="text-muted-foreground font-bold text-xs">•</span>
                                                    <span className="text-muted-foreground font-bold uppercase text-[10px] tracking-tight">{exc.type}</span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 leading-none">
                                                        <Calendar className="w-3 h-3" />
                                                        {exc.date}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 leading-none">
                                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                                        {exc.time}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                                                <Badge variant="outline" className={`text-[9px] font-black uppercase ${exc.status === 'Resolved' ? 'border-green-500/50 text-green-500' :
                                                        exc.status === 'Flagged' ? 'border-red-500/50 text-red-500' : 'border-yellow-500/50 text-yellow-500'
                                                    }`}>
                                                    {exc.status}
                                                </Badge>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button variant="ghost" className="bg-secondary/50 hover:bg-secondary text-muted-foreground text-[10px] font-bold uppercase px-4 h-10 rounded-xl">
                                                    Ignore
                                                </Button>
                                                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-foreground font-bold uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl flex items-center gap-2">
                                                    Resolve
                                                    <ArrowRight className="w-3 h-3" />
                                                </Button>
                                                <Button variant="outline" size="icon" className="h-10 w-10 border-border bg-card hover:bg-secondary rounded-xl" aria-label="Action">
                                                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Intelligence Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-card/20 border-border p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                                <AlertCircle className="w-4 h-4" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary-foreground">Priority Issues</h4>
                        </div>
                        <p className="text-[9px] font-medium text-muted-foreground uppercase leading-relaxed">
                            3 employees have recurring late arrivals this week. System recommends policy review.
                        </p>
                        <Button variant="link" className="p-0 h-auto text-[9px] font-black uppercase text-blue-500">Analyze Detail</Button>
                    </Card>

                    <Card className="bg-card/20 border-border p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                <Bell className="w-4 h-4" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary-foreground">Recent Resolutions</h4>
                        </div>
                        <p className="text-[9px] font-medium text-muted-foreground uppercase leading-relaxed">
                            Main Entrance terminal sync lag resolved. 42 missed logs were backfilled.
                        </p>
                        <Button variant="link" className="p-0 h-auto text-[9px] font-black uppercase text-blue-500">View Audit</Button>
                    </Card>

                    <Card className="bg-card/20 border-border p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary-foreground">Auto-Fix Enabled</h4>
                        </div>
                        <p className="text-[9px] font-medium text-muted-foreground uppercase leading-relaxed">
                            Smart matching is resolving 85% of missed clock-outs based on schedule.
                        </p>
                        <Button variant="link" className="p-0 h-auto text-[9px] font-black uppercase text-blue-500">Manage Rules</Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}
