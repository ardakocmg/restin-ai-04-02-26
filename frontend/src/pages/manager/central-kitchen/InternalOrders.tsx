import { logger } from '@/lib/logger';
import { ClipboardList,Plus } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Card,CardContent } from '../../../components/ui/card';
import PageContainer from '../../../layouts/PageContainer';
import api from '../../../lib/api';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function InternalOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/internal-orders`);
      setOrders(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { pending: 'bg-yellow-600/20 text-yellow-100', fulfilled: 'bg-green-600/20 text-green-100', partial: 'bg-blue-600/20 text-blue-100', cancelled: 'bg-red-600/20 text-red-100' };
    return colors[status] || 'bg-gray-600/20 text-gray-100';
  };

  return (
    <PageContainer title="Internal Orders" description="Orders from outlets to central kitchen" actions={<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-foreground rounded-lg hover:bg-blue-700"><Plus className="h-4 w-4" />New Order</button>}>
      <div className="space-y-4">
        {loading ? <LoadingSpinner variant="page" /> : orders.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">{"No "}internal orders</CardContent></Card> : orders.map((order) => (
          <Card key={order.id} className="border-slate-700"><CardContent className="p-6"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><ClipboardList className="h-5 w-5 text-blue-400" /><h3 className="text-lg font-semibold text-slate-50">{order.order_number}</h3><Badge className={getStatusColor(order.status)}>{order.status}</Badge></div><div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm"><div><p className="text-slate-400">From</p><p className="font-medium">{order.from_venue_id}</p></div><div><p className="text-slate-400">Items</p><p className="font-medium">{order.items?.length || 0}</p></div><div><p className="text-slate-400">Requested Delivery</p><p className="font-medium">{new Date(order.requested_delivery).toLocaleDateString()}</p></div></div></div></div></CardContent></Card>
        ))}
      </div>
    </PageContainer>
  );
}
