/**
 * POSLayoutExpress — Quick Service / Counter POS Layout
 * 
 * Optimized for cafés, bars, food trucks, and counter-service.
 * 
 * Layout:
 *   LEFT (main area): Category strip TOP + Large product grid BELOW
 *   RIGHT (w-80): Compact order list + QuickPayPanel (always visible)
 * 
 * Express-specific features:
 *   - **No "Send" button** — order auto-sends to kitchen on payment
 *   - Payment always visible (no dialog popup)
 *   - Smart cash amount suggestions
 *   - No coursing, no seat assignment
 *   - Counter number auto-assigned (no table selection needed)
 *   - Speed-optimized: tap item → tap pay → done
 * 
 * This is a PURE UI component — all business logic comes via props from POSMain.js
 */
import {
    LogOut, X, Hash, MapPin, Search,
    UtensilsCrossed, Coffee, Pizza, Wine, Dessert, Plus, Minus
} from "lucide-react";
import { ScrollArea } from "../../../components/ui/scroll-area";
import ModifierDialog from "../../../components/ModifierDialog";
import QuickPayPanel from "../QuickPayPanel";
import { safeNumber, safeArray, safeString } from "../../../lib/safe";

const CATEGORY_ICONS = {
    appetizers: UtensilsCrossed,
    mains: UtensilsCrossed,
    breakfast: Coffee,
    soups: UtensilsCrossed,
    pizza: Pizza,
    drinks: Wine,
    desserts: Dessert,
    default: UtensilsCrossed
};

