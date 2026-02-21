import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Activity, Database, Server, Wifi, CheckCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import PageLayout from '../../layouts/PageLayout';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import PermissionGate from '../../components/shared/PermissionGate';
import { useAuditLog } from '../../hooks/useAuditLog';

export default function MonitoringDashboard() {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Audit: log monitoring access
  useEffect(() => {
    if (user?.id) logAction('MONITORING_DASHBOARD_VIEWED', 'monitoring_dashboard');
  }, [user?.id]);

  const loadHealth = useCallback(async () => {
    try {
      const res = await api.get('/system/health');
      setHealth(res.data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    // PERF: Visibility-aware polling
    let interval = setInterval(loadHealth, 10000);
    const handleVisibility = () => {
      clearInterval(interval);
      if (document.visibilityState === 'visible') {
        loadHealth();
        interval = setInterval(loadHealth, 10000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadHealth]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'active': return 'text-green-400';
      case 'standby': return 'text-amber-500';
      case 'unhealthy': return 'text-red-400';
      default: return 'text-zinc-500';
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'active': return 'default';
      case 'unhealthy': return 'destructive';
      default: return 'secondary';
    }
  };

  const getIcon = (name) => {
    switch (name) {
      case 'FastAPI Backend': return <Server className="h-5 w-5" />;
      case 'MongoDB': return <Database className="h-5 w-5" />;
      case 'Edge Gateway': return <Wifi className="h-5 w-5" />;
      case 'Device Mesh': return <Activity className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  // Calculate progress percentages from real data
  const backendMemPct = health?.resources?.backend_memory_mb
    ? Math.min(100, Math.round((health.resources.backend_memory_mb / 512) * 100))
    : 0;
  const mongoStoragePct = health?.resources?.mongodb_storage_mb
    ? Math.min(100, Math.round((health.resources.mongodb_storage_mb / 512) * 100))
    : 0;

  return (
    <PermissionGate requiredRole="OWNER">
      <PageLayout
        title="Service Monitoring"
        description="Real-time system monitoring"
        actions={
          <button
            onClick={() => { setLoading(true); loadHealth(); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-white/5 text-zinc-300 border border-white/10"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        }
      >
        <div className="space-y-6">
          {error && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-400">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Services Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Services Status</span>
                {lastRefresh && (
                  <span className="text-xs font-normal text-zinc-500">
                    Last update: {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(health?.services || []).map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={getStatusColor(service.status)}>
                        {getIcon(service.name)}
                      </div>
                      <div>
                        <h4 className="font-medium text-zinc-100">{service.name}</h4>
                        <p className="text-xs text-zinc-400">
                          Response: {service.responseTime}
                          {service.details?.collections && ` · ${service.details.collections} collections · ${service.details.total_documents?.toLocaleString()} docs`}
                          {service.details?.uptime_seconds && ` · Up ${Math.round(service.details.uptime_seconds / 60)}min`}
                          {service.details?.note && ` · ${service.details.note}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-zinc-300">{service.uptime}</div>
                        <p className="text-xs text-zinc-500">uptime</p>
                      </div>
                      <Badge variant={getStatusVariant(service.status)}>{service.status}</Badge>
                    </div>
                  </div>
                ))}
                {!health?.services?.length && !loading && (
                  <p className="text-center py-4 text-zinc-500">{"No "}services data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resource Usage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Backend Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-zinc-400">Memory (est.)</span>
                    <span className="text-zinc-100">{health?.resources?.backend_memory_mb || 0} MB</span>
                  </div>
                  <Progress value={backendMemPct} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-zinc-400">Index Size</span>
                    <span className="text-zinc-100">{health?.resources?.index_size_mb || 0} MB</span>
                  </div>
                  <Progress value={Math.min(100, (health?.resources?.index_size_mb || 0) / 5 * 100)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>MongoDB Storage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-zinc-400">Data Size</span>
                    <span className="text-zinc-100">{health?.resources?.mongodb_data_mb || 0} MB</span>
                  </div>
                  <Progress value={mongoStoragePct} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-zinc-400">Storage Size</span>
                    <span className="text-zinc-100">{health?.resources?.mongodb_storage_mb || 0} MB</span>
                  </div>
                  <Progress value={mongoStoragePct} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Queue Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Offline Queue Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <Database className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                  <div className="text-3xl font-bold text-zinc-100">{health?.queue?.pending || 0}</div>
                  <p className="text-sm text-zinc-400">Pending</p>
                </div>
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <div className="text-3xl font-bold text-zinc-100">{health?.queue?.synced || 0}</div>
                  <p className="text-sm text-zinc-400">Synced</p>
                </div>
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <div className="text-3xl font-bold text-zinc-100">{health?.queue?.failed || 0}</div>
                  <p className="text-sm text-zinc-400">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </PermissionGate>
  );
}
