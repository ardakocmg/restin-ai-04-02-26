/**
 * POSLayoutPro — iPad Full-Service POS Layout
 * 
 * Optimized for full-service restaurants using iPad (landscape).
 * 
 * Layout: 
 *   LEFT (w-80): Dark order panel with course grouping, seat assignment
 *   CENTER (flex, split): Categories (vertical tabs) + Items grid
 *   BOTTOM: Sticky action bar — Send | Fire | Pay | Table | More
 * 
 * Pro-specific features:
 *   - Course selector per item (C1-C4+)
 *   - Seat assignment per item (S1-SN)
 *   - "Fire Course" button
 *   - Items grouped by course in order panel
 *   - Larger touch targets (min 44px) for iPad
 *   - Course color coding (blue, green, orange, purple)
 *   - Status badges on order items
 * 
 * This is a PURE UI component — all business logic comes via props from POSMain.js
 */
import { useState } from "react";
import {
    LogOut, X, Send, Trash2, Users, Grid3x3, ChevronRight,
    UtensilsCrossed, Coffee, Pizza, Wine, Dessert, Plus, Minus,
    Loader2, Printer, Flame, CreditCard, MoreHorizontal, Receipt, Search
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Checkbox } from "../../../components/ui/checkbox";
import { ScrollArea } from "../../../components/ui/scroll-area";
import ModifierDialog from "../../../components/ModifierDialog";
import CourseSelector, { COURSE_COLORS } from "../CourseSelector";
import SeatSelector from "../SeatSelector";
import { safeNumber, safeArray, safeString } from "../../../lib/safe";
import type { POSLayoutProps, CategoryIconMap, POSMenuItem, POSOrderItem, ItemStyle } from './types';

const CATEGORY_ICONS: CategoryIconMap = {
    appetizers: UtensilsCrossed,
    mains: UtensilsCrossed,
    breakfast: Coffee,
    soups: UtensilsCrossed,
    pizza: Pizza,
    drinks: Wine,
    desserts: Dessert,
    default: UtensilsCrossed
};

