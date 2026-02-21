import { useEffect, useState } from 'react';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import DataTable from '../../components/shared/DataTable';
import { updatesAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import HRAccessPanel from '../../components/hr/HRAccessPanel';

const CHANGE_TYPES = ['Added', 'Changed', 'Fixed', 'Removed'];

export default function UpdatesPage() {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [changes, setChanges] = useState([]);
  const [releases, setReleases] = useState([]);
  const [loadingChanges, setLoadingChanges] = useState(true);
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [viewMode, setViewMode] = useState('user');
  const [form, setForm] = useState({
    title: '',
    change_type: 'Added',
    domain: '',
    user_summary: '',
    technical_summary: ''
  });

  const canEdit = ['owner', 'product_owner'].includes(user?.role);

  const loadChanges = async () => {
    setLoadingChanges(true);
    try {
      const response = await updatesAPI.listChanges(false);
      setChanges(response.data.items || []);
    } finally {
      setLoadingChanges(false);
    }
  };

  const loadReleases = async (view = viewMode) => {
    setLoadingReleases(true);
    try {
      const response = await updatesAPI.listReleases(view);
      setReleases(response.data.items || []);
    } finally {
      setLoadingReleases(false);
    }
  };

  useEffect(() => {
    loadChanges();
  }, []);

  useEffect(() => {
    loadReleases(viewMode);
  }, [viewMode]);

  const handleFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddChange = async () => {
    if (!form.title) return;
    await updatesAPI.createChange(form);
    setForm({ title: '', change_type: 'Added', domain: '', user_summary: '', technical_summary: '' });
    loadChanges();
  };

  const handlePublish = async () => {
    await updatesAPI.publish();
    loadChanges();
    loadReleases(viewMode);
  };

  if (!canEdit) {
    return (
      <PageContainer title="Updates" description="Release notes and update publishing">
        <HRAccessPanel message="Only owners can manage updates." />
      </PageContainer>
    );
  }

  return (
    <PermissionGate requiredRole="OWNER">
      <PageContainer
        title="Updates"
        description="Daily update log with user + technical release notes"
        actions={
          <Button onClick={handlePublish} data-testid="updates-publish-button">
            Publish Update
          </Button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card className="border border-indigo-500/20 bg-slate-950/60" data-testid="updates-change-log">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-indigo-50">Log a Change</h3>
              <div className="grid gap-3">
                <Input aria-label="Input field"
                  value={form.title}
                  onChange={(event) => handleFormChange('title', event.target.value)}
                  placeholder="Change title"
                  data-testid="updates-title-input"
                />
                <Select aria-label="Select option" value={form.change_type} onValueChange={(value) => handleFormChange('change_type', value)}>
                  <SelectTrigger aria-label="Updates Type Select" data-testid="updates-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANGE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input aria-label="Input field"
                  value={form.domain}
                  onChange={(event) => handleFormChange('domain', event.target.value)}
                  placeholder="Domain (Inventory, POS, HR...)"
                  data-testid="updates-domain-input"
                />
                <Textarea aria-label="Input field"
                  value={form.user_summary}
                  onChange={(event) => handleFormChange('user_summary', event.target.value)}
                  placeholder="User-facing summary"
                  data-testid="updates-user-summary"
                />
                <Textarea aria-label="Input field"
                  value={form.technical_summary}
                  onChange={(event) => handleFormChange('technical_summary', event.target.value)}
                  placeholder="Technical summary"
                  data-testid="updates-technical-summary"
                />
                <Button onClick={handleAddChange} data-testid="updates-add-change">Add Change</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-indigo-500/20 bg-slate-950/60" data-testid="updates-pending-changes">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-indigo-50 mb-4">Pending Changes</h3>
              <DataTable
                columns={[
                  { key: 'change_type', label: 'Type', render: (row) => <Badge variant="outline">{row.change_type}</Badge> },
                  { key: 'title', label: 'Title' },
                  { key: 'domain', label: 'Domain' },
                  { key: 'created_at', label: 'Created', render: (row) => new Date(row.created_at).toLocaleString() }
                ]}
                data={changes}
                loading={loadingChanges}
                enableFilters={false}
                enableGlobalSearch={false}
                tableId="updates-pending-changes"
                emptyMessage="No pending changes"
                tableTestId="updates-changes-table"
              />
            </CardContent>
          </Card>
        </div>

        <Card className="border border-indigo-500/20 bg-slate-950/60 mt-6" data-testid="updates-release-notes">
          <CardContent className="p-6">
            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList data-testid="updates-release-tabs">
                <TabsTrigger value="user">User View</TabsTrigger>
                <TabsTrigger value="technical">Technical View</TabsTrigger>
              </TabsList>
              <TabsContent value={viewMode} className="mt-4">
                {loadingReleases && <div className="text-sm text-muted-foreground">{"Loading "}releases…</div>}
                <div className="space-y-4">
                  {releases.map((release) => (
                    <div key={release.id} className="rounded-xl border border-border bg-black/30 p-4" data-testid={`updates-release-${release.version_code}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-indigo-50">{release.version_code}</p>
                        <span className="text-xs text-muted-foreground">{new Date(release.created_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-3 space-y-2 text-xs text-secondary-foreground">
                        {Object.entries(release.notes || {}).map(([section, items]) => (
                          <div key={section}>
                            <p className="text-muted-foreground uppercase tracking-wide">{section}</p>
                            <ul className="mt-1 space-y-1">
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              {(items as/**/any[] || []).map((item) => (
                                <li key={item}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </PageContainer>
    </PermissionGate>
  );
}
