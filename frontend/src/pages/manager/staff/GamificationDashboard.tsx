import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Trophy, Star, Zap, Target, TrendingUp, Award,
    ChevronUp, Clock, Flame, Crown, Medal, Sparkles, User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { levelProgress, xpForNextLevel, getLevelTitle } from '@/lib/gamification';
import { useAuth } from '@/context/AuthContext';

// ─── Mock Leaderboard Data ─────────────────────────────────────────────
interface LeaderboardEntry {
    id: string;
    name: string;
    initials: string;
    color: string;
    role: string;
    xp: number;
    level: number;
    streak: number;
    tasksCompleted: number;
    salesXP: number;
    taskXP: number;
    shiftXP: number;
}

const LEADERBOARD: LeaderboardEntry[] = [
    { id: 'u1', name: 'Maria Lopez', initials: 'ML', color: 'bg-pink-600', role: 'Manager', xp: 4800, level: 8, streak: 12, tasksCompleted: 47, salesXP: 2000, taskXP: 1800, shiftXP: 1000 },
    { id: 'u2', name: 'Chef Marco', initials: 'CM', color: 'bg-orange-600', role: 'Head Chef', xp: 3900, level: 7, streak: 8, tasksCompleted: 38, salesXP: 0, taskXP: 2900, shiftXP: 1000 },
    { id: 'u3', name: 'John Kamara', initials: 'JK', color: 'bg-blue-600', role: 'Senior Waiter', xp: 3200, level: 6, streak: 5, tasksCompleted: 31, salesXP: 1800, taskXP: 900, shiftXP: 500 },
    { id: 'u4', name: 'Sarah Park', initials: 'SP', color: 'bg-teal-600', role: 'Waitress', xp: 2800, level: 5, streak: 3, tasksCompleted: 28, salesXP: 1500, taskXP: 800, shiftXP: 500 },
    { id: 'u5', name: 'Tony Borg', initials: 'TB', color: 'bg-purple-600', role: 'Bartender', xp: 2100, level: 4, streak: 7, tasksCompleted: 22, salesXP: 1200, taskXP: 500, shiftXP: 400 },
    { id: 'u6', name: 'Alex Russo', initials: 'AR', color: 'bg-violet-600', role: 'Host', xp: 1500, level: 3, streak: 1, tasksCompleted: 15, salesXP: 600, taskXP: 500, shiftXP: 400 },
];

// ─── Mock Quests ────────────────────────────────────────────────────────
interface Quest {
    id: string;
    title: string;
    description: string;
    progress: number;
    goal: number;
    rewardXP: number;
    icon: React.ElementType;
    expiresIn: string;
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Epic';
}

const QUESTS: Quest[] = [
    { id: 'q1', title: 'Coffee Master', description: 'Sell 20 coffees today', progress: 14, goal: 20, rewardXP: 200, icon: Flame, expiresIn: '4h left', difficulty: 'Medium' },
    { id: 'q2', title: 'Perfect Shift', description: 'Complete shift with zero complaints', progress: 1, goal: 1, rewardXP: 500, icon: Star, expiresIn: '8h left', difficulty: 'Hard' },
    { id: 'q3', title: 'Speed Demon', description: 'Clear 10 KDS tickets under 8 min', progress: 6, goal: 10, rewardXP: 300, icon: Zap, expiresIn: '2h left', difficulty: 'Medium' },
    { id: 'q4', title: 'Upsell Pro', description: 'Suggest 5 desserts/drinks', progress: 2, goal: 5, rewardXP: 150, icon: TrendingUp, expiresIn: '6h left', difficulty: 'Easy' },
    { id: 'q5', title: 'Team Player', description: 'Help with 3 tasks outside your role', progress: 0, goal: 3, rewardXP: 400, icon: Award, expiresIn: '12h left', difficulty: 'Epic' },
];

// ─── Rank Badge ─────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <Crown className="h-5 w-5 text-amber-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-zinc-300" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-zinc-500 w-5 text-center">#{rank}</span>;
}