export default function POSLayoutPro({
    venue, user, categories, menuItems, tables, activeCategory, selectedTable,
    currentOrder, orderItems, settings, sendOptions, sendInProgress, floorPlan, selectedItem,
    showTableDialog, showPaymentDialog, showFloorPlanDialog, showModifierDialog,
    subtotal, tax, total, searchQuery, onSearchChange, isKeyboardOpen, onSetKeyboardOpen,
    onLoadCategoryItems, onSelectTable, onAddItemToOrder, onConfirmItemWithModifiers,
    onUpdateItemQuantity, onRemoveItem, onSendOrder, onHandlePayment, onClearOrder,
    onDeselectTable, onSetSendOptions, onSetShowTableDialog, onSetShowPaymentDialog,
    onSetShowFloorPlanDialog, onSetShowModifierDialog, onCloseModifierDialog, onNavigate,
    themeSelector,
}: POSLayoutProps) {
    // --- Pro-specific local state ---
    const [activeCourse, setActiveCourse] = useState(1);
    const [activeSeat, setActiveSeat] = useState(1);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    // --- Helper functions ---
    const getCategoryIcon = (categoryName: string) => {
        const name = categoryName.toLowerCase();
        for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
            if (name.includes(key)) return Icon;
        }
        return CATEGORY_ICONS.default;
    };

    const getItemStyle = (item: POSMenuItem): ItemStyle => {
        if (item.image) {
            return {
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%), url(${item.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            };
        }
        if (item.color) {
            return { backgroundColor: item.color };
        }
        return {};
    };

    // Group order items by course
    const groupedByCourse = orderItems.reduce<Record<number, (POSOrderItem & { _originalIndex: number })[]>>((acc, item, idx) => {
        const course = item.course || 1;
        if (!acc[course]) acc[course] = [];
        acc[course].push({ ...item, _originalIndex: idx });
        return acc;
    }, {});

    const courseKeys = Object.keys(groupedByCourse).map(Number).sort((a, b) => a - b);

    // Add item with pro-specific course & seat
    const handleAddItem = (item: POSMenuItem) => {
        onAddItemToOrder({
            ...item,
            _proCourse: activeCourse,
            _proSeat: activeSeat,
        });
    };

    const getCourseColor = (course: number) => {
        return COURSE_COLORS[course] || COURSE_COLORS[4];
    };

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden">
            {/* MAIN AREA — 3 columns */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT COLUMN — Dark Order Panel */}
                <div className="w-80 bg-card border-r border-border/50 flex flex-col">
                    {/* Header */}
                    <div className="p-3 border-b border-border/50 flex items-center justify-between">
                        <div>
                            <h1 className="text-foreground font-bold text-base tracking-tight">RESTIN.AI</h1>
                            <p className="text-muted-foreground text-[11px]">{venue?.name} • {user?.name}</p>
                        </div>
                        {selectedTable && (
                            <div className="flex items-center gap-2">
                                <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg px-3 py-1.5">
                                    <span className="text-blue-400 font-bold text-sm">{selectedTable.name}</span>
                                    <div className="flex items-center gap-1 text-[10px] text-blue-300">
                                        <Users className="w-3 h-3" />
                                        <span>{selectedTable.seats}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={onDeselectTable}
                                    className="text-muted-foreground hover:text-secondary-foreground transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Course/Seat Selectors */}
                    <div className="p-3 border-b border-border/50 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Course</span>
                            <CourseSelector value={activeCourse} onChange={setActiveCourse} />
                        </div>
                        {selectedTable && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground text-[11px] uppercase tracking-wider font-medium">Seat</span>
                                <SeatSelector
                                    value={activeSeat}
                                    onChange={setActiveSeat}
                                    maxSeats={selectedTable.seats || 4}
                                />
                            </div>
                        )}
                    </div>

                    {/* Order Items — Grouped by Course */}
                    <ScrollArea className="flex-1">
                        <div className="p-3">
                            {/* Sent Rounds */}
                            {currentOrder && safeArray(currentOrder.send_rounds).length > 0 && (
                                <div className="mb-3 space-y-1.5">
                                    <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">Sent</p>
                                    {currentOrder.send_rounds.map((round, roundIdx) => (
                                        <div key={roundIdx} className="border-l-2 border-emerald-500 pl-2 py-1 bg-emerald-500/5 rounded-r">
                                            <div className="flex items-center justify-between">
                                                <span className="text-emerald-400 text-xs font-bold">R{round.round_no}</span>
                                                <span className="text-muted-foreground text-[10px]">
                                                    {new Date(round.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="border-t border-border/50 mt-2 pt-2" />
                                </div>
                            )}

                            {/* Current Items by Course */}
                            {courseKeys.length === 0 ? (
                                <div className="text-center py-8">
                                    <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
                                    <p className="text-muted-foreground text-sm">No items yet</p>
                                    <p className="text-muted-foreground text-xs mt-1">Tap items to build order</p>
                                </div>
                            ) : (
                                courseKeys.map((courseNum) => {
                                    const courseColor = getCourseColor(courseNum);
                                    const items = groupedByCourse[courseNum];

                                    return (
                                        <div key={courseNum} className="mb-3">
                                            {/* Course Header */}
                                            <div className={`flex items-center gap-2 mb-1.5 px-1`}>
                                                <div className={`w-1.5 h-4 rounded-full ${courseColor.activeBg}`} />
                                                <span className={`text-[11px] font-bold uppercase tracking-wider ${courseColor.text}`}>
                                                    Course {courseNum}
                                                </span>
                                                <span className="text-muted-foreground text-[10px]">
                                                    ({items.length} {items.length === 1 ? 'item' : 'items'})
                                                </span>
                                            </div>

                                            {/* Items */}
                                            <div className="space-y-1">
                                                {items.map((item) => (
                                                    <div
                                                        key={item._originalIndex}
                                                        className={`p-2 rounded-lg bg-secondary/80 hover:bg-secondary transition-colors border-l-2 ${courseColor.border}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-foreground text-sm font-medium truncate">
                                                                        {safeString(item.menu_item_name || item.name, "Item")}
                                                                    </span>
                                                                    {item.seat && item.seat > 0 && (
                                                                        <span className="text-[9px] bg-zinc-700 text-secondary-foreground px-1.5 py-0.5 rounded font-mono">
                                                                            S{item.seat}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {safeArray(item.modifiers).length > 0 && (
                                                                    <div className="mt-0.5">
                                                                        {safeArray(item.modifiers).map((mod, i) => {
                                                                            const modName = typeof mod === 'object' ? safeString(mod.name) : safeString(mod);
                                                                            return modName ? (
                                                                                <span key={i} className="text-amber-400/80 text-[10px] mr-2">
                                                                                    +{modName}
                                                                                </span>
                                                                            ) : null;
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => onRemoveItem(item._originalIndex)}
                                                                className="text-muted-foreground hover:text-red-400 transition-colors p-0.5 shrink-0"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        <div className="flex items-center justify-between mt-1.5">
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => onUpdateItemQuantity(item._originalIndex, -1)}
                                                                    className="w-7 h-7 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-secondary-foreground"
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <span className="text-foreground font-mono text-sm w-6 text-center">
                                                                    {safeNumber(item.quantity, 1)}
                                                                </span>
                                                                <button
                                                                    onClick={() => onUpdateItemQuantity(item._originalIndex, 1)}
                                                                    className="w-7 h-7 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-secondary-foreground"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            <span className="text-foreground font-bold text-sm">
                                                                €{safeNumber(item.total_price || (item.price * item.quantity), 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>

                    {/* Totals */}
                    <div className="p-3 border-t border-border/50 bg-card/80 backdrop-blur">
                        <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
                            <span>Subtotal</span>
                            <span>€{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                            <span>Tax (18%)</span>
                            <span>€{tax.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-foreground text-lg font-bold">
                            <span>Total</span>
                            <span>€{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* CENTER AREA — Categories + Items */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Category Column (vertical tabs, touch-friendly) */}
                    <div className="w-24 bg-card/50 border-r border-border flex flex-col">
                        <ScrollArea className="flex-1">
                            <div className="p-1.5 space-y-1">
                                {categories.map((cat) => {
                                    const Icon = getCategoryIcon(cat.name);
                                    const isActive = activeCategory === cat.id;

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => onLoadCategoryItems(cat.id)}
                                            className={`
                        w-full min-h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 p-1.5
                        transition-all duration-200 border-2
                        ${isActive
                                                    ? 'bg-white text-foreground border-white shadow-lg shadow-white/10'
                                                    : 'bg-transparent text-muted-foreground border-transparent hover:bg-secondary hover:text-secondary-foreground'
                                                }
                      `}
                                        >
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-zinc-900' : 'text-muted-foreground'}`} />
                                            <span className="text-[10px] font-bold text-center leading-tight px-0.5 line-clamp-2">
                                                {cat.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>

                        {/* Bottom controls */}
                        <div className="p-1.5 border-t border-border space-y-1">
                            {themeSelector}
                        </div>
                    </div>

                    {/* Items Grid */}
                    <div className="flex-1 bg-background p-3 overflow-auto">
                        {/* Active category breadcrumb & Search */}
                        <div className="flex items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider whitespace-nowrap">
                                    {categories.find(c => c.id === activeCategory)?.name || 'Menu'}
                                </span>
                                <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-secondary-foreground text-xs font-medium whitespace-nowrap">
                                    {menuItems.length} items
                                </span>
                            </div>

                            {/* Search Input */}
                            <div className="relative flex-1 max-w-sm">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search menu..."
                                    value={searchQuery || ''}
                                    readOnly
                                    onClick={() => onSetKeyboardOpen?.(true)}
                                    className="w-full h-9 bg-secondary border border-border/50 rounded-lg pl-9 pr-8 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 cursor-pointer"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => onSearchChange?.('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-sm text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                            {menuItems.map((item) => {
                                const style = getItemStyle(item);
                                const hasImage = !!item.image;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleAddItem(item)}
                                        style={style}
                                        className={`
                      min-h-[100px] rounded-xl p-3 flex flex-col justify-between
                      transition-all duration-150 hover:scale-[1.02] active:scale-[0.97]
                      shadow-md hover:shadow-xl relative overflow-hidden
                      ${!item.image && !item.color ? 'bg-secondary border border-border hover:border-zinc-500' : ''}
                    `}
                                    >
                                        {hasImage && <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />}
                                        <span className={`z-10 text-sm font-bold leading-tight text-left ${hasImage || item.color ? 'text-foreground' : 'text-secondary-foreground'}`}>
                                            {item.name}
                                        </span>
                                        <div className="z-10 flex items-end justify-between w-full mt-2">
                                            <span className={`text-lg font-bold ${hasImage || item.color ? 'text-foreground' : 'text-foreground'}`}>
                                                €{safeNumber(item.price, 0).toFixed(2)}
                                            </span>
                                            <Plus className={`w-5 h-5 ${hasImage || item.color ? 'text-foreground/60' : 'text-muted-foreground'}`} />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTTOM ACTION BAR — iPad-optimized */}
            <div className="h-16 bg-card border-t border-border/50 flex items-center px-3 gap-2 shrink-0">
                {/* Send Options (compact) */}
                <div className="flex items-center gap-3 mr-2 border-r border-border pr-3">
                    {settings?.pos?.send_checkbox_print !== false && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox
                                checked={sendOptions.do_print}
                                onCheckedChange={(checked) => onSetSendOptions(prev => ({ ...prev, do_print: !!checked }))}
                                className="border-zinc-600 data-[state=checked]:bg-white data-[state=checked]:border-white"
                            />
                            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                        </label>
                    )}
                    {settings?.pos?.send_checkbox_kds !== false && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <Checkbox
                                checked={sendOptions.do_kds}
                                onCheckedChange={(checked) => onSetSendOptions(prev => ({ ...prev, do_kds: !!checked }))}
                                className="border-zinc-600 data-[state=checked]:bg-white data-[state=checked]:border-white"
                            />
                            <UtensilsCrossed className="w-3.5 h-3.5 text-muted-foreground" />
                        </label>
                    )}
                </div>

                {/* Send Button */}
                <Button
                    onClick={onSendOrder}
                    disabled={orderItems.length === 0 || !selectedTable || sendInProgress}
                    className="h-11 px-6 bg-blue-600 hover:bg-blue-500 text-foreground font-bold text-sm gap-2 rounded-xl"
                >
                    {sendInProgress ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    ) : (
                        <><Send className="w-4 h-4" /> Send</>
                    )}
                </Button>

                {/* Fire Course Button */}
                <Button
                    onClick={onSendOrder}
                    disabled={orderItems.length === 0 || !selectedTable}
                    variant="outline"
                    className="h-11 px-4 border-orange-500/50 text-orange-400 hover:bg-orange-500/10 font-bold text-sm gap-2 rounded-xl"
                >
                    <Flame className="w-4 h-4" />
                    Fire C{activeCourse}
                </Button>

                <div className="flex-1" />

                {/* Table */}
                <Button
                    onClick={() => onSetShowTableDialog(true)}
                    variant="outline"
                    className="h-11 px-4 border-zinc-600 text-secondary-foreground hover:bg-secondary text-sm gap-2 rounded-xl"
                >
                    <Grid3x3 className="w-4 h-4" />
                    {selectedTable ? selectedTable.name : 'Table'}
                </Button>

                {/* Floor Plan */}
                <Button
                    onClick={() => onSetShowFloorPlanDialog(true)}
                    variant="outline"
                    className="h-11 px-4 border-zinc-600 text-secondary-foreground hover:bg-secondary text-sm gap-2 rounded-xl"
                >
                    <Receipt className="w-4 h-4" />
                    Floor
                </Button>

                {/* Pay */}
                <Button
                    onClick={() => onSetShowPaymentDialog(true)}
                    disabled={!currentOrder || orderItems.length === 0}
                    className="h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold text-sm gap-2 rounded-xl"
                >
                    <CreditCard className="w-4 h-4" />
                    Pay €{total.toFixed(2)}
                </Button>

                {/* More Menu */}
                <div className="relative">
                    <Button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        variant="outline"
                        className="h-11 w-11 p-0 border-zinc-600 text-secondary-foreground hover:bg-secondary rounded-xl"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </Button>
                    {showMoreMenu && (
                        <div className="absolute bottom-14 right-0 bg-secondary border border-border rounded-xl shadow-2xl min-w-[180px] z-50">
                            <button
                                onClick={() => { onClearOrder(); setShowMoreMenu(false); }}
                                className="w-full p-3 flex items-center gap-3 text-sm text-red-400 hover:bg-secondary/80 rounded-t-xl transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear Order
                            </button>
                            <button
                                onClick={() => { onNavigate("/manager/dashboard"); setShowMoreMenu(false); }}
                                className="w-full p-3 flex items-center gap-3 text-sm text-secondary-foreground hover:bg-secondary/80 rounded-b-xl transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Exit POS
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== DIALOGS ===== */}

            {/* Table Selection Dialog */}
            <Dialog open={showTableDialog} onOpenChange={onSetShowTableDialog}>
                <DialogContent className="bg-card border-border max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Select Table</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-4 gap-3 p-4">
                        {tables.map((table) => (
                            <button
                                key={table.id}
                                onClick={() => onSelectTable(table)}
                                className={`
                  p-4 rounded-xl border-2 transition-all min-h-20
                  ${table.status === 'occupied'
                                        ? 'bg-red-500/10 border-red-500/50 text-red-400'
                                        : 'bg-secondary border-border text-foreground hover:border-blue-500 hover:bg-blue-500/10'
                                    }
                `}
                            >
                                <div className="text-lg font-bold">{table.name}</div>
                                <div className="text-xs mt-1 capitalize opacity-70">{table.status}</div>
                                <div className="text-xs">{table.seats} seats</div>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={onSetShowPaymentDialog}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Process Payment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 p-4">
                        <div className="text-center py-4">
                            <p className="text-muted-foreground mb-2">Total Amount</p>
                            <p className="text-4xl font-bold text-foreground">€{total.toFixed(2)}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <Button
                                onClick={() => onHandlePayment('cash')}
                                className="h-16 bg-emerald-600 hover:bg-emerald-500 text-lg text-foreground font-bold rounded-xl"
                            >
                                Cash
                            </Button>
                            <Button
                                onClick={() => onHandlePayment('card')}
                                className="h-16 bg-blue-600 hover:bg-blue-500 text-lg text-foreground font-bold rounded-xl"
                            >
                                Card
                            </Button>
                            <Button
                                onClick={() => onHandlePayment('split')}
                                className="h-16 bg-purple-600 hover:bg-purple-500 text-lg text-foreground font-bold rounded-xl"
                            >
                                <div className="flex flex-col items-center">
                                    <span>Split</span>
                                    <span className="text-xs opacity-70">(Beta)</span>
                                </div>
                            </Button>
                        </div>

                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
                            {[total, 50, 100, 200].map((amount, i) => (
                                <button
                                    key={i}
                                    onClick={() => onHandlePayment('cash')}
                                    className="p-3 bg-secondary hover:bg-secondary/80 rounded-xl text-foreground font-mono text-sm"
                                >
                                    €{amount.toFixed(2)}
                                </button>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Floor Plan Dialog */}
            <Dialog open={showFloorPlanDialog} onOpenChange={onSetShowFloorPlanDialog}>
                <DialogContent className="bg-card border-border max-w-6xl">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Floor Plan — Select Table</DialogTitle>
                    </DialogHeader>
                    {floorPlan ? (
                        <div className="p-4">
                            <div className="mb-4 flex gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-emerald-500 rounded" />
                                    <span className="text-sm text-muted-foreground">Available</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 rounded" />
                                    <span className="text-sm text-muted-foreground">Occupied</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-amber-500 rounded" />
                                    <span className="text-sm text-muted-foreground">Reserved</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-6 gap-3">
                                {tables.map((table) => {
                                    const color = table.status === 'available'
                                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                                        : table.status === 'reserved'
                                            ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                                            : 'bg-red-500/15 border-red-500/50 text-red-400';

                                    return (
                                        <button
                                            key={table.id}
                                            onClick={() => {
                                                onSelectTable(table);
                                                onSetShowFloorPlanDialog(false);
                                            }}
                                            className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${color}`}
                                            disabled={table.status === 'occupied' && table.id !== selectedTable?.id}
                                        >
                                            <div className="font-bold text-lg">{table.name}</div>
                                            <div className="text-xs mt-1 opacity-70">{table.seats} seats</div>
                                            <div className="text-xs capitalize mt-1 opacity-70">{table.status}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            <p>No active floor plan configured</p>
                            <p className="text-sm mt-2 text-muted-foreground">Create and activate a floor plan in Admin</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modifier Dialog */}
            <ModifierDialog
                item={selectedItem}
                open={showModifierDialog}
                onClose={onCloseModifierDialog}
                onConfirm={onConfirmItemWithModifiers}
            />
        </div>
    );
}
