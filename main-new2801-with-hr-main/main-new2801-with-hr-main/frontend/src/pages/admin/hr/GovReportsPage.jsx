import React, { useState } from 'react';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Building2, Users, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function GovReportsPage() {
    const [year, setYear] = useState('2026');
    const [loading, setLoading] = useState(false);

    const handleDownload = (reportType) => {
        toast.info(`Generating ${reportType} Report...`);
        // Mock download - in real app would trigger PDF download
        setTimeout(() => toast.success(`${reportType} Report downloaded successfully`), 1500);
    };

    return (
        <PageContainer title="Government Reporting" description="CFR Official Forms (FS3, FS5, FS7)">
            <div className="space-y-6">
                <Tabs defaultValue="monthly" className="w-full">
                    <TabsList className="bg-zinc-800 border-zinc-700">
                        <TabsTrigger value="monthly">Monthly Returns (FS5)</TabsTrigger>
                        <TabsTrigger value="annual">Annual Returns (FS3 & FS7)</TabsTrigger>
                    </TabsList>

                    <TabsContent value="monthly" className="mt-6 space-y-4">
                        <h3 className="text-lg font-bold text-white mb-4">FS5 - Monthly Payer's Receipt</h3>
                        <div className="grid gap-4">
                            {[
                                { month: 'January', status: 'Submitted', amount: '€12,450.00' },
                                { month: 'February', status: 'Pending', amount: '€12,300.00' }
                            ].map((item, idx) => (
                                <Card key={idx} className="bg-zinc-900 border-zinc-800">
                                    <div className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{item.month} {year}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant={item.status === 'Submitted' ? 'secondary' : 'outline'}>
                                                        {item.status}
                                                    </Badge>
                                                    <span className="text-zinc-500 text-sm">Total Due: {item.amount}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button onClick={() => handleDownload('FS5')} variant="outline">
                                            <Download className="mr-2 h-4 w-4" /> Download FS5
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="annual" className="mt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* FS7 Card */}
                            <Card className="bg-zinc-900 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5 text-purple-500" />
                                        FS7 Annual Reconciliation
                                    </CardTitle>
                                    <CardDescription>Aggregate summary for {year}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 bg-zinc-800/50 rounded-lg space-y-2 text-sm text-zinc-400">
                                        <div className="flex justify-between">
                                            <span>Total Gross Emoluments</span>
                                            <span className="text-white font-mono">€148,500.00</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Total FSS Tax</span>
                                            <span className="text-white font-mono">€14,850.00</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Total SSC</span>
                                            <span className="text-white font-mono">€14,850.00</span>
                                        </div>
                                    </div>
                                    <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => handleDownload('FS7')}>
                                        <Download className="mr-2 h-4 w-4" /> Generate FS7
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* FS3 Card */}
                            <Card className="bg-zinc-900 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-green-500" />
                                        FS3 Employee Statements
                                    </CardTitle>
                                    <CardDescription>Individual forms for all 42 employees</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 bg-zinc-800/50 rounded-lg text-sm text-zinc-400">
                                        <p>Generates individual PDF statements for each employee for the tax year {year}. Used for personal tax returns.</p>
                                    </div>
                                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleDownload('FS3 Bulk')}>
                                        <Download className="mr-2 h-4 w-4" /> Download Bulk FS3s
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </PageContainer>
    );
}
