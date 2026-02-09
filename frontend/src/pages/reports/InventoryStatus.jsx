import React, { useState, useEffect } from 'react';import { logger } from '@/lib/logger';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';import { logger } from '@/lib/logger';

import { Package, AlertTriangle, TrendingDown, ArrowUpRight } from 'lucide-react';import { logger } from '@/lib/logger';

import api from '../../lib/api';import { logger } from '@/lib/logger';

import { useVenue } from '../../context/VenueContext';

import { logger } from '@/lib/logger';
const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6'];

export default function InventoryStatus() {
    const { activeVenue } = useVenue();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeVenue?.id) loadData();
    }, [activeVenue?.id]);

    const loadData = async () => {
        try {
            const res = await api.get('/inventory/analytics', { params: { venue_id: activeVenue.id } });
            setData(res.data);
        } catch (err) {
            logger.warn('Inventory analytics API failed');
            setData({
                metrics: { total_items: 0, low_stock_alerts: 0, waste_cost_week: 0, inventory_value: 0 },
                waste_distribution: [],
                low_stock_items: []
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-zinc-950 min-h-screen">
            <h1 className="text-3xl font-heading text-white mb-8">Inventory Status</h1>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card-dark p-6 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-400 text-sm font-medium">Total Value</p>
                            <h3 className="text-2xl font-bold text-white mt-1">€{(data.metrics.inventory_value || 0).toLocaleString()}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Package className="w-6 h-6 text-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="card-dark p-6 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-400 text-sm font-medium">Low Stock Alerts</p>
                            <h3 className="text-2xl font-bold text-red-500 mt-1">{data.metrics.low_stock_alerts}</h3>
                        </div>
                        <div className="p-3 bg-red-500/10 rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                    </div>
                </div>

                <div className="card-dark p-6 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-400 text-sm font-medium">Waste Cost (Week)</p>
                            <h3 className="text-2xl font-bold text-white mt-1">€{data.metrics.waste_cost_week}</h3>
                        </div>
                        <div className="p-3 bg-orange-500/10 rounded-xl">
                            <TrendingDown className="w-6 h-6 text-orange-500" />
                        </div>
                    </div>
                </div>

                <div className="card-dark p-6 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-zinc-400 text-sm font-medium">Total SKUs</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{data.metrics.total_items}</h3>
                        </div>
                        <div className="p-3 bg-zinc-500/10 rounded-xl">
                            <ArrowUpRight className="w-6 h-6 text-zinc-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts & Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Waste Distribution */}
                <div className="card-dark p-6 rounded-2xl border border-white/10">
                    <h3 className="text-xl font-heading text-white mb-6">Waste Distribution</h3>
                    <div className="h-80 flex items-center justify-center">
                        {data.waste_distribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.waste_distribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.waste_distribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181B', border: '1px solid #3F3F46', borderRadius: '8px' }}
                                        itemStyle={{ color: '#E4E4E7' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-zinc-500">No waste data recorded</p>
                        )}
                    </div>
                </div>

                {/* Low Stock List */}
                <div className="card-dark p-6 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-heading text-white">Critical Low Stock</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/10 text-zinc-500 text-sm">
                                    <th className="pb-3 font-medium">Item</th>
                                    <th className="pb-3 font-medium">Current</th>
                                    <th className="pb-3 font-medium">Min Level</th>
                                    <th className="pb-3 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {(data.low_stock_items || []).length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-8 text-zinc-500">No low stock items</td></tr>
                                ) : data.low_stock_items.map((item, index) => (
                                    <tr key={index} className="text-sm">
                                        <td className="py-4 text-white font-medium">{item.name}</td>
                                        <td className="py-4 text-red-400 font-bold">{item.current} {item.unit}</td>
                                        <td className="py-4 text-zinc-400">{item.min} {item.unit}</td>
                                        <td className="py-4">
                                            <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-colors">
                                                Order
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
