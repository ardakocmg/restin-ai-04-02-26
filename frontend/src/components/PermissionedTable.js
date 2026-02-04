/**
 * V3: Permissioned Table Component
 * Server-authoritative column visibility - frontend only renders what backend allows
 */
import { useState, useEffect } from "react";
import api from "../lib/api";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Loader2, AlertTriangle, ShieldOff } from "lucide-react";

export default function PermissionedTable({ 
  venueId, 
  tableKey, 
  dataEndpoint, 
  onRowClick,
  className = "" 
}) {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [schema, setSchema] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

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
    } catch (error) {
      console.error("PermissionedTable error:", error);
      
      if (error.response?.status === 403) {
        setForbidden(true);
      } else {
        toast.error("Failed to load data");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (columnKey) => {
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

  const formatValue = (value, type, currency = "EUR") => {
    if (value == null || value === "") return "-";
    
    switch (type) {
      case "money":
        return `${currency === "EUR" ? "€" : "$"}${parseFloat(value).toFixed(2)}`;
      case "number":
        return parseFloat(value).toFixed(0);
      case "datetime":
        return new Date(value).toLocaleString();
      case "badge":
        return (
          <Badge className="bg-zinc-700 text-white border-zinc-600">
            {value}
          </Badge>
        );
      default:
        return value;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  // Forbidden (403) state
  if (forbidden) {
    return (
      <div className="text-center py-12 px-4">
        <ShieldOff className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
        <p className="text-xl text-zinc-500 mb-2">No Access</p>
        <p className="text-sm text-zinc-600">You don't have permission to view this data</p>
      </div>
    );
  }

  // No schema (should not happen)
  if (!schema || !schema.columns) {
    return (
      <div className="text-center py-12 px-4">
        <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
        <p className="text-xl text-zinc-500">Configuration Error</p>
      </div>
    );
  }

  // Empty state
  if (rows.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-zinc-500">No data available</p>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900 rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-800 border-b border-zinc-700">
            <tr>
              {schema.columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase cursor-pointer hover:bg-zinc-700 transition-colors"
                >
                  {col.label}
                  {sortConfig.key === col.key && (
                    <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sortedRows.map((row, idx) => (
              <tr
                key={row.id || idx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`hover:bg-zinc-800/50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
              >
                {schema.columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-zinc-300">
                    {formatValue(row[col.key], col.type, schema.currency)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer */}
      <div className="px-4 py-3 bg-zinc-800/50 border-t border-zinc-700 text-xs text-zinc-500">
        Showing {rows.length} {rows.length === 1 ? "row" : "rows"}
        {meta.count && meta.count > rows.length && ` (${meta.count} total)`}
      </div>
    </div>
  );
}
