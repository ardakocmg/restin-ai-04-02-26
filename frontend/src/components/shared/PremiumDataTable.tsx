import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    getFilteredRowModel,
    SortingState,
    ColumnDef as RTColumnDef,
    Row,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    Search,
    Filter,
    Download,
    X,
    FileSpreadsheet,
    FileText,
    Loader2,
    Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '../ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';

// ===================== TYPE DEFINITIONS =====================

export interface ColumnDef<TData = unknown> {
    key: string;
    id?: string;
    label?: string | React.ReactNode;
    header?: string;
    columns?: ColumnDef<TData>[];
    render?: (row: TData) => React.ReactNode;
    enableSorting?: boolean;
    filterType?: 'text' | 'select' | 'range' | 'date';
    filterOptions?: Array<{ value: string; label: string }>;
    headerClassName?: string;
    cellClassName?: string;
    size?: number;
    minSize?: number;
    sticky?: 'left' | 'right';
}

export interface FilterConfig {
    key: string;
    label: string;
    type: 'select' | 'text' | 'range' | 'date';
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
}

export interface BulkAction {
    id: string;
    label: string;
    icon?: React.ReactNode;
    variant?: 'default' | 'destructive' | 'success';
    requiresConfirmation?: boolean;
}

export interface PremiumDataTableProps<TData> {
    columns: ColumnDef<TData>[];
    data: TData[];
    loading?: boolean;
    error?: string | null;
    onRetry?: () => void;

    // Selection
    enableRowSelection?: boolean;
    onSelectionChange?: (selectedRows: TData[]) => void;
    getRowId?: (row: TData, index: number) => string;

    // Filtering
    filters?: FilterConfig[];
    onFilterChange?: (filters: Record<string, string>) => void;
    enableGlobalSearch?: boolean;
    globalSearchPlaceholder?: string;

    // Bulk Actions
    bulkActions?: BulkAction[];
    onBulkAction?: (actionId: string, selectedRows: TData[]) => void;

    // Export
    exportFormats?: ('csv' | 'excel' | 'json')[];
    onExport?: (format: string, data: TData[]) => void;

    // Pagination
    enablePagination?: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];
    totalCount?: number;
    currentPage?: number;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (size: number) => void;

    // Styling
    stickyHeader?: boolean;
    animateRows?: boolean;
    stripedRows?: boolean;
    compactMode?: boolean;
    maxHeight?: string;

    // Empty State
    emptyState?: {
        icon?: React.ComponentType<{ className?: string }>;
        title: string;
        description?: string;
        action?: React.ReactNode;
    };

    // Events
    onRowClick?: (row: TData) => void;
}

// ===================== COMPONENT =====================

