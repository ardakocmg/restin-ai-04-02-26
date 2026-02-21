import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import { StatCard, StatsGrid } from '../../components/shared/Stats';
import PermissionedTable from '../../components/PermissionedTable';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { DollarSign, Receipt, ShoppingCart, CheckCircle, RefreshCw } from 'lucide-react';

export default function FinanceDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  const venueId = user?.venueId  || localStorage.getItem('restin_venue');

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/venues/${venueId}/finance/summary`);
      setSummary(response.data);
    } catch (error: any) {
      console.error('Failed to load finance summary:', error);
      if (error.response?.status !== 403) {
        toast.error('Failed to load finance data');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const currency = summary?.currency || 'EUR';
    const symbol = currency === 'EUR' ? '€' : '$';
    return `${symbol}${parseFloat(value || 0).toFixed(2)}`;
  };

  return (
    <PageContainer
      title="Finance Dashboard"
      description="Real-time financial overview and reporting"
      actions={
        <Button onClick={loadSummary} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {/* Summary Stats */}
      <StatsGrid columns={4}>
        <StatCard
          title="Today's Sales"
          value={formatCurrency(summary?.gross_sales_today || 0)}
          icon={DollarSign}
          description="Gross sales"
          className="border-green-500/50 bg-green-900/20 text-green-400"
        />
        <StatCard
          title="Open Orders"
          value={summary?.open_orders_count || 0}
          icon={ShoppingCart}
          description={formatCurrency(summary?.open_orders_value || 0)}
        />
        <StatCard
          title="Closed Checks"
          value={summary?.closed_checks_count || 0}
          icon={CheckCircle}
          description={formatCurrency(summary?.closed_checks_value || 0)}
        />
        <StatCard
          title="Average Check"
          value={formatCurrency(summary?.avg_check || 0)}
          icon={Receipt}
          description="Per transaction"
        />
      </StatsGrid>

      {/* Tabs: Open Orders & Closed Checks */}
      <Card className="mt-6">
        <Tabs defaultValue="open" className="w-full">
          <CardHeader className="pb-3">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-card border border-border p-1">
              <TabsTrigger value="open" className="font-bold data-[state=active]:bg-red-600 data-[state=active]:text-foreground">Open Orders</TabsTrigger>
              <TabsTrigger value="closed" className="font-bold data-[state=active]:bg-red-600 data-[state=active]:text-foreground">Closed Checks</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent>
            <TabsContent value="open" className="mt-0">
              <PermissionedTable
                venueId={venueId}
                tableKey="orders_open"
                title="Open Orders"
                emptyMessage="No open orders"
              />
            </TabsContent>

            <TabsContent value="closed" className="mt-0">
              <PermissionedTable
                venueId={venueId}
                tableKey="checks_closed"
                title="Closed Checks"
                emptyMessage="No closed checks"
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </PageContainer>
  );
}
