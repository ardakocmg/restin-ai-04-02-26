
import { logger } from '@/lib/logger';
import { useEffect,useState } from 'react';

import { useNavigate,useParams } from 'react-router-dom';

import PageContainer from '../../../layouts/PageContainer';

import PayslipDocument from '../../../components/payroll/PayslipDocument';

import { Button } from '../../../components/ui/button';

import { Card,CardContent,CardHeader,CardTitle } from '../../../components/ui/card';

import { ArrowLeft,Download,Image,Mail,Printer } from 'lucide-react';

import api from '@/lib/api';

import { exportToJpeg,exportToPdf } from '../../../lib/exportUtils';

import PermissionGate from '../../../components/shared/PermissionGate';
import { useAuth } from '../../../context/AuthContext';
import { useVenue } from '../../../context/VenueContext';
import { useAuditLog } from '../../../hooks/useAuditLog';

import { toast } from 'sonner';

export default function PayslipViewer() {
    const { employeeId, period } = useParams();
    const navigate = useNavigate();
    const { activeVenue } = useVenue();
    const { user: _user, isManager: _isManager, isOwner: _isOwner } = useAuth();
    const { logAction } = useAuditLog();
    useEffect(() => {
        logAction('PAYSLIP_VIEWED', 'payslip-viewer');
    }, []);
    const [payslipData, setPayslipData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadPayslip();
    }, [employeeId, period]);

    const loadPayslip = async () => {
        try {
            setLoading(true);

            // Try to load by payslip ID (period may be the payslip id)
            const payslipId = period || employeeId;
            const response = await api.get(`/hr/payslips/${payslipId}`);
            setPayslipData(response.data);
        } catch (error) {
            // Fallback: try listing payslips for the employee and pick latest
            try {
                const listRes = await api.get('/hr/payslips', {
                    params: { employee_id: employeeId }
                });
                const payslips = listRes.data;
                if (Array.isArray(payslips) && payslips.length > 0) {
                    setPayslipData(payslips[0]);
                }
            } catch (fallbackErr: unknown) {
                logger.error('Failed to load payslip:', { error: String(fallbackErr) });
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        const rollId = payslipData.employee.occupation_roll?.match(/\(([^)]+)\)/)?.[1] || '000';
        const empCode = payslipData.employee.name?.match(/\(([^)]+)\)/)?.[1] || 'EMP';
        const fileName = `Payslip (${rollId}) ${empCode}.pdf`;
        await exportToPdf('payslip-to-export', fileName);
    };

    const handleDownloadJPEG = async () => {
        const rollId = payslipData.employee.occupation_roll?.match(/\(([^)]+)\)/)?.[1] || '000';
        const empCode = payslipData.employee.name?.match(/\(([^)]+)\)/)?.[1] || 'EMP';
        const fileName = `Payslip (${rollId}) ${empCode}.jpg`;
        await exportToJpeg('payslip-to-export', fileName);
    };

    const handleSendEmail = async () => {
        try {
            setSending(true);
            await api.post('/payroll/send-payslip-email', {
                payslip_id: payslipData?.id,
                employee_id: payslipData?.employee?.id,
                venue_id: activeVenue?.id
            });
            toast.success('Payslip email sent successfully to employee!');
        } catch (error: unknown) {
            logger.error('Failed to send email:', { error: String(error) });
            toast.error('Failed to send email. Please try again.');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <PageContainer title="Loading Payslip...">
                <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">{"Loading "}payslip data...</div>
                </div>
            </PageContainer>
        );
    }

    if (!payslipData) {
        return (
            <PageContainer title="Payslip Not Found">
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="text-muted-foreground mb-4">Payslip not found</div>
                        <Button onClick={() => navigate('/manager/hr/payroll')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Payroll
                        </Button>
                    </CardContent>
                </Card>
            </PageContainer>
        );
    }

    return (
        <PermissionGate requiredRole="MANAGER">
            <PageContainer
                title={`Payslip - ${payslipData.employee.name}`}
                description={`Period: ${payslipData.period.start} to ${payslipData.period.end}`}
                actions={
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/manager/hr/payroll')}
                            className="bg-card border-border text-secondary-foreground hover:bg-secondary"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            className="bg-card border-border text-secondary-foreground hover:bg-secondary"
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadPDF}
                            className="bg-card border-border text-secondary-foreground hover:bg-secondary"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            PDF
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadJPEG}
                            className="bg-card border-border text-secondary-foreground hover:bg-secondary"
                        >
                            <Image className="h-4 w-4 mr-2" />
                            JPEG
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSendEmail}
                            disabled={sending}
                            className="bg-blue-600 border-blue-500 text-foreground hover:bg-blue-700"
                        >
                            <Mail className="h-4 w-4 mr-2" />
                            {sending ? 'Sending...' : 'Send Email'}
                        </Button>
                    </div>
                }
            >
                {/* Payslip Document */}
                <div className="print:p-0">
                    <PayslipDocument payslipData={payslipData} />
                </div>

                {/* Summary Card (Hidden on Print) */}
                <Card className="mt-6 print:hidden">
                    <CardHeader>
                        <CardTitle className="text-base">Payslip Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-card rounded-lg">
                                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Gross Total</div>
                                <div className="text-2xl font-bold text-foreground">€ {payslipData.grossTotal.toFixed(2)}</div>
                            </div>
                            <div className="text-center p-4 bg-card rounded-lg">
                                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Tax</div>
                                <div className="text-2xl font-bold text-red-400">€ {payslipData.tax.amount.toFixed(2)}</div>
                            </div>
                            <div className="text-center p-4 bg-card rounded-lg">
                                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Social Security</div>
                                <div className="text-2xl font-bold text-yellow-400">€ {payslipData.socialSecurity.toFixed(2)}</div>
                            </div>
                            <div className="text-center p-4 bg-green-600 rounded-lg">
                                <div className="text-xs text-foreground uppercase tracking-widest mb-1">Net Pay</div>
                                <div className="text-2xl font-bold text-foreground">€ {payslipData.netPay.toFixed(2)}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </PageContainer>
        </PermissionGate>
    );
}