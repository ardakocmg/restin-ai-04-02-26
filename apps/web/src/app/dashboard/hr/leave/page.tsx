'use client';

import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent } from '@antigravity/ui';

export default function LeaveManagementPage() {
    return (
        <PageContainer
            title="Leave Management"
            description="Manage employee time-off, sick leave, and approvals."
            actions={<Button>New Leave Request</Button>}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500">Pending Requests</p>
                            <p className="text-2xl font-bold">12</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500">Approved (This Month)</p>
                            <p className="text-2xl font-bold">45</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500">On Leave Today</p>
                            <p className="text-2xl font-bold">3</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="min-h-[400px] flex items-center justify-center border-dashed">
                <div className="text-center text-zinc-500">
                    <Calendar className="mx-auto h-12 w-12 opacity-50 mb-4" />
                    <h3 className="text-lg font-medium">Leave Calendar</h3>
                    <p className="text-sm max-w-sm mx-auto mt-2">
                        Interactive calendar view for managing team availability and time-off requests will be displayed here.
                    </p>
                </div>
            </Card>
        </PageContainer>
    );
}
