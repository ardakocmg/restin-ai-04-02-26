'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSafeMode } from "@/context/SafeModeContext";
import { venueAPI, menuAPI, orderAPI } from "@/lib/api";
import api from "@/lib/api";
import { toast } from "sonner";
import { useVenueSettings } from "@/hooks/useVenueSettings";
import { Button } from "@antigravity/ui";
import { Input } from "@antigravity/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@antigravity/ui";
import { Checkbox } from "@antigravity/ui";
import ModifierDialog from "@/components/ModifierDialog";
import {
    LogOut, X, Send, Trash2, Users, Grid3x3,
    UtensilsCrossed, Coffee, Pizza, Wine, Dessert, Plus, Minus, Loader2, Printer, Scan
} from "lucide-react";
import { scannerService } from "@antigravity/utils";

// Helper safety functions
const safeNumber = (val: any, def = 0) => (typeof val === 'number' && !isNaN(val) ? val : def);
const safeArray = (val: any) => (Array.isArray(val) ? val : []);
const safeString = (val: any, def = "") => (typeof val === 'string' ? val : def);

const CATEGORY_ICONS: any = {
    appetizers: UtensilsCrossed,
    mains: UtensilsCrossed,
    breakfast: Coffee,
    soups: UtensilsCrossed,
    pizza: Pizza,
    drinks: Wine,
    desserts: Dessert,
    default: UtensilsCrossed
};

