import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import {
AlertTriangle,
CheckCircle,
Clock,
Database,
Download,
FileArchive,
Loader2,
Package,
Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useVenue } from '../../../context/VenueContext';
import api from '../../../lib/api';
import { cn } from '../../../lib/utils';

const COLLECTIONS = [
    { key: 'orders', label: 'Orders', icon: Package },
    { key: 'reservations', label: 'Reservations', icon: Clock },
    { key: 'guests', label: 'Guest Profiles', icon: Database },
    { key: 'employees', label: 'Employees', icon: Database },
    { key: 'inventory_items', label: 'Inventory', icon: Package },
    { key: 'menu_items', label: 'Menu Items', icon: Package },
    { key: 'recipes', label: 'Recipes', icon: Package },
    { key: 'suppliers', label: 'Suppliers', icon: Database },
    { key: 'transactions', label: 'Transactions', icon: Database },
    { key: 'shifts', label: 'Shifts', icon: Clock },
    { key: 'haccp_logs', label: 'HACCP Logs', icon: Shield },
    { key: 'audit_logs', label: 'Audit Logs', icon: Shield },
];

/**
 * 📦 Data Export — "Export Everything" (Rule 58: Data Sovereignty)
 * Full venue data export with collection selector and download history.
 */
export default function DataExportPage() {
    const { activeVenue } = useVenue();
    const venueId = activeVenue?.id || localStorage.getItem('currentVenueId') || 'default';
    const queryClient = useQueryClient();

    const { data: history = [], isPending: loadingHistory } = useQuery({
        queryKey: ['export-history', venueId],
        queryFn: async () => {
            try {
                const { data } = await api.get(`/data-export/history?venue_id=${venueId}`);
                return data;
            } catch {
                return [];
            }
        }
    });

    const exportMutation = useMutation({
        mutationFn: () => api.post(`/data-export/request?venue_id=${venueId}`),
        onSuccess: (res) => {
            const job = res.data;
            toast.success(`Export complete — ${job.record_count?.toLocaleString()} records`);
            queryClient.invalidateQueries({ queryKey: ['export-history'] });
        },
        onError: () => toast.error('Export failed — check your permissions')
    });

    const latestJob = history[0];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Download className="w-6 h-6 text-blue-500" />
                        Data Export
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Export all your venue data — full data sovereignty, zero lock-in
                    </p>
                </div>
            </div>

            {/* Big Export Button */}
            <Card className="p-8 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20 text-center">
                <FileArchive className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-foreground">Export Everything</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    Download a complete JSON export of all your venue data.
                    This includes orders, guests, inventory, employees, and more.
                </p>
                <Button
                    size="lg"
                    onClick={() => exportMutation.mutate()}
                    disabled={exportMutation.isPending}
                    className="mt-6 bg-blue-600 hover:bg-blue-700 text-foreground px-8"
                >
                    {exportMutation.isPending ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Exporting...
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5 mr-2" />
                            Export All Data
                        </>
                    )}
                </Button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="w-3 h-3" />
                    Only owners and admins can export data
                </div>
            </Card>

            {/* Collections Overview */}
            <div>
                <h3 className="font-semibold text-foreground mb-3">Included Collections</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {COLLECTIONS.map(col => {
                        const Icon = col.icon;
                        return (
                            <Card key={col.key} className="p-3 bg-card border-border flex items-center gap-3">
                                <div className="p-1.5 rounded bg-blue-500/10">
                                    <Icon className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-foreground">{col.label}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">{col.key}</div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Export History */}
            <div>
                <h3 className="font-semibold text-foreground mb-3">Export History</h3>
                {loadingHistory ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : history.length === 0 ? (
                    <Card className="p-8 bg-card border-border text-center">
                        <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">{"No "}exports yet. Click "Export All Data" to get started.</p>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {history.map(job => (
                            <Card key={job.id} className="p-4 bg-card border-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {job.status === 'complete' ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    ) : job.status === 'processing' ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-foreground">
                                            {job.record_count?.toLocaleString()} records
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {new Date(job.requested_at).toLocaleString()} •
                                            {' '}{job.file_size_bytes ? `${(job.file_size_bytes / 1024).toFixed(0)} KB` : '—'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "text-[10px] px-2 py-0.5 rounded capitalize",
                                        job.status === 'complete' ? "bg-emerald-500/10 text-emerald-500" :
                                            job.status === 'processing' ? "bg-amber-500/10 text-amber-500" :
                                                "bg-red-500/10 text-red-500"
                                    )}>
                                        {job.status}
                                    </span>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Legal Note */}
            <Card className="p-4 bg-card border-border flex items-start gap-3">
                <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Data Sovereignty:</strong> You own your data. Exports include all venue records in standard JSON format.
                    You can import this data into any other system. We never lock you in.
                </div>
            </Card>
        </div>
    );
}
