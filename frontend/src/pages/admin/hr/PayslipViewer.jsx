import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '../../../layouts/PageContainer';
import PayslipDocument from '../../../components/payroll/PayslipDocument';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Download, Mail, Printer, ArrowLeft, Calendar, Image } from 'lucide-react';
import axios from 'axios';
import { exportToPdf, exportToJpeg } from '../../../lib/exportUtils';

export default function PayslipViewer() {
    const { employeeId, period } = useParams();
    const navigate = useNavigate();
    const [payslipData, setPayslipData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadPayslip();
    }, [employeeId, period]);

    const loadPayslip = async () => {
        try {
            setLoading(true);

            // For demo purposes, use mock data for Arda KOC
            const mockPayslip = {
                employee: {
                    name: 'ARDA KOC (KOC)',
                    id_number: '0307741A',
                    ss_number: 'D70158083',
                    pe_number: '456398',
                    address: {
                        line1: '23',
                        line2: 'Triq In-Noxagha',
                        city: 'Mellieha',
                        country: 'Malta'
                    },
                    department: 'OTHER',
                    section: '-',
                    unit: '-',
                    grade: '-',
                    occupation: 'IN HOUSE STRATEGIST',
                    occupation_roll: 'Dec 25 (2025-5/12)',
                    company: {
                        name: 'Corinthia Hotel',
                        address: 'St. Georges Bay',
                        city: 'St. Julians',
                        postal_code: 'STJ 3301',
                        country: 'MT'
                    }
                },
                period: {
                    start: '01/12/2025',
                    end: '31/12/2025',
                    pay_date: '05/01/2026',
                    display: "Dec'25"
                },
                basicSalary: {
                    hours: 32.00,
                    rate: 25.1300000,
                    amount: 804.16
                },
                adjustments: [
                    {
                        type: 'Government Bonus',
                        date: '1.00 December',
                        rate: 25.6287817,
                        amount: 25.83
                    }
                ],
                grossTotal: 829.99,
                tax: {
                    type: 'Part Time Standard Tax Rate',
                    amount: 83.00
                },
                socialSecurity: 0.00,
                netPay: 746.99,
                totalsToDate: {
                    gross: 9987.00,
                    ot_con_gross: 0.00,
                    ot_con_hours: 0.00,
                    social_security: 0.00,
                    tax_fs5: 999.00,
                    tax_ot_con: 0.00,
                    tax_arrears: 0.00,
                    tax_share_opt: 0.00
                },
                benefits: {
                    category_1: 0.00,
                    category_2: 0.00,
                    category_3: 0.00,
                    share_opt: 0.00
                },
                leaveType: '',
                employmentDate: '22/08/2024',
                remarks: `SKILLS PASS - Should you fail your third attempt for the Skills Pass, the portal will automatically block you for a period of 3 months before you can try again so kindly start your skills pass process as soon as possible so you have sufficient time to complete the necessary attempts considering the three month suspension period after the third failure.\n\nADVANCES - Any request for a salary advance is to be submitted via email to the HR Department on hr@marvingauci.com. The HR Department will then seek authorization to issue the advance. Requests must reach the HR Department three working days before the funds are needed. Note that Saturdays and Sundays are not counted as working days. No requests will be accepted two days prior to the end of the month and five days after the first of the month. Advances should only be requested in case of emergencies. These requests should not become a regular monthly occurrence and should only be made in situation of extreme need.`
            };

            setPayslipData(mockPayslip);
        } catch (error) {
            console.error('Failed to load payslip:', error);
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
            // In production, this would call the backend to send email
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
            alert('Payslip email sent successfully to employee!');
        } catch (error) {
            console.error('Failed to send email:', error);
            alert('Failed to send email. Please try again.');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <PageContainer title="Loading Payslip...">
                <div className="flex items-center justify-center h-64">
                    <div className="text-zinc-400">Loading payslip data...</div>
                </div>
            </PageContainer>
        );
    }

    if (!payslipData) {
        return (
            <PageContainer title="Payslip Not Found">
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="text-zinc-400 mb-4">Payslip not found</div>
                        <Button onClick={() => navigate('/admin/hr/payroll')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Payroll
                        </Button>
                    </CardContent>
                </Card>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title={`Payslip - ${payslipData.employee.name}`}
            description={`Period: ${payslipData.period.start} to ${payslipData.period.end}`}
            actions={
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/admin/hr/payroll')}
                        className="bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        className="bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800"
                    >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPDF}
                        className="bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadJPEG}
                        className="bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800"
                    >
                        <Image className="h-4 w-4 mr-2" />
                        JPEG
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendEmail}
                        disabled={sending}
                        className="bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
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
                        <div className="text-center p-4 bg-zinc-900 rounded-lg">
                            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Gross Total</div>
                            <div className="text-2xl font-bold text-white">€ {payslipData.grossTotal.toFixed(2)}</div>
                        </div>
                        <div className="text-center p-4 bg-zinc-900 rounded-lg">
                            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Tax</div>
                            <div className="text-2xl font-bold text-red-400">€ {payslipData.tax.amount.toFixed(2)}</div>
                        </div>
                        <div className="text-center p-4 bg-zinc-900 rounded-lg">
                            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Social Security</div>
                            <div className="text-2xl font-bold text-yellow-400">€ {payslipData.socialSecurity.toFixed(2)}</div>
                        </div>
                        <div className="text-center p-4 bg-green-600 rounded-lg">
                            <div className="text-xs text-white uppercase tracking-widest mb-1">Net Pay</div>
                            <div className="text-2xl font-bold text-white">€ {payslipData.netPay.toFixed(2)}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </PageContainer>
    );
}
