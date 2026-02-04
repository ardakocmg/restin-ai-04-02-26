import { Button } from '@antigravity/ui';
import React from 'react';

export default function InventoryDashboard() {
    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Inventory Command
                </h1>
                <Button onClick={() => alert("Add Item (Simulated)")}>
                    + New Ingredient
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Metric Cards would go here */}
                <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="text-sm font-medium text-zinc-500">Total Value</h3>
                    <p className="text-2xl font-bold mt-2">€0.00</p>
                </div>
            </div>
        </div>
    );
}
