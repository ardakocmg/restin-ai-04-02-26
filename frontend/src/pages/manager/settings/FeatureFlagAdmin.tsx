import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import {
AlertTriangle,
Award,
BarChart3,
Briefcase,Calendar,
Clock,
DollarSign,
FileText,
Flag,
Loader2,
Save,
Settings,
Shield,
Users
} from 'lucide-react';
import React,{ useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useVenue } from '../../../context/VenueContext';
import api from '../../../lib/api';
import { cn } from '../../../lib/utils';

const MODULE_META = {
    people: { icon: Users, label: 'People', desc: 'Employee directory & profiles' },
    contracts: { icon: FileText, label: 'Contracts', desc: 'Employment contracts & documents' },
    shifts: { icon: Calendar, label: 'Shifts', desc: 'Shift scheduling & rosters' },
    timesheets: { icon: Clock, label: 'Timesheets', desc: 'Clock-in/out & attendance' },
    leave: { icon: Briefcase, label: 'Leave', desc: 'Holiday & absence management' },
    tips: { icon: DollarSign, label: 'Tips', desc: 'Tip distribution & pools' },
    payroll: { icon: Award, label: 'Payroll', desc: 'Pay runs & payslips' },
    documents: { icon: FileText, label: 'Documents', desc: 'Document management & storage' },
    analytics: { icon: BarChart3, label: 'Analytics', desc: 'HR reporting & dashboards' },
    feature_flags: { icon: Flag, label: 'Feature Flags', desc: 'Module visibility controls' },
    audit_trail: { icon: Shield, label: 'Audit Trail', desc: 'Activity logging & compliance' },
};

/**
 * 🚩 Feature Flag Admin Panel
 * Toggle HR modules on/off per venue. Wires to GET/POST /hr/feature-flags.
 */
export default function FeatureFlagAdmin() {
    const { activeVenue } = useVenue();
    const venueId = activeVenue?.id || localStorage.getItem('currentVenueId') || 'default';
    const queryClient = useQueryClient();
    const [localFlags, setLocalFlags] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    const { data: flagsData, isLoading } = useQuery({
        queryKey: ['feature-flags', venueId],
        queryFn: async () => {
            const { data } = await api.get(`/hr/feature-flags?venue_id=${venueId}`);
            return data;
        }
    });

    // Sync localFlags from fetched data
    React.useEffect(() => {
        if (flagsData && !localFlags) {
            setLocalFlags((flagsData as /**/any).flags as typeof localFlags ?? []);
        }
    }, [flagsData]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            return api.post('/hr/feature-flags', {
                venue_id: venueId,
                flags: localFlags
            });
        },
        onSuccess: () => {
            toast.success('Feature flags saved successfully');
            setHasChanges(false);
            queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
        },
        onError: () => toast.error('Failed to save feature flags')
    });

    const flags = localFlags || (flagsData as /**/any)?.flags as typeof localFlags || [];

    const toggleFlag = (moduleKey: string) => {
        const updated = flags.map(f =>
            f.module_key === moduleKey ? { ...f, enabled: !f.enabled } : f
        );
        setLocalFlags(updated);
        setHasChanges(true);
    };

    const enableAll = () => {
        setLocalFlags(flags.map(f => ({ ...f, enabled: true })));
        setHasChanges(true);
    };

    const disableOptional = () => {
        const core = ['people', 'audit_trail', 'feature_flags'];
        setLocalFlags(flags.map(f => ({
            ...f,
            enabled: core.includes(f.module_key) ? true : false
        })));
        setHasChanges(true);
    };

    const enabledCount = flags.filter(f => f.enabled).length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Flag className="w-6 h-6 text-amber-500" />
                        Feature Flags
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Control which HR modules are active for this venue
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={enableAll}>
                        Enable All
                    </Button>
                    <Button variant="outline" size="sm" onClick={disableOptional}>
                        Core Only
                    </Button>
                    <Button
                        size="sm"
                        disabled={!hasChanges || saveMutation.isPending}
                        onClick={() => saveMutation.mutate()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-foreground"
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                            <Save className="w-4 h-4 mr-1" />
                        )}
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Active Modules</div>
                    <div className="text-2xl font-bold text-emerald-500">{enabledCount}</div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Disabled</div>
                    <div className="text-2xl font-bold text-orange-500">{flags.length - enabledCount}</div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Total Available</div>
                    <div className="text-2xl font-bold text-foreground">{flags.length}</div>
                </Card>
            </div>

            {/* Flags Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {flags.map((flag) => {
                        const meta = MODULE_META[flag.module_key] || {
                            icon: Settings,
                            label: flag.module_key,
                            desc: 'Module'
                        };
                        const Icon = meta.icon;
                        const isCoreModule = ['people', 'audit_trail'].includes(flag.module_key);

                        return (
                            <Card
                                key={flag.module_key}
                                className={cn(
                                    "p-4 border-border transition-all duration-200 cursor-pointer",
                                    flag.enabled
                                        ? "bg-card hover:border-emerald-500/50"
                                        : "bg-muted/30 opacity-60 hover:opacity-80"
                                )}
                                onClick={() => !isCoreModule && toggleFlag(flag.module_key)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            flag.enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                                        )}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground flex items-center gap-2">
                                                {meta.label}
                                                {isCoreModule && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                                                        CORE
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {meta.desc}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-10 h-6 rounded-full flex items-center transition-all duration-200",
                                        flag.enabled ? "bg-emerald-500 justify-end" : "bg-muted-foreground/30 justify-start"
                                    )}>
                                        <div className="w-4 h-4 rounded-full bg-white mx-1 shadow-sm" />
                                    </div>
                                </div>

                                {flag.updated_by && (
                                    <div className="mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground">
                                        Last updated by {flag.updated_by}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Warning */}
            {hasChanges && (
                <Card className="p-4 bg-amber-500/5 border-amber-500/20 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    <div className="text-sm text-foreground">
                        You have unsaved changes. Disabling modules will hide them from staff immediately.
                    </div>
                </Card>
            )}
        </div>
    );
}
