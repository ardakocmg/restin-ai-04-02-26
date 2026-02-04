import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import DataTable from '../../components/shared/DataTable';
import { Plus, Send, CheckCircle, XCircle } from 'lucide-react';

export default function PurchaseOrdersPage() {
  const { activeVenue } = useVenue();
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadPurchaseOrders();
    }
  }, [activeVenue?.id]);

  const loadPurchaseOrders = async () => {
    try {
      const res = await api.get(`/inventory/purchase-orders?venue_id=${activeVenue.id}`);
      setPos(res.data || []);
    } catch (error) {
      console.error('Failed to load purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'DRAFT': 'bg-slate-100 text-slate-700',
      'SUBMITTED': 'bg-blue-100 text-blue-700',
      'APPROVED': 'bg-green-100 text-green-700',
      'SENT': 'bg-purple-100 text-purple-700',
      'PARTIAL_RECEIVED': 'bg-orange-100 text-orange-700',
      'RECEIVED_CLOSED': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <PageContainer
      title="Purchase Orders"
      description="Create and manage purchase orders to suppliers"
      actions={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create PO
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'display_id', label: 'PO #' },
              { key: 'supplier_name', label: 'Supplier' },
              { 
                key: 'total_amount', 
                label: 'Total',
                render: (row) => `€${row.total_amount?.toFixed(2) || '0.00'}`
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <Badge className={getStatusColor(row.status)}>
                    {row.status}
                  </Badge>
                )
              },
              {
                key: 'expected_delivery_date',
                label: 'Expected',
                render: (row) => row.expected_delivery_date ? new Date(row.expected_delivery_date).toLocaleDateString() : 'N/A'
              },
              {
                key: 'created_at',
                label: 'Created',
                render: (row) => new Date(row.created_at).toLocaleDateString()
              }
            ]}
            data={pos}
            loading={loading}
            emptyMessage="No purchase orders found"
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
