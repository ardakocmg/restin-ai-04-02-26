'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@antigravity/ui';
import { Activity, Users, DollarSign, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-black tracking-tight text-white uppercase">Dashboard</h1>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-mono">LAST UPDATED: JUST NOW</span>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Link href="/dashboard/finance">
                    <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-sm hover:border-green-500/50 transition-colors cursor-pointer group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-200 group-hover:text-green-400">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">€45,231.89</div>
                            <p className="text-xs text-zinc-500">+20.1% from last month</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/hr">
                    <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-sm hover:border-blue-500/50 transition-colors cursor-pointer group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-200 group-hover:text-blue-400">Active Staff</CardTitle>
                            <Users className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">+2350</div>
                            <p className="text-xs text-zinc-500">+180 since last hour</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/reports/sales">
                    <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-sm hover:border-purple-500/50 transition-colors cursor-pointer group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-200 group-hover:text-purple-400">Sales</CardTitle>
                            <TrendingUp className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">+12,234</div>
                            <p className="text-xs text-zinc-500">+19% from last month</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/observability">
                    <Card className="bg-zinc-900/50 border-white/5 backdrop-blur-sm hover:border-red-500/50 transition-colors cursor-pointer group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-200 group-hover:text-red-400">Active Now</CardTitle>
                            <Activity className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">+573</div>
                            <p className="text-xs text-zinc-500">+201 since last hour</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Main Content Area Placeholder */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 bg-zinc-900/50 border-white/5 backdrop-blur-sm h-[400px]">
                    <CardHeader>
                        <CardTitle className="text-white">Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] flex items-center justify-center text-zinc-500 text-sm">
                            [Chart Placeholder]
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 bg-zinc-900/50 border-white/5 backdrop-blur-sm h-[400px]">
                    <CardHeader>
                        <CardTitle className="text-white">Recent Sales</CardTitle>
                        <CardDescription className="text-zinc-400">
                            You made 265 sales this month.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] flex items-center justify-center text-zinc-500 text-sm">
                            [List Placeholder]
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
