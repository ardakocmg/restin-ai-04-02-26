import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ArrowRightLeft } from 'lucide-react';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import { toast } from 'sonner';
import api from '../../lib/api';

export default function StockTransfersComplete() {
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [transfersRes, locationsRes] = await Promise.all([
        api.get('/api/inventory/transfers'),
        api.get('/api/inventory/locations')
      ]);
      setTransfers(transfersRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'transfer_id', label: 'Transfer ID' },
    { key: 'from_location', label: 'From' },
    { key: 'to_location', label: 'To' },
    { key: 'items_count', label: 'Items' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Date', render: (row) => new Date(row.created_at).toLocaleDateString() },
  ];

  return (
    <PageContainer 
      title="Stock Transfers" 
      description="Transfer inventory between locations"
      actions={
        <Button>
          <ArrowRightLeft className="h-4 w-4 mr-2" />
          New Transfer
        </Button>
      }
    >
      <DataTable columns={columns} data={transfers} loading={loading} />
    </PageContainer>
  );
}
