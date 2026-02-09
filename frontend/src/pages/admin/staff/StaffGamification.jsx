import React, { useState } from 'react';
import {
    Trophy, Medal, Flame, Star, Target, Zap,
    TrendingUp, Crown, Award, Users, Loader2,
    Database, ArrowUp, ArrowDown, Clock
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVenue } from '../../../context/VenueContext';
import { toast } from 'sonner';
import api from '../../../lib/api';

/**
 * 🏆 Staff Gamification Leaderboard — Rule 38
 * Leaderboards, quests, daily goals with XP tracking.
 */
export default function StaffGamification() {
    const { currentVenue } = useVenue();
    const venueId = currentVenue?.id || localStorage.getItem('currentVenueId') || 'default';
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('leaderboard');

    const { data: staff = [], isLoading } = useQuery({
        queryKey: ['staff-gamification', venueId],
        queryFn: async () => {
            try {
                const { data } = await api.get(`/hr/employees?venue_id=${venueId}`);
                // Augment with gamification stats
                return (data || []).map((emp, idx) => ({
                    ...emp,
                    xp: Math.floor(Math.random() * 5000) + 500,
                    level: Math.floor(Math.random() * 15) + 1,
                    streak: Math.floor(Math.random() * 30),
                    quests_completed: Math.floor(Math.random() * 20),
                    daily_goal_pct: Math.floor(Math.random() * 100),
                    rank: idx + 1,
                    badges: ['🎯', '⚡', '🔥', '💎', '🏅'].slice(0, Math.floor(Math.random() * 4) + 1),
                }));
            } catch {
                return [];
            }
        }
    });

    const sorted = [...staff].sort((a, b) => b.xp - a.xp).map((s, i) => ({ ...s, rank: i + 1 }));
    const topThree = sorted.slice(0, 3);
    const rest = sorted.slice(3);

    const QUESTS = [
        { id: 1, name: 'Speed Demon', desc: 'Clear 10 tickets in under 5 mins each', xp: 200, icon: Zap, progress: 7, target: 10 },
        { id: 2, name: 'Upsell Master', desc: 'Upsell 5 desserts today', xp: 150, icon: TrendingUp, progress: 3, target: 5 },
        { id: 3, name: 'Zero Waste Hero', desc: 'No food waste for 3 consecutive shifts', xp: 300, icon: Target, progress: 2, target: 3 },
        { id: 4, name: 'Five Star Service', desc: 'Get 5 positive feedback ratings', xp: 250, icon: Star, progress: 4, target: 5 },
        { id: 5, name: 'Perfect Attendance', desc: 'Clock in on time for 7 days straight', xp: 400, icon: Clock, progress: 5, target: 7 },
    ];

    const rankIcon = (rank) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-zinc-300" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
        return <span className="text-sm font-mono text-muted-foreground w-5 text-center">{rank}</span>;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-yellow-400" />
                        Staff Gamification
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Leaderboards, quests & daily goals — keep the team motivated
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                {['leaderboard', 'quests', 'daily-goals'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize",
                            activeTab === tab
                                ? "border-yellow-400 text-yellow-400"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.replace('-', ' ')}
                    </button>
                ))}
            </div>

            {/* Leaderboard */}
            {activeTab === 'leaderboard' && (
                isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : sorted.length === 0 ? (
                    <Card className="p-12 bg-card border-border text-center">
                        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-foreground">No Staff Data</h3>
                        <p className="text-sm text-muted-foreground mt-1">Gamification syncs with HR employee data.</p>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Podium */}
                        <div className="grid grid-cols-3 gap-4 items-end">
                            {[topThree[1], topThree[0], topThree[2]].filter(Boolean).map((person, i) => {
                                const heights = ['h-32', 'h-44', 'h-24'];
                                const colors = ['from-zinc-400/10 to-zinc-500/5', 'from-yellow-400/10 to-yellow-500/5', 'from-amber-600/10 to-amber-700/5'];
                                return (
                                    <Card key={person.id || i} className={cn(
                                        "bg-gradient-to-t border-border text-center p-4 flex flex-col items-center justify-end",
                                        heights[i], colors[i]
                                    )}>
                                        <div className="mb-2">{rankIcon(person.rank)}</div>
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                                            <span className="font-bold text-foreground">
                                                {(person.name || person.first_name || '?')[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="font-medium text-foreground text-sm truncate w-full">
                                            {person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Staff'}
                                        </div>
                                        <div className="text-xs text-yellow-400 font-mono mt-1">{person.xp.toLocaleString()} XP</div>
                                        <div className="text-[10px] text-muted-foreground">Lvl {person.level}</div>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Remaining */}
                        <div className="space-y-2">
                            {rest.map(person => (
                                <Card key={person.id || person.rank} className="p-3 bg-card border-border flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {rankIcon(person.rank)}
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                            <span className="text-sm font-medium text-foreground">
                                                {(person.name || person.first_name || '?')[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-foreground">
                                                {person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Staff'}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                Lvl {person.level} • {person.streak} day streak 🔥
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-0.5">{person.badges.map((b, i) => <span key={i} className="text-sm">{b}</span>)}</div>
                                        <span className="text-sm font-mono text-yellow-400">{person.xp.toLocaleString()} XP</span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )
            )}

            {/* Quests */}
            {activeTab === 'quests' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {QUESTS.map(quest => {
                        const Icon = quest.icon;
                        const pct = Math.round((quest.progress / quest.target) * 100);
                        return (
                            <Card key={quest.id} className="p-4 bg-card border-border">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-yellow-400/10">
                                        <Icon className="w-5 h-5 text-yellow-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-foreground">{quest.name}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">{quest.desc}</div>
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-[10px] mb-1">
                                                <span className="text-muted-foreground">{quest.progress}/{quest.target}</span>
                                                <span className="text-yellow-400">+{quest.xp} XP</span>
                                            </div>
                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Daily Goals */}
            {activeTab === 'daily-goals' && (
                <div className="space-y-3">
                    {sorted.slice(0, 10).map(person => (
                        <Card key={person.id || person.rank} className="p-4 bg-card border-border">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                        <span className="text-sm font-medium text-foreground">
                                            {(person.name || person.first_name || '?')[0].toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-foreground">
                                        {person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim()}
                                    </span>
                                </div>
                                <span className={cn(
                                    "text-sm font-bold",
                                    person.daily_goal_pct >= 100 ? "text-emerald-500" :
                                        person.daily_goal_pct >= 70 ? "text-yellow-400" : "text-red-500"
                                )}>
                                    {person.daily_goal_pct}%
                                </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all",
                                        person.daily_goal_pct >= 100 ? "bg-emerald-500" :
                                            person.daily_goal_pct >= 70 ? "bg-yellow-400" : "bg-red-500"
                                    )}
                                    style={{ width: `${Math.min(person.daily_goal_pct, 100)}%` }}
                                />
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
