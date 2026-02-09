
import React, { useState, useEffect } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ShoppingCart, Truck, Check, Store, Loader2 } from 'lucide-react';
import api from '../../../lib/api';
import { useVenue } from '../../../context/VenueContext';

export default function InternalOrders() {
    const { activeVenue } = useVenue();
    const [orders, setOrders] = useState([]);
    const [summary, setSummary] = useState({ total_requests: 0, pending_approval: 0, in_transit: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeVenue?.id) loadOrders();
    }, [activeVenue?.id]);

    const loadOrders = async () => {
        try {
            const res = await api.get('/central-kitchen/orders', { params: { venue_id: activeVenue.id } });
            setOrders(res.data.orders || []);
            setSummary(res.data.summary || { total_requests: 0, pending_approval: 0, in_transit: 0 });
        } catch (err) {
            console.warn('Failed to load internal orders');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-orange-500/20 text-orange-400';
            case 'Approved': return 'bg-blue-500/20 text-blue-400';
            case 'Shipped': return 'bg-purple-500/20 text-purple-400';
            case 'Delivered': return 'bg-green-500/20 text-green-400';
            default: return 'bg-zinc-500/20 text-zinc-400';
        }
    };

    if (loading) {
        return (
            <PageContainer title="Internal Orders" description="Branch-to-Kitchen Supply Requests">
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Internal Orders"
            description="Branch-to-Kitchen Supply Requests"
            actions={<Button className="bg-purple-600"><Store className="w-4 h-4 mr-2" /> New Requisition</Button>}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Total Requests (Today)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white">{summary.total_requests}</div></CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Pending Approval</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-orange-400">{summary.pending_approval}</div></CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">In Transit</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-purple-400">{summary.in_transit}</div></CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900 border-white/10">
                <Table>
                    <TableHeader className="bg-zinc-800">
                        <TableRow>
                            <TableHead className="text-white">Request ID</TableHead>
                            <TableHead className="text-white">Branch</TableHead>
                            <TableHead className="text-white">Items</TableHead>
                            <TableHead className="text-white">Date</TableHead>
                            <TableHead className="text-white">Status</TableHead>
                            <TableHead className="text-right text-white">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-zinc-500">No internal orders found</TableCell>
                            </TableRow>
                        ) : orders.map(order => (
                            <TableRow key={order.id} className="border-white/5">
                                <TableCell className="font-mono text-white">{order.id}</TableCell>
                                <TableCell className="font-medium text-white">{order.branch}</TableCell>
                                <TableCell>{order.items}</TableCell>
                                <TableCell>{(order.date || order.created_at || '').split('T')[0]}</TableCell>
                                <TableCell>
                                    <Badge className={`${getStatusColor(order.status)} border-0`}>{order.status}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white">
                                        <ShoppingCart className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </PageContainer>
    );
}
