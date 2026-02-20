// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useVenue } from '../../context/VenueContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import PermissionGate from '../../components/shared/PermissionGate';
import { useAuditLog } from '../../hooks/useAuditLog';
import { logger } from '@/lib/logger';
import {
  RefreshCw,
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  Download,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

// ─── Severity Colors ────────────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  info: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Info, label: 'Info' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: AlertTriangle, label: 'Warning' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertCircle, label: 'Critical' },
};

// ─── CSV Export Helper ──────────────────────────────────────────────────────────
function exportToCsv(logs) {
  const headers = ['Timestamp', 'User', 'Role', 'Action', 'Resource', 'Resource ID', 'Severity'];
  const rows = logs.map((log) => [
    log.timestamp || log.created_at || '',
    log.actor?.name || log.user_name || '',
    log.actor?.role || log.user_role || '',
    log.action || '',
    log.resource_type || '',
    log.resource_id || '',
    log.severity || 'info',
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Summary Card ───────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, color, bgColor, borderColor }) {
  return (
    <div className={`rounded-xl p-4 ${bgColor} border ${borderColor} flex items-center gap-3 transition-all hover:scale-[1.02]`}>
      <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─── Timeline Entry ─────────────────────────────────────────────────────────────
function TimelineEntry({ log, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const severity = log.severity || 'info';
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const SevIcon = config.icon;
  const ts = new Date(log.timestamp || log.created_at);
  const userName = log.actor?.name || log.user_name || 'System';
  const userRole = log.actor?.role || log.user_role || '';

  return (
    <div className="flex gap-3 group">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${config.bg} border ${config.border} flex items-center justify-center shrink-0 z-10`}>
          <SevIcon className={`w-4 h-4 ${config.color}`} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border/40 min-h-6" />}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left bg-card/50 hover:bg-card/80 border border-border/50 rounded-xl p-3 transition-all group-hover:border-border"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Badge className={`${config.bg} ${config.color} ${config.border} border text-[10px] font-bold uppercase shrink-0`}>
                {log.action}
              </Badge>
              <span className="text-sm text-muted-foreground truncate">{log.resource_type}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-muted-foreground/60 font-mono">
                {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <User className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-xs font-medium text-foreground">{userName}</span>
            {userRole && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-border/50 text-muted-foreground">
                {userRole}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground/40 ml-auto">
              {ts.toLocaleDateString()}
            </span>
          </div>
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-2 ml-2 p-3 bg-card/50 border border-border/30 rounded-lg text-xs space-y-1.5">
            {log.resource_id && (
              <div className="flex gap-2">
                <span className="text-muted-foreground">Resource ID:</span>
                <span className="font-mono text-foreground">{log.resource_id}</span>
              </div>
            )}
            {log.venue_id && (
              <div className="flex gap-2">
                <span className="text-muted-foreground">Venue:</span>
                <span className="font-mono text-foreground">{log.venue_id}</span>
              </div>
            )}
            {log.ip_address && (
              <div className="flex gap-2">
                <span className="text-muted-foreground">IP:</span>
                <span className="font-mono text-foreground">{log.ip_address}</span>
              </div>
            )}
            {log.details && (
              <div className="mt-1">
                <span className="text-muted-foreground">Details:</span>
                <pre className="mt-1 p-2 bg-background rounded text-muted-foreground overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function AuditLogs() {
  const { activeVenue } = useVenue();
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ total: 0, info: 0, warning: 0, critical: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Meta-audit: log who viewed audit logs
  useEffect(() => {
    if (user?.id && activeVenue?.id) {
      logAction('AUDIT_LOGS_VIEWED', 'audit_logs', activeVenue.id);
    }
  }, [user?.id, activeVenue?.id]);

  const loadData = useCallback(async () => {
    if (!activeVenue?.id) return;
    setLoading(true);
    try {
      const [logsRes, summaryRes] = await Promise.all([
        api.get(`/audit/?venue_id=${activeVenue.id}&limit=200`),
        api.get(`/audit/summary?venue_id=${activeVenue.id}&days=30`),
      ]);
      setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      setSummary(summaryRes.data || { total: 0, info: 0, warning: 0, critical: 0 });
    } catch (error: any) {
      logger.error('Failed to load audit data', { error: error instanceof Error ? error.message : String(error) });
      // Fallback: try legacy endpoint
      try {
        const fallback = await api.get(`/venues/${activeVenue.id}/audit-logs`);
        setLogs(Array.isArray(fallback.data) ? fallback.data : []);
      } catch (fallbackErr: any) {
        logger.error('Fallback audit endpoint also failed', { error: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr) });
      }
    } finally {
      setLoading(false);
    }
  }, [activeVenue?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Severity filter
      if (severityFilter && (log.severity || 'info') !== severityFilter) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          log.action,
          log.resource_type,
          log.actor?.name || log.user_name,
          log.resource_id,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [logs, severityFilter, searchQuery]);

  return (
    <PermissionGate requiredRole="OWNER">
      <PageContainer
        title="Audit Trail"
        description="Immutable system activity & change tracking"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => exportToCsv(filteredLogs)} variant="outline" size="sm" className="gap-1.5 text-foreground">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            <Button onClick={loadData} variant="outline" size="sm" className="gap-1.5 text-foreground">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      >
        {/* ── Summary Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryCard
            icon={Activity}
            label="Total Events (30d)"
            value={summary.total}
            color="text-secondary-foreground"
            bgColor="bg-secondary/50"
            borderColor="border-border/50"
          />
          <SummaryCard
            icon={Info}
            label="Info"
            value={summary.info}
            color="text-blue-400"
            bgColor="bg-blue-500/10"
            borderColor="border-blue-500/20"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Warnings"
            value={summary.warning}
            color="text-amber-400"
            bgColor="bg-amber-500/10"
            borderColor="border-amber-500/20"
          />
          <SummaryCard
            icon={AlertCircle}
            label="Critical"
            value={summary.critical}
            color="text-red-400"
            bgColor="bg-red-500/10"
            borderColor="border-red-500/20"
          />
        </div>

        {/* ── Filter Strip ──────────────────────────────────────────────── */}
        <Card className="bg-card border-border/50 mb-4">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions, users, resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background border-border text-foreground"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1.5 text-foreground"
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
              </Button>
            </div>

            {showFilters && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                <span className="text-xs text-muted-foreground font-medium">Severity:</span>
                {['', 'info', 'warning', 'critical'].map((sev) => {
                  const active = severityFilter === sev;
                  const sevConfig = sev ? SEVERITY_CONFIG[sev] : null;
                  return (
                    <Button
                      key={sev || 'all'}
                      variant={active ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSeverityFilter(sev)}
                      className={`text-xs h-7 px-3 ${active ? '' : 'text-muted-foreground'}`}
                    >
                      {sev ? (
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${sevConfig?.bg.replace('/10', '')} ${sevConfig?.color.replace('text-', 'bg-')}`} />
                          {sevConfig?.label}
                        </span>
                      ) : (
                        'All'
                      )}
                    </Button>
                  );
                })}
                {severityFilter && (
                  <Button variant="ghost" size="sm" onClick={() => setSeverityFilter('')} className="text-xs h-7 px-2 text-muted-foreground">
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Timeline ──────────────────────────────────────────────────── */}
        <Card className="bg-card border-border/50 overflow-hidden">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Activity Timeline</h3>
              </div>
              <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                <Shield className="w-3 h-3 mr-1" />
                {filteredLogs.length} events
              </Badge>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading audit trail...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No audit events found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Events will appear here as actions are taken</p>
              </div>
            ) : (
              <div className="space-y-0">
                {filteredLogs.map((log, idx) => (
                  <TimelineEntry
                    key={log._id || log.id || idx}
                    log={log}
                    isLast={idx === filteredLogs.length - 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </PermissionGate>
  );
}
