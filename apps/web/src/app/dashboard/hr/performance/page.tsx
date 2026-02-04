'use client';

import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { TrendingUp, Star, Target } from 'lucide-react';
import { Card, CardContent } from '@antigravity/ui';

export default function PerformanceManagementPage() {
    return (
        <PageContainer
            title="Performance Management"
            description="Track KPIs, goals, and employee reviews."
            actions={<Button>New Review Cycle</Button>}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400">
                            <Star className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500">Avg. Rating</p>
                            <p className="text-2xl font-bold">4.2</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
                            <Target className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500">Goals Due</p>
                            <p className="text-2xl font-bold">8</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500">Reviews Completed</p>
                            <p className="text-2xl font-bold">85%</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="min-h-[400px] flex items-center justify-center border-dashed">
                <div className="text-center text-zinc-500">
                    <TrendingUp className="mx-auto h-12 w-12 opacity-50 mb-4" />
                    <h3 className="text-lg font-medium">KPI Dashboard</h3>
                    <p className="text-sm max-w-sm mx-auto mt-2">
                        Detailed performance metrics, 360-degree feedback, and goal tracking interfaces will be displayed here.
                    </p>
                </div>
            </Card>
        </PageContainer>
    );
}
