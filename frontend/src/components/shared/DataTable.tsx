import {
Cell,
CellContext,
PaginationState,
ColumnDef as RTColumnDef,
Table as RTTable,
Row,
SortingState,
VisibilityState,
flexRender,
getCoreRowModel,
getFilteredRowModel,
getPaginationRowModel,
getSortedRowModel,
useReactTable
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown,ChevronLeft,ChevronRight,GripVertical,MoreHorizontal,Pin,PinOff } from 'lucide-react';
import React,{ useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { tablePreferencesAPI,tablePresetsAPI } from '../../lib/api';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Popover,PopoverContent,PopoverTrigger } from '../ui/popover';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '../ui/select';
import { Sheet,SheetContent,SheetHeader,SheetTitle } from '../ui/sheet';
import { Skeleton } from '../ui/skeleton';
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from '../ui/table';
import EmptyState from './EmptyState';

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

// Generic interface allows typed render functions while defaulting to any for flexibility
export interface ColumnDef<TData = /**/any> {
  key: string;
  id?: string;
  label?: string;
  header?: string;
  columns?: ColumnDef<TData>[];
  render?: (row: TData) => React.ReactNode;
  enableSorting?: boolean;
  filterType?: string;
  filterOptions?: Array<{ value: string; label: string }>;
  headerClassName?: string;
  cellClassName?: string;
  size?: number;
}

interface TablePreset {
  id: string;
  name: string;
  scope: string;
  state?: /**/any;
}

interface QueryPayload {
  pageIndex: number;
  pageSize: number;
  sorting: SortingState;
  globalSearch: string;
  filters: FilterState;
}

type FilterState = Record<string, string | string[] | { min?: string; max?: string } | { start?: string; end?: string }>;

const buildTableId = (pathname: string, columns: ColumnDef[]) => {
  const key = columns.map((col) => col.key || col.id).join('-');
  return `table:${pathname}:${key}`;
};

