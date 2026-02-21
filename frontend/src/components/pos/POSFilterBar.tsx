import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Settings, CalendarClock, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePOSFilters, type ShiftType } from '@/context/POSFilterContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface POSFilterBarProps {
    onSettingsClick?: () => void;
}

export default function POSFilterBar({ onSettingsClick }: POSFilterBarProps) {
    const { filters, updateFilters } = usePOSFilters();

    const handleQuickSelect = (type: string) => {
        const today = new Date();
        let range = { from: today, to: today };

        switch (type) {
            case 'today':
                range = { from: today, to: today };
                break;
            case 'week':
                range = { from: startOfWeek(today, { weekStartsOn: 1 }), to: endOfWeek(today, { weekStartsOn: 1 }) };
                break;
            case 'month':
                range = { from: startOfMonth(today), to: endOfMonth(today) };
                break;
        }
        updateFilters({ dateRange: range, activeShift: null });
    };

    const applyShift = (shift: ShiftType) => {
        const shifts: Record<string, [number, number]> = {
            breakfast: [9, 12],
            lunch: [12, 16],
            dinner: [19, 23]
        };
        updateFilters({
            activeShift: filters.activeShift === shift ? null : shift,
            timeRange: (shift ? shifts[shift] : undefined) || [0, 23] as [number, number]
        });
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-1 mb-6">
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onSettingsClick}
                    className="bg-card border-border text-muted-foreground hover:text-foreground"
                >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {/* Meal Periods */}
                <div className="flex bg-card/50 p-1 rounded-lg border border-border">
                    {['Breakfast', 'Lunch', 'Dinner'].map((shift) => (
                        <button
                            key={shift}
                            onClick={() => applyShift(shift.toLowerCase() as ShiftType)}
                            className={cn(
                                "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
                                filters.activeShift === shift.toLowerCase()
                                    ? "bg-secondary text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-secondary-foreground"
                            )}
                        >
                            {shift}
                        </button>
                    ))}
                </div>

                {/* Event Popover */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-card border-border text-muted-foreground">
                            <CalendarClock className="w-4 h-4 mr-2" />
                            Event
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 bg-background border-border">
                        <div className="space-y-4 p-2">
                            <h4 className="text-sm font-bold text-foreground">Custom Time Range</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Start</Label>
                                    <Input aria-label="Input field" type="time" className="h-8 bg-card border-border text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-muted-foreground">End</Label>
                                    <Input aria-label="Input field" type="time" className="h-8 bg-card border-border text-xs" />
                                </div>
                            </div>
                            <Button className="w-full bg-red-600 hover:bg-red-700 text-foreground h-8 text-xs">Apply Event</Button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Time Display */}
                <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-md text-xs font-bold text-foreground">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{filters.timeRange[0]}:00 - {filters.timeRange[1]}:00</span>
                </div>

                {/* Date Picker */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-card border-border text-foreground font-medium min-w-[220px] justify-between">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                <span>
                                    {isSameDay(filters.dateRange.from, filters.dateRange.to)
                                        ? format(filters.dateRange.from, "MMM dd, yyyy")
                                        : `${format(filters.dateRange.from, "MMM dd")} - ${format(filters.dateRange.to, "MMM dd, yyyy")}`
                                    }
                                </span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background border-border" align="end">
                        <div className="p-3 border-b border-border flex gap-2 bg-card/50">
                            {['today', 'week', 'month'].map(r => (
                                <Button key={r} variant="ghost" size="sm" className="text-xs capitalize h-7 px-3 hover:bg-secondary" onClick={() => handleQuickSelect(r)}>
                                    {r}
                                </Button>
                            ))}
                        </div>
                        <Calendar
                            mode="range"
                            selected={filters.dateRange}
                            onSelect={(range) => updateFilters({ dateRange: range })}
                            numberOfMonths={2}
                            className="p-3"
                        />
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
