import { useEffect, useMemo, useState } from 'react';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import { Badge } from '../../../components/ui/badge';
import { useHRFeatureFlags } from '@/hooks/useHRFeatureFlags';
import { hrFeatureFlagsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useVenue } from '@/context/VenueContext';
import HRAccessPanel from '@/components/hr/HRAccessPanel';

const ROLE_OPTIONS = [
  { label: 'Owner', value: 'owner' },
  { label: 'Product Owner', value: 'product_owner' },
  { label: 'General Manager', value: 'general_manager' },
  { label: 'Manager', value: 'manager' },
  { label: 'Staff', value: 'staff' }
];

export default function AdminSettings() {
  const { user } = useAuth();
  const { activeVenue } = useVenue();
  const { flags, loading, getAccess } = useHRFeatureFlags();
  const [localFlags, setLocalFlags] = useState([]);
  const canEdit = ['owner', 'product_owner'].includes(user?.role);
  const access = getAccess('feature_flags');

  useEffect(() => {
    setLocalFlags(flags);
  }, [flags]);

  const moduleRows = useMemo(() => localFlags.map((flag) => ({
    ...flag,
    roles: flag.roles || []
  })), [localFlags]);

  if (!loading && !access.enabled) {
    return (
      <PageContainer title="HR Feature Flags" description="Role-scoped control over HR modules and workflows">
        <HRAccessPanel message="Feature flags module is disabled for your role." />
      </PageContainer>
    );
  }

  const handleToggle = (moduleKey) => {
    setLocalFlags((prev) => prev.map((flag) => flag.module_key === moduleKey
      ? { ...flag, enabled: !flag.enabled }
      : flag
    ));
  };

  const handleRoleToggle = (moduleKey, role) => {
    setLocalFlags((prev) => prev.map((flag) => {
      if (flag.module_key !== moduleKey) return flag;
      const roles = flag.roles || [];
      if (roles.includes(role)) {
        return { ...flag, roles: roles.filter((item) => item !== role) };
      }
      return { ...flag, roles: [...roles, role] };
    }));
  };

  const handleSave = async () => {
    if (!activeVenue?.id) return;
    await hrFeatureFlagsAPI.update({ venue_id: activeVenue.id, flags: localFlags });
  };

  return (
    <PageContainer
      title="HR Feature Flags"
      description="Role-scoped control over HR modules and workflows"
      actions={
        <Button disabled={!canEdit} onClick={handleSave} data-testid="hr-feature-flags-save">
          Save Changes
        </Button>
      }
    >
      <Card className="border border-indigo-500/20 bg-slate-950/60" data-testid="hr-feature-flags-card">
        <CardContent className="p-6 space-y-4">
          {!canEdit && (
            <div className="text-xs text-amber-400" data-testid="hr-feature-flags-readonly">
              Only Owner or Product Owner can edit feature flags.
            </div>
          )}
          {loading && <div className="text-sm text-muted-foreground">{"Loading "}flags…</div>}
          <div className="space-y-4">
            {moduleRows.map((flag) => (
              <div key={flag.module_key} className="rounded-lg border border-indigo-400/20 bg-indigo-950/30 p-4" data-testid={`hr-flag-${flag.module_key}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-50 font-semibold">{flag.module_key.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-indigo-200">Module access scope</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={flag.enabled ? 'bg-green-600/30 text-green-400 border border-green-500/30 font-bold' : 'bg-zinc-700 text-secondary-foreground'}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canEdit}
                      onClick={() => handleToggle(flag.module_key)}
                      data-testid={`hr-flag-toggle-${flag.module_key}`}
                    >
                      Toggle
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {ROLE_OPTIONS.map((role) => (
                    <label key={role.value} className="flex items-center gap-2 text-xs text-indigo-100">
                      <Checkbox
                        checked={flag.roles.includes(role.value)}
                        disabled={!canEdit}
                        onCheckedChange={() => handleRoleToggle(flag.module_key, role.value)}
                        data-testid={`hr-flag-role-${flag.module_key}-${role.value}`}
                      />
                      {role.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
