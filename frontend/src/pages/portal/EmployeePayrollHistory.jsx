import React, { useState, useEffect } from 'react';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Printer, Eye, Calendar, Award, ShieldCheck, Image, FileSignature, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import FS3Document from '@/components/payroll/FS3Document';
import SkillsPassDocument from '@/components/payroll/SkillsPassDocument';
import EngagementLetter from '@/components/payroll/EngagementLetter';
import ExitTemplate from '@/components/payroll/ExitTemplate';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { exportToPdf, exportToJpeg } from '@/lib/exportUtils';
import { useMultiVenue } from '@/context/MultiVenueContext';

export default function EmployeePayrollHistory() {
    const [payslips, setPayslips] = useState([]);
    const [fs3s, setFs3s] = useState([]);
    const [skillsPass, setSkillsPass] = useState(null);
    const [contracts, setContracts] = useState([]);
    const [exitDocs, setExitDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [docType, setDocType] = useState(null);
    const { currentVenue } = useMultiVenue();
    const navigate = useNavigate();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setTimeout(() => {
            setPayslips([
                { id: 'p1', month: 'December 2025', net: 746.99, date: '05/01/2026', status: 'PAID' },
                { id: 'p2', month: 'November 2025', net: 820.50, date: '05/12/2025', status: 'PAID' },
                { id: 'p3', month: 'October 2025', net: 795.00, date: '05/11/2025', status: 'PAID' },
            ]);
            setFs3s([
                { id: 'f1', year: 2024, total_gross: 9995.00, tax: 1000.00, date: '26/02/2025' },
                { id: 'f2', year: 2023, total_gross: 8500.00, tax: 850.00, date: '15/02/2024' },
            ]);
            setSkillsPass({
                fullName: 'ARDA KOC',
                candidateNumber: '40379',
                jobFamily: 'Revenue Analyst',
                level: 'RED',
                issuanceDate: '07-Aug-2025',
                batchNumber: '69',
                peNumber: '456398',
                validUntil: '07-Aug-2027'
            });
            setContracts([
                { id: 'c1', title: 'Letter of Engagement', date: '22/08/2024', status: 'SIGNED' }
            ]);
            setExitDocs([
                { id: 'e1', title: 'Quick Exit Settlement', date: '31/01/2026', status: 'FINALIZED' }
            ]);
            setLoading(false);
        }, 500);
    };

    const handleViewFS3 = (fs3) => {
        const mockFs3Data = {
            year: fs3.year,
            payee: { surname: 'KOC', firstName: 'ARDA', address: '23, Triq In-Nixxiegha, Mellieha', locality: 'Mellieha', idNumber: '0307741A', ssNumber: 'D70158083' },
            payer: { name: 'Caviar & Bull', address: 'Corinthia Hotel, St. Georges Bay', locality: 'St. Julians, STJ 3301, MT', peNumber: '456398', principalName: 'Antoinette Corby', principalPosition: 'CFO' },
            period: { start: '22/08/2024', end: '31/12/2024' },
            emoluments: { c1: 0, c1a: 0, c1b: 0, c2: 9995, c3: 0, c3a: 0, c4: 9995 },
            deductions: { d1: 0, d1a: 0, d2: 1000, d3: 0, d3a: 0, d4: 1000 },
            sscTable: [
                { wage: 400.00, number: 5.00, category: 'C', payee: 0.00, payer: 0.00, total: 0.00, maternity: 6.00 },
                { wage: 385.00, number: 5.00, category: 'C', payee: 0.00, payer: 0.00, total: 0.00, maternity: 5.80 }
            ]
        };
        setSelectedDoc(mockFs3Data);
        setDocType('FS3');
    };

    const handleViewContract = () => {
        setSelectedDoc({
            employeeName: 'Arda Koc',
            address: '23, Triq In-Nixxiegha, Mellieha',
            date: '22nd August 2024',
            idNumber: '0307741A',
            ssNumber: 'D70158083',
            jobTitle: 'In House Strategist'
        });
        setDocType('Contract');
    };

    const handleViewExit = () => {
        setSelectedDoc({
            employeeName: 'Arda Koc',
            employeeId: 'emp-40379',
            exitDate: '31st January 2026',
            reason: 'Resignation'
        });
        setDocType('Exit');
    };

    const handleDownloadPDF = async () => {
        if (!selectedDoc) return;
        const mapping = {
            'FS3': ['fs3-to-export', `FS3_${selectedDoc.year}_Arda_KOC.pdf`],
            'SkillsPass': ['skillspass-cert-to-export', 'SkillsPass_Certificate_Arda_KOC.pdf'],
            'Contract': ['contract-to-export', 'Engagement_Letter_Arda_KOC.pdf'],
            'Exit': ['exit-to-export', 'Exit_Settlement_Arda_KOC.pdf']
        };
        const [id, name] = mapping[docType] || [];
        if (id) await exportToPdf(id, name);
    };

    const handleDownloadJPEG = async () => {
        if (!selectedDoc) return;
        const mapping = {
            'FS3': ['fs3-to-export', `FS3_${selectedDoc.year}_Arda_KOC.jpg`],
            'SkillsPass': ['skillspass-cert-to-export', 'SkillsPass_Certificate_Arda_KOC.jpg'],
            'Contract': ['contract-to-export', 'Engagement_Letter_Arda_KOC.jpg'],
            'Exit': ['exit-to-export', 'Exit_Settlement_Arda_KOC.jpg']
        };
        const [id, name] = mapping[docType] || [];
        if (id) await exportToJpeg(id, name);
    };

    if (loading) return <div className="p-8">Loading document history...</div>;

    return (
        <PageContainer title="Employee Documents" description="Access your payslips, legal contracts, and certifications">
            <div className="p-6 space-y-6">
                <Tabs defaultValue="payslips" className="w-full">
                    <TabsList className="bg-zinc-900 border-zinc-800">
                        <TabsTrigger value="payslips" className="data-[state=active]:bg-blue-600">Payslips</TabsTrigger>
                        <TabsTrigger value="fs3" className="data-[state=active]:bg-blue-600">FS3 Statements</TabsTrigger>
                        <TabsTrigger value="contracts" className="data-[state=active]:bg-purple-600">Contracts & Exit</TabsTrigger>
                        <TabsTrigger value="certs" className="data-[state=active]:bg-orange-600">Certificates</TabsTrigger>
                    </TabsList>

                    <TabsContent value="payslips" className="mt-6 space-y-4">
                        {payslips.map(p => (
                            <Card key={p.id} className="bg-zinc-900 border-zinc-800">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <FileText className="text-blue-500" />
                                        <div><h4 className="font-bold text-white">{p.month}</h4><p className="text-xs text-zinc-500">Paid on {p.date}</p></div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/hr/payroll/view/emp-arda-koc/dec-2025`)}><Eye className="h-4 w-4 mr-2" /> View</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="contracts" className="mt-6 space-y-4">
                        {contracts.map(c => (
                            <Card key={c.id} className="bg-zinc-900 border-zinc-800 border-l-4 border-l-purple-600">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <FileSignature className="text-purple-500" />
                                        <div><h4 className="font-bold text-white uppercase tracking-wider">{c.title}</h4><p className="text-xs text-zinc-500">Signed on {c.date}</p></div>
                                    </div>
                                    <Button size="sm" className="bg-purple-600 hover:bg-purple-500" onClick={handleViewContract}><Eye className="h-4 w-4 mr-2" /> View Contract</Button>
                                </CardContent>
                            </Card>
                        ))}
                        {exitDocs.map(e => (
                            <Card key={e.id} className="bg-zinc-900 border-zinc-800 border-l-4 border-l-red-600">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <LogOut className="text-red-500" />
                                        <div><h4 className="font-bold text-white uppercase tracking-wider">{e.title}</h4><p className="text-xs text-zinc-500">Issued on {e.date}</p></div>
                                    </div>
                                    <Button size="sm" className="bg-red-600 hover:bg-red-500" onClick={handleViewExit}><Eye className="h-4 w-4 mr-2" /> View Exit Form</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="certs" className="mt-6 space-y-4">
                        {skillsPass && (
                            <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-orange-600">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <ShieldCheck className="text-orange-500" />
                                        <div><h4 className="font-bold text-white uppercase tracking-wider">Skills Pass: Tourism</h4><p className="text-xs text-zinc-500">Valid until {skillsPass.validUntil}</p></div>
                                    </div>
                                    <Button size="sm" className="bg-orange-600" onClick={() => { setSelectedDoc(skillsPass); setDocType('SkillsPass'); }}><Eye className="h-4 w-4 mr-2" /> Open</Button>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="fs3" className="mt-6 space-y-4">
                        {fs3s.map(f => (
                            <Card key={f.id} className="bg-zinc-900 border-zinc-800 border-l-4 border-l-blue-600">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4"><Award className="text-yellow-500" /><div><h4 className="font-bold text-white">FS3 Statement {f.year}</h4></div></div>
                                    <Button size="sm" className="bg-blue-600" onClick={() => handleViewFS3(f)}><Eye className="h-4 w-4 mr-2" /> Open FS3</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
                <DialogContent className="max-w-[220mm] bg-zinc-900 border-zinc-800 p-0 overflow-y-auto max-h-[90vh]">
                    <div className="sticky top-0 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 p-4 z-10 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white uppercase tracking-widest">{docType} Document</h2>
                        <div className="flex gap-2">
                            <Button onClick={() => window.print()} variant="outline" size="sm"><Printer className="h-4 w-4 mr-2" /> Print</Button>
                            <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="bg-zinc-800"><Download className="h-4 w-4 mr-2" /> PDF</Button>
                            <Button onClick={handleDownloadJPEG} variant="outline" size="sm" className="bg-zinc-800"><Image className="h-4 w-4 mr-2" /> JPEG</Button>
                        </div>
                    </div>
                    <div className="p-8 bg-zinc-200">
                        {docType === 'FS3' && <FS3Document fs3Data={selectedDoc} venue={currentVenue} />}
                        {docType === 'SkillsPass' && <SkillsPassDocument data={selectedDoc} venue={currentVenue} />}
                        {docType === 'Contract' && <EngagementLetter data={{ ...selectedDoc, venue: currentVenue }} />}
                        {docType === 'Exit' && <ExitTemplate data={{ ...selectedDoc, venue: currentVenue }} />}
                    </div>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
