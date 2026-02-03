import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Activity, Database, TrendingUp, Clock, Zap } from 'lucide-react';

export default function AdvancedObservability() {
  const { activeVenue } = useVenue();
  const [slowQueries, setSlowQueries] = useState([]);
  const [dataVolume, setDataVolume] = useState([]);
  const [readModelHealth, setReadModelHealth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadData();
    }
  }, [activeVenue?.id]);

  const loadData = async () => {
    try {
      const [slowRes, volRes, healthRes] = await Promise.all([
        api.get(`/system/observability/slow-queries?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/system/observability/data-volume?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/system/observability/read-model-health?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } }))
      ]);
      
      setSlowQueries(slowRes.data?.data || []);
      setDataVolume(volRes.data?.data || []);
      setReadModelHealth(healthRes.data?.data || []);
    } catch (error) {
      console.error('Observability error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Advanced Observability"
      description="Performance, volume, and data health monitoring"
    >
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Query Performance</TabsTrigger>
          <TabsTrigger value="volume">Data Volume</TabsTrigger>
          <TabsTrigger value="health">Read Model Health</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Slow Queries (>800ms)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slowQueries.length === 0 ? (
                <p className="text-center py-8 text-green-600">No slow queries detected</p>
              ) : (
                <div className="space-y-2">
                  {slowQueries.slice(0, 10).map((q, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{q.service_name}.{q.operation}</span>
                        <span className="text-sm text-orange-600 font-bold">{q.duration_ms.toFixed(0)}ms</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{new Date(q.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Collection Sizes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from(new Set(dataVolume.map(d => d.collection))).map(collection => {
                  const latest = dataVolume.filter(d => d.collection === collection).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                  return latest ? (
                    <div key={collection} className="p-3 bg-slate-50 rounded flex items-center justify-between">
                      <span className="text-sm font-medium">{collection}</span>
                      <div className="text-right">
                        <p className="text-sm font-bold">{latest.doc_count.toLocaleString()} docs</p>
                        <p className="text-xs text-slate-600">{latest.storage_mb.toFixed(1)} MB</p>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Read Model Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              {readModelHealth.length === 0 ? (
                <p className="text-center py-8 text-green-600">All read models healthy</p>
              ) : (
                <div className="space-y-2">
                  {readModelHealth.map((rm, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded flex items-center justify-between">
                      <span className="text-sm font-medium">{rm.read_model}</span>
                      <span className="text-sm text-slate-600">Lag: {rm.lag_seconds}s</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
