import { logger } from '@/lib/logger';
import { Edit,LayoutGrid,Plus } from 'lucide-react';
import { useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card,CardContent } from '../../components/ui/card';
import { useVenue } from '../../context/VenueContext';
import PageContainer from '../../layouts/PageContainer';
import api from '../../lib/api';

export default function FloorPlans() {
  const navigate = useNavigate();
  const { activeVenue } = useVenue();
  const [floorPlans, setFloorPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadFloorPlans();
    }
  }, [activeVenue?.id]);

  const loadFloorPlans = async () => {
    try {
      const response = await api.get(`/venues/${activeVenue.id}/floor-plans`);
      setFloorPlans(response.data);
    } catch (error) {
      logger.error('Failed to load floor plans:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Floor Plans"
      description="Manage venue layouts and table arrangements"
      actions={
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Floor Plan
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="col-span-full text-center py-12 text-muted-foreground font-bold animate-pulse">{"Loading "}Floor Plans...</p>
        ) : floorPlans.length === 0 ? (
          <p className="col-span-full text-center py-12 text-muted-foreground font-bold italic">{"No "}floor plans found</p>
        ) : (
          floorPlans.map(plan => (
            <Card key={plan.id} className="bg-background border-border shadow-2xl hover:border-red-500/30 transition-all group overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h3 className="font-black text-foreground uppercase tracking-tight text-lg mb-2 group-hover:text-red-500 transition-colors">{plan.name}</h3>
                    {plan.is_active && (
                      <Badge className="bg-green-600/20 text-green-400 border border-green-500/30 font-black uppercase text-[10px]">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-card border border-border">
                    <LayoutGrid className="w-6 h-6 text-muted-foreground" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-card/50 border border-border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Dimensions</p>
                    <p className="text-sm font-bold text-foreground">{plan.width} x {plan.height}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-card/50 border border-border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Version</p>
                    <p className="text-sm font-bold text-foreground">v{plan.version}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-card border-border hover:bg-red-600 hover:text-foreground hover:border-none font-black uppercase tracking-widest text-[10px] h-10"
                  onClick={() => navigate(`/manager/floor-plans/${plan.id}/edit`)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Design Layout
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}
