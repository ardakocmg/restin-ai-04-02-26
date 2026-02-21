import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { CheckCircle, XCircle, AlertTriangle, RefreshCcw, Check } from 'lucide-react';
import PageContainer from '../../layouts/PageContainer';
import DataTable from '../../components/shared/DataTable';
import api from '../../lib/api';
import { toast } from 'sonner';
import { downloadCsv } from '../../lib/csv';

interface RetryField {
  path: string;
  label?: string;
  type?: string;
  location?: string;
}

interface RetryPlan {
  mode?: string;
  allowed?: boolean;
  editable_fields?: RetryField[];
  base_body_redacted?: Record<string, unknown>;
  base_query?: Record<string, string>;
  target?: { method?: string; path?: string };
}

interface ErrorStep {
  step_id: string;
  title: string;
  domain: string;
  status: string;
}

interface ErrorEntry {
  id: string;
  display_id: string;
  domain: string;
  severity: string;
  status: string;
  occurrence_count: number;
  last_seen_at: string;
  created_at?: string;
  error?: { message?: string };
  source?: unknown;
  steps?: ErrorStep[];
  retry_plan?: RetryPlan;
  entity_refs?: Record<string, string>;
  [key: string]: unknown;
}

interface TableQuery {
  pageIndex: number;
  pageSize: number;
  sorting: Array<{ id: string; desc: boolean }>;
  globalSearch: string;
  filters: Record<string, unknown>;
}

interface RetryPatch {
  body: Record<string, unknown>;
  query: Record<string, unknown>;
}

