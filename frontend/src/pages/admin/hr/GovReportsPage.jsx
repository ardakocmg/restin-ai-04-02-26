import React, { useState } from 'react';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Building2, Users, Calendar, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';




export default function GovReportsPage() {
    const [year, setYear] = useState('2026');
    const [loading, setLoading] = useState(false);
    const [fs7Data, setFs7Data] = useState(null);
    const [runs, setRuns] = useState([]);
    const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

    useEffect(() => {
        loadData();
    }, [year]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load FS7 Data (Annual Summary)
            const fs7Res = await api.get(`/venues/${venueId}/hr/payroll/reports/fs7/${year}`);
            setFs7Data(fs7Res.data);

            // Load Payroll Runs for FS5 (Monthly)
            // We need a list of runs to show FS5s for. Assuming /runs endpoint exists or we filter
            const runsRes = await api.get(`/venues/${venueId}/hr/payroll/runs`); // Assuming this exists
            setRuns(runsRes.data.filter(r => r.period_end.endsWith(year))); // Filter client side for now
        } catch (error) {
            console.error("Failed to load report data", error);
            // Fallback for demo if backend empty
            setFs7Data(null);
        } finally {
            setLoading(false);
        }
    }

    const handleDownload = async (reportType, id = null) => {
        toast.info(`Generating ${reportType}...`);
        try {
            let endpoint = '';
            let filename = `Report.pdf`;

            if (reportType === 'FS5') {
                endpoint = `/venues/${venueId}/hr/payroll/reports/fs5/${id}/pdf`;
                filename = `FS5_${id}.pdf`;
            } else if (reportType === 'FS7') {
                // Note: FS7 doesn't have a PDF endpoint in backend yet, strictly data, but let's assume we add one or just show data
                toast.warning("FS7 PDF Generation not yet enabled on server. Data is visible below.");
                return;
            } else if (reportType === 'FS3 Bulk') {
                endpoint = `/venues/${venueId}/hr/payroll/reports/fs3/${year}/pdf`;
                filename = `FS3_Pack_${year}.zip`;
            }

            if (!endpoint) return;

            const response = await api.get(endpoint, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();

            toast.success(`${reportType} downloaded successfully`);
        } catch (e) {
            console.error(e);
            toast.error("Download failed");
        }
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
                        {loading && <Loader2 className="animate-spin text-white" />}

                        {!loading && runs.length === 0 && (
                            <Card className="bg-zinc-900 border-zinc-800"><div className="p-6 text-zinc-500">No payroll runs found for {year}</div></Card>
                        )}

                        <div className="grid gap-4">
                            {runs.map((run) => (
                                <Card key={run.id} className="bg-zinc-900 border-zinc-800">
                                    <div className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400">
                                                <Calendar className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{run.run_name || 'Payroll Run'}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant={run.state === 'committed' ? 'secondary' : 'outline'}>
                                                        {run.state?.toUpperCase()}
                                                    </Badge>
                                                    <span className="text-zinc-500 text-sm">Period: {run.period_start} - {run.period_end}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button onClick={() => handleDownload('FS5', run.id)} variant="outline">
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
                                    {fs7Data ? (
                                        <div className="p-4 bg-zinc-800/50 rounded-lg space-y-2 text-sm text-zinc-400">
                                            <div className="flex justify-between">
                                                <span>Total Gross Emoluments</span>
                                                <span className="text-white font-mono">€{fs7Data.total_gross_emoluments.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Total FSS Tax</span>
                                                <span className="text-white font-mono">€{fs7Data.total_fss_tax.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Total SSC</span>
                                                <span className="text-white font-mono">€{fs7Data.total_ssc.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between border-t border-zinc-700 pt-2 mt-2">
                                                <span className="font-bold">Total Due</span>
                                                <span className="text-white font-mono font-bold">€{fs7Data.total_due.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-zinc-500">No Data Available</div>
                                    )}
                                    <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => handleDownload('FS7')}>
                                        <Download className="mr-2 h-4 w-4" /> Generate FS7 Data
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
                                    <CardDescription>Individual forms for all employees</CardDescription>
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
