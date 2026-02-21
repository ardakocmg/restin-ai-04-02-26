import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import DataTable from '../../components/shared/DataTable';
import { DollarSign, FileText, Lock } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function PayrollMaltaPage() {
  const { activeVenue } = useVenue();
  const [profiles, setProfiles] = useState([]);
  const [payruns, setPayruns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadPayroll();
    }
  }, [activeVenue?.id]);

  const loadPayroll = async () => {
    try {
      const [profRes, runRes] = await Promise.all([
        api.get(`/payroll-mt/profiles?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/payroll-mt/payruns?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } }))
      ]);
      
      setProfiles(profRes.data?.data || []);
      setPayruns(runRes.data?.data || []);
    } catch (error: any) {
      logger.error('Payroll error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Payroll (Malta)" description="Malta tax compliant payroll processing">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pay Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {payruns.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No pay runs. Enable Payroll MT in venue settings.</p>
            ) : (
              <div className="space-y-2">
                {payruns.map(pr => (
                  <div key={pr.id} className="p-3 bg-slate-50 rounded flex items-center justify-between">
                    <div>
                      <span className="font-medium">{pr.display_id}</span>
                      <p className="text-sm text-slate-600">{pr.period}</p>
                    </div>
                    <Badge>{pr.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employee Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{profiles.length} profiles configured</p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
