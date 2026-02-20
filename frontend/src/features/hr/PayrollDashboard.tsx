import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import PageLayout from '../../layouts/PageLayout';

import DataTable from '../../components/shared/DataTable';

import { Card } from '../../components/ui/card';

import { Button } from '../../components/ui/button';

import { Badge } from '../../components/ui/badge';

import { Employee, Payslip } from '../../types';

import { HRService } from './HRService';

import { toast } from 'sonner';

export default function PayrollDashboard() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [offlineMode, setOfflineMode] = useState(false);

    // Load Employees and Local Drafts on Mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Try to fetch from API
            const empData = await HRService.getEmployees();
            setEmployees(empData);
            setOfflineMode(false);
        } catch (e: any) {
            logger.warn("API Offline, check for local data?");
            toast.error("Network Error: Could not fetch employees.");
            setOfflineMode(true);
        }

        // 2. Always load local drafts
        const drafts = await HRService.getDraftsLocally();
        if (drafts.length > 0) {
            setPayslips(drafts);
            toast.info(`Loaded ${drafts.length} offline drafts.`);
        }
        setLoading(false);
    };

    const handleRunPayroll = async () => {
        setIsProcessing(true);
        try {
            const today = new Date();
            const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
            const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

            // Ensure we have a venue ID (taking from first employee for demo, ideally from context)
            const venueId = employees[0]?.venueId || 'venue-caviar-bull';

            const results = await HRService.calculatePayroll(venueId, periodStart, periodEnd);
            setPayslips(results);
            setOfflineMode(false);
            toast.success("Payroll calculated successfully via API.");

            // Auto-save to local draft
            results.forEach(p => HRService.saveDraftLocally(p));

        } catch (error: any) {
            logger.error("Payroll Run Failed", { error: String(error) });
            toast.error("Failed to run payroll. Check connection.");
            setOfflineMode(true);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveDrafts = async () => {
        if (payslips.length === 0) return;
        let successCount = 0;
        for (const p of payslips) {
            const saved = await HRService.saveDraftLocally(p);
            if (saved) successCount++;
        }
        toast.success(`Saved ${successCount} drafts to Offline Storage.`);
    };

    const employeeColumns = [
        { key: 'first_name', label: 'First Name' },
        { key: 'last_name', label: 'Last Name' },
        { key: 'role', label: 'Role' },
        { key: 'gross_salary_cents', label: 'Gross Salary', render: (row: Employee) => `€${(row.gross_salary_cents / 100).toLocaleString()}` },
        { key: 'tax_status', label: 'Tax Status', render: (row: Employee) => row.fss_tax_status?.toUpperCase() || 'N/A' },
    ];

    const payslipColumns = [
        {
            key: 'employee_id', label: 'Employee', render: (row: Payslip) => {
                const emp = employees.find(e => e.id === row.employee_id);
                return emp ? `${emp.first_name} ${emp.last_name}` : row.employee_id;
            }
        },
        { key: 'gross_pay_cents', label: 'Gross', render: (row: Payslip) => `€${(row.gross_pay_cents / 100).toFixed(2)}` },
        { key: 'tax_cents', label: 'Tax', render: (row: Payslip) => `€${(row.tax_cents / 100).toFixed(2)}` },
        { key: 'ssc_cents', label: 'SSC', render: (row: Payslip) => `€${(row.ssc_cents / 100).toFixed(2)}` },
        { key: 'net_pay_cents', label: 'Net Pay', render: (row: Payslip) => `€${(row.net_pay_cents / 100).toFixed(2)}` },
        { key: 'status', label: 'Status' }
    ];

    return (
        <PageLayout
            title="Payroll Dashboard"
            description="Manage employee salaries and tax calculations (Malta FSS)"
            actions={
                <div className="flex gap-2">
                    {offlineMode && <Badge variant="destructive">OFFLINE MODE</Badge>}
                    <Button onClick={handleSaveDrafts} variant="outline" disabled={payslips.length === 0}>
                        Save Drafts Locally
                    </Button>
                    <Button onClick={handleRunPayroll} disabled={isProcessing || offlineMode}>
                        {isProcessing ? 'Processing...' : 'Run Payroll (API)'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                <Card className="p-6 bg-background border-border">
                    <div className="flex justify-between mb-4">
                        <h2 className="text-xl font-bold text-foreground">Employee Directory</h2>
                        <Button variant="ghost" size="sm" onClick={loadData}>Refresh</Button>
                    </div>
                    <DataTable
                        columns={employeeColumns}
                        data={employees}
                        loading={loading}
                        emptyMessage="No employees found. Ensure Backend API is running."
                    />
                </Card>

                {payslips.length > 0 && (
                    <Card className="p-6 bg-background border-border animate-in slide-in-from-bottom-5 fade-in duration-500">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-foreground">Payroll Draft (Current Period)</h2>
                            <div className="text-sm text-muted-foreground">
                                Total Net: €{(payslips.reduce((sum, p) => sum + p.net_pay_cents, 0) / 100).toLocaleString()}
                            </div>
                        </div>
                        <DataTable
                            columns={payslipColumns}
                            data={payslips}
                            emptyMessage="No payslips generated."
                        />
                    </Card>
                )}
            </div>
        </PageLayout>
    );
}