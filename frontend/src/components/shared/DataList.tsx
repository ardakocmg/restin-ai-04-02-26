import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  List
} from 'lucide-react';
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface DataListColumn {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  cellClassName?: string;
  render?: (value: unknown, item: DataListItem) => React.ReactNode;
}

interface DataListItem {
  id?: string;
  [key: string]: unknown;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

interface SortState {
  key: string | null;
  direction: string | null;
}

interface DataListProps {
  columns?: DataListColumn[];
  data?: DataListItem[];
  loading?: boolean;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSort?: (key: string, direction: string | null) => void;
  onRowClick?: (item: DataListItem) => void;
  density?: 'comfortable' | 'compact';
  emptyMessage?: string;
  cardRender?: (item: DataListItem) => React.ReactNode;
  selectedIds?: string[];
  onSelect?: (ids: string[]) => void;
}

/**
 * DataList - Responsive table/cards component with server-side pagination and sorting
 */
export default function DataList({
  columns = [],
  data = [],
  loading = false,
  pagination = { page: 1, pageSize: 25, total: 0 },
  onPageChange,
  onPageSizeChange,
  onSort,
  onRowClick,
  density = 'comfortable',
  emptyMessage = 'No data found',
  cardRender,
  selectedIds: _selectedIds = [],
  onSelect: _onSelect,
}: DataListProps) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortState, setSortState] = useState<SortState>({ key: null, direction: null });

  const handleSort = (key: string) => {
    if (!onSort) return;

    let newDirection: string | null = 'asc';
    if (sortState.key === key) {
      if (sortState.direction === 'asc') newDirection = 'desc';
      else if (sortState.direction === 'desc') newDirection = null;
    }

    setSortState({ key, direction: newDirection });
    onSort(key, newDirection);
  };

  const getSortIcon = (key: string) => {
    if (sortState.key !== key) return <ArrowUpDown className="h-4 w-4" />;
    if (sortState.direction === 'asc') return <ArrowUp className="h-4 w-4" />;
    if (sortState.direction === 'desc') return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const startItem = (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

  const rowClasses = density === 'compact' ? 'h-10' : 'h-14';

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Empty state
  if (!loading && data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground mb-2">
              {emptyMessage}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Cards view for mobile or user preference
  if (viewMode === 'cards' && cardRender) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4 mr-2" />
            Table View
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item, index) => (
            <div
              key={item.id || index}
              onClick={() => onRowClick && onRowClick(item)}
              className="cursor-pointer"
            >
              {cardRender(item)}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination.total > pagination.pageSize && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startItem} to {endItem} of {pagination.total} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={pagination.page === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Page {pagination.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={pagination.page >= totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Table view (desktop)
  return (
    <div className="space-y-4">
      {/* View Toggle */}
      {cardRender && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Card View
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(column.key)}
                      className="-ml-3 h-8 data-[state=open]:bg-accent"
                    >
                      {column.label}
                      {getSortIcon(column.key)}
                    </Button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow
                key={item.id || index}
                onClick={() => onRowClick && onRowClick(item)}
                className={`${rowClasses} ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.cellClassName}>
                    {column.render
                      ? column.render(item[column.key], item)
                      : item[column.key] as React.ReactNode}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Rows per page:
            </span>
            <Select aria-label="Select option"
              value={pagination.pageSize.toString()}
              onValueChange={(value) => onPageSizeChange && onPageSizeChange(parseInt(value))}
            >
              <SelectTrigger aria-label="Select option" className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Showing {startItem} to {endItem} of {pagination.total} results
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={pagination.page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Page {pagination.page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={pagination.page >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
