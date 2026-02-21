import React, { useState } from 'react';
import {
    Puzzle, Package, Download, Star, Shield,
    Code, Globe, Search, ExternalLink, Loader2,
    Key, Check, X, Clock, Users, Tag
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

/**
 * 🧩 Plugin SDK Marketplace — Rule 59
 * 3rd party developer ecosystem for extending the core platform.
 */
export default function PluginMarketplace() {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [installing, setInstalling] = useState(null);

    const CATEGORIES = ['all', 'payments', 'delivery', 'marketing', 'accounting', 'loyalty', 'analytics'];

    const PLUGINS = [
        {
            id: '1', name: 'Stripe Advanced', author: 'Stripe Inc.',
            category: 'payments', rating: 4.8, installs: 12400,
            desc: 'Advanced payment processing with 3D Secure 2.0, subscriptions, and invoice management.',
            icon: '💳', verified: true, price: 'Free',
        },
        {
            id: '2', name: 'Wolt Integration', author: 'Wolt Technologies',
            category: 'delivery', rating: 4.5, installs: 8900,
            desc: 'Direct order injection from Wolt to your KDS. Auto-accept, menu sync, and rider tracking.',
            icon: '🛵', verified: true, price: '€29/mo',
        },
        {
            id: '3', name: 'Mailchimp Sync', author: 'Intuit Mailchimp',
            category: 'marketing', rating: 4.3, installs: 6500,
            desc: 'Auto-sync guest profiles and segment data to Mailchimp for email campaigns.',
            icon: '📧', verified: true, price: 'Free',
        },
        {
            id: '4', name: 'QuickBooks Bridge', author: 'Intuit',
            category: 'accounting', rating: 4.6, installs: 5800,
            desc: 'Export daily revenue, expenses, and payroll data to QuickBooks Online automatically.',
            icon: '📊', verified: true, price: '€19/mo',
        },
        {
            id: '5', name: 'LoyaltyLion', author: 'LoyaltyLion Ltd.',
            category: 'loyalty', rating: 4.4, installs: 3200,
            desc: 'Points-based loyalty program with tiered rewards, referrals, and birthday bonuses.',
            icon: '🦁', verified: false, price: '€39/mo',
        },
        {
            id: '6', name: 'Bolt Food Connector', author: 'Bolt Technology',
            category: 'delivery', rating: 4.2, installs: 4100,
            desc: 'Receive Bolt Food orders directly in POS. Real-time status updates and dispatch management.',
            icon: '⚡', verified: true, price: 'Free',
        },
        {
            id: '7', name: 'Google Analytics 4', author: 'Google',
            category: 'analytics', rating: 4.7, installs: 15200,
            desc: 'Track website conversions, menu page views, and ordering funnels with GA4 integration.',
            icon: '📈', verified: true, price: 'Free',
        },
        {
            id: '8', name: 'UberEats Direct', author: 'Uber Technologies',
            category: 'delivery', rating: 4.1, installs: 7300,
            desc: 'Native UberEats integration with automatic menu sync and order status callbacks.',
            icon: '🚗', verified: true, price: '€25/mo',
        },
    ];

    const filtered = PLUGINS.filter(p =>
        (activeCategory === 'all' || p.category === activeCategory) &&
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleInstall = (pluginId) => {
        setInstalling(pluginId);
        setTimeout(() => {
            setInstalling(null);
            toast.success('Plugin installed successfully');
        }, 2000);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Puzzle className="w-6 h-6 text-purple-500" />
                        Plugin Marketplace
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Extend your platform with verified integrations
                    </p>
                </div>
                <Button variant="outline">
                    <Code className="w-4 h-4 mr-1" /> Developer Docs
                </Button>
            </div>

            {/* Search + Categories */}
            <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search plugins..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-background border-border text-foreground pl-10"
                    />
                </div>
            </div>

            <div className="flex gap-1 flex-wrap">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                            "px-3 py-1.5 text-sm rounded-full capitalize transition-all",
                            activeCategory === cat
                                ? "bg-purple-500 text-foreground"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Available</div>
                    <div className="text-2xl font-bold text-foreground">{PLUGINS.length}</div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Verified</div>
                    <div className="text-2xl font-bold text-emerald-500">{PLUGINS.filter(p => p.verified).length}</div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Free</div>
                    <div className="text-2xl font-bold text-blue-500">{PLUGINS.filter(p => p.price === 'Free').length}</div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Categories</div>
                    <div className="text-2xl font-bold text-purple-500">{CATEGORIES.length - 1}</div>
                </Card>
            </div>

            {/* Plugin Grid */}
            <div className="grid grid-cols-2 gap-4">
                {filtered.map(plugin => (
                    <Card key={plugin.id} className="p-5 bg-card border-border hover:border-purple-500/30 transition-all">
                        <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-2xl flex-shrink-0">
                                {plugin.icon}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-foreground">{plugin.name}</h3>
                                    {plugin.verified && (
                                        <Shield className="w-4 h-4 text-blue-500" aria-label="Verified" />
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">{plugin.author}</div>
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{plugin.desc}</p>

                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-0.5">
                                            <Star className="w-3.5 h-3.5 text-yellow-400" /> {plugin.rating}
                                        </span>
                                        <span className="flex items-center gap-0.5">
                                            <Download className="w-3.5 h-3.5" /> {(plugin.installs / 1000).toFixed(1)}k
                                        </span>
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded capitalize",
                                            plugin.price === 'Free' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                        )}>
                                            {plugin.price}
                                        </span>
                                    </div>
                                    <Button
                                        size="sm" variant="outline"
                                        onClick={() => handleInstall(plugin.id)}
                                        disabled={installing === plugin.id}
                                        className={installing === plugin.id ? "" : "hover:bg-purple-500 hover:text-foreground hover:border-purple-500"}
                                    >
                                        {installing === plugin.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <>
                                                <Download className="w-3.5 h-3.5 mr-1" /> Install
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {filtered.length === 0 && (
                <Card className="p-12 bg-card border-border text-center">
                    <Puzzle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground">No plugins found</h3>
                    <p className="text-sm text-muted-foreground mt-1">Try a different search or category</p>
                </Card>
            )}

            {/* SDK Banner */}
            <Card className="p-5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-purple-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Code className="w-8 h-8 text-purple-500" />
                        <div>
                            <h3 className="font-semibold text-foreground">Build Your Own Plugin</h3>
                            <p className="text-sm text-muted-foreground">Use our SDK to create and distribute integrations</p>
                        </div>
                    </div>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-foreground">
                        <Key className="w-4 h-4 mr-1" /> Get API Key
                    </Button>
                </div>
            </Card>
        </div>
    );
}
