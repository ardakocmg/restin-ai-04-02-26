import { logger } from '@/lib/logger';
import { useEffect,useState } from 'react';

import { useVenue } from '../../context/VenueContext';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import { Card,CardContent,CardDescription,CardHeader,CardTitle } from '../../components/ui/card';

import { Badge } from '../../components/ui/badge';

import { Button } from '../../components/ui/button';

import { Tabs,TabsContent,TabsList,TabsTrigger } from '../../components/ui/tabs';

import { CheckCircle2,Truck,UtensilsCrossed } from 'lucide-react';

export default function DeliveryAggregators() {
  const { activeVenue } = useVenue();
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [capabilities, setCapabilities] = useState([]);
  const [menuMappings, setMenuMappings] = useState([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadData();
    }
  }, [activeVenue?.id]);

  const loadData = async () => {
    try {
      const [ordersRes, capRes, mapRes] = await Promise.all([
        api.get(`/integrations/delivery-orders?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } })),
        api.get('/integrations/capabilities').catch(() => ({ data: { data: [] } })),
        api.get(`/integrations/menu-mappings?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } }))
      ]);
      
      setDeliveryOrders(ordersRes.data?.data || []);
      setCapabilities(capRes.data?.data || []);
      setMenuMappings(mapRes.data?.data || []);
    } catch (error) {
      logger.error('Delivery error:', error);
    } finally {
      setLoading(false);
    }
  };

  const maltaConnectors = capabilities.filter(c => ['WOLT', 'BOLT_FOOD', 'DELIVEROO'].includes(c.connector_key));
  const otherConnectors = capabilities.filter(c => !['WOLT', 'BOLT_FOOD', 'DELIVEROO'].includes(c.connector_key));

  return (
    <PageContainer
      title="Delivery Aggregators"
      description="Wolt, Bolt Food, Deliveroo, Uber Eats, Glovo, JustEat integrations"
    >
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Delivery Orders</TabsTrigger>
          <TabsTrigger value="menus">Menu Mappings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-foreground mb-4">🇲🇹 Malta Priority Connectors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {maltaConnectors.map((conn) => (
                <Card key={conn.connector_key} className="border-blue-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{conn.connector_key}</CardTitle>
                      <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardDescription>Primary Malta delivery platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {Object.entries(conn.supports).filter(([_k, v]) => v).slice(0, 4).map(([key, _value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                          <span className="text-slate-700">{key.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      Configure
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">Global Delivery Platforms</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {otherConnectors.map((conn) => (
                <Card key={conn.connector_key}>
                  <CardHeader>
                    <CardTitle className="text-lg">{conn.connector_key}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {Object.values(conn.supports).filter(v => v).length} capabilities
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Configure
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Delivery Orders</CardTitle>
              <CardDescription>Aggregated orders from all channels</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveryOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <p>{"No "}delivery orders yet</p>
                  <p className="text-xs mt-2">Configure connectors to start receiving orders</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deliveryOrders.slice(0, 10).map((order) => (
                    <div key={order.id} className="p-4 bg-background rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium text-foreground">{order.display_id}</span>
                          <Badge variant="outline" className="ml-2">{order.source?.connector_key}</Badge>
                        </div>
                        <Badge>{order.state}</Badge>
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>Customer: {order.customer?.name_redacted}</p>
                        <p>Items: {order.items?.length || 0} | Total: €{order.totals?.total?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menus" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Menu Channel Mappings</CardTitle>
              <CardDescription>SKU to external platform menu item mappings</CardDescription>
            </CardHeader>
            <CardContent>
              {menuMappings.length === 0 ? (
                <p className="text-center py-8 text-slate-500">
                  No menu mappings configured
                </p>
              ) : (
                <div className="space-y-2">
                  {menuMappings.slice(0, 10).map((mapping, idx) => (
                    <div key={idx} className="p-3 bg-background rounded flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{mapping.sku_id?.substring(0, 8)}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{mapping.connector_key}</Badge>
                      </div>
                      <Badge variant={mapping.sync_status === 'OK' ? 'outline' : 'destructive'}>
                        {mapping.sync_status}
                      </Badge>
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