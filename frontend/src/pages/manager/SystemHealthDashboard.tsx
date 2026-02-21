import { Activity,AlertCircle,CheckCircle,Cpu,Database,Server } from 'lucide-react';
import { useEffect,useState } from 'react';
import PermissionGate from '../../components/shared/PermissionGate';
import { Badge } from '../../components/ui/badge';
import { Card,CardContent,CardHeader,CardTitle } from '../../components/ui/card';
import { useAuth } from '../../context/AuthContext';
import { useAuditLog } from '../../hooks/useAuditLog';
import PageContainer from '../../layouts/PageContainer';
import deviceMesh from '../../services/DeviceMesh';
import edgeGatewayClient from '../../services/EdgeGatewayClient';
import resilienceManager from '../../services/ResilienceManager';

export default function SystemHealthDashboard() {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [edgeHealth, setEdgeHealth] = useState(null);
  const [resilienceStatus, setResilienceStatus] = useState(null);
  const [meshStatus, setMeshStatus] = useState(null);

  // Audit: log system health access
  useEffect(() => {
    if (user?.id) logAction('SYSTEM_HEALTH_VIEWED', 'system_health_dashboard');
  }, [user?.id]);

  const loadSystemHealth = async () => {
    // Edge Gateway health
    const edgeAvailable = await edgeGatewayClient.checkEdgeAvailability();
    if (edgeAvailable) {
      const stats = await edgeGatewayClient.getQueueStats();
      setEdgeHealth(stats);
    }

    // Resilience status
    setResilienceStatus(resilienceManager.getStatus());

    // Mesh status
    setMeshStatus(deviceMesh.getStatus());
  };

  useEffect(() => {
    loadSystemHealth();
    // PERF: Visibility-aware polling
    let interval = setInterval(loadSystemHealth, 10000);
    const handleVisibility = () => {
      clearInterval(interval);
      if (document.visibilityState === 'visible') {
        loadSystemHealth();
        interval = setInterval(loadSystemHealth, 10000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <PermissionGate requiredRole="OWNER">
      <PageContainer title="System Health" description="Resilience & monitoring dashboard">
        <div className="space-y-6">
          {/* System Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Cloud Status</CardTitle>
                <Server className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {resilienceStatus?.cloudReachable ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  )}
                  <span className="text-lg font-bold text-zinc-100">
                    {resilienceStatus?.cloudReachable ? 'Online' : 'Offline'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Edge Gateway</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {resilienceStatus?.edgeReachable ? (
                    <CheckCircle className="h-6 w-6 text-blue-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-zinc-500" />
                  )}
                  <span className="text-lg font-bold text-zinc-100">
                    {resilienceStatus?.edgeReachable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Device Mesh</CardTitle>
                <Cpu className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-zinc-100">
                    {meshStatus?.peerCount || 0} Peers
                  </span>
                </div>
                {meshStatus?.isHub && (
                  <Badge variant="default" className="mt-1">Hub Device</Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Queue Status</CardTitle>
                <Database className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-lg font-bold ${edgeHealth?.stats?.pending > 0 ? 'text-amber-500' : 'text-green-400'}`}>
                  {edgeHealth?.stats?.pending || 0} Pending
                </div>
                <p className="text-xs text-zinc-500">
                  {edgeHealth?.stats?.synced || 0} synced
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Resilience Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Current Resilience Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className={`text-3xl font-bold mb-2 ${resilienceStatus?.mode === 'online' ? 'text-green-400' :
                      resilienceStatus?.mode === 'edge' ? 'text-blue-500' :
                        resilienceStatus?.mode === 'mesh' ? 'text-purple-500' : 'text-red-500'
                    }`}>
                    {resilienceStatus?.mode?.toUpperCase() || 'UNKNOWN'}
                  </div>
                  <p className="text-sm text-zinc-400">
                    {resilienceStatus?.mode === 'online' && 'Full cloud connectivity - all features available'}
                    {resilienceStatus?.mode === 'edge' && 'Venue gateway active - operating via edge server'}
                    {resilienceStatus?.mode === 'device' && 'Full offline mode - operations queued'}
                    {resilienceStatus?.mode === 'mesh' && 'Peer-to-peer mode - distributed operation'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-500">Failover Chain</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={resilienceStatus?.cloudReachable ? 'default' : 'outline'}>Cloud</Badge>
                    <span className="text-zinc-500">→</span>
                    <Badge variant={resilienceStatus?.edgeReachable ? 'default' : 'outline'}>Edge</Badge>
                    <span className="text-zinc-500">→</span>
                    <Badge variant="outline">Device</Badge>
                    <span className="text-zinc-500">→</span>
                    <Badge variant={meshStatus?.active ? 'default' : 'outline'}>Mesh</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edge Gateway Details */}
          {resilienceStatus?.edgeReachable && edgeHealth && (
            <Card>
              <CardHeader>
                <CardTitle>Edge Gateway Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-zinc-400">Pending Commands</div>
                    <div className="text-2xl font-bold text-zinc-100">{edgeHealth.stats?.pending || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-zinc-400">Synced Commands</div>
                    <div className="text-2xl font-bold text-green-400">{edgeHealth.stats?.synced || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-zinc-400">Failed Commands</div>
                    <div className="text-2xl font-bold text-red-400">{edgeHealth.stats?.failed || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Device Mesh Topology */}
          {meshStatus?.active && (
            <Card>
              <CardHeader>
                <CardTitle>Device Mesh Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Mesh Active:</span>
                    <Badge variant={meshStatus.connected ? 'default' : 'outline'}>
                      {meshStatus.connected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Device Role:</span>
                    <Badge variant={meshStatus.isHub ? 'default' : 'secondary'}>
                      {meshStatus.isHub ? 'Hub' : 'Peer'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Connected Peers:</span>
                    <span className="font-bold text-zinc-100">{meshStatus.peerCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Election Score:</span>
                    <span className="font-bold text-zinc-100">{meshStatus.score || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </PermissionGate>
  );
}
