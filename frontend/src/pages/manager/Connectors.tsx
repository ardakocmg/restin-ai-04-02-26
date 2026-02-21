import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Plug, Activity } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function ConnectorsPage() {
  const { activeVenue } = useVenue();
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadConnectors();
    }
  }, [activeVenue?.id]);

  const loadConnectors = async () => {
    try {
      const res = await api.get(`/connectors?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } }));
      setConnectors(res.data?.data || []);
    } catch (error) {
      logger.error('Connectors error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="API Connectors" description="Third-party integrations and webhooks">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Active Connectors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connectors.length === 0 ? (
            <p className="text-center py-8 text-slate-500">{"No "}connectors configured. Enable API Connectors in venue settings.</p>
          ) : (
            <div className="space-y-3">
              {connectors.map(conn => (
                <div key={conn.id} className="p-4 bg-background rounded border flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">{conn.name}</span>
                    <p className="text-sm text-slate-600">{conn.type}</p>
                  </div>
                  <Badge variant={conn.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {conn.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
