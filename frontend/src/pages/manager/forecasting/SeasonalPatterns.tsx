import { logger } from '@/lib/logger';
import { Calendar } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Card,CardContent } from '../../../components/ui/card';
import PageContainer from '../../../layouts/PageContainer';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function SeasonalPatterns() {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    try {
      const _venueId = localStorage.getItem('currentVenueId');
      // Fetch from API when available
      setPatterns([]);
    } catch (error) {
      logger.error('Failed to fetch patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Seasonal Patterns" description="Detect seasonality in demand">
      <div className="space-y-4">
        {loading ? <LoadingSpinner variant="page" /> : patterns.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">{"No "}seasonal patterns detected yet</CardContent></Card> : patterns.map((pattern) => (
          <Card key={pattern.id} className="border-slate-700"><CardContent className="p-6"><div className="flex items-start gap-4"><Calendar className="h-6 w-6 text-purple-400" /><div className="flex-1"><h3 className="text-lg font-semibold text-slate-50 mb-2">{pattern.pattern_name}</h3><p className="text-sm text-muted-foreground mb-3">{pattern.description}</p><div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-slate-400">Affected Items</p><p className="font-medium">{pattern.affected_items?.length || 0}</p></div><div><p className="text-slate-400">Multiplier</p><p className="font-medium text-green-400">{pattern.multiplier}x</p></div></div></div></div></CardContent></Card>
        ))}
      </div>
    </PageContainer>
  );
}