export default function ErrorInbox() {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedError, setSelectedError] = useState<ErrorEntry | null>(null);
  const [retryableOnly, setRetryableOnly] = useState(false);
  const [blockingOnly, setBlockingOnly] = useState(false);
  const [retryFormValues, setRetryFormValues] = useState<Record<string, unknown>>({});
  const [tableQuery, setTableQuery] = useState<TableQuery>({
    pageIndex: 0,
    pageSize: 20,
    sorting: [{ id: 'last_seen_at', desc: true }],
    globalSearch: '',
    filters: {}
  });
  const venueId = localStorage.getItem('restin_pos_venue') || 'venue-caviar-bull';

  useEffect(() => {
    loadErrors();
  }, [venueId, tableQuery, retryableOnly, blockingOnly]);

  useEffect(() => {
    if (selectedError?.retry_plan?.editable_fields) {
      const initialValues: Record<string, unknown> = {};
      const baseBody = selectedError.retry_plan?.base_body_redacted || {};
      const baseQuery = selectedError.retry_plan?.base_query || {};
      selectedError.retry_plan.editable_fields.forEach((field: RetryField) => {
        const location = field.location || 'body';
        if (location === 'query') {
          initialValues[field.path] = baseQuery[field.path] ?? '';
        } else if (location === 'path') {
          initialValues[field.path] = selectedError.entity_refs?.[field.path] || '';
        } else {
          initialValues[field.path] = baseBody[field.path] ?? '';
        }
      });
      setRetryFormValues(initialValues);
    }
  }, [selectedError]);

  const loadErrors = async (query: TableQuery = tableQuery) => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        venue_id: venueId,
        page: query.pageIndex + 1,
        page_size: query.pageSize,
        q: query.globalSearch || undefined,
        retryable_only: retryableOnly || undefined,
        blocking_only: blockingOnly || undefined
      };

      const filters = query.filters || {} as Record<string, unknown>;
      const fDomain = filters.domain as string[] | undefined;
      const fStatus = filters.status as string[] | undefined;
      const fSeverity = filters.severity as string[] | undefined;
      const fOccurrence = filters.occurrence_count as { min?: number; max?: number } | undefined;
      const fLastSeen = filters.last_seen_at as { start?: string; end?: string } | undefined;
      if (fDomain?.length) params.domains = fDomain.join(',');
      if (fStatus?.length) params.statuses = fStatus.join(',');
      if (fSeverity?.length) params.severities = fSeverity.join(',');
      if (fOccurrence?.min) params.occurrence_min = fOccurrence.min;
      if (fOccurrence?.max) params.occurrence_max = fOccurrence.max;
      if (fLastSeen?.start) params.last_seen_start = fLastSeen.start;
      if (fLastSeen?.end) params.last_seen_end = fLastSeen.end;

      if (query.sorting?.length) {
        const sort = query.sorting[0];
        const sortMap: Record<string, string> = {
          last_seen_at: 'last_seen_at',
          occurrence_count: 'occurrence_count',
          severity: 'severity',
          status: 'status',
          created_at: 'created_at'
        };
        params.sort_by = sortMap[sort.id] || 'created_at';
        params.sort_dir = sort.desc ? 'desc' : 'asc';
      }

      const response = await api.get('/observability/error-inbox', { params });
      setErrors(response.data.items || []);
      setTotalCount(response.data.total || 0);
    } catch (error: unknown) {
      logger.error('Failed to load errors:', { error: String(error) });
      toast.error('Failed to load error inbox');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (errorId: string) => {
    try {
      await api.post(`/observability/error-inbox/${errorId}/acknowledge`);
      toast.success('Error acknowledged');
      loadErrors();
    } catch (error: unknown) {
      toast.error('Failed to acknowledge');
    }
  };

  const handleRetry = async (errorId: string) => {
    try {
      const retryPlan = selectedError?.retry_plan;
      const editableFields = retryPlan?.editable_fields || [];
      const patch: RetryPatch = { body: {}, query: {} };

      editableFields.forEach((field: RetryField) => {
        const location = field.location || 'body';
        const value = retryFormValues[field.path];
        if (location === 'query') {
          patch.query[field.path] = value;
        } else {
          patch.body[field.path] = value;
        }
      });

      const tokenRes = await api.post(`/observability/error-inbox/${errorId}/action-token`);
      const retryRes = await api.post(`/observability/error-inbox/${errorId}/retry`, {
        token: tokenRes.data.action_token,
        mode: retryPlan?.mode || 'FULL_REPLAY',
        patch
      });
      toast.success('Retry executed');
      loadErrors();
    } catch (error: unknown) {
      toast.error('Retry failed');
    }
  };

  const handleExport = async (query: TableQuery = tableQuery) => {
    try {
      const params: Record<string, unknown> = {
        venue_id: venueId,
        page: 1,
        page_size: 1000,
        q: query.globalSearch || undefined,
        retryable_only: retryableOnly || undefined,
        blocking_only: blockingOnly || undefined
      };

      const response = await api.get('/observability/error-inbox', { params });
      const rows = (response.data.items || []).map((item: ErrorEntry) => ({
        display_id: item.display_id,
        domain: item.domain,
        severity: item.severity,
        message: item.error?.message || '-',
        status: item.status,
        occurrence_count: item.occurrence_count,
        last_seen_at: new Date(item.last_seen_at).toLocaleString()
      }));

      downloadCsv(`error-inbox-${new Date().toISOString().split('T')[0]}.csv`, rows, [
        { key: 'display_id', label: 'Error ID' },
        { key: 'domain', label: 'Domain' },
        { key: 'severity', label: 'Severity' },
        { key: 'message', label: 'Message' },
        { key: 'status', label: 'Status' },
        { key: 'occurrence_count', label: 'Count' },
        { key: 'last_seen_at', label: 'Last Seen' }
      ]);
      toast.success('Export completed');
    } catch (error: unknown) {
      logger.error('Failed to export errors:', { error: String(error) });
      toast.error('Export failed');
    }
  };

  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      INFO: '#3B82F6',
      WARNING: '#FB8C00',
      ERROR: '#EF4444',
      CRITICAL: '#DC2626'
    };
    return colors[severity] || '#71717A';
  };

  const columns = [
    {
      key: 'display_id',
      label: 'Error ID',
      render: (row: ErrorEntry) => <span className="font-bold font-heading tracking-tight" style={{ color: '#EF4444' }}>{row.display_id}</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
    },
    {
      key: 'domain',
      label: 'Domain',
      filterType: 'multiSelect',
      filterOptions: [
        { label: 'Orders', value: 'ORDERS' },
        { label: 'Inventory', value: 'INVENTORY' },
        { label: 'Payments', value: 'PAYMENTS' },
        { label: 'KDS', value: 'KDS' },
        { label: 'System', value: 'SYSTEM' }
      ],
      render: (row: ErrorEntry) => <Badge variant="outline">{row.domain}</Badge>
    },
    {
      key: 'severity',
      label: 'Severity',
      filterType: 'multiSelect',
      filterOptions: [
        { label: 'Info', value: 'INFO' },
        { label: 'Warning', value: 'WARNING' },
        { label: 'Critical', value: 'CRITICAL' }
      ],
      render: (row: ErrorEntry) => (
        <Badge style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
          backgroundColor: `${getSeverityColor(row.severity)
            }20`, color: getSeverityColor(row.severity), border: `1px solid ${getSeverityColor(row.severity)} 40`
        }}>
          {row.severity}
        </Badge>
      )
    },
    { key: 'message', label: 'Message', enableSorting: false, render: (row: ErrorEntry) => row.error?.message || '-' },
    {
      key: 'status',
      label: 'Status',
      filterType: 'multiSelect',
      filterOptions: [
        { label: 'Open', value: 'OPEN' },
        { label: 'Acked', value: 'ACKED' },
        { label: 'Resolved', value: 'RESOLVED' },
        { label: 'Muted', value: 'MUTED' }
      ],
      render: (row: ErrorEntry) => {
        const colors: Record<string, string> = { OPEN: '#FB8C00', ACKED: '#3B82F6', RESOLVED: '#4ADE80', MUTED: '#71717A' };
        return <Badge style={{ backgroundColor: `${colors[row.status]}20`, color: colors[row.status] }}>{row.status}</Badge>; /* keep-inline */ /* keep-inline */ /* keep-inline */
      }
    },
    { key: 'occurrence_count', label: 'Count', filterType: 'numberRange' },
    { key: 'last_seen_at', label: 'Last Seen', filterType: 'dateRange', render: (row: ErrorEntry) => new Date(row.last_seen_at).toLocaleString() },
  ];

  const renderRetryField = (field: RetryField) => {
    const value = retryFormValues[field.path] ?? '';
    const onChange = (val: unknown) => setRetryFormValues((prev) => ({ ...prev, [field.path]: val }));

    if (field.type === 'boolean') {
      const normalizedValue = value === '' ? 'false' : String(value);
      return (
        <Select aria-label="Select option" value={normalizedValue} onValueChange={(val) => onChange(val === 'true')}>
          <SelectTrigger aria-label="Select option" data-testid={`retry - field - ${field.path} `}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (field.type === 'number') {
      return (
        <Input aria-label="Input field"
          type="number"
          value={value as string | number}
          onChange={(e) => onChange(Number(e.target.value))}
          data-testid={`retry - field - ${field.path} `}
        />
      );
    }

    if (field.type === 'object' || field.type === 'array') {
      return (
        <textarea aria-label="Input"
          className="w-full p-2 rounded-lg text-xs font-mono"
          style={{ backgroundColor: '#09090B', color: '#F8FAFC', border: '1px solid rgba(255,255,255,0.05)' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`retry - field - ${field.path} `}
        />
      );
    }

    return (
      <Input aria-label="Input field"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        data-testid={`retry - field - ${field.path} `}
      />
    );
  };

  return (
    <PageContainer
      title="Error Inbox"
      description="System-generated errors and retry management"
      actions={
        <div className="flex flex-wrap gap-2" data-testid="error-inbox-filters">
          <Button
            variant={retryableOnly ? 'default' : 'outline'}
            onClick={() => setRetryableOnly((prev) => !prev)}
            data-testid="error-inbox-retryable-toggle"
            className={retryableOnly ? 'bg-red-500 text-foreground font-bold' : 'bg-card border-border text-secondary-foreground hover:bg-secondary'}
          >
            Retryable
          </Button>
          <Button
            variant={blockingOnly ? 'default' : 'outline'}
            onClick={() => setBlockingOnly((prev) => !prev)}
            data-testid="error-inbox-blocking-toggle"
            className={blockingOnly ? 'bg-red-500 text-foreground font-bold' : 'bg-card border-border text-secondary-foreground hover:bg-secondary'}
          >
            Blocking
          </Button>
          <Button
            onClick={() => loadErrors()}
            data-testid="error-inbox-refresh-button"
            className="bg-card border-border text-secondary-foreground hover:bg-secondary hover:text-foreground transition-all shadow-lg"
          >
            <RefreshCcw className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={errors}
        loading={loading}
        onRowClick={(row: ErrorEntry) => setSelectedError(row)}
        onQueryChange={setTableQuery}
        totalCount={totalCount}
        tableId="observability-error-inbox"
        onExport={handleExport}
        tableTestId="error-inbox-table"
        rowTestIdPrefix="error-inbox-row"
      />

      {/* Error Detail Dialog */}
      {selectedError && (
        <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedError.display_id} - {selectedError.error?.message}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 space-y-1" data-testid="error-inbox-detail-meta">
                    <div className="text-xs text-muted-foreground">Severity</div>
                    <div className="text-sm font-semibold" style={{ color: getSeverityColor(selectedError.severity) }}>{selectedError.severity}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <div className="text-xs text-muted-foreground">Domain</div>
                    <div className="text-sm font-semibold text-secondary-foreground">{selectedError.domain}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-1">
                    <div className="text-xs text-muted-foreground">Occurrences</div>
                    <div className="text-sm font-semibold text-secondary-foreground">{selectedError.occurrence_count}</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-background border-border">
                <CardHeader>
                  <CardTitle className="text-base text-foreground font-bold uppercase tracking-widest">Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs p-3 rounded-lg bg-black text-secondary-foreground overflow-auto max-h-[200px]" data-testid="error-inbox-source">
                    {JSON.stringify(selectedError.source, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              {/* Steps Timeline */}
              <div>
                <h3 className="font-semibold mb-3" style={{ color: '#F5F5F7' }}>Steps Timeline</h3> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <div className="space-y-2">
                  {selectedError.steps?.map((step: ErrorStep) => (
                    <div
                      key={step.step_id}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                      data-testid={`error - inbox - step - ${step.step_id} `}
                    >
                      {step.status === 'SUCCESS' ? <CheckCircle className="h-5 w-5 text-green-500" /> :
                        step.status === 'FAILED' ? <XCircle className="h-5 w-5 text-red-500" /> :
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                      <div className="flex-1">
                        <p style={{ color: '#F5F5F7' }}>{step.title}</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <p className="text-xs" style={{ color: '#71717A' }}>{step.domain}</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                      </div>
                      <Badge>{step.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {selectedError.retry_plan && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Retry Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3" data-testid="error-inbox-retry-plan">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Mode: {selectedError.retry_plan.mode}</Badge>
                      <Badge variant="outline">Allowed: {selectedError.retry_plan.allowed ? 'Yes' : 'No'}</Badge>
                      <Badge variant="outline">Target: {selectedError.retry_plan.target?.method} {selectedError.retry_plan.target?.path}</Badge>
                    </div>
                    {(selectedError.retry_plan.editable_fields?.length ?? 0) > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(selectedError.retry_plan.editable_fields ?? []).map((field: RetryField) => (
                          <div key={field.path} className="space-y-1">
                            <label className="text-xs text-muted-foreground">{field.label || field.path}</label>
                            {renderRetryField(field)}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleAcknowledge(selectedError.id)}
                  data-testid="error-inbox-acknowledge-button"
                  className="bg-card border-border text-foreground font-bold hover:bg-secondary transition-all shadow-lg"
                >
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Acknowledge
                </Button>
                {selectedError.retry_plan?.allowed && (
                  <Button
                    onClick={() => handleRetry(selectedError.id)}
                    data-testid="error-inbox-retry-button"
                    className="bg-red-600 text-foreground font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-500/10"
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PageContainer>
  );
}