import React, { useEffect, useState } from 'react';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { publicContentAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const CONTENT_TYPES = [
  { value: 'marketing', label: 'Marketing Homepage' },
  { value: 'technical', label: 'Technical Hub' },
  { value: 'modules', label: 'Module Catalog' }
];

export default function ContentStudio() {
  const { user } = useAuth();
  const [contentType, setContentType] = useState('marketing');
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [editorValue, setEditorValue] = useState('');
  const [editorMode, setEditorMode] = useState('JSON');
  const [visualContent, setVisualContent] = useState(null);
  const [changelog, setChangelog] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const canApprove = ['owner', 'product_owner'].includes(user?.role);

  const loadVersions = async (type = contentType) => {
    try {
      setLoading(true);
      const response = await publicContentAPI.listVersions(type);
      setVersions(response.data.versions || []);
      if (response.data.versions?.length) {
        setSelectedVersion(response.data.versions[0]);
        setEditorValue(JSON.stringify(response.data.versions[0].content, null, 2));
        setVisualContent(response.data.versions[0].content || {});
        setScheduledAt(response.data.versions[0].scheduled_publish_at ? new Date(response.data.versions[0].scheduled_publish_at).toISOString().slice(0, 16) : '');
      } else {
        setSelectedVersion(null);
        setEditorValue('');
        setVisualContent(null);
        setScheduledAt('');
      }
    } catch (error) {
      toast.error('Failed to load content versions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersions(contentType);
  }, [contentType]);

  useEffect(() => {
    if (editorMode === 'VISUAL') {
      try {
        setVisualContent(JSON.parse(editorValue || '{}'));
      } catch (error) {
        toast.error('Invalid JSON for visual editor');
      }
    }
  }, [editorMode]);

  const handleSelectVersion = (versionId) => {
    const version = versions.find((item) => item.id === versionId);
    setSelectedVersion(version);
    setEditorValue(JSON.stringify(version?.content || {}, null, 2));
    setVisualContent(version?.content || {});
    setScheduledAt(version?.scheduled_publish_at ? new Date(version.scheduled_publish_at).toISOString().slice(0, 16) : '');
  };

  const handleCreateDraft = async () => {
    try {
      setLoading(true);
      const current = await publicContentAPI.getCurrent(contentType);
      const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : null;
      const response = await publicContentAPI.createVersion({
        type: contentType,
        content: current.data.content || {},
        changelog: changelog || 'Draft created from current',
        scheduled_publish_at: scheduledIso
      });
      toast.success('Draft created');
      setChangelog('');
      loadVersions(contentType);
      setSelectedVersion(response.data.version);
      setEditorValue(JSON.stringify(response.data.version.content, null, 2));
    } catch (error) {
      toast.error('Failed to create draft');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedVersion) return;
    try {
      const parsed = editorMode === 'VISUAL' && visualContent ? visualContent : JSON.parse(editorValue || '{}');
      const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : null;
      setLoading(true);
      await publicContentAPI.updateVersion(selectedVersion.id, { content: parsed, changelog, scheduled_publish_at: scheduledIso });
      toast.success('Draft saved');
      setChangelog('');
      loadVersions(contentType);
    } catch (error) {
      toast.error('Invalid JSON or save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVersion) return;
    try {
      setLoading(true);
      await publicContentAPI.approveVersion(selectedVersion.id);
      toast.success('Version approved');
      loadVersions(contentType);
    } catch (error) {
      toast.error('Failed to approve version');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!selectedVersion) return;
    const targetPath = contentType === 'technical' ? '/technic' : contentType === 'modules' ? '/modules' : '/';
    window.open(`${targetPath}?previewId=${selectedVersion.id}`, '_blank');
  };

  const handleSyncModules = async () => {
    try {
      setLoading(true);
      await publicContentAPI.syncModules();
      toast.success('Synced modules from registry');
      loadVersions('modules');
    } catch (error) {
      toast.error('Failed to sync modules');
    } finally {
      setLoading(false);
    }
  };

  const updateVisualModule = (index, field, value) => {
    setVisualContent((prev) => {
      const modules = [...(prev?.modules || [])];
      modules[index] = { ...modules[index], [field]: value };
      return { ...prev, modules };
    });
  };

  const updateVisualPricing = (index, field, value) => {
    setVisualContent((prev) => {
      const pricing = [...(prev?.pricing || [])];
      pricing[index] = { ...pricing[index], [field]: value };
      return { ...prev, pricing };
    });
  };

  const applyVisualToJson = () => {
    if (!visualContent) return;
    setEditorValue(JSON.stringify(visualContent, null, 2));
    toast.success('Visual changes synced to JSON');
  };

  const toggleAutoSync = (checked) => {
    setVisualContent((prev) => ({ ...prev, auto_sync_registry: checked }));
  };

  const approvedVersion = versions.find((item) => item.status === 'APPROVED');
  const approvedJson = JSON.stringify(approvedVersion?.content || {}, null, 2);
  const selectedJson = editorValue || '';

  const diffLines = selectedJson.split('\n').map((line, index) => {
    const baseLine = approvedJson.split('\n')[index] || '';
    return { line, changed: line !== baseLine };
  });

  return (
    <PageContainer
      title="Content Studio"
      description="Versioned content with admin approval"
      actions={
        <div className="flex flex-wrap gap-2">
          {contentType === 'modules' && (
            <Button variant="outline" onClick={handleSyncModules} disabled={loading} data-testid="content-studio-sync-modules">
              Sync Modules
            </Button>
          )}
          <Button onClick={handleCreateDraft} disabled={loading} data-testid="content-studio-create-draft">
            Create Draft
          </Button>
          <Button variant="outline" onClick={handlePreview} disabled={!selectedVersion} data-testid="content-studio-preview">
            Preview
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6" data-testid="content-studio-layout">
        <Card data-testid="content-studio-sidebar">
          <CardHeader>
            <CardTitle>Content Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger data-testid="content-studio-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="space-y-2" data-testid="content-studio-versions">
              {versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => handleSelectVersion(version.id)}
                  className={`w-full text-left p-3 rounded-lg border ${selectedVersion?.id === version.id ? 'border-red-500 bg-red-500/10' : 'border-white/10 bg-zinc-900/40'}`}
                  data-testid={`content-version-${version.version}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-200 font-semibold">{version.version}</p>
                      <p className="text-xs text-zinc-500">{new Date(version.created_at).toLocaleString()}</p>
                      {version.created_by_role && (
                        <p className="text-xs text-zinc-500">Drafted by: {version.created_by_role}</p>
                      )}
                      {version.approved_by_role && (
                        <p className="text-xs text-zinc-500">Approved by: {version.approved_by_role}</p>
                      )}
                      {version.scheduled_publish_at && (
                        <p className="text-xs text-amber-400">Scheduled: {new Date(version.scheduled_publish_at).toLocaleString()}</p>
                      )}
                    </div>
                    <Badge variant={version.status === 'APPROVED' ? 'default' : 'outline'}>
                      {version.status}
                    </Badge>
                  </div>
                </button>
              ))}
              {!versions.length && <p className="text-xs text-zinc-500">No versions yet.</p>}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="content-studio-editor">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Version Editor</CardTitle>
            <div className="flex flex-wrap gap-2">
              {(contentType === 'marketing' || contentType === 'modules') && (
                <div className="flex gap-2">
                  <Button
                    variant={editorMode === 'JSON' ? 'default' : 'outline'}
                    onClick={() => setEditorMode('JSON')}
                    data-testid="content-studio-mode-json"
                  >
                    JSON
                  </Button>
                  <Button
                    variant={editorMode === 'VISUAL' ? 'default' : 'outline'}
                    onClick={() => setEditorMode('VISUAL')}
                    data-testid="content-studio-mode-visual"
                  >
                    Visual
                  </Button>
                </div>
              )}
              <Button variant="outline" onClick={handleSaveDraft} disabled={loading} data-testid="content-studio-save-draft">
                Save Draft
              </Button>
              <Button onClick={handleApprove} disabled={loading || selectedVersion?.status === 'APPROVED' || !canApprove} data-testid="content-studio-approve">
                Approve
              </Button>
              {selectedVersion && selectedVersion.status === 'ARCHIVED' && (
                <Button variant="outline" onClick={handleApprove} disabled={loading || !canApprove} data-testid="content-studio-rollback">
                  Rollback
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Changelog / release note"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              data-testid="content-studio-changelog"
            />
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              data-testid="content-studio-schedule"
            />
            {!canApprove && (
              <div className="text-xs text-amber-400" data-testid="content-studio-approval-note">
                Approval requires Owner or Product Owner role.
              </div>
            )}

            {contentType === 'modules' && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-white/10" data-testid="content-studio-auto-sync">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Auto-sync from system registry</p>
                  <p className="text-xs text-zinc-500">Keeps module list aligned with MODULE_REGISTRY</p>
                </div>
                <Switch
                  checked={!!visualContent?.auto_sync_registry}
                  onCheckedChange={toggleAutoSync}
                  data-testid="content-studio-auto-sync-toggle"
                />
              </div>
            )}

            {(editorMode === 'VISUAL' && (contentType === 'marketing' || contentType === 'modules')) && (
              <div className="space-y-6" data-testid="content-studio-visual-editor">
                {contentType === 'marketing' && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-zinc-200">Pricing Packages</h4>
                    {(visualContent?.pricing || []).map((plan, index) => (
                      <div key={plan.key || index} className="p-3 rounded-lg border border-white/10 space-y-2" data-testid={`content-studio-pricing-${index}`}>
                        <Input
                          value={plan.name || ''}
                          onChange={(e) => updateVisualPricing(index, 'name', e.target.value)}
                          placeholder="Plan name"
                          data-testid={`content-studio-pricing-name-${index}`}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={plan.price || ''}
                            onChange={(e) => updateVisualPricing(index, 'price', e.target.value)}
                            placeholder="Price"
                            data-testid={`content-studio-pricing-price-${index}`}
                          />
                          <Input
                            value={plan.period || ''}
                            onChange={(e) => updateVisualPricing(index, 'period', e.target.value)}
                            placeholder="Period"
                            data-testid={`content-studio-pricing-period-${index}`}
                          />
                        </div>
                        <Input
                          value={plan.tagline || ''}
                          onChange={(e) => updateVisualPricing(index, 'tagline', e.target.value)}
                          placeholder="Tagline"
                          data-testid={`content-studio-pricing-tagline-${index}`}
                        />
                        <Textarea
                          value={(plan.highlights || []).join('\n')}
                          onChange={(e) => updateVisualPricing(index, 'highlights', e.target.value.split('\n').filter(Boolean))}
                          placeholder="Highlights (one per line)"
                          data-testid={`content-studio-pricing-highlights-${index}`}
                        />
                        <Textarea
                          value={(plan.future || []).join('\n')}
                          onChange={(e) => updateVisualPricing(index, 'future', e.target.value.split('\n').filter(Boolean))}
                          placeholder="Future items (one per line)"
                          data-testid={`content-studio-pricing-future-${index}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-zinc-200">Modules</h4>
                  {(visualContent?.modules || []).map((module, index) => (
                    <div key={module.key || index} className="p-3 rounded-lg border border-white/10 space-y-2" data-testid={`content-studio-module-${index}`}>
                      <Input
                        value={module.title || ''}
                        onChange={(e) => updateVisualModule(index, 'title', e.target.value)}
                        placeholder="Module title"
                        data-testid={`content-studio-module-title-${index}`}
                      />
                      <Textarea
                        value={module.description || ''}
                        onChange={(e) => updateVisualModule(index, 'description', e.target.value)}
                        placeholder="Module description"
                        data-testid={`content-studio-module-description-${index}`}
                      />
                      <Textarea
                        value={(module.capabilities || []).join('\n')}
                        onChange={(e) => updateVisualModule(index, 'capabilities', e.target.value.split('\n').filter(Boolean))}
                        placeholder="Capabilities (one per line)"
                        data-testid={`content-studio-module-capabilities-${index}`}
                      />
                    </div>
                  ))}
                </div>

                <Button variant="outline" onClick={applyVisualToJson} data-testid="content-studio-apply-visual">
                  Apply Visual Changes to JSON
                </Button>
              </div>
            )}

            {(editorMode === 'JSON' || contentType === 'technical') && (
              <Textarea
                value={editorValue}
                onChange={(e) => setEditorValue(e.target.value)}
                className="min-h-[420px] font-mono text-xs"
                data-testid="content-studio-json-editor"
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="content-studio-diff">
          <CardHeader>
            <CardTitle>Diff Viewer</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-zinc-400 mb-2">Approved Version</div>
              <pre className="text-xs p-3 rounded-lg overflow-auto max-h-[360px]" style={{ backgroundColor: '#111114', color: '#E2E8F0' }} data-testid="content-studio-diff-approved">
                {approvedJson || 'No approved version yet.'}
              </pre>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-2">Selected Version</div>
              <pre className="text-xs p-3 rounded-lg overflow-auto max-h-[360px]" style={{ backgroundColor: '#111114', color: '#E2E8F0' }} data-testid="content-studio-diff-selected">
                {diffLines.map((item, idx) => (
                  <div key={`${item.line}-${idx}`} style={{ backgroundColor: item.changed ? 'rgba(229,57,53,0.15)' : 'transparent' }}>
                    {item.line}
                  </div>
                ))}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