export default function PremiumDataTable<TData>({
    columns,
    data,
    loading = false,
    error,
    onRetry,
    enableRowSelection = false,
    onSelectionChange,
    getRowId = (row: TData, index: number) => (row as Record<string, unknown>).id as string || `row-${index}`,
    filters = [],
    onFilterChange,
    enableGlobalSearch = true,
    globalSearchPlaceholder = 'Search...',
    bulkActions = [],
    onBulkAction,
    exportFormats = [],
    onExport,
    enablePagination = true,
    pageSize = 20,
    pageSizeOptions = [10, 20, 50, 100],
    totalCount,
    currentPage = 1,
    onPageChange,
    onPageSizeChange,
    stickyHeader = true,
    animateRows = true,
    stripedRows = false,
    compactMode = false,
    maxHeight = '600px',
    emptyState,
    onRowClick,
}: PremiumDataTableProps<TData>) {
    // State
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
    const [isFilterStripOpen, setIsFilterStripOpen] = useState(false);

    const tableContainerRef = useRef<HTMLDivElement>(null);

    // Map our columns to TanStack Table format
    const tableColumns = useMemo(() => {
        const mapColumns = (cols: ColumnDef<TData>[]): RTColumnDef<TData>[] => {
            return cols.map((col) => {
                // Passthrough: if column already has native TanStack `accessorKey` + `cell`, use as-is
                if ((col as unknown as Record<string, unknown>).accessorKey && typeof (col as unknown as Record<string, unknown>).cell === 'function') {
                    const native = col as unknown as RTColumnDef<TData>;
                    // Wrap the header to add our sorting UI if it's a plain string
                    if (typeof native.header === 'string') {
                        const label = native.header;
                        return {
                            ...native,
                            header: ({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: () => void } }) => {
                                const canSort = col.enableSorting !== false;
                                const sorted = column.getIsSorted();
                                return (
                                    <div
                                        className={cn(
                                            'flex items-center gap-1.5 select-none',
                                            canSort && 'cursor-pointer hover:text-foreground transition-colors'
                                        )}
                                        onClick={() => canSort && column.toggleSorting()}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {label}
                                        </span>
                                        {canSort && (
                                            <span className="text-muted-foreground/50">
                                                {sorted === 'asc' ? (
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                ) : sorted === 'desc' ? (
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                ) : (
                                                    <ChevronsUpDown className="w-3.5 h-3.5" />
                                                )}
                                            </span>
                                        )}
                                    </div>
                                );
                            },
                            enableSorting: col.enableSorting !== false,
                        } as RTColumnDef<TData>;
                    }
                    return native;
                }

                if (col.columns) {
                    return {
                        id: col.key || col.id,
                        header: col.label as string,
                        columns: mapColumns(col.columns),
                    } as RTColumnDef<TData>;
                }

                return {
                    id: col.key || col.id,
                    accessorKey: col.key,
                    header: ({ column }) => {
                        const canSort = col.enableSorting !== false;
                        const sorted = column.getIsSorted();

                        return (
                            <div
                                className={cn(
                                    'flex items-center gap-1.5 select-none',
                                    canSort && 'cursor-pointer hover:text-foreground transition-colors',
                                    col.headerClassName
                                )}
                                onClick={() => canSort && column.toggleSorting()}
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    {typeof col.label === 'string' ? col.label : col.header || col.key}
                                </span>
                                {canSort && (
                                    <span className="text-muted-foreground/50">
                                        {sorted === 'asc' ? (
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        ) : sorted === 'desc' ? (
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        ) : (
                                            <ChevronsUpDown className="w-3.5 h-3.5" />
                                        )}
                                    </span>
                                )}
                            </div>
                        );
                    },
                    cell: ({ row }) => {
                        if (col.render) {
                            return col.render(row.original);
                        }
                        const value = (row.original as Record<string, unknown>)[col.key];
                        return <span className={col.cellClassName}>{String(value ?? '-')}</span>;
                    },
                    size: col.size,
                    minSize: col.minSize,
                    enableSorting: col.enableSorting !== false,
                } as RTColumnDef<TData>;
            });
        };

        // Add selection column if enabled
        const selectionColumn: RTColumnDef<TData> = enableRowSelection
            ? {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        onClick={(e) => e.stopPropagation()}
                        className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                ),
                size: 40,
                enableSorting: false,
            }
            : (null as unknown as RTColumnDef<TData>);

        return enableRowSelection
            ? [selectionColumn, ...mapColumns(columns)]
            : mapColumns(columns);
    }, [columns, enableRowSelection]);

    // Table instance
    const table = useReactTable({
        data,
        columns: tableColumns.filter(Boolean),
        state: {
            sorting,
            globalFilter,
            rowSelection,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        enableRowSelection,
        getRowId: (row, index) => getRowId(row, index),
    });

    // Notify selection changes
    useEffect(() => {
        if (onSelectionChange) {
            const selectedRows = table
                .getSelectedRowModel()
                .rows.map((row) => row.original);
            onSelectionChange(selectedRows);
        }
    }, [rowSelection, onSelectionChange, table]);

    // Virtualization for large datasets
    const { rows } = table.getRowModel();
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => (compactMode ? 52 : 56),
        overscan: 10,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalSize = rowVirtualizer.getTotalSize();

    // Selected count
    const selectedCount = Object.keys(rowSelection).filter(
        (k) => rowSelection[k]
    ).length;

    // Handle filter change
    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...activeFilters, [key]: value };
        if (!value) delete newFilters[key];
        setActiveFilters(newFilters);
        onFilterChange?.(newFilters);
    };

    // Clear all filters
    const clearFilters = () => {
        setActiveFilters({});
        setGlobalFilter('');
        onFilterChange?.({});
    };

    // Export handler
    const handleExport = (format: string) => {
        if (onExport) {
            const exportData = table.getFilteredRowModel().rows.map((r) => r.original);
            onExport(format, exportData);
        }
    };

    // Active filter count
    const activeFilterCount = Object.keys(activeFilters).filter(
        (k) => activeFilters[k]
    ).length;

    return (
        <div className="space-y-4">
            {/* ============== COMMAND BAR ============== */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Global Search */}
                {enableGlobalSearch && (
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input aria-label="Input field"
                            placeholder={globalSearchPlaceholder}
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="pl-10 bg-card border-border/50 focus:border-primary/50 h-10"
                            autoComplete="off"
                        />
                        {globalFilter && (
                            <button
                                onClick={() => setGlobalFilter('')}
                                title="Clear search"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Filter Toggle */}
                {filters.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFilterStripOpen(!isFilterStripOpen)}
                        className={cn(
                            'gap-2 border-border/50',
                            isFilterStripOpen && 'bg-primary/10 border-primary/50 text-primary'
                        )}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary/20 text-primary">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                )}

                {/* Export Dropdown */}
                {exportFormats.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 border-border/50">
                                <Download className="w-4 h-4" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuLabel className="text-muted-foreground text-xs">Export Format</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {exportFormats.includes('csv') && (
                                <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2 cursor-pointer">
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                                    CSV
                                </DropdownMenuItem>
                            )}
                            {exportFormats.includes('excel') && (
                                <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2 cursor-pointer">
                                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                    Excel
                                </DropdownMenuItem>
                            )}
                            {exportFormats.includes('json') && (
                                <DropdownMenuItem onClick={() => handleExport('json')} className="gap-2 cursor-pointer">
                                    <FileText className="w-4 h-4 text-blue-500" />
                                    JSON
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* ============== FILTER STRIP ============== */}
            <AnimatePresence>
                {isFilterStripOpen && filters.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/30 backdrop-blur-sm">
                            {filters.map((filter) => (
                                <div key={filter.key} className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        {filter.label}
                                    </label>
                                    {filter.type === 'select' && filter.options ? (
                                        <Select aria-label="Select option"
                                            value={activeFilters[filter.key] || ''}
                                            onValueChange={(v) => handleFilterChange(filter.key, v)}
                                        >
                                            <SelectTrigger aria-label="Select option" className="w-[140px] h-9 bg-background/50 border-border/50 text-sm">
                                                <SelectValue placeholder={filter.placeholder || 'All'} />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card border-border">
                                                <SelectItem value="">All</SelectItem>
                                                {filter.options.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input aria-label="Input field"
                                            placeholder={filter.placeholder}
                                            value={activeFilters[filter.key] || ''}
                                            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                                            className="w-40 h-9 bg-background/50 border-border/50 text-sm"
                                        />
                                    )}
                                </div>
                            ))}

                            {activeFilterCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="text-muted-foreground hover:text-destructive ml-auto"
                                >
                                    <X className="w-4 h-4 mr-1" />
                                    Clear All
                                </Button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ============== BULK ACTION BAR ============== */}
            <AnimatePresence>
                {selectedCount > 0 && bulkActions.length > 0 && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                <Check className="w-4 h-4 text-primary" />
                            </div>
                            <span className="text-sm font-semibold text-primary">
                                {selectedCount} selected
                            </span>
                        </div>

                        <div className="h-4 w-px bg-primary/20" />

                        {bulkActions.map((action) => (
                            <Button
                                key={action.id}
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    const selectedRows = table
                                        .getSelectedRowModel()
                                        .rows.map((r) => r.original);
                                    onBulkAction?.(action.id, selectedRows);
                                }}
                                className={cn(
                                    'gap-2',
                                    action.variant === 'destructive' && 'text-destructive hover:text-destructive hover:bg-destructive/10',
                                    action.variant === 'success' && 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                                )}
                            >
                                {action.icon}
                                {action.label}
                            </Button>
                        ))}

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRowSelection({})}
                            className="ml-auto text-muted-foreground"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* eslint-disable-next-line react/forbid-dom-props */}
            <div
                ref={tableContainerRef}
                className={cn(
                    'relative overflow-auto rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm',
                    stickyHeader && 'max-h-[var(--table-height)]'
                )}
                style={{ '--table-height': maxHeight } as React.CSSProperties} /* keep-inline */ /* keep-inline */ /* keep-inline */
            >
                {/* Loading Overlay */}
                {loading && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Loading...</span>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="p-8 text-center">
                        <p className="text-destructive mb-4">{error}</p>
                        {onRetry && (
                            <Button variant="outline" onClick={onRetry}>
                                Retry
                            </Button>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && data.length === 0 && (
                    <div className="p-12 text-center">
                        {emptyState?.icon && (
                            <emptyState.icon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                        )}
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                            {emptyState?.title || 'No data available'}
                        </h3>
                        {emptyState?.description && (
                            <p className="text-sm text-muted-foreground mb-4">
                                {emptyState.description}
                            </p>
                        )}
                        {emptyState?.action}
                    </div>
                )}

                {/* Table */}
                {!error && data.length > 0 && (
                    <table className="w-full border-collapse table-fixed">
                        {/* Header */}
                        <thead
                            className={cn(
                                'bg-card border-b border-border/30',
                                stickyHeader && 'sticky top-0 z-10'
                            )}
                        >
                            {/* eslint-disable react/forbid-dom-props */}
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className={cn(
                                                'text-left px-4 border-b border-border/30',
                                                compactMode ? 'py-2' : 'py-3',
                                                header.column.columnDef.size && `w-[${header.column.columnDef.size}px]`
                                            )}
                                            style={{ width: header.column.columnDef.size }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>

                        {/* Body */}
                        {/* eslint-disable-next-line react/forbid-dom-props */}
                        <tbody style={{ height: `${totalSize}px`, position: 'relative' }}>
                            {virtualRows.map((virtualRow) => {
                                const row = rows[virtualRow.index] as Row<TData>;
                                return (
                                    <motion.tr
                                        key={row.id}
                                        initial={animateRows ? { opacity: 0 } : false}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.15, delay: Math.min(virtualRow.index * 0.01, 0.3) }}
                                        onClick={() => onRowClick?.(row.original)}
                                        className={cn(
                                            'group border-b border-border/10 transition-all duration-200',
                                            'hover:bg-primary/5 hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.1)]',
                                            stripedRows && virtualRow.index % 2 === 1 && 'bg-muted/10',
                                            onRowClick && 'cursor-pointer',
                                            row.getIsSelected() && 'bg-primary/10'
                                        )}
                                        style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td
                                                key={cell.id}
                                                className={cn(
                                                    'px-4 text-sm overflow-hidden',
                                                    compactMode ? 'py-1.5' : 'py-4'
                                                )}
                                                style={{ width: cell.column.columnDef.size }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                                            >
                                                <div className="line-clamp-2">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </div>
                                            </td>
                                        ))}
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ============== PAGINATION ============== */}
            {
                enablePagination && data.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Rows per page:</span>
                            <Select aria-label="Select option"
                                value={String(pageSize)}
                                onValueChange={(v) => onPageSizeChange?.(Number(v))}
                            >
                                <SelectTrigger aria-label="Select option" className="w-[70px] h-8 bg-card border-border/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    {pageSizeOptions.map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                Page {currentPage} of {Math.ceil((totalCount || data.length) / pageSize) || 1}
                            </span>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onPageChange?.(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="h-8 px-3 border-border/50"
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onPageChange?.(currentPage + 1)}
                                    disabled={currentPage >= Math.ceil((totalCount || data.length) / pageSize)}
                                    className="h-8 px-3 border-border/50"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
