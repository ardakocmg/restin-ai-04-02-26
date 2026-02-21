import React, { useState } from 'react';
import {
    DollarSign, Plus, Clock, Tag, TrendingUp,
    Percent, Calendar, ToggleLeft, Trash2, Edit,
    Loader2, Save, AlertTriangle, Sun, Moon,
    Zap, ChevronRight, ArrowUpRight, Filter
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVenue } from '../../../context/VenueContext';
import { toast } from 'sonner';
import api from '../../../lib/api';

/**
 * 💸 Dynamic Pricing Rules Engine UI (Pillar 6)
 * Price Books, Happy Hour rules, Surge pricing, and per-item overrides.
 * Wires to existing /pricing/price-books backend.
 */
export default function DynamicPricingPage() {
    const { activeVenue } = useVenue();
    const venueId = activeVenue?.id || localStorage.getItem('currentVenueId') || 'default';
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [newBook, setNewBook] = useState({ name: '', type: 'happy_hour', modifier_type: 'PERCENTAGE', modifier_value: -15 });

    const { data: priceBooks = [], isLoading } = useQuery({
        queryKey: ['price-books', venueId],
        queryFn: async () => {
            try {
                const { data } = await api.get(`/pricing/price-books?venue_id=${venueId}`);
                return Array.isArray(data) ? data : [];
            } catch {
                return [];
            }
        }
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            return api.post('/pricing/price-books', {
                venue_id: venueId,
                name: newBook.name,
                type: newBook.type,
                modifier_type: newBook.modifier_type,
                modifier_value: newBook.modifier_value,
                active: false,
                priority: priceBooks.length + 1,
                schedule: {}
            });
        },
        onSuccess: () => {
            toast.success('Price book created');
            setShowCreate(false);
            setNewBook({ name: '', type: 'happy_hour', modifier_type: 'PERCENTAGE', modifier_value: -15 });
            queryClient.invalidateQueries({ queryKey: ['price-books'] });
        },
        onError: () => toast.error('Failed to create price book')
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            return api.patch(`/pricing/price-books/${id}?venue_id=${venueId}`, { active: !active });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['price-books'] });
            toast.success('Price book updated');
        }
    });

    const activeBooks = priceBooks.filter(b => b.active);
    const totalRules = priceBooks.length;

    const typeConfig = {
        happy_hour: { icon: Sun, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Happy Hour' },
        surge: { icon: Zap, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Surge' },
        seasonal: { icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Seasonal' },
        vip: { icon: Tag, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'VIP' },
        default: { icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Custom' },
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-emerald-500" />
                        Dynamic Pricing
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage price books, happy hours, and surge pricing rules
                    </p>
                </div>
                <Button
                    size="sm"
                    onClick={() => setShowCreate(!showCreate)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-foreground"
                >
                    <Plus className="w-4 h-4 mr-1" /> New Price Book
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Total Rules</div>
                    <div className="text-2xl font-bold text-foreground">{totalRules}</div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Active Now</div>
                    <div className="text-2xl font-bold text-emerald-500">{activeBooks.length}</div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Avg. Discount</div>
                    <div className="text-2xl font-bold text-amber-500">
                        {priceBooks.length > 0
                            ? `${Math.round(priceBooks.reduce((sum, b) => sum + (b.modifier_value || 0), 0) / priceBooks.length)}%`
                            : '—'}
                    </div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Scheduled</div>
                    <div className="text-2xl font-bold text-blue-500">
                        {priceBooks.filter(b => b.schedule && Object.keys(b.schedule).length > 0).length}
                    </div>
                </Card>
            </div>

            {/* Create Form */}
            {showCreate && (
                <Card className="p-5 bg-card border-border space-y-4">
                    <h3 className="font-semibold text-foreground">Create Price Book</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Name</label>
                            <Input
                                value={newBook.name}
                                onChange={(e) => setNewBook({ ...newBook, name: e.target.value })}
                                placeholder="e.g., Friday Happy Hour"
                                className="bg-background border-border text-foreground"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Type</label>
                            <select
                                value={newBook.type}
                                onChange={(e) => setNewBook({ ...newBook, type: e.target.value })}
                                className="w-full h-9 rounded-md border border-border bg-background text-foreground text-sm px-3"
                            >
                                <option value="happy_hour">Happy Hour</option>
                                <option value="surge">Surge Pricing</option>
                                <option value="seasonal">Seasonal</option>
                                <option value="vip">VIP Discount</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Modifier</label>
                            <select
                                value={newBook.modifier_type}
                                onChange={(e) => setNewBook({ ...newBook, modifier_type: e.target.value })}
                                className="w-full h-9 rounded-md border border-border bg-background text-foreground text-sm px-3"
                            >
                                <option value="PERCENTAGE">Percentage (%)</option>
                                <option value="FIXED">Fixed Amount (¢)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Value</label>
                            <Input
                                type="number"
                                value={newBook.modifier_value}
                                onChange={(e) => setNewBook({ ...newBook, modifier_value: parseFloat(e.target.value) })}
                                className="bg-background border-border text-foreground"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button
                            size="sm"
                            onClick={() => createMutation.mutate()}
                            disabled={!newBook.name || createMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-foreground"
                        >
                            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Price Books List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : priceBooks.length === 0 ? (
                <Card className="p-12 bg-card border-border text-center">
                    <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground">{"No "}Price Books Yet</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Create your first pricing rule to get started with happy hours, surge pricing, and more.
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {priceBooks.map((book) => {
                        const tc = typeConfig[book.type] || typeConfig.default;
                        const Icon = tc.icon;

                        return (
                            <Card
                                key={book.id}
                                className={cn(
                                    "p-4 border-border transition-all",
                                    book.active ? "bg-card" : "bg-muted/30 opacity-70"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("p-2.5 rounded-lg", tc.bg)}>
                                            <Icon className={cn("w-5 h-5", tc.color)} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">{book.name}</div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className={cn("text-xs px-2 py-0.5 rounded-full", tc.bg, tc.color)}>
                                                    {tc.label}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {book.modifier_type === 'PERCENTAGE'
                                                        ? `${book.modifier_value > 0 ? '+' : ''}${book.modifier_value}%`
                                                        : `${book.modifier_value > 0 ? '+' : ''}€${(Math.abs(book.modifier_value) / 100).toFixed(2)}`
                                                    }
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Priority: {book.priority || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => toggleMutation.mutate({ id: book.id, active: book.active })}
                                        >
                                            <div className={cn(
                                                "w-10 h-6 rounded-full flex items-center transition-all",
                                                book.active ? "bg-emerald-500 justify-end" : "bg-muted-foreground/30 justify-start"
                                            )}>
                                                <div className="w-4 h-4 rounded-full bg-white mx-1 shadow-sm" />
                                            </div>
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