export default function POSLayoutExpress({
    // Data
    venue,
    user,
    categories,
    menuItems,
    tables,
    activeCategory,
    selectedTable,
    currentOrder,
    orderItems,
    settings,
    sendOptions,
    sendInProgress,
    floorPlan,
    selectedItem,
    // Dialog states
    showTableDialog,
    showPaymentDialog,
    showFloorPlanDialog,
    showModifierDialog,
    // Calculated values
    subtotal,
    tax,
    total,
    searchQuery,
    onSearchChange,
    isKeyboardOpen,
    onSetKeyboardOpen,
    // Actions
    onLoadCategoryItems,
    onSelectTable,
    onAddItemToOrder,
    onConfirmItemWithModifiers,
    onUpdateItemQuantity,
    onRemoveItem,
    onSendOrder,
    onHandlePayment,
    onClearOrder,
    onDeselectTable,
    onSetSendOptions,
    onSetShowTableDialog,
    onSetShowPaymentDialog,
    onSetShowFloorPlanDialog,
    onSetShowModifierDialog,
    onCloseModifierDialog,
    onNavigate,
    // Theme switcher slot
    themeSelector,
}) {
    // --- Helper functions ---
    const getCategoryIcon = (categoryName) => {
        const name = categoryName.toLowerCase();
        for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
            if (name.includes(key)) return Icon;
        }
        return CATEGORY_ICONS.default;
    };

    const getItemStyle = (item) => {
        if (item.image) {
            return {
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.85) 100%), url(${item.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            };
        }
        if (item.color) {
            return { backgroundColor: item.color };
        }
        return {};
    };

    // Express auto-payment: sends order AND processes payment in one step
    const handleExpressPayment = (method) => {
        // Auto-send to kitchen first (if items haven't been sent)
        if (orderItems.length > 0 && !currentOrder) {
            // For Express, we rely on the parent's payment handler
            // which should handle the send+pay flow
            onHandlePayment(method);
        } else {
            onHandlePayment(method);
        }
    };

    return (
        <div className="h-screen flex bg-background overflow-hidden">
            {/* LEFT SIDE — Categories + Products Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar — Venue + Quick Actions */}
                <div className="h-12 bg-card border-b border-border flex items-center justify-between px-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-foreground font-bold text-sm tracking-tight">RESTIN.AI</h1>
                        <span className="text-muted-foreground text-xs">|</span>
                        <span className="text-muted-foreground text-xs">{venue?.name}</span>
                        {selectedTable && (
                            <>
                                <span className="text-muted-foreground text-xs">•</span>
                                <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-0.5 rounded">
                                    {selectedTable.name}
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Search Input */}
                        <div className="relative flex items-center">
                            <Search className="w-3.5 h-3.5 absolute left-2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search menu..."
                                value={searchQuery || ''}
                                readOnly
                                onClick={() => onSetKeyboardOpen?.(true)}
                                className="w-40 h-7 bg-secondary/50 border border-border/50 rounded-md pl-7 pr-7 text-xs text-secondary-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 cursor-pointer"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => onSearchChange?.('')}
                                    className="absolute right-1.5 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-sm text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        {/* Counter / Order Number */}
                        <div className="flex items-center gap-1 bg-secondary rounded-lg px-2 py-1">
                            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-secondary-foreground font-mono text-sm">
                                {currentOrder?.order_number || '—'}
                            </span>
                        </div>
                        {/* Theme Switcher */}
                        <div className="w-24">
                            {themeSelector}
                        </div>
                        {/* Exit */}
                        <button
                            onClick={() => onNavigate("/manager/dashboard")}
                            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-secondary-foreground transition-colors"
                            title="Exit POS"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Quick Table Selector — Compact horizontal strip */}
                <div className="h-9 bg-card/30 border-b border-border/30 flex items-center px-2 gap-1 overflow-x-auto shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <button
                        onClick={() => onDeselectTable?.()}
                        className={`
                            h-6 rounded-md px-2.5 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all
                            ${!selectedTable
                                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                            }
                        `}
                        title="Counter order (no table)"
                    >
                        Counter
                    </button>
                    <div className="w-px h-4 bg-border/50 shrink-0 mx-0.5" />
                    {safeArray(tables).filter(t => t.status !== 'reserved').map((table) => {
                        const isActive = selectedTable?.id === table.id;
                        const isOccupied = table.status === 'occupied';
                        return (
                            <button
                                key={table.id}
                                onClick={() => onSelectTable(table)}
                                className={`
                                    h-6 rounded-md px-2 text-[11px] font-medium whitespace-nowrap shrink-0 transition-all
                                    ${isActive
                                        ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
                                        : isOccupied
                                            ? 'bg-amber-500/10 text-amber-500/70 hover:bg-amber-500/20'
                                            : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                                    }
                                `}
                                title={`${table.name}${isOccupied ? ' (occupied)' : ''}`}
                            >
                                {table.name}
                                {isOccupied && <span className="ml-0.5 text-[9px]">●</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Category Strip — Horizontal, scrollable */}
                <div className="h-14 bg-card/50 border-b border-border flex items-center px-2 gap-1.5 overflow-x-auto shrink-0">
                    {categories.map((cat) => {
                        const Icon = getCategoryIcon(cat.name);
                        const isActive = activeCategory === cat.id;

                        return (
                            <button
                                key={cat.id}
                                onClick={() => onLoadCategoryItems(cat.id)}
                                className={`
                  h-10 rounded-xl flex items-center gap-1.5 px-3 whitespace-nowrap shrink-0
                  transition-all duration-150 text-sm font-medium
                  ${isActive
                                        ? 'bg-white text-zinc-900 shadow-lg shadow-white/10'
                                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                                    }
                `}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-zinc-900' : 'text-muted-foreground'}`} />
                                <span>{cat.name}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Product Grid — Large, touch-optimized */}
                <div className="flex-1 p-3 overflow-auto">
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                        {menuItems.map((item) => {
                            const style = getItemStyle(item);
                            const hasImage = !!item.image;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onAddItemToOrder(item)}
                                    style={style}
                                    className={`
                    min-h-[110px] rounded-xl p-3 flex flex-col justify-between
                    transition-all duration-100 hover:scale-[1.02] active:scale-[0.95]
                    shadow-md hover:shadow-xl relative overflow-hidden
                    ${!item.image && !item.color ? 'bg-secondary border border-border/50 hover:border-zinc-600' : ''}
                  `}
                                >
                                    {hasImage && <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />}
                                    <span className={`z-10 text-sm font-bold leading-tight text-left ${hasImage || item.color ? 'text-foreground' : 'text-secondary-foreground'}`}>
                                        {item.name}
                                    </span>
                                    <span className={`z-10 text-lg font-bold mt-auto self-end ${hasImage || item.color ? 'text-foreground' : 'text-foreground'}`}>
                                        €{safeNumber(item.price, 0).toFixed(2)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE — Compact Order + Payment */}
            <div className="w-80 bg-card border-l border-border/50 flex flex-col">
                {/* Order Header */}
                <div className="p-3 border-b border-border/50 flex items-center justify-between">
                    <div>
                        <h2 className="text-foreground font-bold text-sm">
                            {selectedTable ? selectedTable.name : 'Counter Order'}
                        </h2>
                        <span className="text-muted-foreground text-[10px]">
                            {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'}
                        </span>
                    </div>
                    {orderItems.length > 0 && (
                        <button
                            onClick={onClearOrder}
                            className="text-muted-foreground hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
                            title="Clear Order"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Order Items (compact list) */}
                <ScrollArea className="flex-1">
                    <div className="p-2">
                        {/* Sent Rounds (if any) */}
                        {currentOrder && safeArray(currentOrder.send_rounds).length > 0 && (
                            <div className="mb-2 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                <span className="text-emerald-400 text-[10px] font-bold uppercase">
                                    {currentOrder.send_rounds.length} round(s) sent
                                </span>
                            </div>
                        )}

                        {orderItems.length === 0 ? (
                            <div className="text-center py-8">
                                <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                                <p className="text-muted-foreground text-sm">Tap items to order</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {orderItems.map((item, index) => (
                                    <div
                                        key={index}
                                        className="p-2 rounded-lg bg-secondary/60 hover:bg-secondary transition-colors flex items-center gap-2"
                                    >
                                        {/* Quantity Controls */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            <button
                                                onClick={() => onUpdateItemQuantity(index, -1)}
                                                className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-secondary-foreground"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-foreground font-mono text-xs w-5 text-center font-bold">
                                                {safeNumber(item.quantity, 1)}
                                            </span>
                                            <button
                                                onClick={() => onUpdateItemQuantity(index, 1)}
                                                className="w-6 h-6 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-secondary-foreground"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Item Name */}
                                        <div className="flex-1 min-w-0">
                                            <span className="text-foreground text-xs font-medium truncate block">
                                                {safeString(item.menu_item_name || item.name, "Item")}
                                            </span>
                                            {safeArray(item.modifiers).length > 0 && (
                                                <span className="text-amber-400/70 text-[10px] truncate block">
                                                    +{safeArray(item.modifiers).map(m =>
                                                        typeof m === 'object' ? safeString(m.name) : safeString(m)
                                                    ).filter(Boolean).join(', ')}
                                                </span>
                                            )}
                                        </div>

                                        {/* Price + Remove */}
                                        <span className="text-foreground font-bold text-xs shrink-0">
                                            €{safeNumber(item.total_price || (item.price * item.quantity), 0).toFixed(2)}
                                        </span>
                                        <button
                                            onClick={() => onRemoveItem(index)}
                                            className="text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Quick Pay Panel (always visible at bottom) */}
                <QuickPayPanel
                    total={total}
                    subtotal={subtotal}
                    tax={tax}
                    orderItems={orderItems}
                    onHandlePayment={handleExpressPayment}
                    disabled={orderItems.length === 0}
                />
            </div>

            {/* Modifier Dialog (still needed for item customization) */}
            <ModifierDialog
                item={selectedItem}
                open={showModifierDialog}
                onClose={onCloseModifierDialog}
                onConfirm={onConfirmItemWithModifiers}
            />
        </div>
    );
}
