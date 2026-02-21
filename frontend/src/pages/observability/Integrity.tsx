import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useVenue } from '../../context/VenueContext';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { Badge } from '../../components/ui/badge';

import { Button } from '../../components/ui/button';

import DataTable from '../../components/shared/DataTable';

import { Play, Shield, AlertTriangle } from 'lucide-react';

export default function IntegrityPage() {
  const { activeVenue } = useVenue();
  const [runs, setRuns] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadIntegrityData();
    }
  }, [activeVenue?.id]);

  const loadIntegrityData = async () => {
    try {
      const [runsRes, findingsRes] = await Promise.all([
        api.get(`/system/integrity/runs?venue_id=${activeVenue.id}`),
        api.get(`/system/integrity/findings?venue_id=${activeVenue.id}`)
      ]);

      setRuns(runsRes.data?.data || []);
      setFindings(findingsRes.data?.data || []);
    } catch (error: any) {
      logger.error('Integrity data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const runChecks = async () => {
    try {
      await api.post(`/system/integrity/run?venue_id=${activeVenue.id}`, {});
      await loadIntegrityData();
    } catch (error: any) {
      logger.error('Run checks error:', error);
    }
  };

  const openFindings = findings.filter(f => f.status === 'OPEN');

  return (
    <PageContainer
      title="Integrity Checks"
      description="System integrity validation and findings"
      actions={
        <Button onClick={runChecks} size="sm">
          <Play className="h-4 w-4 mr-2" />
          Run Checks Now
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Open Findings</p>
                <p className="text-2xl font-black text-red-500">{openFindings.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Runs</p>
              <p className="text-2xl font-black text-foreground">{runs.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Last Run</p>
              <p className="text-sm font-black text-foreground">
                {runs[0] ? new Date(runs[0].started_at).toLocaleString() : 'Never'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {runs.slice(0, 5).map(run => (
                <div key={run.run_id} className="p-3 bg-background rounded flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{run.run_id.substring(0, 8)}</span>
                    <p className="text-xs text-slate-600">{new Date(run.started_at).toLocaleString()}</p>
                  </div>
                  <Badge variant={run.status === 'SUCCESS' ? 'outline' : 'destructive'}>
                    {run.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {openFindings.length === 0 ? (
                <div className="text-center py-8 text-green-600 dark:text-green-400">
                  <Shield className="h-12 w-12 mx-auto mb-2" />
                  <p>No open findings</p>
                </div>
              ) : (
                openFindings.slice(0, 5).map(f => (
                  <div key={f.finding_id} className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-orange-700">{f.severity}</Badge>
                      <span className="text-xs text-slate-600">{f.check_key}</span>
                    </div>
                    <p className="text-sm text-foreground">{f.title}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}