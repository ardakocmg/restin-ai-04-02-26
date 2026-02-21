import { Badge } from '@/components/ui/badge';
import { Card,CardContent } from '@/components/ui/card';
import { AlertCircle,ArrowDown,ArrowUp,RefreshCw } from 'lucide-react';

type MovementAction = 'IN' | 'OUT' | 'ADJUST' | 'WASTE';

interface Movement {
  action: MovementAction;
  quantity: number;
  reason?: string;
  lot_number?: string;
  created_at: string;
}

interface MovementsTabProps {
  movements?: Movement[];
}

export default function MovementsTab({ movements = [] }: MovementsTabProps) {
  const getActionIcon = (action: MovementAction) => {
    switch (action) {
      case 'IN': return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'OUT': return <ArrowDown className="h-4 w-4 text-red-600" />;
      case 'ADJUST': return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'WASTE': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default: return null;
    }
  };

  const getActionColor = (action: MovementAction) => {
    switch (action) {
      case 'IN': return 'bg-green-100 text-green-700';
      case 'OUT': return 'bg-red-100 text-red-700';
      case 'ADJUST': return 'bg-blue-100 text-blue-700';
      case 'WASTE': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-3">
      {movements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No movements recorded
          </CardContent>
        </Card>
      ) : (
        movements.map((mov, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {getActionIcon(mov.action)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getActionColor(mov.action)}>
                        {mov.action}
                      </Badge>
                      <span className="font-mono text-sm font-medium text-foreground">
                        {mov.action === 'OUT' ? '-' : '+'}{mov.quantity}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{mov.reason || 'No reason'}</p>
                    {mov.lot_number && (
                      <p className="text-xs text-muted-foreground mt-1">Lot: {mov.lot_number}</p>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {new Date(mov.created_at).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
