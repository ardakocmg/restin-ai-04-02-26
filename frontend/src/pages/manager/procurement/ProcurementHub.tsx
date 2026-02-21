import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { ShoppingCart, FileText, TrendingUp, Settings, CheckCircle } from 'lucide-react';
import api from '../../../lib/api';
import { logger } from '@/lib/logger';

const PROCUREMENT_MODULES = [
  { key: 'rfq', title: 'RFQ Management', desc: 'Request for Quotation workflow', icon: FileText, path: '/manager/procurement/rfq', color: 'blue' },
  { key: 'approval', title: 'Approval Workflow', desc: 'Configure approval rules', icon: CheckCircle, path: '/manager/procurement/approval', color: 'green' },
  { key: 'auto-order', title: 'Auto-Ordering', desc: 'Automatic reorder rules', icon: Settings, path: '/manager/procurement/auto-order', color: 'purple' },
  { key: 'analytics', title: 'Supplier Analytics', desc: 'Performance & insights', icon: TrendingUp, path: '/manager/procurement/analytics', color: 'orange' }
];

export default function ProcurementHub() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ rfqs: 0, pending: 0, approved: 0, suppliers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      setStats({ rfqs: 12, pending: 3, approved: 8, suppliers: 24 });
    } catch (error) {
      logger.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Procurement & Sourcing" description="Advanced procurement management">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-blue-500/20 bg-blue-950/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Active RFQs</p>
                  <p className="text-2xl font-bold text-blue-50">{stats.rfqs}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-700 bg-slate-900/60">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-50 mb-4">Procurement Modules</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {PROCUREMENT_MODULES.map((module) => {
                const Icon = module.icon;
                return (
                  <button key={module.key} onClick={() => navigate(module.path)} className="flex items-start gap-4 rounded-lg border border-slate-700 bg-slate-800 p-4 text-left transition hover:border-blue-500">
                    <Icon className="h-6 w-6 text-blue-400 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-50">{module.title}</p>
                      <p className="text-sm text-slate-400">{module.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
