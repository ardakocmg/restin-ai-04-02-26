import { Activity, AlertCircle, CheckCircle, ChevronDown, Cpu, Database, Server, RefreshCw, Shield, Clock, Zap, BarChart3, FileCode2, TestTube2, Eye, Wrench, FileText, Accessibility, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import PermissionGate from '../../components/shared/PermissionGate';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { useAuditLog } from '../../hooks/useAuditLog';
import PageContainer from '../../layouts/PageContainer';
import api from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HealthMetrics {
  db_ok: boolean;
  db_latency_ms: number;
  avg_latency_ms: number;
  rps: number;
  error_rate_5xx: number;
  uptime_seconds: number;
  memory_mb: number;
  cpu_percent: number;
  queue_depth: number;
  dlq_size: number;
  active_alerts: number;
  total_documents: number;
  total_requests: number;
  system_iq: number;
  resilience_pct: number;
}

interface AuditScores {
  overall_score: number;
  scores: Record<string, number>;
  evidence: Record<string, Record<string, EvidenceCheck>>;
  _source?: string;
}

interface EvidenceCheck {
  value: unknown;
  source?: string;
  method: string;
  confidence: string;
  industry_ref?: string;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────
const fetchHealth = async (): Promise<HealthMetrics> => {
  const { data } = await api.get('/system/hyperscale-metrics');
  return data;
};

const fetchAuditScores = async (): Promise<AuditScores> => {
  const { data } = await api.get('/system/audit-scores');
  return data;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const getScoreColor = (score: number): string => {
  if (score >= 8) return 'text-green-400';
  if (score >= 6) return 'text-yellow-400';
  if (score >= 4) return 'text-orange-400';
  return 'text-red-400';
};

const getConfidenceBadge = (c: string): { color: string; label: string } => {
  if (c === 'high') return { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'High' };
  if (c === 'medium') return { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Medium' };
  if (c === 'critical') return { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Critical' };
  return { color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30', label: 'Low' };
};

const getMethodLabel = (m: string): string => {
  const labels: Record<string, string> = {
    file_exists: 'File Exists', file_count: 'File Count', line_count: 'Line Count',
    pattern_scan: 'Pattern Scan', config_parse: 'Config Parse', direct_read: 'Direct Read',
    dir_exists: 'Dir Exists', computed: 'Computed', known_config: 'Known Config',
    'file_exists+pattern': 'File + Pattern',
  };
  return labels[m] || m;
};

const getScoreBarColor = (score: number): string => {
  if (score >= 8) return 'bg-green-500';
  if (score >= 6) return 'bg-yellow-500';
  if (score >= 4) return 'bg-orange-500';
  return 'bg-red-500';
};

const DIMENSION_ICONS: Record<string, React.ElementType> = {
  code_volume: FileCode2,
  architecture: Wrench,
  testing: TestTube2,
  security: Shield,
  observability: Eye,
  infrastructure: Server,
  production_readiness: Zap,
  typescript_strictness: FileCode2,
  api_documentation: FileText,
  accessibility_ux: Accessibility,
};

const DIMENSION_LABELS: Record<string, string> = {
  code_volume: 'Code Volume',
  architecture: 'Architecture',
  testing: 'Testing',
  security: 'Security',
  observability: 'Observability',
  infrastructure: 'Infrastructure',
  production_readiness: 'Production Readiness',
  typescript_strictness: 'TypeScript Strictness',
  api_documentation: 'API Documentation',
  accessibility_ux: 'Accessibility UX',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SystemHealthDashboard() {
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  useEffect(() => {
    if (user?.id) logAction('SYSTEM_HEALTH_VIEWED', 'system_health_dashboard');
  }, [user?.id]);

  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery<HealthMetrics>({
    queryKey: ['health-metrics'],
    queryFn: fetchHealth,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const { data: audit, isLoading: auditLoading, refetch: refetchAudit } = useQuery<AuditScores>({
    queryKey: ['audit-scores-health'],
    queryFn: fetchAuditScores,
    staleTime: 60000, // 1 min — snapshot doesn't change often
  });

  const isLoading = healthLoading || auditLoading;

  return (
    <PermissionGate requiredRole="OWNER">
      <PageContainer
        title="Advanced Health"
        description="System resilience, audit scores & infrastructure health"
        actions={
          <Button
            onClick={() => { refetchHealth(); refetchAudit(); }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      >
        <div className="space-y-6">
          {/* System Status Overview — REAL DATA */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Cloud Status</CardTitle>
                <Server className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {health?.db_ok ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  )}
                  <span className="text-lg font-bold text-zinc-100">
                    {health?.db_ok ? 'Online' : 'Offline'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {health ? `${health.avg_latency_ms.toFixed(0)}ms avg · ${(health.error_rate_5xx * 100).toFixed(1)}% errors` : 'Loading...'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">System IQ</CardTitle>
                <Cpu className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${health && health.system_iq >= 80 ? 'text-green-400' : health && health.system_iq >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {health?.system_iq || 0}
                  </span>
                  <span className="text-sm text-zinc-500">/ 100</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Health intelligence score</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Resilience</CardTitle>
                <Shield className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${health && health.resilience_pct >= 99 ? 'text-green-400' : health && health.resilience_pct >= 95 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {health?.resilience_pct?.toFixed(1) || 0}%
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Request success rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Queue Status</CardTitle>
                <Database className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-lg font-bold ${health && health.queue_depth > 0 ? 'text-amber-500' : 'text-green-400'}`}>
                  {health?.queue_depth || 0} Pending
                </div>
                <p className="text-xs text-zinc-500">
                  {health?.dlq_size || 0} in DLQ · {health?.active_alerts || 0} alerts
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Audit Score Overview */}
          {audit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    <span>Codebase Audit Score</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      Source: {audit._source || 'runtime'}
                    </Badge>
                    <span className={`text-3xl font-black ${getScoreColor(audit.overall_score)}`}>
                      {audit.overall_score.toFixed(1)}
                    </span>
                    <span className="text-sm text-zinc-500">/ 10</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(audit.scores).map(([key, score]) => {
                    const Icon = DIMENSION_ICONS[key] || Activity;
                    const label = DIMENSION_LABELS[key] || key;
                    const isExpanded = expandedDim === key;
                    const dimEvidence = audit.evidence[key] || {};
                    return (
                      <div
                        key={key}
                        className={`rounded-lg border transition-all cursor-pointer ${isExpanded
                            ? 'bg-white/[0.04] border-blue-500/30 col-span-1 md:col-span-2 lg:col-span-3'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                          }`}
                        onClick={() => setExpandedDim(isExpanded ? null : key)}
                      >
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${getScoreColor(score)}`} />
                              <span className="text-sm font-medium text-zinc-200">{label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
                              <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${getScoreBarColor(score)}`}
                              style={{ width: `${(score / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-white/5 pt-3" onClick={(e) => e.stopPropagation()}>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-zinc-500 border-b border-white/5">
                                  <th className="text-left py-2 font-medium">Check</th>
                                  <th className="text-left py-2 font-medium">Value</th>
                                  <th className="text-left py-2 font-medium">Source</th>
                                  <th className="text-left py-2 font-medium">Method</th>
                                  <th className="text-left py-2 font-medium">Confidence</th>
                                  <th className="text-left py-2 font-medium">Standard</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(dimEvidence).map(([checkKey, check]) => {
                                  const c = check as EvidenceCheck;
                                  const conf = getConfidenceBadge(c.confidence || 'low');
                                  const val = c.value;
                                  const isPass = typeof val === 'boolean' ? val : typeof val === 'number' ? val > 0 : !!val;
                                  return (
                                    <tr key={checkKey} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                      <td className="py-2 text-zinc-300 font-mono">{checkKey}</td>
                                      <td className="py-2">
                                        {typeof val === 'boolean' ? (
                                          <span className={val ? 'text-green-400' : 'text-red-400'}>
                                            {val ? '✓' : '✗'}
                                          </span>
                                        ) : (
                                          <span className="text-zinc-200 font-mono">{String(val)}</span>
                                        )}
                                      </td>
                                      <td className="py-2 text-zinc-400 max-w-[200px] truncate" title={c.source || ''}>
                                        {c.source || '—'}
                                      </td>
                                      <td className="py-2">
                                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                          {getMethodLabel(c.method)}
                                        </span>
                                      </td>
                                      <td className="py-2">
                                        <span className={`px-1.5 py-0.5 rounded border text-[10px] ${conf.color}`}>
                                          {conf.label}
                                        </span>
                                      </td>
                                      <td className="py-2">
                                        {c.industry_ref ? (
                                          <span className="flex items-center gap-1 text-blue-400">
                                            <ExternalLink className="h-3 w-3" />
                                            {c.industry_ref}
                                          </span>
                                        ) : (
                                          <span className="text-zinc-600">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Operational Health */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-400" />
                  Runtime Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Uptime</span>
                  <span className="font-bold text-zinc-100">{health ? formatUptime(health.uptime_seconds) : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Memory</span>
                  <span className="font-bold text-zinc-100">{health?.memory_mb?.toFixed(0) || 0} MB</span>
                </div>
                <div>
                  <Progress value={health ? Math.min(100, (health.memory_mb / 512) * 100) : 0} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">CPU</span>
                  <span className="font-bold text-zinc-100">{health?.cpu_percent?.toFixed(1) || 0}%</span>
                </div>
                <div>
                  <Progress value={health?.cpu_percent || 0} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total Documents</span>
                  <span className="font-bold text-zinc-100">{(health?.total_documents || 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-400" />
                  Database Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Connection</span>
                  <Badge variant={health?.db_ok ? 'default' : 'destructive'}>
                    {health?.db_ok ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Ping Latency</span>
                  <span className="font-bold text-zinc-100">{health?.db_latency_ms?.toFixed(1) || 0}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">RPS</span>
                  <span className="font-bold text-zinc-100">{health?.rps?.toFixed(2) || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Error Rate</span>
                  <span className={`font-bold ${health && health.error_rate_5xx > 0.01 ? 'text-red-400' : 'text-green-400'}`}>
                    {health ? (health.error_rate_5xx * 100).toFixed(2) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total Requests</span>
                  <span className="font-bold text-zinc-100">{(health?.total_requests || 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Failover Chain */}
          <Card>
            <CardHeader>
              <CardTitle>Resilience Failover Chain</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 justify-center py-4">
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-2 ${health?.db_ok ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    <Server className={`h-8 w-8 ${health?.db_ok ? 'text-green-400' : 'text-red-400'}`} />
                  </div>
                  <Badge variant={health?.db_ok ? 'default' : 'destructive'}>Cloud</Badge>
                  <p className="text-xs text-zinc-500 mt-1">{health?.db_ok ? 'Active' : 'Down'}</p>
                </div>
                <span className="text-zinc-500 text-2xl">→</span>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-2 bg-zinc-800 border border-zinc-700">
                    <Activity className="h-8 w-8 text-zinc-500" />
                  </div>
                  <Badge variant="outline">Edge</Badge>
                  <p className="text-xs text-zinc-500 mt-1">Standby</p>
                </div>
                <span className="text-zinc-500 text-2xl">→</span>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-2 bg-zinc-800 border border-zinc-700">
                    <Cpu className="h-8 w-8 text-zinc-500" />
                  </div>
                  <Badge variant="outline">Device</Badge>
                  <p className="text-xs text-zinc-500 mt-1">Standby</p>
                </div>
                <span className="text-zinc-500 text-2xl">→</span>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-2 bg-zinc-800 border border-zinc-700">
                    <Clock className="h-8 w-8 text-zinc-500" />
                  </div>
                  <Badge variant="outline">Mesh</Badge>
                  <p className="text-xs text-zinc-500 mt-1">Standby</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/manager/hyperscale">
              <Card className="hover:bg-white/5 transition-all cursor-pointer">
                <CardContent className="p-4 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                  <p className="text-sm font-medium text-zinc-200">Hyperscale APM</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/manager/observability/error-inbox">
              <Card className="hover:bg-white/5 transition-all cursor-pointer">
                <CardContent className="p-4 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <p className="text-sm font-medium text-zinc-200">Error Inbox</p>
                  {health && health.active_alerts > 0 && (
                    <Badge variant="destructive" className="mt-1">{health.active_alerts}</Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
            <Link to="/manager/logs">
              <Card className="hover:bg-white/5 transition-all cursor-pointer">
                <CardContent className="p-4 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm font-medium text-zinc-200">System Logs</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/manager/observability/testpanel">
              <Card className="hover:bg-white/5 transition-all cursor-pointer">
                <CardContent className="p-4 text-center">
                  <TestTube2 className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                  <p className="text-sm font-medium text-zinc-200">Test Panel</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </PageContainer>
    </PermissionGate>
  );
}
