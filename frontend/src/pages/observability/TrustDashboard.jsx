import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Activity } from 'lucide-react';

export default function TrustDashboard() {
  const { activeVenue } = useVenue();
  const [riskFindings, setRiskFindings] = useState([]);
  const [killSwitches, setKillSwitches] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadTrustData();
    }
  }, [activeVenue?.id]);

  const loadTrustData = async () => {
    try {
      const [riskRes, switchRes, overrideRes] = await Promise.all([
        api.get(`/trust/risk/findings?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/trust/kill-switches?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/trust/overrides?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } }))
      ]);

      setRiskFindings(riskRes.data?.data || []);
      setKillSwitches(switchRes.data?.data || []);
      setOverrides(overrideRes.data?.data || []);
    } catch (error) {
      console.error('Trust data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFindings = riskFindings.filter(f => f.status === 'OPEN').length;
  const criticalFindings = riskFindings.filter(f => f.severity === 'CRITICAL').length;
  const pendingOverrides = overrides.filter(o => o.status === 'REQUESTED').length;

  return (
    <PageContainer
      title="Trust & Resilience"
      description="Platform security, risk management, and operational resilience"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Open Findings</p>
                <p className="text-2xl font-black text-zinc-100">{openFindings}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Critical</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalFindings}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Overrides</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingOverrides}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Kill Switches</p>
                <p className="text-2xl font-black text-zinc-100">{killSwitches.length}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Risk Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskFindings.length === 0 ? (
              <div className="text-center py-8 text-slate-500 flex flex-col items-center gap-2">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p>No risk findings. Enable Trust Risk Engine in venue settings.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {riskFindings.slice(0, 5).map(f => (
                  <div key={f.finding_id} className="p-3 bg-slate-50 rounded border">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant={f.severity === 'CRITICAL' ? 'destructive' : 'outline'}>
                        {f.severity}
                      </Badge>
                      <span className="text-xs text-slate-600">{f.action_key}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{f.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Kill Switches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {killSwitches.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No kill switches configured</p>
            ) : (
              <div className="space-y-2">
                {killSwitches.map(s => (
                  <div key={s.key} className="p-3 bg-slate-50 rounded flex items-center justify-between">
                    <span className="text-sm font-medium">{s.key}</span>
                    <Badge variant={s.enabled ? 'default' : 'destructive'}>
                      {s.enabled ? 'ENABLED' : 'DISABLED'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
