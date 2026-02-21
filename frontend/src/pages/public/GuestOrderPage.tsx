// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { toast, Toaster } from 'sonner';
import {
    ShoppingBag, Plus, Minus, X, ArrowRight,
    Clock, MapPin, ChefHat, Loader2, CheckCircle2,
    UtensilsCrossed, Heart, Tag, Search
} from 'lucide-react';
import './GuestOrderPage.css';

const API_BASE = process.env.REACT_APP_BACKEND_URL
    ? `${process.env.REACT_APP_BACKEND_URL}/api`
    : `http://${window.location.hostname}:8000/api`;

interface MenuItem {
    id: string;
    name: string;
    category_id: string;
    price_cents: number;
    sell_price?: number;
    description?: string;
    image_url?: string;
    allergens?: string[];
    tags?: string[];
}

interface Category {
    id: string;
    name: string;
    sort_order?: number;
}

interface CartItem {
    item: MenuItem;
    quantity: number;
    notes: string;
}

interface VenueConfig {
    welcome_message: string;
    theme: { primary_color: string; bg_color: string; font: string };
    allow_dine_in: boolean;
    allow_takeaway: boolean;
    require_table_number: boolean;
    accept_tips: boolean;
    tip_presets_percent: number[];
    estimated_prep_minutes: number;
}

type OrderStatus = 'browsing' | 'cart' | 'checkout' | 'confirmed' | 'tracking';