// ─── Main Dashboard ─────────────────────────────────────────────────────
export default function GamificationDashboard() {
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

    // Top 3 summary
    const topThree = LEADERBOARD.slice(0, 3);
    const totalXP = LEADERBOARD.reduce((s, e) => s + e.xp, 0);

    return (
        <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
            {/* Hero */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-amber-400" />
                        Staff Gamification
                    </h1>
                    <p className="text-zinc-400 mt-2">
                        XP leaderboard, daily quests, and achievement tracking — turn every shift into a game.
                    </p>
                </div>
                {user && (
                    <Badge variant="outline" className="py-1.5 px-3 text-sm border-zinc-700 text-zinc-300">
                        <User className="w-3.5 h-3.5 mr-1.5" />
                        {user.name} · {user.role || 'Staff'}
                    </Badge>
                )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Trophy className="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-zinc-100 tabular-nums">{totalXP.toLocaleString()}</p>
                            <p className="text-xs text-zinc-500 font-medium uppercase">Total Team XP</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Target className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-zinc-100 tabular-nums">{QUESTS.length}</p>
                            <p className="text-xs text-zinc-500 font-medium uppercase">Active Quests</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <Flame className="h-5 w-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-zinc-100 tabular-nums">{Math.max(...LEADERBOARD.map(e => e.streak))}</p>
                            <p className="text-xs text-zinc-500 font-medium uppercase">Best Streak</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-zinc-100 tabular-nums">
                                {LEADERBOARD.reduce((s, e) => s + e.tasksCompleted, 0)}
                            </p>
                            <p className="text-xs text-zinc-500 font-medium uppercase">Tasks Done</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ─── Leaderboard ──────────────────────────────── */}
                <div className="lg:col-span-2">
                    <Card className="bg-zinc-950 border-zinc-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-zinc-100 flex items-center gap-2">
                                    <Crown className="h-5 w-5 text-amber-400" /> Leaderboard
                                </CardTitle>
                                <div className="flex gap-1 bg-zinc-900 rounded-lg p-0.5">
                                    {(['daily', 'weekly', 'monthly'] as const).map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setTimeRange(r)}
                                            className={`px-3 py-1 text-xs rounded-md transition-all font-medium ${timeRange === r
                                                ? 'bg-zinc-800 text-zinc-100'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                                }`}
                                        >
                                            {r.charAt(0).toUpperCase() + r.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {LEADERBOARD.map((entry, idx) => {
                                const rank = idx + 1;
                                const progress = levelProgress(entry.xp, entry.level);
                                const nextLevelXP = xpForNextLevel(entry.level);
                                const title = getLevelTitle(entry.level);
                                const isCurrentUser = user && (entry.name === user.name || entry.id === user.id);

                                return (
                                    <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isCurrentUser
                                            ? 'bg-blue-500/5 border-blue-500/30 ring-1 ring-blue-500/20'
                                            : rank <= 3
                                                ? 'bg-zinc-900/80 border-zinc-700'
                                                : 'bg-zinc-900/30 border-zinc-800/50'
                                            }`}
                                    >
                                        {/* Rank */}
                                        <div className="w-8 flex justify-center">
                                            <RankBadge rank={rank} />
                                        </div>

                                        {/* Avatar */}
                                        <div className={`h-10 w-10 rounded-full ${entry.color} flex items-center justify-center flex-shrink-0`}>
                                            <span className="text-white text-sm font-bold">{entry.initials}</span>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-zinc-200">{entry.name}</span>
                                                {isCurrentUser && (
                                                    <Badge className="text-[9px] bg-blue-500/10 text-blue-400 border-0">You</Badge>
                                                )}
                                                <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                                                    {entry.role}
                                                </Badge>
                                                <Badge className="text-[10px] bg-zinc-800 text-amber-400 border-0">
                                                    Lvl {entry.level} — {title}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                                </div>
                                                <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                                                    {entry.xp.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
                                                </span>
                                            </div>
                                        </div>

                                        {/* Streak & XP */}
                                        <div className="flex items-center gap-3 text-right">
                                            <div className="flex items-center gap-1 text-xs">
                                                <Flame className="h-3.5 w-3.5 text-orange-400" />
                                                <span className="text-zinc-300 font-medium">{entry.streak}d</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-amber-400 tabular-nums">{entry.xp.toLocaleString()}</p>
                                                <p className="text-[10px] text-zinc-500">XP</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>

                {/* ─── Quests Panel ─────────────────────────────── */}
                <div>
                    <Card className="bg-zinc-950 border-zinc-800">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-zinc-100 flex items-center gap-2">
                                <Target className="h-5 w-5 text-emerald-400" /> Active Quests
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {QUESTS.map(quest => {
                                const pct = Math.round((quest.progress / quest.goal) * 100);
                                return (
                                    <motion.div
                                        key={quest.id}
                                        whileHover={{ scale: 1.01 }}
                                        className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2"
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                                <quest.icon className="h-4 w-4 text-amber-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-zinc-200">{quest.title}</p>
                                                    <Badge className={`text-[9px] border-0 ${quest.difficulty === 'Epic' ? 'bg-purple-600 text-white' :
                                                        quest.difficulty === 'Hard' ? 'bg-red-600 text-white' :
                                                            quest.difficulty === 'Medium' ? 'bg-amber-600 text-white' :
                                                                'bg-zinc-700 text-zinc-300'
                                                        }`}>
                                                        {quest.difficulty}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-zinc-500 mt-0.5">{quest.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-[10px] text-zinc-500">{quest.progress}/{quest.goal}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {quest.expiresIn}
                                            </span>
                                            <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                                                <Zap className="h-3 w-3" /> {quest.rewardXP} XP
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
