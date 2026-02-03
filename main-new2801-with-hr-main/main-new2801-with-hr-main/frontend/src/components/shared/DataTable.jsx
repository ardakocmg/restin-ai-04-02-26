import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronLeft, ChevronRight, GripVertical, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { tablePreferencesAPI, tablePresetsAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100];

const buildTableId = (pathname, columns) => {
  const key = columns.map((col) => col.key || col.id).join('-');
  return `table:${pathname}:${key}`;
};

export default function DataTable({
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
}) {
  const location = useLocation();
  const { user } = useAuth();
  const resolvedVenueId = venueId || user?.defaultVenueId || localStorage.getItem('restin_pos_venue');
  const resolvedTableId = tableId || buildTableId(location.pathname, columns);

  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [columnPinning, setColumnPinning] = useState({ left: [], right: [] });
  const [columnSizing, setColumnSizing] = useState({});
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalSearch, setGlobalSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZES[1]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [presetScope, setPresetScope] = useState('USER');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const serverMode = typeof onQueryChange === 'function';
  const canRolePreset = ['owner', 'product_owner'].includes(user?.role);
  const virtualizationEnabled = enableVirtualization;

  const selectionColumn = useMemo(() => ({
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all rows"
        data-testid="datatable-select-all"
      />
    ),
    cell: ({ row }) => (
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
    const base = columns.map((col, index) => {
      const colId = col.key || col.id || `col-${index}`;
      return {
        id: colId,
        accessorKey: col.key,
        header: col.label || colId,
        cell: (info) => (col.render ? col.render(info.row.original) : info.getValue()),
        enableSorting: col.enableSorting !== false,
        meta: {
          filterType: col.filterType,
          filterOptions: col.filterOptions || [],
          headerClassName: col.headerClassName,
          cellClassName: col.cellClassName
        }
      };
    });
    return enableRowSelection ? [selectionColumn, ...base] : base;
  }, [columns, enableRowSelection, selectionColumn]);

  const table = useReactTable({
    data: data || [],
    columns: tableColumns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnPinning,
      columnSizing,
      rowSelection
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange'
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
      setColumnOrder(tableColumns.map((col) => col.id));
    }
  }, [prefsLoaded, columnOrder.length, tableColumns]);

  const preferencesRef = useRef(null);
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

  const tableContainerRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 8
  });

  const handleRowClick = (row) => {
    if (renderRowDrawer) {
      setActiveRow(row.original);
      setDrawerOpen(true);
      return;
    }
    onRowClick?.(row.original);
  };

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);

  const handleBulkAction = (actionId) => {
    if (typeof onBulkAction === 'function') {
      onBulkAction(actionId, selectedRows);
    }
  };

  const applyPreset = (preset) => {
    if (!preset?.state) return;
    setColumnVisibility(preset.state.columnVisibility || {});
    setColumnOrder(preset.state.columnOrder || []);
    setColumnPinning(preset.state.columnPinning || { left: [], right: [] });
    setColumnSizing(preset.state.columnSizing || {});
    setPageSize(preset.state.pageSize || pageSize);
    setSorting(preset.state.sorting || []);
    setGlobalSearch(preset.state.globalSearch || '');
    setColumnFilters(preset.state.filters || {});
  };

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
      <Card className={cn("bg-zinc-900 border-white/5", className)}>
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
      <Card className={cn('p-8 bg-zinc-900 border-white/10', className)}>
        <div className="text-center space-y-3" data-testid="datatable-error">
          <p className="text-sm text-zinc-100 font-medium">{error}</p>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} data-testid="datatable-retry-button">Retry</Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4 space-y-3 bg-zinc-950/50 border-white/5 shadow-2xl', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {enableGlobalSearch && serverMode && (
            <Input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search..."
              className="w-[220px] bg-zinc-900 border-white/10 focus:border-red-500/50 transition-all"
              data-testid="datatable-global-search"
            />
          )}
          {enableFilters && serverMode && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="datatable-filter-button">
                  Filters <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-4" data-testid="datatable-filter-panel">
                <div className="space-y-4">
                  {columns.map((col) => {
                    const filterType = col.filterType || 'text';
                    const value = columnFilters[col.key] || (filterType === 'multiSelect' ? [] : '');
                    return (
                      <div key={col.key} className="space-y-2">
                        <label className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{col.label}</label>
                        {filterType === 'text' && (
                          <Input
                            value={value}
                            onChange={(e) => setColumnFilters((prev) => ({ ...prev, [col.key]: e.target.value }))}
                            data-testid={`datatable-filter-${col.key}`}
                          />
                        )}
                        {filterType === 'numberRange' && (
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="Min"
                              value={value?.min || ''}
                              onChange={(e) => setColumnFilters((prev) => ({ ...prev, [col.key]: { ...value, min: e.target.value } }))}
                              data-testid={`datatable-filter-${col.key}-min`}
                            />
                            <Input
                              type="number"
                              placeholder="Max"
                              value={value?.max || ''}
                              onChange={(e) => setColumnFilters((prev) => ({ ...prev, [col.key]: { ...value, max: e.target.value } }))}
                              data-testid={`datatable-filter-${col.key}-max`}
                            />
                          </div>
                        )}
                        {filterType === 'dateRange' && (
                          <div className="flex gap-2">
                            <Input
                              type="date"
                              value={value?.start || ''}
                              onChange={(e) => setColumnFilters((prev) => ({ ...prev, [col.key]: { ...value, start: e.target.value } }))}
                              data-testid={`datatable-filter-${col.key}-start`}
                            />
                            <Input
                              type="date"
                              value={value?.end || ''}
                              onChange={(e) => setColumnFilters((prev) => ({ ...prev, [col.key]: { ...value, end: e.target.value } }))}
                              data-testid={`datatable-filter-${col.key}-end`}
                            />
                          </div>
                        )}
                        {filterType === 'multiSelect' && (
                          <div className="space-y-2" data-testid={`datatable-filter-${col.key}-multiselect`}>
                            {(col.filterOptions || []).map((option) => (
                              <label key={option.value} className="flex items-center gap-2 text-xs text-zinc-300">
                                <Checkbox
                                  checked={value.includes(option.value)}
                                  onCheckedChange={(checked) => {
                                    setColumnFilters((prev) => {
                                      const current = prev[col.key] || [];
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
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-zinc-900 border-white/10 hover:border-red-500/30 hover:bg-red-500/5 transition-all text-zinc-100 font-bold"
                data-testid="datatable-presets-button"
              >
                Presets <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4" data-testid="datatable-presets-panel">
              <div className="space-y-3">
                <Select
                  value={selectedPresetId}
                  onValueChange={(value) => {
                    setSelectedPresetId(value);
                    const preset = presets.find((item) => item.id === value);
                    applyPreset(preset);
                  }}
                >
                  <SelectTrigger data-testid="datatable-presets-select">
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name} ({preset.scope})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name"
                  data-testid="datatable-presets-name"
                />

                <Select value={presetScope} onValueChange={setPresetScope}>
                  <SelectTrigger data-testid="datatable-presets-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Personal</SelectItem>
                    {canRolePreset && <SelectItem value="ROLE">Role</SelectItem>}
                  </SelectContent>
                </Select>

                <Button onClick={handleSavePreset} data-testid="datatable-presets-save">Save preset</Button>
              </div>
            </PopoverContent>
          </Popover>

          {enableColumnControls && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-zinc-900 border-white/10 hover:border-red-500/30 hover:bg-red-500/5 transition-all text-zinc-100 font-bold"
                  data-testid="datatable-columns-button"
                >
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-4" data-testid="datatable-columns-panel">
                <div className="space-y-3">
                  {table && table.getAllLeafColumns ? table.getAllLeafColumns().map((column) => (
                    <div key={column.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-zinc-500" />
                        <Checkbox
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                          data-testid={`datatable-column-toggle-${column.id}`}
                        />
                        <span className="text-xs text-zinc-300">
                          {typeof column.columnDef.header === 'function'
                            ? column.columnDef.header({ column, table })
                            : column.columnDef.header}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
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
                          size="icon"
                          variant="ghost"
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
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (column.getIsPinned()) {
                              column.pin(false);
                            } else {
                              column.pin('left');
                            }
                          }}
                          data-testid={`datatable-column-pin-${column.id}`}
                        >
                          {column.getIsPinned() ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )) : null}
                </div>
              </PopoverContent>
            </Popover>
          )}
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

        <div className="relative border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto" ref={tableContainerRef} style={{ maxHeight: virtualizationEnabled ? '480px' : 'auto' }}>
            <Table data-testid={tableTestId || 'datatable-table'}>
              <TableHeader className="sticky top-0 bg-zinc-900/95 backdrop-blur">
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
                          className={cn('relative', header.column.columnDef.meta?.headerClassName)}
                          style={{ width: header.getSize(), ...style }}
                        >
                          <div
                            className={cn('flex items-center gap-2 select-none font-black text-white uppercase tracking-widest text-[10px]', header.column.getCanSort() && 'cursor-pointer')}
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
                              onMouseDown={header.getResizeHandler()}
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
                    <TableCell colSpan={tableColumns.length} className="text-center text-zinc-100 font-bold py-12 bg-zinc-950/20" data-testid="datatable-empty">
                      <div className="flex flex-col items-center gap-2">
                        {emptyMessage}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  (virtualizationEnabled ? rowVirtualizer.getVirtualItems() : table.getRowModel().rows).map((rowItem) => {
                    const row = virtualizationEnabled ? table.getRowModel().rows[rowItem.index] : rowItem;
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
                        {row.getVisibleCells().map((cell) => {
                          const pinned = cell.column.getIsPinned();
                          const style = pinned === 'left'
                            ? { position: 'sticky', left: cell.column.getStart('left'), backgroundColor: '#18181B', zIndex: 1 }
                            : pinned === 'right'
                              ? { position: 'sticky', right: cell.column.getAfter('right'), backgroundColor: '#18181B', zIndex: 1 }
                              : undefined;
                          return (
                            <TableCell
                              key={cell.id}
                              className={cn('py-4 text-zinc-100 font-bold text-xs', cell.column.columnDef.meta?.cellClassName)}
                              style={{ width: cell.column.getSize(), ...style }}
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

        {enablePagination && serverMode && (
          <div className="flex flex-wrap items-center justify-between gap-3" data-testid="datatable-pagination">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-[80px]" data-testid="datatable-page-size">
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
                size="icon"
                onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
                disabled={pageIndex === 0}
                data-testid="datatable-page-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-zinc-400" data-testid="datatable-page-indicator">
                Page {pageIndex + 1} {totalPages ? `of ${totalPages}` : ''}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPageIndex((prev) => (totalPages ? Math.min(prev + 1, totalPages - 1) : prev + 1))}
                disabled={totalPages ? pageIndex + 1 >= totalPages : false}
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
