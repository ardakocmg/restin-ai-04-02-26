import { logger } from '@/lib/logger';
import { Mail,MessageSquare,Zap } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Card,CardContent,CardHeader,CardTitle } from '../../components/ui/card';
import { useVenue } from '../../context/VenueContext';
import PageContainer from '../../layouts/PageContainer';
import api from '../../lib/api';

export default function AutomationsPage() {
  const { activeVenue } = useVenue();
  const [flows, setFlows] = useState([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadFlows();
    }
  }, [activeVenue?.id]);

  const loadFlows = async () => {
    try {
      const res = await api.get(`/automations/flows?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } }));
      setFlows(res.data?.data || []);
    } catch (error) {
      logger.error('Automations error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Automations" description="Automated workflows and notifications">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automation Flows
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flows.length === 0 ? (
            <p className="text-center py-8 text-slate-500">{"No "}flows configured. Enable Automations in venue settings.</p>
          ) : (
            <div className="space-y-3">
              {flows.map(flow => (
                <div key={flow.id} className="p-4 bg-background rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900">{flow.name}</span>
                    <Badge variant={flow.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {flow.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    {flow.channels?.map(ch => (
                      <div key={ch} className="flex items-center gap-1">
                        {ch === 'EMAIL' && <Mail className="h-3 w-3" />}
                        {ch === 'WHATSAPP' && <MessageSquare className="h-3 w-3" />}
                        <span>{ch}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
