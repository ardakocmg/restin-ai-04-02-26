
import React, { useState } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { ShoppingCart, Truck, Check, Store } from 'lucide-react';

export default function InternalOrders() {
    // Phase 5: Simulated Store Requisitions
    const [orders, setOrders] = useState([
        { id: 'REQ-001', branch: 'St. Julian\'s', items: 'Burger Patties (50kg), Buns (200)', status: 'Approved', date: '2026-02-05' },
        { id: 'REQ-002', branch: 'Valletta', items: 'Sauce Base (20L)', status: 'Pending', date: '2026-02-05' },
        { id: 'REQ-003', branch: 'Sliema', items: 'Fries (100kg)', status: 'Shipped', date: '2026-02-04' },
    ]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-orange-500/20 text-orange-400';
            case 'Approved': return 'bg-blue-500/20 text-blue-400';
            case 'Shipped': return 'bg-purple-500/20 text-purple-400';
            case 'Delivered': return 'bg-green-500/20 text-green-400';
            default: return 'bg-zinc-500/20 text-zinc-400';
        }
    };

    return (
        <PageContainer
            title="Internal Orders"
            description="Branch-to-Kitchen Supply Requests"
            actions={<Button className="bg-purple-600"><Store className="w-4 h-4 mr-2" /> New Requisition</Button>}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Total Requests (Today)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white">12</div></CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Pending Approval</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-orange-400">4</div></CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">In Transit</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-purple-400">2</div></CardContent>
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
                        {orders.map(order => (
                            <TableRow key={order.id} className="border-white/5">
                                <TableCell className="font-mono text-white">{order.id}</TableCell>
                                <TableCell className="font-medium text-white">{order.branch}</TableCell>
                                <TableCell>{order.items}</TableCell>
                                <TableCell>{order.date}</TableCell>
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
