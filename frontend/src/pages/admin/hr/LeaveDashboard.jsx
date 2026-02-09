import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import PageContainer from '@/layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';

import { Progress } from '@/components/ui/progress';

import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

import api from '@/lib/api';

import { toast } from 'sonner';

import LeaveRequestModal from './LeaveRequestModal';

export default function LeaveDashboard() {
    const [balances, setBalances] = useState(null);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [balanceRes, requestsRes] = await Promise.all([
                api.get('/hr/leave/balances/1001'),
                api.get('/hr/leave/requests?employee_code=1001')
            ]);
            setBalances(balanceRes.data);
            setRequests(requestsRes.data);
        } catch (error) {
            logger.error(error);
            toast.error("Failed to load leave data");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status.toLowerCase()) {
            case 'approved': return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
            case 'rejected': return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
            default: return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
        }
    };

    if (loading) return <div className="p-8 text-white">Loading...</div>;

    return (
        <PageContainer
            title="My Leave Portal"
            description="Manage your vacation, sick leave, and entitlements"
            actions={
                <Button className="bg-blue-600 hover:bg-blue-500" onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> New Request
                </Button>
            }
        >
            <LeaveRequestModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSuccess={fetchData}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Balances */}
                <div className="space-y-6">
                    {/* Vacation Balance */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-blue-400">Vacation Leave</CardTitle>
                            <CardDescription>2026 Entitlement</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative pt-2">
                                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                                    <span>Taken: {balances?.vacation_taken}h</span>
                                    <span>Total: {balances?.vacation_entitlement}h</span>
                                </div>
                                <Progress value={(balances?.vacation_taken / balances?.vacation_entitlement) * 100} className="h-4 bg-zinc-800" indicatorClassName="bg-blue-500" />
                                <div className="mt-4 text-center">
                                    <span className="text-4xl font-bold text-white">{balances?.vacation_remaining}</span>
                                    <span className="text-zinc-500 ml-2">hours remaining</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sick Leave Balance */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-red-400">Sick Leave (Full Pay)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative pt-2">
                                <div className="flex justify-between text-sm text-zinc-400 mb-2">
                                    <span>Taken: {balances?.sick_full_taken}h</span>
                                    <span>Total: {balances?.sick_full_entitlement}h</span>
                                </div>
                                <Progress value={(balances?.sick_full_taken / balances?.sick_full_entitlement) * 100} className="h-4 bg-zinc-800" indicatorClassName="bg-red-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Col: Requests List */}
                <div className="lg:col-span-2">
                    <Card className="bg-zinc-900 border-zinc-800 h-full">
                        <CardHeader>
                            <CardTitle>Recent Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {requests.map((req) => (
                                    <div key={req.id} className="group flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${req.leave_type_id.includes('SICK') ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-white">{req.leave_type_id.replace('_', ' ')}</h4>
                                                <div className="text-sm text-zinc-400 flex items-center gap-2">
                                                    <span>{req.start_date}</span>
                                                    {req.start_date !== req.end_date && <span>- {req.end_date}</span>}
                                                    <span className="text-zinc-600">•</span>
                                                    <span>{req.hours} hours</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {getStatusBadge(req.status)}
                                            {req.reason && <span className="text-xs text-zinc-500 italic max-w-[200px] truncate">{req.reason}</span>}
                                        </div>
                                    </div>
                                ))}

                                {requests.length === 0 && (
                                    <div className="text-center py-12 text-zinc-500">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>No leave requests found.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}