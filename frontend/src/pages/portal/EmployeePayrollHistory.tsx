import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

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
        try {
            // Get the current user's employee ID from localStorage or auth context
            const authData = JSON.parse(localStorage.getItem('auth') || '{}');
            const employeeId = authData?.user?.id || 'current';

            const response = await api.get('/hr/employee/documents', {
                params: { employee_id: employeeId }
            });
            const data = response.data;

            setPayslips(data.payslips || []);
            setFs3s(data.fs3_statements || []);
            setSkillsPass(data.skills_pass?.[0] || null);
            setContracts(data.contracts || []);
            setExitDocs(data.exit_documents || []);
        } catch (error) {
            logger.error('Failed to fetch employee documents:', error);
            setPayslips([]);
            setFs3s([]);
            setContracts([]);
            setExitDocs([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewFS3 = (fs3) => {
        // Use real FS3 data from the API response
        setSelectedDoc(fs3);
        setDocType('FS3');
    };

    const handleViewContract = (contract) => {
        // Use real contract data from the API response
        setSelectedDoc(contract || contracts[0]);
        setDocType('Contract');
    };

    const handleViewExit = (exitDoc) => {
        // Use real exit document data from the API response
        setSelectedDoc(exitDoc || exitDocs[0]);
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
                    <TabsList className="bg-card border-border">
                        <TabsTrigger value="payslips" className="data-[state=active]:bg-blue-600">Payslips</TabsTrigger>
                        <TabsTrigger value="fs3" className="data-[state=active]:bg-blue-600">FS3 Statements</TabsTrigger>
                        <TabsTrigger value="contracts" className="data-[state=active]:bg-purple-600">Contracts & Exit</TabsTrigger>
                        <TabsTrigger value="certs" className="data-[state=active]:bg-orange-600">Certificates</TabsTrigger>
                    </TabsList>

                    <TabsContent value="payslips" className="mt-6 space-y-4">
                        {payslips.map(p => (
                            <Card key={p.id} className="bg-card border-border">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <FileText className="text-blue-500" />
                                        <div><h4 className="font-bold text-foreground">{p.month}</h4><p className="text-xs text-muted-foreground">Paid on {p.date}</p></div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/manager/hr/payroll/view/emp-arda-koc/dec-2025`)}><Eye className="h-4 w-4 mr-2" /> View</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="contracts" className="mt-6 space-y-4">
                        {contracts.map(c => (
                            <Card key={c.id} className="bg-card border-border border-l-4 border-l-purple-600">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <FileSignature className="text-purple-500" />
                                        <div><h4 className="font-bold text-foreground uppercase tracking-wider">{c.title}</h4><p className="text-xs text-muted-foreground">Signed on {c.date}</p></div>
                                    </div>
                                    <Button size="sm" className="bg-purple-600 hover:bg-purple-500" onClick={handleViewContract}><Eye className="h-4 w-4 mr-2" /> View Contract</Button>
                                </CardContent>
                            </Card>
                        ))}
                        {exitDocs.map(e => (
                            <Card key={e.id} className="bg-card border-border border-l-4 border-l-red-600">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <LogOut className="text-red-500" />
                                        <div><h4 className="font-bold text-foreground uppercase tracking-wider">{e.title}</h4><p className="text-xs text-muted-foreground">Issued on {e.date}</p></div>
                                    </div>
                                    <Button size="sm" className="bg-red-600 hover:bg-red-500" onClick={handleViewExit}><Eye className="h-4 w-4 mr-2" /> View Exit Form</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="certs" className="mt-6 space-y-4">
                        {skillsPass && (
                            <Card className="bg-card border-border border-l-4 border-l-orange-600">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <ShieldCheck className="text-orange-500" />
                                        <div><h4 className="font-bold text-foreground uppercase tracking-wider">Skills Pass: Tourism</h4><p className="text-xs text-muted-foreground">Valid until {skillsPass.validUntil}</p></div>
                                    </div>
                                    <Button size="sm" className="bg-orange-600" onClick={() => { setSelectedDoc(skillsPass); setDocType('SkillsPass'); }}><Eye className="h-4 w-4 mr-2" /> Open</Button>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="fs3" className="mt-6 space-y-4">
                        {fs3s.map(f => (
                            <Card key={f.id} className="bg-card border-border border-l-4 border-l-blue-600">
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex items-center gap-4"><Award className="text-yellow-500" /><div><h4 className="font-bold text-foreground">FS3 Statement {f.year}</h4></div></div>
                                    <Button size="sm" className="bg-blue-600" onClick={() => handleViewFS3(f)}><Eye className="h-4 w-4 mr-2" /> Open FS3</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
                <DialogContent className="max-w-[220mm] bg-card border-border p-0 overflow-y-auto max-h-[90vh]">
                    <div className="sticky top-0 bg-card/90 backdrop-blur border-b border-border p-4 z-10 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-foreground uppercase tracking-widest">{docType} Document</h2>
                        <div className="flex gap-2">
                            <Button onClick={() => window.print()} variant="outline" size="sm"><Printer className="h-4 w-4 mr-2" /> Print</Button>
                            <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="bg-secondary"><Download className="h-4 w-4 mr-2" /> PDF</Button>
                            <Button onClick={handleDownloadJPEG} variant="outline" size="sm" className="bg-secondary"><Image className="h-4 w-4 mr-2" /> JPEG</Button>
                        </div>
                    </div>
                    <div className="p-8 bg-zinc-200">
                        {docType === 'FS3' && <FS3Document fs3Data={selectedDoc} />}
                        {docType === 'SkillsPass' && <SkillsPassDocument data={selectedDoc} />}
                        {docType === 'Contract' && <EngagementLetter data={{ ...selectedDoc, venue: currentVenue }} />}
                        {docType === 'Exit' && <ExitTemplate data={{ ...selectedDoc, venue: currentVenue }} />}
                    </div>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}