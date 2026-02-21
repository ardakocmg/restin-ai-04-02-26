import { useEffect, useState } from 'react';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import DataTable from '@/components/shared/DataTable';
import { useVenue } from '@/context/VenueContext';
import { useAuth } from '@/context/AuthContext';
import { hrAuditAPI } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { useHRFeatureFlags } from '@/hooks/useHRFeatureFlags';
import HRAccessPanel from '@/components/hr/HRAccessPanel';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';

export default function AuditTrail() {
  const { activeVenue } = useVenue();
  const { user } = useAuth();
  const { getAccess, loading: flagsLoading } = useHRFeatureFlags();
  const { logAction } = useAuditLog();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [tableQuery, setTableQuery] = useState({
    pageIndex: 0,
    pageSize: 20,
    sorting: [],
    globalSearch: '',
    filters: {}
  });

  const loadLogs = async (query = tableQuery) => {
    if (!activeVenue?.id) return;
    setLoading(true);
    try {
      const response = await hrAuditAPI.list(activeVenue.id, query.pageIndex + 1, query.pageSize);
      setLogs(response.data.items || []);
      setTotalCount(response.data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [activeVenue?.id, tableQuery]);

  // Meta-audit: log who viewed the audit trail
  useEffect(() => {
    if (user?.id && activeVenue?.id) {
      logAction('AUDIT_TRAIL_VIEWED', 'hr_audit_trail', activeVenue.id);
    }
  }, [user?.id, activeVenue?.id]);

  const access = getAccess('audit_trail');
  if (!flagsLoading && !access.enabled) {
    return (
      <PageContainer title="HR Audit Trail" description="Audit-first ledger for HR configuration and workflows">
        <HRAccessPanel message="Audit trail module is disabled for your role." />
      </PageContainer>
    );
  }

  const columns = [
    { key: 'created_at', label: 'Timestamp', render: (row) => new Date(row.created_at).toLocaleString() },
    { key: 'action', label: 'Action' },
    { key: 'actor_role', label: 'Role', render: (row) => <Badge variant="outline">{row.actor_role || 'system'}</Badge> },
    { key: 'entity', label: 'Entity' },
    { key: 'details', label: 'Details', enableSorting: false, render: (row) => <span className="text-xs text-slate-300">{JSON.stringify(row.details || {})}</span> }
  ];

  return (
    <PermissionGate requiredRole="OWNER">
      <PageContainer
        title="HR Audit Trail"
        description="Audit-first ledger for HR configuration and workflows"
      >
        <Card className="border border-border bg-background shadow-sm" data-testid="hr-audit-trail-card">
          <CardContent className="p-4">
            <DataTable
              columns={columns}
              data={logs}
              loading={loading}
              onQueryChange={setTableQuery}
              totalCount={totalCount}
              tableId="hr-audit-trail"
              enableGlobalSearch={false}
              enableFilters={false}
              emptyMessage="No audit events"
              tableTestId="hr-audit-table"
            />
          </CardContent>
        </Card>
      </PageContainer>
    </PermissionGate>
  );
}