export default function GuestOrderPage() {
    const { venueId } = useParams<{ venueId: string }>();
    const [searchParams] = useSearchParams();
    const tableName = searchParams.get('table') || '';

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [config, setConfig] = useState<VenueConfig | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [search, setSearch] = useState('');
    const [view, setView] = useState<OrderStatus>('browsing');
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [guestNotes, setGuestNotes] = useState('');
    const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
    const [tableInput, setTableInput] = useState(tableName);
    const [selectedTip, setSelectedTip] = useState<number>(0);
    const [orderId, setOrderId] = useState('');
    const [orderStatus, setOrderStatus] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Load menu
    const loadMenu = useCallback(async () => {
        if (!venueId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/order-anywhere/guest/menu/${venueId}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.detail || 'Menu not available');
            setConfig(json.config);
            setCategories(json.categories || []);
            setProducts(json.products || []);
            if (json.categories?.length) setActiveCategory(json.categories[0].id);
        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : 'Failed to load menu';
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    }, [venueId]);

    useEffect(() => { loadMenu(); }, [loadMenu]);

    // Cart helpers
    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(c => c.item.id === item.id);
            if (existing) {
                return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { item, quantity: 1, notes: '' }];
        });
        toast.success(`${item.name} added`);
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => {
            const existing = prev.find(c => c.item.id === itemId);
            if (existing && existing.quantity > 1) {
                return prev.map(c => c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
            }
            return prev.filter(c => c.item.id !== itemId);
        });
    };

    const getItemPrice = (item: MenuItem): number => {
        return item.sell_price ? Math.round(item.sell_price * 100) : item.price_cents || 0;
    };

    const subtotal = useMemo(() =>
        cart.reduce((sum, c) => sum + getItemPrice(c.item) * c.quantity, 0),
        [cart]
    );

    const tipAmount = Math.round(subtotal * selectedTip / 100);
    const total = subtotal + tipAmount;
    const cartCount = cart.reduce((n, c) => n + c.quantity, 0);

    // Filter by category + search
    const filteredProducts = useMemo(() => {
        let items = products;
        if (activeCategory) items = items.filter(p => p.category_id === activeCategory);
        if (search) {
            const q = search.toLowerCase();
            items = items.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
        }
        return items;
    }, [products, activeCategory, search]);

    // Submit order
    const submitOrder = async () => {
        if (config?.require_table_number && orderType === 'dine_in' && !tableInput) {
            toast.error('Please enter your table name');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                venue_id: venueId,
                items: cart.map(c => ({
                    item_id: c.item.id,
                    name: c.item.name,
                    price_cents: getItemPrice(c.item),
                    quantity: c.quantity,
                    notes: c.notes,
                })),
                order_type: orderType,
                table_name: tableInput,
                guest_name: guestName,
                guest_phone: guestPhone,
                guest_notes: guestNotes,
                tip_cents: tipAmount,
            };

            const res = await fetch(`${API_BASE}/order-anywhere/guest/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.detail || 'Failed to place order');

            setOrderId(json.order.id);
            setOrderStatus(json.order.status);
            setView('confirmed');
            setCart([]);
        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : 'Failed to place order';
            toast.error(errMsg);
        } finally {
            setSubmitting(false);
        }
    };

    // Poll order status
    useEffect(() => {
        if (!orderId || view !== 'tracking') return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE}/order-anywhere/guest/order/${orderId}`);
                const json = await res.json();
                if (json.success) setOrderStatus(json.order.status);
            } catch { /* silent */ }
        }, 5000);
        return () => clearInterval(interval);
    }, [orderId, view]);

    const primaryColor = config?.theme?.primary_color || '#e53935';

    // Set the --guest-primary CSS custom property on document root for dynamic theming
    useEffect(() => {
        document.documentElement.style.setProperty('--guest-primary', primaryColor);
        return () => { document.documentElement.style.removeProperty('--guest-primary'); };
    }, [primaryColor]);

    // Loading
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center guest-order-page">
                <Loader2 className="w-8 h-8 animate-spin guest-primary-text" />
            </div>
        );
    }

    // Error
    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <UtensilsCrossed className="w-16 h-16 text-foreground mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-foreground mb-2">Online ordering unavailable</h1>
                    <p className="text-sm text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }

    // ORDER CONFIRMED
    if (view === 'confirmed' || view === 'tracking') {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 guest-order-page">
                <Toaster theme="dark" position="top-center" />
                <div className="text-center max-w-sm space-y-6">
                    <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center guest-primary-bg-faded-wrap">
                        <CheckCircle2 className="w-10 h-10 guest-primary-text" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black">Order Placed!</h1>
                        <p className="text-muted-foreground text-sm mt-1">Your order number is</p>
                        <p className="text-3xl font-black mt-2 guest-primary-text">{orderId}</p>
                    </div>

                    {/* Status tracker */}
                    <div className="p-5 bg-card/50 border border-border rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Est. {config?.estimated_prep_minutes || 20} min</span>
                        </div>
                        {['pending', 'accepted', 'preparing', 'ready'].map((step, i) => (
                            <div key={step} className="flex items-center gap-3">
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                    ['pending', 'accepted', 'preparing', 'ready', 'completed'].indexOf(orderStatus) >= i
                                        ? "text-foreground guest-step-active" : "bg-secondary text-muted-foreground"
                                )}>
                                    {i + 1}
                                </div>
                                <span className={cn(
                                    "text-sm capitalize",
                                    ['pending', 'accepted', 'preparing', 'ready', 'completed'].indexOf(orderStatus) >= i ? "text-foreground font-bold" : "text-muted-foreground"
                                )}>
                                    {step === 'pending' ? 'Received' : step}
                                </span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={() => setView('tracking')}
                        className="w-full py-3 border border-border rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {view === 'tracking' ? 'Tracking...' : 'Track Order'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground max-w-lg mx-auto relative pb-20 guest-order-page" style={{ '--guest-primary': primaryColor } as React.CSSProperties}>
            <Toaster theme="dark" position="top-center" />

            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl p-4 border-b border-border">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-black">{config?.welcome_message || 'Order Here'}</h1>
                        {tableInput && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" /> Table {tableInput}
                            </p>
                        )}
                    </div>
                    {view === 'checkout' ? (
                        <button onClick={() => setView('browsing')} className="p-2 bg-secondary rounded-xl" title="Back to menu">
                            <X className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={() => cartCount > 0 && setView('checkout')}
                            className="relative p-2 bg-secondary rounded-xl"
                            title="View cart"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-foreground guest-primary-bg">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {/* Category scrollbar */}
                {view === 'browsing' && categories.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                                    activeCategory === cat.id
                                        ? "text-foreground border-transparent guest-category-active" : "bg-transparent border-border text-muted-foreground"
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Search */}
                {view === 'browsing' && (
                    <div className="mt-2 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search menu..."
                            className="w-full h-9 bg-card border border-border rounded-xl pl-9 pr-3 text-sm text-foreground outline-none focus:border-white/15"
                        />
                    </div>
                )}
            </div>

            {/* Menu Items */}
            {view === 'browsing' && (
                <div className="p-4 space-y-3">
                    {filteredProducts.length === 0 && (
                        <div className="text-center py-12">
                            <ChefHat className="w-12 h-12 text-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No items found</p>
                        </div>
                    )}
                    {filteredProducts.map(item => {
                        const inCart = cart.find(c => c.item.id === item.id);
                        const price = getItemPrice(item);
                        return (
                            <div key={item.id} className="flex gap-3 p-3 bg-card/50 border border-border rounded-xl">
                                {/* Image placeholder */}
                                {item.image_url && (
                                    <div className="w-20 h-20 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold text-foreground truncate">{item.name}</h3>
                                    {item.description && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>}
                                    {item.tags && item.tags.length > 0 && (
                                        <div className="flex gap-1 mt-1 flex-wrap">
                                            {item.tags.slice(0, 3).map(tag => (
                                                <span key={tag} className="px-1.5 py-0.5 bg-secondary text-[8px] text-muted-foreground rounded font-bold uppercase">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-sm font-bold guest-primary-text">
                                            €{(price / 100).toFixed(2)}
                                        </span>
                                        {inCart ? (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center" title="Remove one">
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="text-sm font-bold w-4 text-center">{inCart.quantity}</span>
                                                <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-full flex items-center justify-center text-foreground guest-primary-bg" title="Add one more">
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => addToCart(item)} className="px-3 py-1.5 rounded-full text-[10px] font-bold text-foreground transition-all guest-primary-bg">
                                                Add
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Checkout View */}
            {view === 'checkout' && (
                <div className="p-4 space-y-4">
                    {/* Order Type */}
                    <div className="flex gap-2">
                        {config?.allow_dine_in && (
                            <button
                                onClick={() => setOrderType('dine_in')}
                                className={cn(
                                    "flex-1 py-3 rounded-xl text-sm font-bold transition-all border-2",
                                    orderType === 'dine_in' ? "text-foreground guest-btn-active" : "bg-transparent border-border text-muted-foreground"
                                )}
                            >
                                Dine-In
                            </button>
                        )}
                        {config?.allow_takeaway && (
                            <button
                                onClick={() => setOrderType('takeaway')}
                                className={cn(
                                    "flex-1 py-3 rounded-xl text-sm font-bold transition-all border-2",
                                    orderType === 'takeaway' ? "text-foreground guest-btn-active" : "bg-transparent border-border text-muted-foreground"
                                )}
                            >
                                Takeaway
                            </button>
                        )}
                    </div>

                    {/* Table / Guest Info */}
                    {orderType === 'dine_in' && config?.require_table_number && (
                        <input
                            value={tableInput}
                            onChange={(e) => setTableInput(e.target.value)}
                            placeholder="Table name / number"
                            className="w-full h-10 bg-card border border-border rounded-xl px-3 text-sm outline-none focus:border-white/15"
                        />
                    )}
                    <input
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Your name (optional)"
                        className="w-full h-10 bg-card border border-border rounded-xl px-3 text-sm outline-none focus:border-white/15"
                    />

                    {/* Cart Items */}
                    <div className="space-y-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Your Order</h3>
                        {cart.map(c => (
                            <div key={c.item.id} className="flex items-center justify-between p-3 bg-card/50 border border-border rounded-xl">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">{c.item.name}</p>
                                    <p className="text-[10px] text-muted-foreground">€{(getItemPrice(c.item) / 100).toFixed(2)} each</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => removeFromCart(c.item.id)} className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center" title="Remove">
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-sm font-bold w-4 text-center">{c.quantity}</span>
                                    <button onClick={() => addToCart(c.item)} className="w-7 h-7 rounded-full flex items-center justify-center text-foreground guest-primary-bg" title="Add">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tips */}
                    {config?.accept_tips && (
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Add a tip</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedTip(0)}
                                    className={cn(
                                        "flex-1 py-2 rounded-xl text-sm font-bold transition-all border",
                                        selectedTip === 0 ? "bg-zinc-700 border-zinc-600 text-foreground" : "border-border text-muted-foreground"
                                    )}
                                >
                                    No Tip
                                </button>
                                {(config.tip_presets_percent || [10, 15, 20]).map(pct => (
                                    <button
                                        key={pct}
                                        onClick={() => setSelectedTip(pct)}
                                        className={cn(
                                            "flex-1 py-2 rounded-xl text-sm font-bold transition-all border",
                                            selectedTip === pct ? "text-foreground guest-btn-active" : "border-border text-muted-foreground"
                                        )}
                                    >
                                        {pct}%
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <textarea
                        value={guestNotes}
                        onChange={(e) => setGuestNotes(e.target.value)}
                        placeholder="Special notes or allergies..."
                        className="w-full h-20 bg-card border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-white/15 resize-none"
                    />

                    {/* Totals */}
                    <div className="p-4 bg-card/50 border border-border rounded-xl space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Subtotal</span>
                            <span>€{(subtotal / 100).toFixed(2)}</span>
                        </div>
                        {tipAmount > 0 && (
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Tip ({selectedTip}%)</span>
                                <span>€{(tipAmount / 100).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
                            <span>Total</span>
                            <span className="guest-primary-text">€{(total / 100).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Cart / Checkout Button */}
            {view === 'browsing' && cartCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 z-30">
                    <button
                        onClick={() => setView('checkout')}
                        className="w-full py-4 rounded-2xl text-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] guest-primary-bg"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        View Cart ({cartCount}) — €{(subtotal / 100).toFixed(2)}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {view === 'checkout' && cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 z-30">
                    <button
                        onClick={submitOrder}
                        disabled={submitting}
                        className="w-full py-4 rounded-2xl text-foreground font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 guest-primary-bg"
                    >
                        {submitting ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</>
                        ) : (
                            <>Place Order — €{(total / 100).toFixed(2)}</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
