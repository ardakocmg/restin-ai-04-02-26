/**
 * V3: Permissioned Table Component
 * Server-authoritative column visibility - frontend only renders what backend allows
 */
import { useState, useEffect } from "react";
import api from "../lib/api";
import { logger } from "../lib/logger";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldOff, AlertTriangle } from "lucide-react";

interface TableColumn {
  key: string;
  label: string;
  type?: string;
}

interface TableSchema {
  columns: TableColumn[];
  currency?: string;
}

interface TableRow {
  id?: string;
  [key: string]: unknown;
}

interface TableMeta {
  count?: number;
  [key: string]: unknown;
}

interface SortConfig {
  key: string | null;
  direction: string;
}

interface PermissionedTableProps {
  venueId: string;
  tableKey: string;
  dataEndpoint: string;
  onRowClick?: (row: TableRow) => void;
  className?: string;
}

export default function PermissionedTable({
  venueId,
  tableKey,
  dataEndpoint,
  onRowClick,
  className = ""
}: PermissionedTableProps) {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [rows, setRows] = useState<TableRow[]>([]);
  const [meta, setMeta] = useState<TableMeta>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: "asc" });

  useEffect(() => {
    loadData();
  }, [venueId, tableKey, dataEndpoint]);

  const loadData = async () => {
    setLoading(true);
    setForbidden(false);

    try {
      // Step 1: Fetch schema (server decides what columns are allowed)
      const schemaRes = await api.get(`/venues/${venueId}/ui/table-schema?table=${tableKey}`);
      setSchema(schemaRes.data);

      // Step 2: Fetch data
      const dataRes = await api.get(dataEndpoint);
      setRows(dataRes.data.rows || []);
      setMeta(dataRes.data.meta || {});
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("PermissionedTable error:", error);

      const response = error.response as Record<string, unknown> | undefined;
      if (response?.status === 403) {
        setForbidden(true);
      } else {
        toast.error("Failed to load data");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (columnKey: string) => {
    let direction = "asc";
    if (sortConfig.key === columnKey && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: columnKey, direction });
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];

    if (aVal === bVal) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    const comparison = aVal > bVal ? 1 : -1;
    return sortConfig.direction === "asc" ? comparison : -comparison;
  });

  const formatValue = (value: unknown, type?: string, currency = "EUR"): React.ReactNode => {
    if (value == null || value === "") return "-";

    switch (type) {
      case "money":
        return `${currency === "EUR" ? "€" : "$"}${parseFloat(String(value)).toFixed(2)}`;
      case "number":
        return parseFloat(String(value)).toFixed(0);
      case "datetime":
        return new Date(String(value)).toLocaleString();
      case "badge":
        return (
          <Badge className="bg-zinc-700 text-foreground border-zinc-600">
            {String(value)}
          </Badge>
        );
      default:
        return String(value);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-red-600 dark:text-red-400 animate-spin" />
      </div>
    );
  }

  // Forbidden (403) state
  if (forbidden) {
    return (
      <div className="text-center py-12 px-4">
        <ShieldOff className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground mb-2">No Access</p>
        <p className="text-sm text-muted-foreground">You don't have permission to view this data</p>
      </div>
    );
  }

  // No schema (should not happen)
  if (!schema || !schema.columns) {
    return (
      <div className="text-center py-12 px-4">
        <AlertTriangle className="w-16 h-16 mx-auto text-yellow-600 dark:text-yellow-400 mb-4" />
        <p className="text-xl text-muted-foreground">Configuration Error</p>
      </div>
    );
  }

  // Empty state
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary border-b border-border">
            <tr>
              {schema.columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase cursor-pointer hover:bg-secondary/80 transition-colors"
                >
                  {col.label}
                  {sortConfig.key === col.key && (
                    <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedRows.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`hover:bg-secondary/50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
              >
                {schema.columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-secondary-foreground">
                    {formatValue(row[col.key], col.type, schema.currency)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-secondary/50 border-t border-border text-xs text-muted-foreground">
        Showing {rows.length} {rows.length === 1 ? "row" : "rows"}
        {meta.count && meta.count > rows.length && ` (${meta.count} total)`}
      </div>
    </div>
  );
}
