// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import DataTable from '@/components/shared/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ClipboardCheck,
  Save,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Calculator,
  ArrowUpDown,
  Package,
  ScanBarcode,
  Boxes,
  X,
  Search,
  Mic,
  MicOff,
  TrendingDown,
  Target,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';

// ── KPI Stat Card ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtext, color = 'text-foreground' }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2.5 rounded-lg bg-muted">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
          {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StockCount() {
  const { activeVenue } = useVenue();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Barcode Scanning State ──
  const [scanMode, setScanMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = useRef(null);

  // ── Package Counting State ──
  const [countMode, setCountMode] = useState('unit'); // 'unit' | 'package'
  const [packageSizes, setPackageSizes] = useState({}); // { itemId: packageSize }

  // ── Voice Counting State (Gap 10) ──
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (activeVenue?.id) {
      loadData();
    }
  }, [activeVenue?.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory/items?venue_id=${activeVenue.id}`);
      const data = res.data;
      setItems(Array.isArray(data) ? data : (data?.items || []));
      setCounts({});
    } catch (error) {
      logger.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [activeVenue?.id]);

  const handleCountChange = (id, value) => {
    setCounts(prev => ({ ...prev, [id]: value }));
  };

  const getVariance = (item) => {
    const newQty = parseFloat(counts[item.id]);
    if (isNaN(newQty)) return 0;
    return newQty - (item.quantity ?? 0);
  };

  // ── Theoretical Stock Calculation (Gap 9) ──
  const getTheoreticalStock = (item) => {
    // Theoretical = Opening Stock + Purchases - POS Depletion
    const opening = item.opening_stock ?? item.quantity ?? 0;
    const purchases = item.purchases_qty ?? 0;
    const depletion = item.pos_depletion ?? item.theoretical_depletion ?? 0;
    const transfers_in = item.transfers_in ?? 0;
    const transfers_out = item.transfers_out ?? 0;
    const waste = item.waste_qty ?? 0;
    return opening + purchases + transfers_in - transfers_out - depletion - waste;
  };

  const getTheoreticalVariance = (item) => {
    const actual = parseFloat(counts[item.id]);
    if (isNaN(actual)) return null;
    const theoretical = getTheoreticalStock(item);
    return actual - theoretical;
  };

  // ── Barcode Scan Handler ──
  const handleBarcodeScan = useCallback((code) => {
    const match = items.find(i =>
      i.sku === code || i.barcode === code || i.display_id === code
    );
    if (match) {
      const currentQty = parseFloat(counts[match.id] || '0') || 0;
      const increment = countMode === 'package' && packageSizes[match.id]
        ? parseFloat(packageSizes[match.id]) : 1;
      setCounts(prev => ({ ...prev, [match.id]: String(currentQty + increment) }));
      toast.success(`Scanned: ${match.name} (+${increment})`);
      setBarcodeInput('');
    } else {
      toast.error(`No item found for barcode: ${code}`);
    }
  }, [items, counts, countMode, packageSizes]);

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      handleBarcodeScan(barcodeInput.trim());
    }
  };

  // ── Voice Counting (Gap 10) — Web Speech API ──
  const startVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice recognition not supported in this browser');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript.trim();
      setVoiceTranscript(transcript);

      if (last.isFinal) {
        // Parse pattern: "[quantity] [item name]" or "[item name] [quantity]"
        const numMatch = transcript.match(/(\d+(?:\.\d+)?)/);
        const qty = numMatch ? parseFloat(numMatch[1]) : 1;
        const nameGuess = transcript.replace(/\d+(?:\.\d+)?/g, '').trim().toLowerCase();

        if (nameGuess.length > 1) {
          const match = items.find(i =>
            i.name?.toLowerCase().includes(nameGuess) ||
            nameGuess.includes(i.name?.toLowerCase()?.split(' ')[0])
          );
          if (match) {
            setCounts(prev => ({ ...prev, [match.id]: String(qty) }));
            toast.success(`Voice: ${match.name} → ${qty}`);
          } else {
            toast.error(`Voice: Could not match "${nameGuess}"`);
          }
        }
        setVoiceTranscript('');
      }
    };

    recognition.onerror = (e) => {
      logger.error('Voice recognition error:', e.error);
      setVoiceActive(false);
    };

    recognition.onend = () => setVoiceActive(false);

    recognition.start();
    recognitionRef.current = recognition;
    setVoiceActive(true);
    toast.info('Voice counting active — say item name and quantity');
  }, [items]);

  const stopVoice = useCallback(() => {
    recognitionRef.current?.stop();
    setVoiceActive(false);
    setVoiceTranscript('');
  }, []);

  const commitAdjustments = async () => {
    const updates = Object.entries(counts).filter(([id, val]) => {
      const item = items.find(i => i.id === id);
      return item && val !== '' && parseFloat(val) !== item.quantity;
    });

    if (updates.length === 0) return toast.info('No changes to save');
    if (!window.confirm(`Confirm updates for ${updates.length} items? This will reset system stock.`)) return;

    setSaving(true);
    try {
      for (const [id, val] of updates) {
        await api.post('/inventory/ledger', {
          item_id: id,
          action: 'ADJUST',
          quantity: parseFloat(val),
          reason: 'Physical Stock Count',
          venue_id: activeVenue.id,
        });
      }
      toast.success('Stock count applied successfully');
      loadData();
    } catch (e) {
      logger.error('Failed to save adjustments:', e);
      toast.error('Failed to save adjustments');
    } finally {
      setSaving(false);
    }
  };

  // ── KPI Calculations ──
  const stats = useMemo(() => {
    const totalItems = items.length;
    let counted = 0;
    let withVariance = 0;
    let totalVarianceValue = 0;
    let theoVarianceCount = 0;
    let totalTheoVarianceValue = 0;

    for (const item of items) {
      if (counts[item.id] !== undefined && counts[item.id] !== '') {
        counted++;
        const variance = getVariance(item);
        if (variance !== 0) {
          withVariance++;
          totalVarianceValue += variance * (item.cost ?? item.unit_cost ?? 0);
        }
        // Theoretical variance
        const theoVar = getTheoreticalVariance(item);
        if (theoVar !== null && theoVar !== 0) {
          theoVarianceCount++;
          totalTheoVarianceValue += theoVar * (item.cost ?? item.unit_cost ?? 0);
        }
      }
    }

    const accuracyScore = counted > 0 ? Math.round(((counted - withVariance) / counted) * 100) : 0;
    const shrinkageRate = counted > 0 ? Math.abs(totalTheoVarianceValue) : 0;

    return { totalItems, counted, withVariance, totalVarianceValue, accuracyScore, shrinkageRate, theoVarianceCount, totalTheoVarianceValue };
  }, [items, counts]);

  // ── Column Definitions ──
  const COLUMNS = useMemo(() => [
    {
      key: 'name',
      label: 'Item Name',
      enableSorting: true,
      size: 200,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.sku || row.display_id || row.id?.substring(0, 8)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      enableSorting: true,
      size: 100,
      render: (row) =>
        row.category ? (
          <Badge variant="outline" className="capitalize text-xs">{row.category?.replace(/_/g, ' ')}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: 'quantity',
      label: 'System Stock',
      enableSorting: true,
      size: 100,
      render: (row) => (
        <span className="font-medium tabular-nums">
          {(row.quantity ?? 0).toFixed(2)} <span className="text-xs text-muted-foreground">{row.unit || 'EA'}</span>
        </span>
      ),
    },
    // Gap 9: Theoretical Stock column
    {
      key: 'theoretical',
      label: 'Theoretical',
      enableSorting: true,
      size: 100,
      render: (row) => {
        const theo = getTheoreticalStock(row);
        return (
          <span className="tabular-nums text-muted-foreground">
            {theo.toFixed(2)} <span className="text-xs">{row.unit || 'EA'}</span>
          </span>
        );
      },
    },
    {
      key: 'physical_count',
      label: 'Physical Count',
      size: 140,
      render: (row) => {
        const hasVariance = counts[row.id] !== undefined && getVariance(row) !== 0;
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className={`w-24 h-8 text-right font-mono ${hasVariance ? 'border-orange-500 bg-orange-900/10' : 'bg-background border-input'}`}
              placeholder={(row.quantity ?? 0).toString()}
              value={counts[row.id] || ''}
              onChange={(e) => handleCountChange(row.id, e.target.value)}
            />
            <span className="text-xs text-muted-foreground">{row.unit || 'EA'}</span>
          </div>
        );
      },
    },
    {
      key: 'variance',
      label: 'Variance',
      size: 90,
      render: (row) => {
        if (counts[row.id] === undefined || counts[row.id] === '') {
          return <span className="text-muted-foreground">—</span>;
        }
        const variance = getVariance(row);
        return (
          <span className={`font-bold tabular-nums ${variance < 0 ? 'text-red-500' : variance > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
            {variance > 0 ? '+' : ''}{variance.toFixed(2)}
          </span>
        );
      },
    },
    // Gap 9: Theoretical Variance column
    {
      key: 'theo_variance',
      label: 'Theo vs Actual',
      size: 110,
      render: (row) => {
        const theoVar = getTheoreticalVariance(row);
        if (theoVar === null) return <span className="text-muted-foreground text-xs">—</span>;
        const pct = getTheoreticalStock(row) !== 0 ? ((theoVar / getTheoreticalStock(row)) * 100).toFixed(1) : '0.0';
        return (
          <div className="flex flex-col">
            <span className={`font-bold tabular-nums text-xs ${theoVar < 0 ? 'text-red-500' : theoVar > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
              {theoVar > 0 ? '+' : ''}{theoVar.toFixed(2)}
            </span>
            <span className={`text-[10px] tabular-nums ${theoVar < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
              {pct}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      size: 90,
      render: (row) => {
        if (counts[row.id] === undefined || counts[row.id] === '') {
          return <Badge variant="outline" className="text-xs text-muted-foreground">Pending</Badge>;
        }
        const variance = getVariance(row);
        if (variance === 0) {
          return (
            <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Match
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="text-xs text-orange-600 dark:text-orange-400 border-orange-400 gap-1">
            <AlertTriangle className="h-3 w-3" /> Variance
          </Badge>
        );
      },
    },
  ], [counts, items]);

  const pendingChanges = Object.entries(counts).filter(([id, val]) => {
    const item = items.find(i => i.id === id);
    return item && val !== '' && parseFloat(val) !== item.quantity;
  }).length;

  return (
    <PageContainer
      title="Physical Stock Count"
      description="Reconcile system stock with actual physical inventory — Theoretical vs Actual"
      actions={
        <div className="flex items-center gap-2">
          <Select value={countMode} onValueChange={setCountMode}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unit"><span className="flex items-center gap-1.5"><Package className="h-3.5 w-3.5" />Unit Count</span></SelectItem>
              <SelectItem value="package"><span className="flex items-center gap-1.5"><Boxes className="h-3.5 w-3.5" />Package Count</span></SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={scanMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setScanMode(!scanMode); setTimeout(() => barcodeRef.current?.focus(), 100); }}
          >
            <ScanBarcode className="h-4 w-4 mr-2" />
            {scanMode ? 'Close Scanner' : 'Scan Barcode'}
          </Button>
          {/* Gap 10: Voice Counting Button */}
          <Button
            variant={voiceActive ? 'default' : 'outline'}
            size="sm"
            onClick={voiceActive ? stopVoice : startVoice}
            className={voiceActive ? 'bg-red-600 hover:bg-red-700 animate-pulse' : ''}
          >
            {voiceActive ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
            {voiceActive ? 'Stop Voice' : 'Voice Count'}
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={commitAdjustments}
            disabled={saving || pendingChanges === 0}
            className={pendingChanges > 0 ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : `Commit ${pendingChanges} Adjustments`}
          </Button>
        </div>
      }
    >
      {/* ── Voice Transcript Panel (Gap 10) ── */}
      {voiceActive && (
        <Card className="mb-4 border-dashed border-2 border-red-500/30 bg-red-950/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-500/10 animate-pulse">
              <Mic className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <Label className="text-sm font-medium text-red-400">🎙️ Voice Counting Active</Label>
              <p className="text-xs text-muted-foreground">Say: "[Item Name] [Quantity]" — e.g., "Flour 25" or "Olive Oil 12.5"</p>
              {voiceTranscript && (
                <div className="mt-2 px-3 py-1.5 bg-muted rounded-md text-sm font-mono">
                  Hearing: {voiceTranscript}...
                </div>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={stopVoice}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Barcode Scanner Panel ── */}
      {scanMode && (
        <Card className="mb-4 border-dashed border-2 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <ScanBarcode className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium">Barcode / SKU Scanner</Label>
                <p className="text-xs text-muted-foreground mb-2">Scan barcode or type SKU and press Enter. Each scan adds {countMode === 'package' ? 'package qty' : '1 unit'}.</p>
                <div className="flex gap-2">
                  <Input
                    ref={barcodeRef}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={handleBarcodeKeyDown}
                    placeholder="Scan or type barcode / SKU..."
                    className="max-w-sm font-mono"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => barcodeInput.trim() && handleBarcodeScan(barcodeInput.trim())}>
                    <Search className="h-4 w-4 mr-1" /> Lookup
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setScanMode(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPI Stat Cards (Enhanced with Gap 9 KPIs) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard
          icon={Package}
          label="Total Items"
          value={stats.totalItems}
          color="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Counted"
          value={stats.counted}
          subtext={`of ${stats.totalItems}`}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={ArrowUpDown}
          label="With Variance"
          value={stats.withVariance}
          color="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          icon={Calculator}
          label="Variance Value"
          value={`€${Math.abs(stats.totalVarianceValue).toFixed(2)}`}
          subtext={stats.totalVarianceValue < 0 ? 'Loss' : stats.totalVarianceValue > 0 ? 'Surplus' : '—'}
          color={stats.totalVarianceValue < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}
        />
        {/* Gap 9: Shrinkage & Accuracy KPIs */}
        <StatCard
          icon={TrendingDown}
          label="Shrinkage Value"
          value={`€${Math.abs(stats.totalTheoVarianceValue).toFixed(2)}`}
          subtext={`${stats.theoVarianceCount} items differ`}
          color="text-red-600 dark:text-red-400"
        />
        <StatCard
          icon={Target}
          label="Accuracy Score"
          value={`${stats.accuracyScore}%`}
          subtext={stats.accuracyScore >= 95 ? 'Excellent' : stats.accuracyScore >= 85 ? 'Good' : 'Needs Review'}
          color={stats.accuracyScore >= 95 ? 'text-emerald-600 dark:text-emerald-400' : stats.accuracyScore >= 85 ? 'text-amber-500' : 'text-red-500'}
        />
      </div>

      {/* ── Data Table ── */}
      <DataTable
        columns={COLUMNS}
        data={items}
        loading={loading}
        totalCount={items.length}
        enableGlobalSearch={true}
        enablePagination={true}
        emptyMessage="No inventory items found. Add items in the Ingredients page first."
        tableId="stock-count"
        venueId={activeVenue?.id}
      />
    </PageContainer>
  );
}
