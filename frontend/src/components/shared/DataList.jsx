import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

/**
 * DataList - Responsive table/cards component with server-side pagination and sorting
 * 
 * Props:
 * - columns: Array of { key, label, sortable, render? }
 * - data: Array of items
 * - loading: boolean
 * - pagination: { page, pageSize, total }
 * - onPageChange: (page) => void
 * - onPageSizeChange: (size) => void
 * - onSort: (key, direction) => void
 * - onRowClick: (item) => void
 * - density: 'comfortable' | 'compact' (user preference)
 * - emptyMessage: string
 * - cardRender: (item) => React.Node (for mobile card view)
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
  selectedIds = [],
  onSelect
}) {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [sortState, setSortState] = useState({ key: null, direction: null });

  const handleSort = (key) => {
    if (!onSort) return;

    let newDirection = 'asc';
    if (sortState.key === key) {
      if (sortState.direction === 'asc') newDirection = 'desc';
      else if (sortState.direction === 'desc') newDirection = null;
    }

    setSortState({ key, direction: newDirection });
    onSort(key, newDirection);
  };

  const getSortIcon = (key) => {
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
                      : item[column.key]}
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
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => onPageSizeChange && onPageSizeChange(parseInt(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
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
