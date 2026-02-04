/**
 * Observability Logs - Live Logs + Error Code Registry
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import LogService from '../../services/LogService';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Loader2, Search, AlertTriangle, Info, Shield, CheckCircle, Copy, FileText } from 'lucide-react';
import { safeArray, safeString } from '../../lib/safe';

const LEVEL_COLORS = {
  ERROR: 'bg-red-100 text-red-700 border-red-200',
  WARN: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  INFO: 'bg-blue-100 text-blue-700 border-blue-200',
  AUDIT: 'bg-green-100 text-green-700 border-green-200',
  SECURITY: 'bg-purple-100 text-purple-700 border-purple-200'
};

const LEVEL_ICONS = {
  ERROR: AlertTriangle,
  WARN: AlertTriangle,
  INFO: Info,
  AUDIT: FileText,
  SECURITY: Shield
};

export default function ObservabilityLogs() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [errorCodes, setErrorCodes] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [filters, setFilters] = useState({
    level: '',
    code: '',
    q: '',
    timeRange: '24h'
  });
  const [searchCodeQuery, setSearchCodeQuery] = useState('');
  
  const venueId = user?.venueId || user?.venue_id;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, codesData] = await Promise.all([
        LogService.listLogs({
          venue_id: filters.level !== 'ALL' ? venueId : null,
          level: filters.level || null,
          code: filters.code || null,
          q: filters.q || null,
          limit: 200
        }),
        LogService.getErrorCodes()
      ]);
      
      setLogs(logsData.items || []);
      setErrorCodes(codesData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      if (error.response?.status !== 403) {
        toast.error('Failed to load logs');
      }
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    loadData();
  };

  const resetFilters = () => {
    setFilters({ level: '', code: '', q: '', timeRange: '24h' });
    setTimeout(loadData, 100);
  };

  const showDetails = (log) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  const ackLog = async (logId) => {
    try {
      await LogService.ackLog(logId);
      toast.success('Log acknowledged');
      await loadData();
    } catch (error) {
      toast.error('Failed to acknowledge log');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const filteredErrorCodes = errorCodes.filter(code =>
    !searchCodeQuery || 
    code.code.toLowerCase().includes(searchCodeQuery.toLowerCase()) ||
    code.title.toLowerCase().includes(searchCodeQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Logs & Error Codes</h1>
          <p className="text-zinc-400">System observability and error documentation</p>
        </div>

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="bg-zinc-900 mb-6">
            <TabsTrigger value="logs">Live Logs</TabsTrigger>
            <TabsTrigger value="codes">Error Codes</TabsTrigger>
          </TabsList>

          {/* Live Logs Tab */}
          <TabsContent value="logs">
            {/* Filters */}
            <div className="bg-zinc-900 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label className="text-white text-sm">Level</Label>
                  <Select value={filters.level} onValueChange={(value) => setFilters({...filters, level: value})}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
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
                  <Label className="text-white text-sm">Code</Label>
                  <Input
                    value={filters.code}
                    onChange={(e) => setFilters({...filters, code: e.target.value})}
                    placeholder="e.g., ORDER_SENT"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-white text-sm">Search</Label>
                  <Input
                    value={filters.q}
                    onChange={(e) => setFilters({...filters, q: e.target.value})}
                    placeholder="Search message or code..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={applyFilters} className="bg-red-500 hover:bg-red-600">
                  <Search className="w-4 h-4 mr-2" />
                  Apply Filters
                </Button>
                <Button onClick={resetFilters} variant="outline">
                  Reset
                </Button>
              </div>
            </div>

            {/* Logs Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
              </div>
            ) : (
              <div className="bg-zinc-900 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-800 border-b border-zinc-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Level</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Message</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Endpoint</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Request ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {safeArray(logs).map((log, idx) => {
                        const LevelIcon = LEVEL_ICONS[log.level] || Info;
                        return (
                          <tr
                            key={log.id || idx}
                            onClick={() => showDetails(log)}
                            className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">
                              {new Date(log.ts).toLocaleTimeString()}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={`${LEVEL_COLORS[log.level]} border flex items-center gap-1 w-fit`}>
                                <LevelIcon className="w-3 h-3" />
                                {log.level}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-white font-mono">{log.code}</td>
                            <td className="px-4 py-3 text-sm text-zinc-400 max-w-md truncate">{log.message}</td>
                            <td className="px-4 py-3 text-sm text-zinc-500 font-mono text-xs">
                              {safeString(log.endpoint, '-')}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-500 font-mono text-xs">
                              {log.request_id ? log.request_id.slice(0, 8) : '-'}
                            </td>
                            <td className="px-4 py-3">
                              {!log.acknowledged && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    ackLog(log.id);
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {logs.length === 0 && (
                  <div className="text-center py-12 text-zinc-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No logs found</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Error Codes Tab */}
          <TabsContent value="codes">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Search error codes..."
                  value={searchCodeQuery}
                  onChange={(e) => setSearchCodeQuery(e.target.value)}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredErrorCodes.map(errorCode => (
                <div key={errorCode.code} className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white font-mono">{errorCode.code}</h3>
                      <p className="text-sm text-zinc-400 mt-1">{errorCode.title}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(errorCode.code)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  <p className="text-zinc-300 mb-4">{errorCode.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500 font-medium mb-2">Likely Causes:</p>
                      <ul className="space-y-1">
                        {(errorCode.likely_causes || []).map((cause, idx) => (
                          <li key={idx} className="text-zinc-400">• {cause}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-zinc-500 font-medium mb-2">Operator Action:</p>
                      <ul className="space-y-1">
                        {(errorCode.operator_action || []).map((action, idx) => (
                          <li key={idx} className="text-green-400">✓ {action}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-zinc-500 font-medium mb-2">Developer Action:</p>
                      <ul className="space-y-1">
                        {(errorCode.dev_action || []).map((action, idx) => (
                          <li key={idx} className="text-blue-400">➤ {action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Log Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="bg-zinc-900 border-white/10 max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Log Event Details</DialogTitle>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400 text-xs">Timestamp</Label>
                    <p className="text-white">{new Date(selectedLog.ts).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs">Level</Label>
                    <Badge className={`${LEVEL_COLORS[selectedLog.level]} border mt-1`}>
                      {selectedLog.level}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs">Code</Label>
                    <p className="text-white font-mono">{selectedLog.code}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs">Endpoint</Label>
                    <p className="text-white font-mono text-sm">{selectedLog.endpoint || '-'}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-zinc-400 text-xs">Message</Label>
                  <p className="text-white mt-1">{selectedLog.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400 text-xs">Request ID</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-white font-mono text-sm">{selectedLog.request_id || '-'}</p>
                      {selectedLog.request_id && (
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(selectedLog.request_id)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-zinc-400 text-xs">Fingerprint</Label>
                    <p className="text-white font-mono text-xs">{selectedLog.fingerprint || '-'}</p>
                  </div>
                </div>

                {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <Label className="text-zinc-400 text-xs mb-2 block">Details (JSON)</Label>
                    <pre className="bg-zinc-800 p-4 rounded text-xs text-zinc-300 overflow-x-auto">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog.details, null, 2))}
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      Copy JSON
                    </Button>
                  </div>
                )}

                {!selectedLog.acknowledged && (
                  <Button
                    onClick={() => {
                      ackLog(selectedLog.id);
                      setShowDetailDialog(false);
                    }}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Acknowledge This Log
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
