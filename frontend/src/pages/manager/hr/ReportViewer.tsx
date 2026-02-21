import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useParams, useNavigate } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import {
    ArrowLeft,
    Download,
    Filter,
    RefreshCw,
    FileText,
    Search,
    ChevronRight
} from 'lucide-react';

import api from '@/lib/api';

import DataTable from '@/components/shared/DataTable';

import PageContainer from '@/layouts/PageContainer';

export default function ReportViewer() {
    const { reportSlug } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (reportSlug) fetchReport();
    }, [reportSlug]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/reporting/hr/${reportSlug}`);
            setReport(response.data);
        } catch (error) {
            logger.error('Failed to fetch report:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#0A0A0B]">
            <div className="flex flex-col items-center gap-4">
                <RefreshCw className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Generating {reportSlug.replace('-', ' ')}...</p>
            </div>
        </div>
    );

    if (!report) return (
        <div className="p-8 text-center text-muted-foreground bg-[#0A0A0B] min-h-screen">
            Report context not found.
            <Button onClick={() => navigate(-1)} variant="ghost" className="mt-4">Go Back</Button>
        </div>
    );

    return (
        <PageContainer
            title={report.title}
            description={`System Audit: ${report.title} generated for ${new Date().toLocaleDateString()}`}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 bg-card/40 p-4 rounded-2xl border border-border backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/manager/hr')}
                            className="hover:bg-white/5 rounded-full p-2"
                        >
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Button>
                        <div>
                            <h3 className="text-foreground font-black uppercase tracking-tighter text-lg">{report.title}</h3>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Analytical Engine</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="border-border bg-card/50 hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest h-10 px-4">
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                        <Button variant="outline" className="border-border bg-card/50 hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest h-10 px-4">
                            <Filter className="h-4 w-4 mr-2" />
                            Parameters
                        </Button>
                    </div>
                </div>

                <DataTable
                    columns={report.columns}
                    data={report.data}
                    loading={false}
                    tableId={`hr-report-${reportSlug}`}
                    emptyMessage="No discrepancies found in this reporting cycle"
                    enableRowSelection={false}
                />

                <div className="flex items-center justify-between pt-6 border-t border-border">
                    <p className="text-[9px] text-foreground font-bold uppercase tracking-widest italic">
                        This report is a point-in-time snapshot. Data may reflect pending synchronizations.
                    </p>
                </div>
            </div>
        </PageContainer>
    );
}