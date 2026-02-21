import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useNavigate } from 'react-router-dom';

import { useVenue } from '../../context/VenueContext';
import { useAuth } from '../../context/AuthContext';
import PermissionGate from '../../components/shared/PermissionGate';
import { useAuditLog } from '../../hooks/useAuditLog';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import DataTable from '../../components/shared/DataTable';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';

import { Button } from '../../components/ui/button';

import { Badge } from '../../components/ui/badge';

import { Input } from '../../components/ui/input';

import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    UtensilsCrossed,
    Wine,
    Coffee,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

import { toast } from 'sonner';

import { cn } from '../../lib/utils';

export default function ProductManagement() {
    const navigate = useNavigate();
    const { activeVenue } = useVenue();
    const { user } = useAuth();
    const { logAction } = useAuditLog();

    React.useEffect(() => {
        logAction('PRODUCT_MANAGEMENT_VIEWED', 'product_management', undefined, { user_id: user?.id });
    }, []);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (activeVenue?.id) {
            loadProducts();
        }
    }, [activeVenue?.id]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            // For now, using inventory endpoint or similar if product management isn't fully separate
            // In a real scenario, this would be /venues/{id}/products
            const response = await api.get(`/venues/${activeVenue.id}/inventory`);
            setProducts(response.data.items || []);
        } catch (error) {
            logger.error('Failed to load products:', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = [
        { name: 'Dishes', icon: UtensilsCrossed, count: 42, color: 'text-orange-500' },
        { name: 'Drinks', icon: Wine, count: 128, color: 'text-blue-500' },
        { name: 'Coffee', icon: Coffee, count: 15, color: 'text-amber-700' },
    ];

    return (
        <PermissionGate requiredRole="MANAGER">
            <PageContainer
                title="Product & Menu Management"
                description="Manage your restaurant menu, categories, and item pricing."
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="bg-card border-border text-muted-foreground">
                            Import Menu
                        </Button>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-foreground font-bold">
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Product
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    {/* Category Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {categories.map((cat) => (
                            <Card key={cat.name} className="bg-card/50 border-border hover:border-border transition-all cursor-pointer group">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-background flex items-center justify-center border border-border group-hover:border-border transition-all">
                                                <cat.icon className={cn("h-6 w-6", cat.color)} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-foreground uppercase tracking-tighter">{cat.name}</h3>
                                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{cat.count} Items Active</p>
                                            </div>
                                        </div>
                                        <CheckCircle2 className="h-5 w-5 text-foreground group-hover:text-green-500 transition-all" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Main Product Table */}
                    <Card className="bg-background border-border shadow-2xl">
                        <CardHeader className="border-b border-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Catalog Items</CardTitle>
                                    <CardDescription>Live pricing and availability across all menus</CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input aria-label="Search Catalog..."
                                        placeholder="Search Catalog..."
                                        className="pl-10 bg-card border-border"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <DataTable
                                columns={[
                                    {
                                        key: 'name',
                                        label: 'Product',
                                        render: (row) => (
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded bg-card border border-border flex items-center justify-center">
                                                    <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <span className="font-bold text-foreground uppercase tracking-tight">{row.name}</span>
                                            </div>
                                        )
                                    },
                                    {
                                        key: 'category',
                                        label: 'Category',
                                        render: (row) => <Badge variant="outline" className="text-[10px] uppercase font-bold border-border text-muted-foreground">DISIIES</Badge>
                                    },
                                    {
                                        key: 'price',
                                        label: 'Price',
                                        render: (row) => <span className="font-black text-foreground italic">€24.50</span>
                                    },
                                    {
                                        key: 'status',
                                        label: 'Status',
                                        render: (row) => (
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Published</span>
                                            </div>
                                        )
                                    }
                                ]}
                                data={products}
                                loading={loading}
                                emptyMessage="No products found in the catalog"
                            />
                        </CardContent>
                    </Card>
                </div>
            </PageContainer>
        </PermissionGate>
    );
}