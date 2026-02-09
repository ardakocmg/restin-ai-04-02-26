import React, { useState } from 'react';import { logger } from '@/lib/logger';

import { useVenue } from '../../context/VenueContext';import { logger } from '@/lib/logger';

import api from '../../lib/api';import { logger } from '@/lib/logger';

import PageContainer from '../../layouts/PageContainer';import { logger } from '@/lib/logger';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';import { logger } from '@/lib/logger';

import { Button } from '../../components/ui/button';import { logger } from '@/lib/logger';

import { Badge } from '../../components/ui/badge';import { logger } from '@/lib/logger';

import { Play, CheckCircle2, XCircle, Loader2, Award } from 'lucide-react';

import { logger } from '@/lib/logger';
export default function PreGoLive() {
  const { activeVenue } = useVenue();
  const [runs, setRuns] = useState([]);
  const [currentRun, setCurrentRun] = useState(null);
  const [running, setRunning] = useState(false);

  const runCertification = async () => {
    try {
      setRunning(true);
      const res = await api.post(`/ops/pre-go-live/run?venue_id=${activeVenue.id}`);
      setCurrentRun(res.data?.data);
      loadRuns();
    } catch (error) {
      logger.error('Certification error:', error);
    } finally {
      setRunning(false);
    }
  };

  const loadRuns = async () => {
    try {
      const res = await api.get(`/ops/pre-go-live/runs?venue_id=${activeVenue.id}`);
      setRuns(res.data?.data || []);
    } catch (error) {
      logger.error('Load runs error:', error);
    }
  };

  return (
    <PageContainer
      title="Pre-Go-Live Certification"
      description="Venue readiness self-test before launch"
    >
      <div className="text-center mb-8">
        <Button
          onClick={runCertification}
          disabled={running}
          size="lg"
          className="px-8"
        >
          {running ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Running Certification...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Run Pre-Go-Live Certification
            </>
          )}
        </Button>
      </div>

      {currentRun && (
        <div className="mb-8">
          <div className="text-center mb-6">
            {currentRun.status === 'PASS' ? (
              <>
                <Award className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h2 className="text-3xl font-bold text-green-600 dark:text-green-400">PASS</h2>
                <p className="text-slate-600 mt-2">Venue certified for launch!</p>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
                <h2 className="text-3xl font-bold text-red-600 dark:text-red-400">FAIL</h2>
                <p className="text-slate-600 mt-2">Issues detected. Review and fix before launch.</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentRun.checks?.map((check, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    {check.status === 'PASS' ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{check.key}</p>
                      <p className="text-sm text-slate-600">{check.details}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
