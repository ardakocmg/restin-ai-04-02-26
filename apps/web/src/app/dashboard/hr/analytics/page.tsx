'use client';

import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { BarChart, PieChart, Users, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@antigravity/ui';

export default function HRAnalyticsPage() {
    return (
        <PageContainer
            title="HR Analytics"
            description="Insights into workforce dynamics, costs, and retention."
            actions={<Button variant="outline">Export Report</Button>}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium text-zinc-500">Headcount</p>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">142</div>
                        <p className="text-xs text-green-500">+4% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium text-zinc-500">Payroll Cost</p>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">€45.2k</div>
                        <p className="text-xs text-red-500">+12% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium text-zinc-500">Turnover Rate</p>
                            <PieChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">2.1%</div>
                        <p className="text-xs text-zinc-500">Stable</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium text-zinc-500">Absence Rate</p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">1.5%</div>
                        <p className="text-xs text-green-500">-0.5% improvement</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="min-h-[300px] flex items-center justify-center">
                    <div className="text-center text-zinc-500">
                        <BarChart className="mx-auto h-10 w-10 opacity-50 mb-2" />
                        <p>Department Distribution</p>
                    </div>
                </Card>
                <Card className="min-h-[300px] flex items-center justify-center">
                    <div className="text-center text-zinc-500">
                        <PieChart className="mx-auto h-10 w-10 opacity-50 mb-2" />
                        <p>Tenure Analysis</p>
                    </div>
                </Card>
            </div>
        </PageContainer>
    );
}
