'use client';

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@antigravity/ui";
import { Badge } from "@antigravity/ui";

interface Column {
    header: string;
    accessorKey: string;
}

interface DataTableProps {
    data: any[];
    columns: Column[];
}

export default function DataTable({ data, columns }: DataTableProps) {
    if (!data || data.length === 0) {
        return <div className="p-8 text-center text-zinc-500 italic">No records found.</div>
    }

    return (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <Table>
                <TableHeader className="bg-zinc-900">
                    <TableRow className="border-zinc-800 hover:bg-zinc-900">
                        {columns.map((col) => (
                            <TableHead key={col.accessorKey} className="text-zinc-400 font-bold uppercase text-xs">
                                {col.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, i) => (
                        <TableRow key={row.id || i} className="border-zinc-800 hover:bg-zinc-800/50">
                            {columns.map((col) => (
                                <TableCell key={col.accessorKey} className="text-zinc-300">
                                    {col.accessorKey === 'status' ? (
                                        <Badge variant="outline" className={
                                            row[col.accessorKey] === 'available' ? 'text-emerald-500 border-emerald-900 bg-emerald-900/10' :
                                                row[col.accessorKey] === 'occupied' ? 'text-red-500 border-red-900 bg-red-900/10' :
                                                    'text-zinc-500 border-zinc-900'
                                        }>
                                            {row[col.accessorKey]}
                                        </Badge>
                                    ) : (
                                        row[col.accessorKey]
                                    )}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
