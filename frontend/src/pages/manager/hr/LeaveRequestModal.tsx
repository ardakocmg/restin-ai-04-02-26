
import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Textarea } from '@/components/ui/textarea';

import api from '@/lib/api';

import { toast } from 'sonner';

export default function LeaveRequestModal({ open, onOpenChange, onSuccess }) {
    const { logAction } = useAuditLog();
    useEffect(() => {
        logAction('LEAVE_REQUEST_VIEWED', 'leave-request-modal');
    }, []);
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
        } catch (error: unknown) {
            logger.error("Failed to fetch leave types", { error: String(error) });
            toast.error("Could not load leave types");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Basic hours calculation logic (mock)
            // In real app, this should check shift patterns
            const start = new Date(formData.start_date);
            const end = new Date(formData.end_date);
            const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
            const estimatedHours = days * 8; // Default 8h day

            await api.post('/hr/leave/request', {
                ...formData,
                hours: estimatedHours
            });

            toast.success("Leave request submitted successfully");
            onSuccess();
            onOpenChange(false);
            setFormData({ leave_type_id: '', start_date: '', end_date: '', hours: 8, reason: '' });
        } catch (error: unknown) {
            logger.error('Leave request failed:', { error: String(error) });
            toast.error("Failed to submit request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>New Leave Request</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>Leave Type</Label>
                        <Select aria-label="Select option"
                            value={formData.leave_type_id}
                            onValueChange={(val) => setFormData({ ...formData, leave_type_id: val })}
                            required
                        >
                            <SelectTrigger aria-label="Select option" className="bg-secondary border-border">
                                <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent className="bg-secondary border-border">
                                {leaveTypes.map(type => (
                                    <SelectItem key={type.id} value={type.id}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color  /* keep-inline */ }} /* keep-inline */ /* keep-inline */></div>{}
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
                            <Input aria-label="Input field"
                                type="date"
                                className="bg-secondary border-border"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input aria-label="Input field"
                                type="date"
                                className="bg-secondary border-border"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason (Optional)</Label>
                        <Textarea aria-label="e.g. Family vacation, Doctor's appointment..."
                            className="bg-secondary border-border"
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