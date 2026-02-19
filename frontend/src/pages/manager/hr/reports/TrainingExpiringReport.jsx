
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../../components/ui/card';
import { GraduationCap, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../../../lib/api';
import { useVenue } from '../../../../context/VenueContext';

import { logger } from '@/lib/logger';
export default function TrainingExpiringReport() {
  const { activeVenue } = useVenue();
  const [loading, setLoading] = useState(true);
  const [expiringTraining, setExpiringTraining] = useState([]);

  useEffect(() => {
    if (activeVenue?.id) loadData();
  }, [activeVenue?.id]);

  const loadData = async () => {
    try {
      const res = await api.get(`/venues/${activeVenue.id}/hr/documents/expiring-soon`);
      const data = Array.isArray(res.data) ? res.data : res.data.documents || [];
      setExpiringTraining(data.map(doc => ({
        id: doc.id || doc._id,
        name: doc.document_type || doc.name || 'Certificate',
        employee: doc.employee_name || 'Unknown',
        expiry: (doc.expiry_date || '').split('T')[0],
        status: doc.days_until_expiry <= 14 ? 'critical' : 'expiring'
      })));
    } catch (err) {
      logger.warn('Failed to load expiring training data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <GraduationCap className="w-6 h-6 text-yellow-500" />
        Training & Compliance Audit
      </h1>

      <div className="grid gap-4">
        {expiringTraining.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">No expiring training certificates found</p>
        ) : expiringTraining.map(item => (
          <Card key={item.id} className="bg-zinc-900 border-white/10 hover:border-yellow-500/50 transition-colors">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${item.status === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{item.name}</h3>
                  <p className="text-sm text-zinc-400">{item.employee}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono text-white">{item.expiry}</div>
                <div className="text-xs text-red-400 font-bold uppercase">{item.status}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-zinc-500 text-sm text-center mt-8">
        Connect to Restin Academy for live LMS data synchronization.
      </p>
    </div>
  );
}