export interface DataTableProps<TData, _TValue> {
  columns: ColumnDef[];
  data: TData[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  className?: string;
  tableTestId?: string;
  rowTestIdPrefix?: string;
  tableId?: string;
  venueId?: string;
  totalCount?: number;
  pageCount?: number;
  enableRowSelection?: boolean;
  enableColumnControls?: boolean;
  enableGlobalSearch?: boolean;
  enableFilters?: boolean;
  enablePagination?: boolean;
  enableVirtualization?: boolean;
  bulkActions?: { id: string; label: string; variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" }[];
  onBulkAction?: (actionId: string, selectedRows: TData[]) => void;
  onQueryChange?: (query: QueryPayload) => void;
  onExport?: (query: QueryPayload) => void;
  renderRowDrawer?: (row: TData | null) => React.ReactNode;
}

export default function DataTable<TData, _TValue>({
  columns,
  data,
  loading = false,
  error,
  onRetry,
  onRowClick,
  emptyMessage = 'No data available',
  className,
  tableTestId,
  rowTestIdPrefix,
  tableId,
  venueId,
  totalCount,
  pageCount,
  enableRowSelection = true,
  enableColumnControls = true,
  enableGlobalSearch = true,
  enableFilters = true,
  enablePagination = true,
  enableVirtualization = false,
  bulkActions = [],
  onBulkAction,
  onQueryChange,
  onExport,
  renderRowDrawer
}: DataTableProps<TData, _TValue>) {
  const location = useLocation();
  const { user } = useAuth();
  const resolvedVenueId = venueId || (user as { defaultVenueId?: string })?.defaultVenueId || localStorage.getItem('restin_pos_venue');
  const resolvedTableId = tableId || buildTableId(location.pathname, columns);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnPinning, setColumnPinning] = useState<{ left: string[]; right: string[] }>({ left: [], right: [] });
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<FilterState>({});
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZES[1]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<TData | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [presets, setPresets] = useState<TablePreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [presetScope, setPresetScope] = useState('USER');
  const [selectedPresetId, setSelectedPresetId] = useState('');

  const serverMode = typeof onQueryChange === 'function';
  const canRolePreset = ['owner', 'product_owner'].includes(user?.role as string);
  const VIRTUALIZATION_THRESHOLD = 50; // Rule I.6: Virtualize all lists > 50 items
  const virtualizationEnabled = enableVirtualization || (data && data.length > VIRTUALIZATION_THRESHOLD);

  const selectionColumn = useMemo(() => ({
    id: 'select',
    header: ({ table }: { table: RTTable<TData> }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all rows"
        data-testid="datatable-select-all"
      />
    ),
    cell: ({ row }: { row: Row<TData> }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        data-testid={`datatable-select-row-${row.id}`}
      />
    ),
    enableSorting: false,
    size: 48
  }), []);

  const tableColumns = useMemo(() => {
    const mapColumns = (cols: ColumnDef[]): RTColumnDef<TData>[] => {
      return cols.map((col, index) => {
        const colId = col.key || col.id || `col-${index}`;
        const mapped: RTColumnDef<TData> & { accessorKey?: string; meta?: /**/any; columns?: RTColumnDef<TData>[] } = {
          id: colId,
          header: col.label || col.header || colId,
        };

        if (col.columns && Array.isArray(col.columns)) {
          mapped.columns = mapColumns(col.columns);
        } else {
          mapped.accessorKey = col.key;
          mapped.cell = (info: CellContext<TData, unknown>) => (col.render ? col.render(info.row.original) : info.getValue());
          mapped.enableSorting = col.enableSorting !== false;
          mapped.meta = {
            filterType: col.filterType,
            filterOptions: col.filterOptions || [],
            headerClassName: col.headerClassName,
            cellClassName: col.cellClassName
          };
          if (col.size) mapped.size = col.size;
        }
        return mapped as RTColumnDef<TData>;
      });
    };

    const base = mapColumns(columns);
    return enableRowSelection ? [selectionColumn, ...base] : base;
  }, [columns, enableRowSelection, selectionColumn]);

  const table = useReactTable({
    data: data || [],
    columns: tableColumns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnPinning, // @ts-ignore
      columnSizing,
      rowSelection,
      ...(!serverMode && { globalFilter: globalSearch }),
      ...(!serverMode && { pagination: { pageIndex, pageSize } }),
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    // @ts-ignore
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    manualSorting: serverMode,
    manualFiltering: serverMode,
    manualPagination: serverMode,
    getCoreRowModel: getCoreRowModel(),
    ...(!serverMode && {
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
    }),
    // @ts-ignore
    onGlobalFilterChange: serverMode ? undefined : setGlobalSearch,
    onPaginationChange: serverMode ? undefined : (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => {
      const next = typeof updater === 'function'
        ? updater({ pageIndex, pageSize })
        : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    globalFilterFn: 'includesString',
    columnResizeMode: 'onChange',
  });

  const totalPages = pageCount || (totalCount ? Math.ceil(totalCount / pageSize) : undefined);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id || !resolvedVenueId || !resolvedTableId) return;
      try {
        const response = await tablePreferencesAPI.get(resolvedTableId, resolvedVenueId);
        const prefs = response.data.preferences || {};
        setColumnVisibility(prefs.columnVisibility || {});
        setColumnOrder(prefs.columnOrder || []);
        setColumnPinning(prefs.columnPinning || { left: [], right: [] });
        setColumnSizing(prefs.columnSizing || {});
        setPageSize(prefs.pageSize || DEFAULT_PAGE_SIZES[1]);
        setPrefsLoaded(true);
      } catch (error) {
        setPrefsLoaded(true);
      }
    };
    loadPreferences();
  }, [user?.id, resolvedVenueId, resolvedTableId]);

  useEffect(() => {
    const loadPresets = async () => {
      if (!user?.id || !resolvedVenueId || !resolvedTableId) return;
      try {
        const response = await tablePresetsAPI.list(resolvedTableId, resolvedVenueId);
        setPresets(response.data.presets || []);
      } catch (error) {
        setPresets([]);
      }
    };
    loadPresets();
  }, [user?.id, resolvedVenueId, resolvedTableId]);

  useEffect(() => {
    if (!prefsLoaded && columnOrder.length === 0 && tableColumns.length > 0) {
      setColumnOrder(tableColumns.map((col) => col.id as string));
    }
  }, [prefsLoaded, columnOrder.length, tableColumns]);

  const preferencesRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!prefsLoaded || !user?.id || !resolvedVenueId || !resolvedTableId) return;
    if (preferencesRef.current) clearTimeout(preferencesRef.current);
    preferencesRef.current = setTimeout(() => {
      tablePreferencesAPI.upsert({
        table_id: resolvedTableId,
        venue_id: resolvedVenueId,
        preferences: {
          columnVisibility,
          columnOrder,
          columnPinning,
          columnSizing,
          pageSize
        }
      });
    }, 500);
  }, [columnVisibility, columnOrder, columnPinning, columnSizing, pageSize, prefsLoaded, user?.id, resolvedVenueId, resolvedTableId]);

  const queryPayload = useMemo(() => ({
    pageIndex,
    pageSize,
    sorting,
    globalSearch,
    filters: columnFilters
  }), [pageIndex, pageSize, sorting, globalSearch, columnFilters]);

  useEffect(() => {
    if (!onQueryChange) return;
    const timeout = setTimeout(() => {
      onQueryChange(queryPayload);
    }, 350);
    return () => clearTimeout(timeout);
  }, [queryPayload, onQueryChange]);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 8
  });

  const handleRowClick = useCallback((row: Row<TData>) => {
    if (renderRowDrawer) {
      setActiveRow(row.original);
      setDrawerOpen(true);
      return;
    }
    onRowClick?.(row.original);
  }, [renderRowDrawer, onRowClick]);

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);

  const handleBulkAction = useCallback((actionId: string) => {
    if (typeof onBulkAction === 'function') {
      onBulkAction(actionId, selectedRows);
    }
  }, [onBulkAction, selectedRows]);

  const applyPreset = useCallback((preset: TablePreset) => {
    if (!preset?.state) return;
    setColumnVisibility((preset.state.columnVisibility as VisibilityState) || {});
    setColumnOrder((preset.state.columnOrder as string[]) || []);
    setColumnPinning((preset.state.columnPinning as { left: string[]; right: string[] }) || { left: [], right: [] });
    setColumnSizing((preset.state.columnSizing as Record<string, number>) || {});
    setPageSize((preset.state.pageSize as number) || pageSize);
    setSorting((preset.state.sorting as SortingState) || []);
    setGlobalSearch((preset.state.globalSearch as string) || '');
    setColumnFilters((preset.state.filters as FilterState) || {});
  }, [pageSize]);

  const handleSavePreset = async () => {
    if (!presetName || !resolvedTableId || !resolvedVenueId) return;
    try {
      await tablePresetsAPI.create({
        table_id: resolvedTableId,
        venue_id: resolvedVenueId,
        name: presetName,
        scope: presetScope,
        state: {
          columnVisibility,
          columnOrder,
          columnPinning,
          columnSizing,
          pageSize,
          sorting,
          globalSearch,
          filters: columnFilters
        }
      });
      setPresetName('');
      const response = await tablePresetsAPI.list(resolvedTableId, resolvedVenueId);
      setPresets(response.data.presets || []);
    } catch (error) {
      // handled silently
    }
  };

  if (loading) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <div className="p-4 space-y-3" data-testid="datatable-loading">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full bg-white/5" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('p-8 bg-card border-border', className)}>
        <div className="text-center space-y-3" data-testid="datatable-error">
          <p className="text-sm text-foreground font-medium">{error}</p>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} data-testid="datatable-retry-button">Retry</Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4 space-y-3 bg-background/50 border-border shadow-2xl', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {enableGlobalSearch && (
            <Input aria-label="Input field"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search..."
              className="w-[220px] bg-card border-border focus:border-red-500/50 transition-all"
              data-testid="datatable-global-search"
              autoComplete="off"
            />
          )}
          {enableFilters && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="datatable-filter-button">
                  Filters <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" data-testid="datatable-filter-panel">
                <div className="space-y-4">
                  {columns.map((col) => {
                    const filterType = col.filterType || 'text';
                    const value = (columnFilters as FilterState)[col.key] || (filterType === 'multiSelect' ? [] : '');
                    return (
                      <div key={col.key} className="space-y-2">
                        <label className="text-xs font-bold text-secondary-foreground uppercase tracking-widest">{col.label}</label>
                        {filterType === 'text' && (
                          <Input aria-label="Input field"
                            value={value as string}
                            onChange={(e) => setColumnFilters((prev: FilterState) => ({ ...prev, [col.key]: e.target.value }))}
                            data-testid={`datatable-filter-${col.key}`}
                          />
                        )}
                        {filterType === 'numberRange' && (
                          <div className="flex gap-2">
                            <Input aria-label="Min"
                              type="number"
                              placeholder="Min"
                              value={(value as { min?: string; max?: string })?.min || ''}
                              onChange={(e) => setColumnFilters((prev: FilterState) => ({ ...prev, [col.key]: { ...(value as Record<string, string>), min: e.target.value } }))}
                              data-testid={`datatable-filter-${col.key}-min`}
                            />
                            <Input aria-label="Max"
                              type="number"
                              placeholder="Max"
                              value={(value as { min?: string; max?: string })?.max || ''}
                              onChange={(e) => setColumnFilters((prev: FilterState) => ({ ...prev, [col.key]: { ...(value as Record<string, string>), max: e.target.value } }))}
                              data-testid={`datatable-filter-${col.key}-max`}
                            />
                          </div>
                        )}
                        {filterType === 'dateRange' && (
                          <div className="flex gap-2">
                            <Input aria-label="Input field"
                              type="date"
                              value={(value as { start?: string; end?: string })?.start || ''}
                              onChange={(e) => setColumnFilters((prev: FilterState) => ({ ...prev, [col.key]: { ...(value as Record<string, string>), start: e.target.value } }))}
                              data-testid={`datatable-filter-${col.key}-start`}
                            />
                            <Input aria-label="Input field"
                              type="date"
                              value={(value as { start?: string; end?: string })?.end || ''}
                              onChange={(e) => setColumnFilters((prev: FilterState) => ({ ...prev, [col.key]: { ...(value as Record<string, string>), end: e.target.value } }))}
                              data-testid={`datatable-filter-${col.key}-end`}
                            />
                          </div>
                        )}
                        {filterType === 'multiSelect' && (
                          <div className="space-y-2" data-testid={`datatable-filter-${col.key}-multiselect`}>
                            {(col.filterOptions || []).map((option: { value: string; label: string }) => (
                              <label key={option.value} className="flex items-center gap-2 text-xs text-secondary-foreground">
                                <Checkbox
                                  checked={(value as string[]).includes(option.value)}
                                  onCheckedChange={(checked) => {
                                    setColumnFilters((prev: FilterState) => {
                                      const current = (prev[col.key] as string[]) || [];
                                      if (checked) {
                                        return { ...prev, [col.key]: [...current, option.value] };
                                      }
                                      return { ...prev, [col.key]: current.filter((item) => item !== option.value) };
                                    });
                                  }}
                                  data-testid={`datatable-filter-${col.key}-${option.value}`}
                                />
                                {option.label}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <div className="flex items-center gap-2">
          {typeof onExport === 'function' && (
            <Button variant="outline" onClick={() => onExport(queryPayload)} data-testid="datatable-export-button">
              Export CSV
            </Button>
          )}

          {/* ⋮ Table Settings — Presets + Columns in one 3-dot menu */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="bg-card border-border hover:border-red-500/30 hover:bg-red-500/5 transition-all text-muted-foreground hover:text-foreground"
                data-testid="datatable-settings-button"
                aria-label="Table settings">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0 bg-[#0F0F10] border-border" align="end" data-testid="datatable-settings-panel">
              {/* ── Presets Section ── */}
              <div className="p-4 border-b border-border">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Presets</p>
                <div className="space-y-2">
                  <Select aria-label="Select option"
                    value={selectedPresetId}
                    onValueChange={(value) => {
                      setSelectedPresetId(value);
                      const preset = presets.find((item) => item.id === value);
                      if (preset) applyPreset(preset);
                    }}
                  >
                    <SelectTrigger aria-label="Datatable Presets Select" className="bg-card border-border" data-testid="datatable-presets-select">
                      <SelectValue placeholder="Load a preset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name} ({preset.scope})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Input aria-label="Input field"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="New preset name..."
                      className="bg-card border-border flex-1 text-xs"
                      data-testid="datatable-presets-name"
                    />
                    <Select aria-label="Select option" value={presetScope} onValueChange={setPresetScope}>
                      <SelectTrigger aria-label="Datatable Presets Scope" className="w-[90px] bg-card border-border text-xs" data-testid="datatable-presets-scope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">Personal</SelectItem>
                        {canRolePreset && <SelectItem value="ROLE">Role</SelectItem>}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={handleSavePreset}
                      disabled={!presetName}
                      className="bg-red-600 hover:bg-red-700 text-foreground text-xs font-bold shrink-0"
                      data-testid="datatable-presets-save"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              {/* ── Column Visibility Section ── */}
              {enableColumnControls && (
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Columns</p>
                  <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                    {table && table.getAllLeafColumns ? table.getAllLeafColumns().map((column) => (
                      <div key={column.id} className="flex items-center justify-between gap-2 py-1 rounded-lg px-2 hover:bg-white/[0.03] transition-all group">
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical className="h-3.5 w-3.5 text-foreground group-hover:text-muted-foreground cursor-grab shrink-0 transition-colors" />
                          <Checkbox
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                            data-testid={`datatable-column-toggle-${column.id}`}
                          />
                          <span className="text-xs text-muted-foreground font-medium truncate">
                            {/* @ts-ignore */}
                            {typeof column.columnDef.header === 'function' ? column.columnDef.header({ column, table }) : column.columnDef.header}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon" aria-label="Action"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              const currentOrder = table.getState().columnOrder;
                              if (!currentOrder.length) return;
                              const newOrder = [...currentOrder];
                              const columnIndex = newOrder.indexOf(column.id);
                              if (columnIndex > 0) {
                                [newOrder[columnIndex - 1], newOrder[columnIndex]] = [newOrder[columnIndex], newOrder[columnIndex - 1]];
                                table.setColumnOrder(newOrder);
                              }
                            }}
                            data-testid={`datatable-column-move-up-${column.id}`}
                          >
                            ↑
                          </Button>
                          <Button
                            size="icon" aria-label="Action"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              const currentOrder = table.getState().columnOrder;
                              if (!currentOrder.length) return;
                              const newOrder = [...currentOrder];
                              const columnIndex = newOrder.indexOf(column.id);
                              if (columnIndex < newOrder.length - 1) {
                                [newOrder[columnIndex + 1], newOrder[columnIndex]] = [newOrder[columnIndex], newOrder[columnIndex + 1]];
                                table.setColumnOrder(newOrder);
                              }
                            }}
                            data-testid={`datatable-column-move-down-${column.id}`}
                          >
                            ↓
                          </Button>
                          <Button
                            size="icon" aria-label="Action"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              if (column.getIsPinned()) {
                                column.pin(false);
                              } else {
                                column.pin('left');
                              }
                            }}
                            data-testid={`datatable-column-pin-${column.id}`}
                          >
                            {column.getIsPinned() ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    )) : null}
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {selectedRows.length > 0 && bulkActions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" data-testid="datatable-bulk-actions">
            <Badge variant="outline" data-testid="datatable-bulk-count">{selectedRows.length} selected</Badge>
            {bulkActions.map((action) => (
              <Button key={action.id} variant={action.variant || 'default'} onClick={() => handleBulkAction(action.id)} data-testid={`datatable-bulk-${action.id}`}>
                {action.label}
              </Button>
            ))}
          </div>
        )}

        <div className="relative border border-border rounded-lg overflow-hidden">
          {/* eslint-disable-next-line react/forbid-dom-props */}
          <div className="overflow-x-auto" ref={tableContainerRef} style={{ maxHeight: virtualizationEnabled ? '480px' : 'auto'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
            <Table data-testid={tableTestId || 'datatable-table'}>
              <TableHeader className="sticky top-0 bg-card/95 backdrop-blur">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const pinned = header.column.getIsPinned();
                      const style = pinned === 'left'
                        ? { position: 'sticky', left: header.column.getStart('left'), zIndex: 2, backgroundColor: '#09090B' }
                        : pinned === 'right'
                          ? { position: 'sticky', right: header.column.getAfter('right'), zIndex: 2, backgroundColor: '#09090B' }
                          : undefined;
                      return (
                        <TableHead
                          key={header.id}
                          // @ts-ignore
                          className={cn('relative', header.column.columnDef.meta?.headerClassName)}
                          // @ts-ignore
                          style={{ width: header.getSize(), ...style  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                        >
                          <div
                            className={cn('flex items-center gap-2 select-none font-black text-foreground uppercase tracking-widest text-[10px]', header.column.getCanSort() && 'cursor-pointer')}
                            onClick={header.column.getToggleSortingHandler()}
                            data-testid={`datatable-header-${header.id}`}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() && (
                              <span className="text-xs">{header.column.getIsSorted() === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                          {header.column.getCanResize() && (
                            <div
                              // @ts-ignore
                              onMouseDown={header.getResizeHandler()}
                              // @ts-ignore
                              onTouchStart={header.getResizeHandler()}
                              className="h-full w-1 cursor-col-resize absolute right-0 top-0"
                              data-testid={`datatable-resizer-${header.id}`}
                            />
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {!data || data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={tableColumns.length} className="p-0 border-none" data-testid="datatable-empty">
                      <EmptyState
                        title={emptyMessage}
                        description="Try adjusting your filters or search terms."
                        className="bg-card/20 backdrop-blur-sm"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  (virtualizationEnabled ? rowVirtualizer.getVirtualItems() : table.getRowModel().rows).map((rowItem) => {
                    const row = (virtualizationEnabled ? table.getRowModel().rows[(rowItem as { index: number }).index] : rowItem) as Row<TData>;
                    return (
                      <TableRow
                        key={row.id}
                        onClick={() => handleRowClick(row)}
                        className={cn((onRowClick || renderRowDrawer) && 'cursor-pointer')}
                        data-testid={rowTestIdPrefix ? `${rowTestIdPrefix}-${row.id}` : undefined}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            handleRowClick(row);
                          }
                        }}
                      >
                        {row.getVisibleCells().map((cell: Cell<TData, unknown>) => {
                          const pinned = cell.column.getIsPinned();
                          const style = pinned === 'left'
                            ? { position: 'sticky', left: cell.column.getStart('left'), backgroundColor: '#18181B', zIndex: 1 }
                            : pinned === 'right'
                              ? { position: 'sticky', right: cell.column.getAfter('right'), backgroundColor: '#18181B', zIndex: 1 }
                              : undefined;
                          return (
                            <TableCell
                              key={cell.id}
                              // @ts-ignore
                              className={cn('py-4 text-foreground font-bold text-xs', cell.column.columnDef.meta?.cellClassName)}
                              // @ts-ignore
                              style={{ width: cell.column.getSize(), ...style  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {enablePagination && (
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="datatable-pagination">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Rows per page</span>
              <Select aria-label="Select option" value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger aria-label="Datatable Page Size" className="w-20" data-testid="datatable-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon" aria-label="Action"
                onClick={() => { if (serverMode) { setPageIndex((prev) => Math.max(prev - 1, 0)); } else { table.previousPage(); } }}
                disabled={serverMode ? pageIndex === 0 : !table.getCanPreviousPage()}
                data-testid="datatable-page-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground" data-testid="datatable-page-indicator">
                Page {(serverMode ? pageIndex : table.getState().pagination.pageIndex) + 1} of {serverMode ? (totalPages || '?') : table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="icon" aria-label="Action"
                onClick={() => { if (serverMode) { setPageIndex((prev) => (totalPages ? Math.min(prev + 1, totalPages - 1) : prev + 1)); } else { table.nextPage(); } }}
                disabled={serverMode ? (totalPages ? pageIndex + 1 >= totalPages : false) : !table.getCanNextPage()}
                data-testid="datatable-page-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="right" className="w-[420px]" data-testid="datatable-row-drawer">
            <SheetHeader>
              <SheetTitle>Row Details</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {renderRowDrawer ? renderRowDrawer(activeRow) : null}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </Card>
  );
}
