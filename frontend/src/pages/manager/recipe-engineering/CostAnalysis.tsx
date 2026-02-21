import { useState, useEffect } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { DollarSign, TrendingUp } from 'lucide-react';
import api from '../../../lib/api';
import { logger } from '@/lib/logger';

export default function CostAnalysis() {
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/recipes/engineered/analytics/profitability`);
      setAnalysis(response.data || []);
    } catch (error: any) {
      logger.error('Failed to fetch analysis:', error);
      setAnalysis([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Cost Analysis" description="Recipe profitability insights">
      <div className="space-y-4">
        {loading ? <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card> : analysis.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">No cost analysis available</CardContent></Card> : analysis.map((item) => (
          <Card key={item.recipe_id} className="border-slate-700"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="flex-1"><h3 className="text-lg font-semibold text-slate-50 mb-3">{item.recipe_name}</h3><div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm"><div><p className="text-slate-400">Cost/Serving</p><p className="font-medium text-red-400">${item.cost_per_serving?.toFixed(2) || '0.00'}</p></div><div><p className="text-slate-400">Suggested Price</p><p className="font-medium text-green-400">${item.suggested_price?.toFixed(2) || '0.00'}</p></div><div><p className="text-slate-400">Markup</p><p className="font-medium text-blue-400">{item.markup_percentage?.toFixed(0) || 0}%</p></div></div></div><TrendingUp className="h-6 w-6 text-green-400" /></div></CardContent></Card>
        ))}
      </div>
    </PageContainer>
  );
}
