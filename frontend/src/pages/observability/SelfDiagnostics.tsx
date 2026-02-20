import React, { useState } from 'react';
import { logger } from '@/lib/logger';

import { useVenue } from '../../context/VenueContext';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { Button } from '../../components/ui/button';

import { Badge } from '../../components/ui/badge';

import { Play, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

export default function SelfDiagnostics() {
  const { activeVenue } = useVenue();
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);

  const runDiagnostics = async () => {
    try {
      setRunning(true);
      const res = await api.post(`/system/diagnostics/run?venue_id=${activeVenue.id}`);
      setReport(res.data?.data);
    } catch (error: any) {
      logger.error('Diagnostics error:', error);
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'OK') return <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />;
    if (status === 'WARN') return <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />;
    return <XCircle className="h-16 w-16 text-red-500 mx-auto" />;
  };

  const getStatusBadge = (status) => {
    if (status === 'OK') return <Badge className="bg-green-100 text-green-700">PASS</Badge>;
    if (status === 'WARN') return <Badge className="bg-orange-100 text-orange-700">WARN</Badge>;
    return <Badge variant="destructive">FAIL</Badge>;
  };

  return (
    <PageContainer
      title="Self-Diagnostics"
      description="One-click comprehensive system diagnosis"
    >
      <div className="text-center mb-8">
        <Button
          onClick={runDiagnostics}
          disabled={running}
          size="lg"
          className="px-8"
        >
          {running ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Run Full System Diagnostics
            </>
          )}
        </Button>
      </div>

      {report && (
        <>
          <div className="mb-8 text-center">
            {getStatusIcon(report.overall_status)}
            <h2 className="text-4xl font-black text-foreground mt-4 tracking-tighter">
              System Status: {report.overall_status}
            </h2>
            <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest italic">
              Reported: {new Date(report.created_at).toLocaleString()}
            </p>
          </div>

          {report.failed_checks && report.failed_checks.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Failed Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.failed_checks.map((check, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground">{check.check}</span>
                        {getStatusBadge(check.status)}
                      </div>
                      <p className="text-sm text-slate-700">{check.details || check.error}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {report.suggested_actions && report.suggested_actions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Suggested Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {report.suggested_actions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                      <span className="text-sm text-slate-700">{action}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </PageContainer>
  );
}