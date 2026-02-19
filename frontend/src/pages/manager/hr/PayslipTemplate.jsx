import React, { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

import { useParams } from 'react-router-dom';

import api from '@/lib/api';

import { useAuth } from '@/context/AuthContext';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';

import { Loader2 } from 'lucide-react';

export default function PayslipTemplate() {
    const { runId, employeeCode } = useParams();
    const { user, isManager, isOwner } = useAuth();
    useAuditLog('PAYSLIP_TEMPLATE_VIEWED', { resource: 'payslip-template', runId, employeeCode });
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // In a real app, we might have a dedicated endpoint for single payslip
                // For now, fetch the run and find the employee
                const response = await api.get(`/hr/payroll/runs/${runId}`);
                const run = response.data;
                const payslip = run.payslips.find(p => p.employee_code === employeeCode);

                if (payslip) {
                    setData({ run, payslip });
                }
            } catch (error) {
                logger.error("Failed to load payslip", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [runId, employeeCode]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-black" /></div>;
    }

    if (!data) return <div className="p-10 text-center">Payslip not found</div>;

    const { run, payslip } = data;

    return (
        <PermissionGate requiredRole="MANAGER">
            <div className="bg-white text-black min-h-screen p-8 max-w-[210mm] mx-auto font-sans text-sm print:p-0 print:max-w-none">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b border-gray-300 pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground uppercase tracking-tight">Payslip</h1>
                        <p className="text-gray-500 font-medium">{run.run_name}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-bold">Restin Hotel Group</h2>
                        <p className="text-gray-600">Level 5, Portomaso Business Tower</p>
                        <p className="text-gray-600">St. Julians, Malta</p>
                        <p className="text-gray-600">PE: 12345-6789</p>
                    </div>
                </div>

                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-8 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200 print:border-none print:bg-transparent print:p-0">
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Employee</p>
                        <p className="font-bold text-lg">{payslip.employee_name}</p>
                        <p className="text-gray-600">{payslip.employee_code}</p>
                        <p className="text-gray-600">{payslip.employee_role}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Pay Period</p>
                        <p className="font-bold">{run.period_start} - {run.period_end}</p>
                        <div className="mt-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">ID Card</p>
                            <p>123456M</p>
                        </div>
                    </div>
                </div>

                {/* Details Table */}
                <div className="mb-8">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-800">
                                <th className="text-left py-2">Description</th>
                                <th className="text-center py-2">Rate/Hours</th>
                                <th className="text-right py-2">Payments</th>
                                <th className="text-right py-2">Deductions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            <tr>
                                <td className="py-2">Basic Salary</td>
                                <td className="text-center py-2">173.33 hrs</td>
                                <td className="text-right py-2">€{payslip.basic_pay.toFixed(2)}</td>
                                <td className="text-right py-2"></td>
                            </tr>
                            {payslip.overtime_pay > 0 && (
                                <tr>
                                    <td className="py-2">Overtime (x1.5)</td>
                                    <td className="text-center py-2">10.00 hrs</td>
                                    <td className="text-right py-2">€{payslip.overtime_pay.toFixed(2)}</td>
                                    <td className="text-right py-2"></td>
                                </tr>
                            )}
                            <tr>
                                <td className="py-2">SSC (Employee Share)</td>
                                <td className="text-center py-2">10%</td>
                                <td className="text-right py-2"></td>
                                <td className="text-right py-2">€{payslip.ssc_contribution.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td className="py-2">FSS (Tax)</td>
                                <td className="text-center py-2">Single</td>
                                <td className="text-right py-2"></td>
                                <td className="text-right py-2">€{payslip.tax_deducted.toFixed(2)}</td>
                            </tr>
                        </tbody>
                        <tfoot className="border-t-2 border-gray-800 bg-gray-50 print:bg-transparent">
                            <tr>
                                <td className="py-3 font-bold">Total</td>
                                <td className="py-3"></td>
                                <td className="text-right py-3 font-bold">€{payslip.gross_pay.toFixed(2)}</td>
                                <td className="text-right py-3 font-bold text-red-600 dark:text-red-400">-€{(payslip.tax_deducted + payslip.ssc_contribution).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Net Pay */}
                <div className="flex justify-end mb-12">
                    <div className="bg-gray-900 text-white p-6 rounded-xl print:bg-transparent print:text-black print:border-2 print:border-black">
                        <p className="text-xs uppercase tracking-widest font-bold mb-2 opacity-70">Net Pay</p>
                        <p className="text-4xl font-black">€{payslip.net_pay.toFixed(2)}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-300 pt-4 text-center text-xs text-gray-500">
                    <p>Generated by Restin HR on {new Date().toLocaleDateString()}</p>
                    <p>This is a computer-generated document and requires no signature.</p>
                </div>

                {/* Print Trigger */}
                <div className="fixed bottom-8 right-8 print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2"
                    >
                        Print Payslip
                    </button>
                </div>
            </div>
        </PermissionGate>
    );
}