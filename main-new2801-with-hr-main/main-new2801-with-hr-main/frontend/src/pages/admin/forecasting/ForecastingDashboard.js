import { useState, useEffect } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Plus, TrendingUp, BarChart } from 'lucide-react';
import api from '../../../lib/api';

export default function ForecastingDashboard() {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecasts();
  }, []);

  const fetchForecasts = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/forecasting`);
      setForecasts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch forecasts:', error);
      setForecasts([]);
    } finally {
      setLoading(false);
    }
  };

  const generateForecast = async (itemId) => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      await api.post(`/venues/${venueId}/forecasting/generate`, {
        item_id: itemId,
        method: 'moving_average',
        days: 30,
        use_ai: true
      });
      fetchForecasts();
    } catch (error) {
      console.error('Failed to generate forecast:', error);
    }
  };

  return (
    <PageContainer title="Demand Forecasting Dashboard" description="AI-powered demand predictions">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-blue-500/20 bg-blue-950/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Active Forecasts</p>
                  <p className="text-2xl font-bold text-blue-50">{forecasts.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/20 bg-green-950/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Avg Accuracy</p>
                  <p className="text-2xl font-bold text-green-50">87%</p>
                </div>
                <BarChart className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-500/20 bg-purple-950/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Items Tracked</p>
                  <p className="text-2xl font-bold text-purple-50">42</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {loading ? (
            <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card>
          ) : forecasts.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-slate-400">No forecasts available. Generate your first forecast!</CardContent></Card>
          ) : (
            forecasts.map((forecast) => (
              <Card key={forecast.id} className="border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-50 mb-2">{forecast.item_name}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-400">Method</p>
                          <p className="font-medium">{forecast.method}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Forecast Days</p>
                          <p className="font-medium">{forecast.forecast_data?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Recommended Order</p>
                          <p className="font-medium text-green-400">{forecast.recommended_order_quantity}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Order Date</p>
                          <p className="font-medium">{forecast.recommended_order_date ? new Date(forecast.recommended_order_date).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                      {forecast.ai_insights && (
                        <div className="mt-3 p-3 bg-blue-900/20 rounded border border-blue-500/30">
                          <p className="text-sm text-blue-300">{forecast.ai_insights.substring(0, 200)}...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}
