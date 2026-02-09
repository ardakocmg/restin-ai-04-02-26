import React, { useState, useEffect } from 'react';import { logger } from '@/lib/logger';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';import { logger } from '@/lib/logger';

import { Button } from '@/components/ui/button';import { logger } from '@/lib/logger';

import { Input } from '@/components/ui/input';import { logger } from '@/lib/logger';

import { Label } from '@/components/ui/label';import { logger } from '@/lib/logger';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';import { logger } from '@/lib/logger';

import { Textarea } from '@/components/ui/textarea';import { logger } from '@/lib/logger';

import api from '@/lib/api';import { logger } from '@/lib/logger';

import { toast } from 'sonner';

import { logger } from '@/lib/logger';
export default function LeaveRequestModal({ open, onOpenChange, onSuccess }) {
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [formData, setFormData] = useState({
        leave_type_id: '',
        start_date: '',
        end_date: '',
        hours: 8,
        reason: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            fetchLeaveTypes();
        }
    }, [open]);

    const fetchLeaveTypes = async () => {
        try {
            const res = await api.get('/hr/leave/types');
            setLeaveTypes(res.data);
        } catch (error) {
            logger.error("Failed to fetch leave types", error);
            toast.error("Could not load leave types");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Basic hours calculation logic (mock)
            // In real app, this should check shift patterns
            const start = new Date(formData.start_date);
            const end = new Date(formData.end_date);
            const days = (end - start) / (1000 * 60 * 60 * 24) + 1;
            const estimatedHours = days * 8; // Default 8h day

            await api.post('/hr/leave/request', {
                ...formData,
                hours: estimatedHours
            });

            toast.success("Leave request submitted successfully");
            onSuccess();
            onOpenChange(false);
            setFormData({ leave_type_id: '', start_date: '', end_date: '', hours: 8, reason: '' });
        } catch (error) {
            logger.error(error);
            toast.error("Failed to submit request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>New Leave Request</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Leave Type</Label>
                        <Select
                            value={formData.leave_type_id}
                            onValueChange={(val) => setFormData({ ...formData, leave_type_id: val })}
                            required
                        >
                            <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                {leaveTypes.map(type => (
                                    <SelectItem key={type.id} value={type.id}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
                                            {type.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                                type="date"
                                className="bg-zinc-800 border-zinc-700"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                                type="date"
                                className="bg-zinc-800 border-zinc-700"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason (Optional)</Label>
                        <Textarea
                            className="bg-zinc-800 border-zinc-700"
                            placeholder="e.g. Family vacation, Doctor's appointment..."
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        />
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-500" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
