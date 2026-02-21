import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import LogService from '../../services/LogService';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { RefreshCw, Search } from 'lucide-react';
import { logger } from '@/lib/logger';

const LEVEL_COLORS = {
  ERROR: 'bg-red-100 text-red-700 dark:text-red-400 border-red-200',
  WARN: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  INFO: 'bg-blue-100 text-blue-700 dark:text-blue-400 border-blue-200',
  AUDIT: 'bg-green-100 text-green-700 dark:text-green-400 border-green-200',
  SECURITY: 'bg-purple-100 text-purple-700 border-purple-200'
};

export default function LogsViewer() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ level: '', code: '', q: '' });

  const venueId = user?.venueId;

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const logsData = await LogService.listLogs({
        venue_id: venueId,
        level: filters.level || null,
        code: filters.code || null,
        q: filters.q || null,
        limit: 100
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLogs((logsData as any)?.items || []);
    } catch (error) {
      logger.error('Failed to load logs:', error);
      if (error.response?.status !== 403) {
        toast.error('Failed to load logs');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="System Logs"
      description="Real-time system activity and events"
      actions={
        <Button onClick={loadLogs} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2">Level</Label>
              <Select value={filters.level} onValueChange={(value) => setFilters({ ...filters, level: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Levels</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="WARN">WARN</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="AUDIT">AUDIT</SelectItem>
                  <SelectItem value="SECURITY">SECURITY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2">Code</Label>
              <Input
                value={filters.code}
                onChange={(e) => setFilters({ ...filters, code: e.target.value })}
                placeholder="Error code..."
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2">Search</Label>
              <Input
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                placeholder="Search logs..."
              />
            </div>
          </div>
          <Button onClick={loadLogs} className="mt-4" size="sm">
            <Search className="w-4 h-4 mr-2" />
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {loading ? (
              <p className="text-center py-8 text-gray-500">Loading...</p>
            ) : logs.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No logs found</p>
            ) : (
              logs.map((log, idx) => (
                <div key={log.id || idx} className="p-3 border border-border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={LEVEL_COLORS[log.level] || 'bg-gray-100 text-gray-700'}>
                          {log.level}
                        </Badge>
                        <span className="text-xs font-mono text-gray-500">{log.code}</span>
                      </div>
                      <p className="text-sm text-gray-900">{log.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.ts).toLocaleString()} • {log.user_display_id || 'System'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
