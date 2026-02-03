import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import DataTable from '../../components/shared/DataTable';
import { Plus, Archive, Edit } from 'lucide-react';

export default function SuppliersPage() {
  const { activeVenue } = useVenue();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadSuppliers();
    }
  }, [activeVenue?.id]);

  const loadSuppliers = async () => {
    try {
      const res = await api.get(`/inventory/suppliers?venue_id=${activeVenue.id}`);
      setSuppliers(res.data || []);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Suppliers"
      description="Manage your suppliers and vendor relationships"
      actions={
        <Button className="bg-zinc-950 hover:bg-zinc-900 text-white border border-white/10 font-black uppercase tracking-widest text-[10px] h-10 px-6 shadow-2xl">
          <Plus className="h-4 w-4 mr-2 text-red-500" />
          Add Supplier
        </Button>
      }
    >
      <Card className="bg-zinc-950 border-white/5 shadow-2xl">
        <CardHeader className="border-b border-white/5 bg-zinc-900/50 p-6">
          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-white">Active Suppliers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                key: 'display_id',
                label: 'ID',
                render: (row) => <span className="text-[10px] font-mono text-zinc-600 font-bold">{row.display_id || row.id?.slice(0, 8)}</span>
              },
              {
                key: 'name',
                label: 'Supplier Name',
                render: (row) => <span className="text-sm font-black text-white uppercase tracking-tight">{row.name}</span>
              },
              { key: 'email', label: 'Email', render: (row) => <span className="text-xs font-bold text-zinc-400">{row.email || '-'}</span> },
              { key: 'phone', label: 'Phone', render: (row) => <span className="text-xs font-bold text-zinc-500">{row.phone || '-'}</span> },
              {
                key: 'payment_terms_days',
                label: 'Payment Terms',
                render: (row) => (
                  <div className="flex items-center gap-2 px-2 py-1 bg-zinc-900 border border-white/5 rounded-md w-fit">
                    <span className="text-xs font-black text-white">{row.payment_terms_days || 30} DAYS</span>
                  </div>
                )
              },
              {
                key: 'is_active',
                label: 'Status',
                render: (row) => (
                  <Badge className={row.is_active ? 'bg-green-600/20 text-green-400 border border-green-500/30 font-black uppercase text-[10px]' : 'bg-zinc-600/20 text-zinc-300 border border-zinc-500/30 font-black uppercase text-[10px]'}>
                    {row.is_active ? 'Active' : 'Archived'}
                  </Badge>
                )
              }
            ]}
            data={suppliers}
            loading={loading}
            emptyMessage="No suppliers found"
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
