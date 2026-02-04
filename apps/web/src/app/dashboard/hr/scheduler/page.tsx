'use client';

import React, { useState, useEffect } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import {
    ChevronLeft, ChevronRight, Filter, Settings, Download, Copy, Trash2, Edit,
    MoreHorizontal, Plus, Calendar as CalendarIcon, Search, ArrowUp, ArrowDown,
    ArrowUpDown, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@antigravity/ui"; // Assuming these exist in UI package or we stub them if not

// Mock data generator
const generateMockData = (startStr: string) => {
    const employees = ['John Doe', 'Jane Smith', 'Mike Ross', 'Rachel Zane', 'Harvey Specter'];
    const roles = ['Server', 'Bartender', 'Chef', 'Host', 'Manager'];
    const days = [];
    let curr = new Date(startStr);
    for (let i = 0; i < 7; i++) {
        days.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }

    const rows = employees.map((emp, i) => {
        const row: any = {
            employee_name: emp,
            occupation: roles[i],
            cost_centre: 'Main Floor',
            basic_hrs_overtime: '40h',
            cost_eur: 800 + (i * 100)
        };
        days.forEach(day => {
            if (Math.random() > 0.3) {
                row[day] = {
                    cell_type: 'WORK_SHIFT',
                    role: roles[i],
                    start_time: '09:00',
                    end_time: '17:00'
                };
            } else {
                row[day] = { cell_type: 'OFF_DAY' };
            }
        });
        return row;
    });

    return { week_start: startStr, week_end: days[6], rows };
};

export default function SchedulerPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [weekStart, setWeekStart] = useState(new Date().toISOString().split('T')[0]);
    const [viewType, setViewType] = useState('week');

    useEffect(() => {
        // Mock API call
        setLoading(true);
        setTimeout(() => {
            setData(generateMockData(weekStart));
            setLoading(false);
        }, 500);
    }, [weekStart]);

    const dayKeys = React.useMemo(() => {
        if (!data?.week_start) return [];
        const keys = [];
        let curr = new Date(data.week_start);
        for (let i = 0; i < 7; i++) {
            keys.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }
        return keys;
    }, [data]);

    const getCellStyles = (cell: any) => {
        if (!cell) return 'bg-white/5 hover:bg-white/10';
        if (cell.cell_type === 'OFF_DAY') return 'bg-pink-900/10 text-pink-400 border-l-2 border-pink-500 hover:bg-pink-900/20';
        if (cell.cell_type === 'WORK_SHIFT') return 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500 hover:bg-blue-600/20';
        return 'bg-white/5';
    };

    return (
        <PageContainer title="Scheduler" description="Staff Roster Management (v2.1.0)">
            <div className="flex flex-col h-[calc(100vh-140px)]">

                {/* Toolbar */}
                <div className="flex justify-between mb-4 bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                            const d = new Date(weekStart);
                            d.setDate(d.getDate() - 7);
                            setWeekStart(d.toISOString().split('T')[0]);
                        }}><ChevronLeft className="h-4 w-4" /></Button>
                        <div className="text-center min-w-[120px]">
                            <span className="block text-xs font-bold text-white">{weekStart}</span>
                            <span className="block text-[10px] text-zinc-500">WEEK VIEW</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => {
                            const d = new Date(weekStart);
                            d.setDate(d.getDate() + 7);
                            setWeekStart(d.toISOString().split('T')[0]);
                        }}><ChevronRight className="h-4 w-4" /></Button>
                    </div>

                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => toast.success("Applied '2-Week Rotation' Pattern")}><Settings className="h-4 w-4 mr-2" /> Auto-Fill</Button>
                        <Button size="sm" className="bg-blue-600"><Plus className="h-4 w-4 mr-2" /> Add Shift</Button>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-auto border border-zinc-800 rounded-lg bg-zinc-900/50">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-zinc-500">Loading roster...</div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-zinc-900 border-b border-zinc-800">
                                    <th className="p-3 text-left min-w-[200px] sticky left-0 z-10 bg-zinc-900 border-r border-zinc-800 text-xs font-bold text-zinc-500 uppercase">Employee</th>
                                    {dayKeys.map(key => {
                                        const d = new Date(key);
                                        return (
                                            <th key={key} className="p-3 text-center min-w-[120px] border-r border-zinc-800 text-xs font-bold text-zinc-500 uppercase">
                                                <div>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                                                <div className="text-[10px] text-zinc-600">{d.getDate()}</div>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {data?.rows.map((row: any, i: number) => (
                                    <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800/20">
                                        <td className="p-3 bg-zinc-900/95 sticky left-0 z-10 border-r border-zinc-800">
                                            <div className="font-bold text-sm text-zinc-200">{row.employee_name}</div>
                                            <div className="text-[10px] text-zinc-500">{row.occupation}</div>
                                        </td>
                                        {dayKeys.map(key => {
                                            const cell = row[key];
                                            return (
                                                <td key={key} className="p-1 border-r border-zinc-800 h-16">
                                                    {cell ? (
                                                        <div className={`w-full h-full rounded p-1 text-[10px] flex flex-col justify-center ${getCellStyles(cell)}`}>
                                                            {cell.cell_type === 'WORK_SHIFT' ? (
                                                                <>
                                                                    <div className="font-bold truncate">{cell.role}</div>
                                                                    <div className="opacity-75">{cell.start_time}-{cell.end_time}</div>
                                                                </>
                                                            ) : (
                                                                <div className="text-center font-bold opacity-50">OFF</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full hover:bg-white/5 cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100">
                                                            <Plus className="h-4 w-4 text-zinc-600" />
                                                        </div>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}
