import { logger } from '@/lib/logger';
import { useState } from 'react';

import { useVenue } from '../../context/VenueContext';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import { Card,CardContent } from '../../components/ui/card';

import { Button } from '../../components/ui/button';

import { Badge } from '../../components/ui/badge';

import { AlertTriangle,CheckCircle2,Play,XCircle } from 'lucide-react';

export default function ServiceDayClose() {
  const { activeVenue } = useVenue();
  const [closeStatus, setCloseStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const runChecks = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/ops/service-day-close/status?venue_id=${activeVenue.id}&date=${today}`);
      setCloseStatus(res.data?.data);
    } catch (error) {
      logger.error('Day close error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCheckIcon = (status) => {
    if (status === 'OK') return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
    if (status === 'WARN') return <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
    return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
  };

  return (
    <PageContainer
      title="Service Day Close"
      description="End-of-day checklist and closure"
      actions={
        <Button onClick={runChecks} disabled={loading}>
          <Play className="h-4 w-4 mr-2" />
          Run Checks
        </Button>
      }
    >
      {closeStatus && (
        <>
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold">Status:</span>
              <Badge 
                variant={closeStatus.status === 'READY' ? 'default' : 'destructive'}
                className="text-lg px-4 py-2"
              >
                {closeStatus.status}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {closeStatus.checks?.map((check, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    {getCheckIcon(check.status)}
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{check.label}</p>
                      <p className="text-sm text-slate-600">{check.details}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {closeStatus.status === 'READY' && (
            <div className="mt-6 text-center">
              <Button size="lg" className="px-8">
                Close Service Day
              </Button>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}