export default function POSMain() {
    const router = useRouter();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const { setSafeMode, setOrderActive, setSendInProgress, sendInProgress } = useSafeMode();
    const sendInFlightRef = useRef(false);

    // Data states
    const [venue, setVenue] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);

    // UI states
    const [activeCategory, setActiveCategory] = useState(null);
    const [selectedTable, setSelectedTable] = useState<any>(null);
    const [currentOrder, setCurrentOrder] = useState<any>(null);
    const [orderItems, setOrderItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTableDialog, setShowTableDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false); // Make sure this is used if needed, or keep for future
    const [showModifierDialog, setShowModifierDialog] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [splitType, setSplitType] = useState<'even' | 'seat'>('even'); // For payment dialog

    // Send options state
    const [sendOptions, setSendOptions] = useState({
        do_print: true,
        do_kds: true,
        do_stock: false
    });

    // Mock Venue ID for dev
    const venueId = 'venue_123';
    const { settings, loading: settingsLoading } = useVenueSettings(venueId);

    useEffect(() => {
        // Initial load
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            const [venueRes, tablesRes] = await Promise.all([
                venueAPI.get(venueId),
                venueAPI.getTables(venueId),
            ]);

            setVenue(venueRes.data);
            setTables(tablesRes.data || []);

            await loadMenuData();
        } catch (error) {
            console.error("[POS] Failed to load data:", error);
            toast.error("Failed to load POS data.");
        } finally {
            setLoading(false);
        }
    };

    const loadMenuData = async () => {
        try {
            const categoriesRes = await menuAPI.getCategories(venueId);
            setCategories(categoriesRes.data || []);

            if (categoriesRes.data && categoriesRes.data.length > 0) {
                const firstCat = categoriesRes.data[0];
                setActiveCategory(firstCat.id);

                const itemsRes = await menuAPI.getItems(venueId, firstCat.id);
                setMenuItems(itemsRes.data || []);
            }
        } catch (error) {
            console.error("[POS] Failed to load menu:", error);
        }
    };

    const loadCategoryItems = async (categoryId: any) => {
        setActiveCategory(categoryId);
        try {
            const response = await menuAPI.getItems(venueId, categoryId);
            setMenuItems(response.data);
        } catch (error) {
            toast.error("Failed to load items");
        }
    };

    const selectTable = async (table: any) => {
        try {
            setSelectedTable(table);
            setOrderActive(true);

            if (table.current_order_id) {
                // Mock loading existing order
                const response = await orderAPI.get(table.current_order_id);
                setCurrentOrder(response.data);
                setOrderItems(response.data.items || []);
                toast.info(`Loaded order for ${table.name}`);
            } else {
                setCurrentOrder(null);
                setOrderItems([]);
                toast.info(`New order for ${table.name}`);
            }
        } catch (error) {
            toast.error("Failed to load order");
        } finally {
            setShowTableDialog(false);
        }
    };

    const addItemToOrder = async (item: any) => {
        if (!selectedTable) {
            setShowTableDialog(true);
            return;
        }
        setSelectedItem(item);
        setShowModifierDialog(true);
    };

    const confirmItemWithModifiers = (itemWithModifiers: any) => {
        setOrderItems([...orderItems, {
            item_id: itemWithModifiers.id,
            name: itemWithModifiers.name,
            price: itemWithModifiers.price,
            quantity: 1,
            total_price: itemWithModifiers.price,
            modifiers: []
        }]);
        setShowModifierDialog(false);
        toast.success(`Added ${itemWithModifiers.name}`);
    };

    const updateItemQuantity = (index: number, delta: number) => {
        const updated = [...orderItems];
        updated[index].quantity += delta;

        if (updated[index].quantity <= 0) {
            updated.splice(index, 1);
        } else {
            updated[index].total_price = updated[index].quantity * updated[index].price;
        }
        setOrderItems(updated);
    };

    const calculateTotal = () => {
        const subtotal = orderItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
        const tax = subtotal * 0.18;
        return { subtotal, tax, total: subtotal + tax };
    };

    const sendOrder = async () => {
        if (!selectedTable || orderItems.length === 0) return;
        setSendInProgress(true);
        setTimeout(() => {
            setSendInProgress(false);
            setOrderItems([]);
            toast.success("Order sent to kitchen!");
        }, 1000); // Simulate network
    };

    const handleScan = async () => {
        toast.info("Starting Scanner...");
        const result = await scannerService.scan();
        if (result.hasContent) {
            toast.success(`Scanned: ${result.content}`);
            // Logic to find product by SKU would go here
        }
    };

    const getCategoryIcon = (categoryName: string) => {
        const name = categoryName.toLowerCase();
        for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
            if (name.includes(key)) return Icon;
        }
        return CATEGORY_ICONS.default;
    };

    if (loading) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-white">Loading POS...</div>;

    const { subtotal, tax, total } = calculateTotal();

    return (
        <div className="h-[calc(100vh-64px)] flex bg-zinc-950 overflow-hidden">
            {/* LEFT COLUMN - Categories */}
            <div className="w-48 bg-zinc-900 border-r border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <h1 className="text-white font-bold text-lg">RESTIN.AI</h1>
                    <p className="text-zinc-500 text-xs mt-1">POS Terminal</p>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-1">
                    {categories.map((cat) => {
                        const Icon = getCategoryIcon(cat.name);
                        return (
                            <button
                                key={cat.id}
                                onClick={() => loadCategoryItems(cat.id)}
                                className={`w-full p-3 rounded-lg flex flex-col items-center gap-2 transition-all ${activeCategory === cat.id ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                            >
                                <Icon className="w-6 h-6" />
                                <span className="text-xs font-medium text-center">{cat.name}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="p-2 border-t border-white/10 space-y-1">
                    <Button onClick={() => setShowTableDialog(true)} variant="secondary" className="w-full justify-start"><Grid3x3 className="w-4 h-4 mr-2" /> Tables</Button>
                    <Button onClick={() => router.push('/dashboard')} variant="destructive" className="w-full justify-start"><LogOut className="w-4 h-4 mr-2" /> Exit</Button>
                </div>
            </div>

            {/* CENTER COLUMN - Menu Items */}
            <div className="flex-1 bg-zinc-950 p-4 overflow-auto flex flex-col">
                {/* Header with Scan Button */}
                <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 mb-4">
                    <div className="flex items-center gap-4">
                        <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            POS TERMINAL
                        </h1>
                        <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800 hidden md:block">Use scanner for products</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleScan} className="border-cyan-500/50 text-cyan-500 hover:bg-cyan-500/10 hidden md:flex">
                            <Scan className="w-4 h-4 mr-2" /> Scan Item
                        </Button>
                        <div className="h-4 w-[1px] bg-zinc-800 mx-2" />
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span>Online</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => addItemToOrder(item)}
                            className="aspect-square bg-gradient-to-br from-purple-900/50 to-purple-800/50 hover:from-purple-600 hover:to-purple-700 border border-purple-500/20 rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-lg hover:scale-105 transition-all"
                        >
                            <span className="text-white font-bold text-center leading-tight">{item.name}</span>
                            <span className="text-lg font-black text-purple-200 mt-auto">€{safeNumber(item.price).toFixed(2)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* RIGHT COLUMN - Order */}
            <div className="w-96 bg-zinc-900 border-l border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-white font-bold text-xl">{selectedTable ? selectedTable.name : "No Table"}</h2>
                    {selectedTable && <Button size="sm" variant="ghost" onClick={() => setSelectedTable(null)}><X className="w-4 h-4" /></Button>}
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-2">
                    {orderItems.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Start an order</p>
                        </div>
                    ) : (
                        orderItems.map((item, index) => (
                            <div key={index} className="p-3 bg-zinc-800 rounded-lg flex justify-between items-start">
                                <div>
                                    <span className="text-white font-medium block">{item.name}</span>
                                    <span className="text-sm text-zinc-400">€{safeNumber(item.price).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateItemQuantity(index, -1)} className="p-1 bg-zinc-700 rounded text-white"><Minus className="w-3 h-3" /></button>
                                    <span className="text-white font-mono w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => updateItemQuantity(index, 1)} className="p-1 bg-zinc-700 rounded text-white"><Plus className="w-3 h-3" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-zinc-950 border-t border-white/10 space-y-3">
                    <div className="flex justify-between text-zinc-400">
                        <span>Subtotal</span>
                        <span>€{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                        <span>Tax (18%)</span>
                        <span>€{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold text-xl pt-2 border-t border-white/10">
                        <span>Total</span>
                        <span>€{total.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white font-bold h-12"
                            disabled={!selectedTable || orderItems.length === 0 || sendInProgress}
                            onClick={sendOrder}
                        >
                            {sendInProgress ? <Loader2 className="animate-spin w-5 h-5" /> : `SEND ORDER`}
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12"
                            disabled={!selectedTable || orderItems.length === 0}
                            onClick={() => setShowPaymentDialog(true)}
                        >
                            PAY / SPLIT
                        </Button>
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-4xl h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>Select Table</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-4 gap-4 p-4 overflow-auto">
                        {tables.map(table => (
                            <button
                                key={table.id}
                                onClick={() => selectTable(table)}
                                className={`p-6 rounded-xl border flex flex-col items-center gap-2 transition-all ${table.status === 'OCCUPIED' ? 'bg-red-900/20 border-red-500/50 text-red-200' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}
                            >
                                <span className="font-bold text-xl">{table.name}</span>
                                <span className="text-xs uppercase">{table.status}</span>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Payment & Splitting</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => setSplitType('even')}
                                className={`p-4 rounded-lg border cursor-pointer flex flex-col items-center gap-2 ${splitType === 'even' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                            >
                                <Users className="w-6 h-6" />
                                <span className="font-bold">Split Evenly</span>
                            </div>
                            <div
                                onClick={() => setSplitType('seat')}
                                className={`p-4 rounded-lg border cursor-pointer flex flex-col items-center gap-2 ${splitType === 'seat' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                            >
                                <Grid3x3 className="w-6 h-6" />
                                <span className="font-bold">Split by Seat</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {['CASH', 'CARD', 'ROOM'].map(method => (
                                <Button key={method} variant="outline" className="h-12 border-zinc-700 hover:bg-zinc-800">
                                    {method}
                                </Button>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {selectedItem && (
                <ModifierDialog
                    open={showModifierDialog}
                    onOpenChange={setShowModifierDialog}
                    item={selectedItem}
                    onConfirm={confirmItemWithModifiers}
                />
            )}
        </div>
    );
}
