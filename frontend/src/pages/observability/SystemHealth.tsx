import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useVenue } from '../../context/VenueContext';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { Badge } from '../../components/ui/badge';

import { Button } from '../../components/ui/button';

import { Activity, Database, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function SystemHealth() {
  const { activeVenue } = useVenue();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [health, setHealth] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadHealth();
    }
  }, [activeVenue?.id]);

  const loadHealth = async () => {
    try {
      const res = await api.get(`/system/health?venue_id=${activeVenue.id}`);
      setHealth(res.data?.data);
    } catch (error: any) {
      logger.error('Health check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOverallBadge = (overall: string) => {
    if (overall === 'OK') return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>;
    if (overall === 'DEGRADED') return <Badge className="bg-orange-100 text-orange-700"><AlertTriangle className="h-3 w-3 mr-1" />DEGRADED</Badge>;
    return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />DOWN</Badge>;
  };

  return (
    <PageContainer
      title="System Health"
      description="Real-time system status and health monitoring"
      actions={
        <Button onClick={loadHealth} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      }
    >
      {health && (
        <>
          <div className="mb-6 bg-card/40 p-6 rounded-xl border border-border backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold text-muted-foreground uppercase tracking-tighter">Overall Status</span>
              {getOverallBadge(health.overall)}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium uppercase tracking-widest italic">
              Last sync: {new Date(health.last_updated_at).toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Hard Checks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(health.hard || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm font-medium">{key}</span>
                    <Badge variant={value === 'OK' ? 'outline' : 'destructive'}>
                      {value as string}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Soft Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(health.soft || {}).map(([key, metric]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div>
                      <span className="text-sm font-medium">{key}</span>
                      <p className="text-xs text-slate-600">{metric.value}</p>
                    </div>
                    <Badge
                      variant={metric.status === 'OK' ? 'outline' : metric.status === 'WARN' ? 'secondary' : 'destructive'}
                      className={metric.status === 'OK' ? 'bg-green-50 text-green-700' : ''}
                    >
                      {metric.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageContainer>
  );
}