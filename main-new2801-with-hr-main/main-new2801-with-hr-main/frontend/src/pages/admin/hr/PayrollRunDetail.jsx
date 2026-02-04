import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft, Download, Lock, Send, Printer,
    FileText, CheckCircle2, AlertCircle, Building2
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function PayrollRunDetail() {
    const { runId } = useParams();
    const navigate = useNavigate();
    const [run, setRun] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRunDetails();
    }, [runId]);

    const fetchRunDetails = async () => {
        try {
            const response = await api.get(`/hr/payroll/runs/${runId}`);
            setRun(response.data);
        } catch (error) {
            console.error("Failed to fetch run details", error);
            toast.error("Could not load payroll run details");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPayslip = async (employeeId) => {
        const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull'; // Should use context or fallback
        try {
            toast.info("Generating PDF...");
            // Use current wrapper pattern if necessary, or raw axios for blob
            // Using raw api.get with responseType blob
            const response = await api.get(`/venues/${venueId}/hr/payroll-mt/run/${runId}/payslip/${employeeId}/pdf`, { responseType: 'blob' });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Payslip_${employeeId}.pdf`); // Filename usually set by Content-Disposition, but we ensure one here
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success("Payslip downloaded");
        } catch (error) {
            console.error("Failed to download payslip", error);
            toast.error("Failed to generate PDF");
        }
    };

    if (loading) {
        return (
            <PageContainer title="Loading Payroll..." description="Fetching secure data">
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            </PageContainer>
        );
    }

    if (!run) {
        return (
            <PageContainer title="Not Found" description="Payroll run not found">
                <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                    <AlertCircle className="h-12 w-12 text-red-500" />
                    <h3 className="text-xl font-bold text-white">Run Not Found</h3>
                    <Button onClick={() => navigate('/admin/hr/payroll')}>Back to Payroll</Button>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title={run.run_name}
            description={`${run.period_start} - ${run.period_end} • ${run.state}`}
            actions={
                <>
                    <Button variant="outline" onClick={() => navigate('/admin/hr/payroll')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button variant="outline" className="border-green-500/20 text-green-500 hover:bg-green-500/10">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Validate
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-500">
                        <Lock className="mr-2 h-4 w-4" /> Finalize & Lock
                    </Button>
                </>
            }
        >
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-6">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Cost</p>
                            <div className="text-2xl font-bold text-white mt-2">€{(run.total_gross + 1200).toLocaleString()}</div> {/* Mock Employer Cost */}
                            <p className="text-[10px] text-zinc-500 mt-1">Includes SSC contribution</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-6">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Gross Pay</p>
                            <div className="text-2xl font-bold text-zinc-200 mt-2">€{run.total_gross.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-6">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Tax (FSS)</p>
                            <div className="text-2xl font-bold text-red-400 mt-2">€{run.total_tax.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-6">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Net Payable</p>
                            <div className="text-2xl font-bold text-green-400 mt-2">€{run.total_net.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Payslip Grid */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="border-b border-zinc-800 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold text-white">Employee Payslips</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm"><Printer className="h-4 w-4 mr-2" /> Print All</Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        window.location.href = `http://localhost:8000/hr/payroll/runs/${runId}/sepa-xml`;
                                        toast.success("Downloading SEPA XML for Bank Upload");
                                    }}
                                >
                                    <Download className="h-4 w-4 mr-2" /> Export Bank File (SEPA)
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-800/50 text-zinc-400 uppercase text-[10px] tracking-wider font-bold">
                                <tr>
                                    <th className="px-6 py-3">Employee</th>
                                    <th className="px-6 py-3 text-right">Basic Pay</th>
                                    <th className="px-6 py-3 text-right">Overtime</th>
                                    <th className="px-6 py-3 text-right">Gross</th>
                                    <th className="px-6 py-3 text-right">Tax</th>
                                    <th className="px-6 py-3 text-right">SSC</th>
                                    <th className="px-6 py-3 text-right">Net Pay</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {run.payslips.map((slip) => (
                                    <tr key={slip.employee_code} className="hover:bg-zinc-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-xs ring-1 ring-blue-500/30">
                                                    {slip.employee_name.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{slip.employee_name}</div>
                                                    <div className="text-xs text-zinc-500">{slip.employee_role} • {slip.employee_code}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-zinc-300">€{slip.basic_pay.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-zinc-300">€{slip.overtime_pay.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-white font-medium">€{slip.gross_pay.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-red-300">-€{slip.tax_deducted.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-red-300">-€{slip.ssc_contribution.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono text-green-400 font-bold text-base">€{slip.net_pay.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 hover:bg-zinc-700 rounded-lg"
                                                title="Download Payslip PDF"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadPayslip(slip.employee_id || slip.employee_code);
                                                }}
                                            >
                                                <Printer className="h-4 w-4 text-zinc-400 group-hover:text-white" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </PageContainer>
    );
}
