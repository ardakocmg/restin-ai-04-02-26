import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { BarChart3, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function AnalyticsPage() {
  const { activeVenue } = useVenue();
  const [dashboards, setDashboards] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadAnalytics();
    }
  }, [activeVenue?.id]);

  const loadAnalytics = async () => {
    try {
      const [dashRes, metricsRes] = await Promise.all([
        api.get(`/analytics/dashboards?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/analytics/metrics?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } }))
      ]);
      
      setDashboards(dashRes.data?.data || []);
      setMetrics(metricsRes.data?.data || []);
    } catch (error) {
      logger.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Analytics" description="Business insights and metrics">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Dashboards</p>
                <p className="text-2xl font-bold text-slate-900">{dashboards.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Metrics</p>
                <p className="text-2xl font-bold text-slate-900">{metrics.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboards</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboards.length === 0 ? (
            <p className="text-center py-8 text-slate-500">{"No "}dashboards configured. Enable Analytics feature in venue settings.</p>
          ) : (
            <div className="space-y-2">
              {dashboards.map(d => (
                <div key={d.id} className="p-3 bg-background rounded">
                  {d.name}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
