/**
 * POSLayoutRestin — Classic Restin.AI POS Layout
 * 
 * Extracted from POSMain.js — exact same 3-column layout:
 *   LEFT (w-48): Categories sidebar with icons/images
 *   CENTER (flex-1): Menu items grid
 *   RIGHT (w-96): Order summary, totals, actions
 * 
 * Plus 4 dialogs: Table Selection, Payment, Floor Plan, Modifier
 * 
 * This is a PURE UI component — all business logic comes via props from POSMain.js
 */
import {
    LogOut, X, Send, Trash2, Users, Grid3x3,
    UtensilsCrossed, Coffee, Pizza, Wine, Dessert, Plus, Minus, Loader2, Printer, Search
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Checkbox } from "../../../components/ui/checkbox";
import { ScrollArea } from "../../../components/ui/scroll-area";
import ModifierDialog from "../../../components/ModifierDialog";
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

export default function POSLayoutRestin({
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
    // --- Helper functions (pure UI) ---
    const getCategoryIcon = (categoryName) => {
        const name = categoryName.toLowerCase();
        for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
            if (name.includes(key)) return Icon;
        }
        return CATEGORY_ICONS.default;
    };

    const getCategoryStyle = (cat) => {
        if (cat.image) {
            return {
                backgroundImage: `url(${cat.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            };
        }
        if (cat.color) {
            return { backgroundColor: cat.color };
        }
        return {};
    };

    const getItemStyle = (item) => {
        if (item.image) {
            return {
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.8) 100%), url(${item.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            };
        }
        if (item.color) {
            return { backgroundColor: item.color };
        }
        return {};
    };

    return (
        <div className="h-screen flex bg-background overflow-hidden">
            {/* LEFT COLUMN - Categories */}
            <div className="w-48 bg-card border-r border-border flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-border">
                    <h1 className="text-foreground font-heading font-bold text-lg">RESTIN.AI</h1>
                    <p className="text-muted-foreground text-xs">{venue?.name}</p>
                    <p className="text-muted-foreground text-xs mt-1">{user?.name}</p>
                </div>

                {/* Categories */}
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-2">
                        {categories.map((cat) => {
                            const Icon = getCategoryIcon(cat.name);
                            const isActive = activeCategory === cat.id;
                            const style = getCategoryStyle(cat);
                            const hasImage = !!cat.image;

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => onLoadCategoryItems(cat.id)}
                                    style={style}
                                    className={`
                    w-full h-20 rounded-lg flex flex-col items-center justify-center gap-1 relative overflow-hidden group
                    transition-all duration-200 border-2
                    ${isActive
                                            ? 'border-foreground ring-2 ring-foreground/20'
                                            : 'border-transparent hover:border-border'}
                    ${!cat.image && !cat.color && (isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
                  `}
                                >
                                    {hasImage && <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />}
                                    {!hasImage && <Icon className={`w-6 h-6 z-10 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />}
                                    <span className={`text-xs font-bold text-center leading-tight z-10 px-2 ${hasImage || isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {cat.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>

                {/* Bottom Actions */}
                <div className="p-2 border-t border-border space-y-1">
                    {/* Theme Selector (injected from POSMain) */}
                    {themeSelector}

                    <button
                        onClick={() => onSetShowFloorPlanDialog(true)}
                        className="w-full p-3 rounded-lg bg-muted hover:bg-accent text-foreground flex items-center justify-center gap-2 transition-colors"
                    >
                        <Grid3x3 className="w-5 h-5" />
                        <span className="text-sm">Floor Plan</span>
                    </button>
                    <button
                        onClick={() => onSetShowTableDialog(true)}
                        className="w-full p-3 rounded-lg bg-muted hover:bg-accent text-foreground flex items-center justify-center gap-2 transition-colors"
                    >
                        <Grid3x3 className="w-5 h-5" />
                        <span className="text-sm">Tables</span>
                    </button>
                    <button
                        onClick={() => onNavigate("/manager/dashboard")}
                        className="w-full p-3 rounded-lg bg-muted hover:bg-accent text-foreground flex items-center justify-center gap-2 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm">Exit</span>
                    </button>
                </div>
            </div>

            {/* CENTER COLUMN - Menu Items Grid */}
            <div className="flex-1 bg-background flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border shrink-0 flex items-center bg-card/50">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Arama..."
                            value={searchQuery || ''}
                            readOnly
                            onClick={() => onSetKeyboardOpen?.(true)}
                            className="w-full h-10 bg-secondary/80 border border-border/50 rounded-xl pl-10 pr-10 text-sm text-secondary-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow cursor-pointer"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange?.('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-sm hover:bg-muted"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                    <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {menuItems.map((item) => {
                            const style = getItemStyle(item);
                            const hasImage = !!item.image;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onAddItemToOrder(item)}
                                    style={style}
                                    className={`
                    aspect-square rounded-xl p-4 flex flex-col justify-between
                    transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                    shadow-lg hover:shadow-xl relative overflow-hidden group
                    ${!item.image && !item.color ? 'bg-card border border-border hover:border-primary/50' : ''}
                `}
                                >
                                    {hasImage && <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />}
                                    <div className="z-10 w-full flex justify-between items-start">
                                        <span className={`text-sm font-bold leading-tight text-left ${hasImage || item.color ? 'text-foreground' : 'text-foreground'}`}>
                                            {item.name}
                                        </span>
                                    </div>
                                    <span className={`z-10 text-[10px] font-mono self-start opacity-60 ${hasImage || item.color ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {item.id.substring(0, 4)}
                                    </span>
                                    <div className="z-10 mt-auto flex items-end justify-end w-full">
                                        <span className={`text-lg font-bold ${hasImage || item.color ? 'text-foreground' : 'text-foreground'}`}>
                                            €{safeNumber(item.price, 0).toFixed(2)}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN - Order Summary */}
            <div className="w-96 bg-card border-l border-border flex flex-col">
                {/* Table Info */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-foreground font-heading font-bold text-xl">
                            {selectedTable ? selectedTable.name : "No Table"}
                        </h2>
                        {selectedTable && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onDeselectTable}
                                className="text-muted-foreground hover:text-foreground hover:bg-accent"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    {selectedTable && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span>{selectedTable.seats} seats</span>
                            <span className="mx-1">•</span>
                            <span className="capitalize">{selectedTable.status}</span>
                        </div>
                    )}
                </div>

                {/* Order Items */}
                <ScrollArea className="flex-1 p-4">
                    {currentOrder && safeArray(currentOrder.send_rounds).length > 0 && (
                        <div className="mb-4 space-y-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Sent Items</p>
                            {currentOrder.send_rounds.map((round, roundIdx) => (
                                <div key={roundIdx} className="border-l-4 border-success pl-3 py-2 bg-muted/50 rounded">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-bold text-success">Round {round.round_no}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(round.sent_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex gap-2">
                                        {round.do_print && <span>📄 Printed</span>}
                                        {round.do_kds && <span>🔪 KDS</span>}
                                        {round.do_stock && <span>📦 Stock</span>}
                                    </div>
                                </div>
                            ))}
                            <div className="border-t border-border my-3"></div>
                        </div>
                    )}

                    {orderItems.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No items yet</p>
                            <p className="text-xs mt-1">Select items to start order</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {orderItems.map((item, index) => (
                                <div
                                    key={index}
                                    className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <span className="text-foreground font-medium">
                                                {safeString(item.menu_item_name || item.name, "Item")}
                                            </span>
                                            {safeArray(item.modifiers).length > 0 && (
                                                <div className="mt-1 space-y-0.5">
                                                    {safeArray(item.modifiers).map((mod, i) => {
                                                        const modName = typeof mod === 'object' ? safeString(mod.name) : safeString(mod);
                                                        const priceAdj = typeof mod === 'object' ? safeNumber(mod.price_adjustment, 0) : 0;
                                                        return modName ? (
                                                            <p key={i} className="text-xs text-warning">
                                                                • {modName}
                                                                {priceAdj !== 0 && (
                                                                    <span className="ml-1">
                                                                        ({priceAdj > 0 ? '+' : ''}€{priceAdj.toFixed(2)})
                                                                    </span>
                                                                )}
                                                            </p>
                                                        ) : null;
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => onRemoveItem(index)}
                                            className="text-destructive/80 hover:text-destructive transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onUpdateItemQuantity(index, -1)}
                                                className="w-8 h-8 rounded bg-background hover:bg-accent flex items-center justify-center text-foreground border border-border"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="text-foreground font-mono w-8 text-center">{safeNumber(item.quantity, 1)}</span>
                                            <button
                                                onClick={() => onUpdateItemQuantity(index, 1)}
                                                className="w-8 h-8 rounded bg-background hover:bg-accent flex items-center justify-center text-foreground border border-border"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <span className="text-foreground font-bold">€{safeNumber(item.total_price || (item.price * item.quantity), 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Totals */}
                <div className="p-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>€{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                        <span>Tax (18%)</span>
                        <span>€{tax.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-foreground text-xl font-bold">
                        <span>Total</span>
                        <span>€{total.toFixed(2)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-border space-y-3">
                    <div className="bg-muted p-3 rounded-lg space-y-2">
                        <p className="text-muted-foreground text-sm font-medium mb-2">Send Options</p>

                        {settings?.pos?.send_checkbox_print !== false && (
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <Checkbox
                                    checked={sendOptions.do_print}
                                    onCheckedChange={(checked) => onSetSendOptions(prev => ({ ...prev, do_print: checked }))}
                                    className="border-input"
                                />
                                <Printer className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground text-sm">Print</span>
                            </label>
                        )}

                        {settings?.pos?.send_checkbox_kds !== false && (
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <Checkbox
                                    checked={sendOptions.do_kds}
                                    onCheckedChange={(checked) => onSetSendOptions(prev => ({ ...prev, do_kds: checked }))}
                                    className="border-input"
                                />
                                <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground text-sm">Send to KDS</span>
                            </label>
                        )}

                        {settings?.pos?.send_checkbox_stock !== false && (
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <Checkbox
                                    checked={sendOptions.do_stock}
                                    onCheckedChange={(checked) => onSetSendOptions(prev => ({ ...prev, do_stock: checked }))}
                                    className="border-input"
                                />
                                <span className="text-foreground text-sm">Deduct Stock</span>
                            </label>
                        )}
                    </div>

                    <Button
                        onClick={onSendOrder}
                        disabled={orderItems.length === 0 || !selectedTable || sendInProgress}
                        className="w-full bg-primary hover:bg-primary/90 h-12 text-base text-primary-foreground"
                        type="button"
                    >
                        {sendInProgress ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5 mr-2" />
                                {sendOptions.do_kds ? "Send to Kitchen" : "Print Only"}
                            </>
                        )}
                    </Button>

                    <Button
                        onClick={() => onSetShowPaymentDialog(true)}
                        disabled={!currentOrder || orderItems.length === 0}
                        className="w-full bg-success hover:bg-success/90 h-12 text-base text-success-foreground"
                    >
                        Pay €{total.toFixed(2)}
                    </Button>

                    <Button
                        onClick={onClearOrder}
                        disabled={orderItems.length === 0}
                        variant="outline"
                        className="w-full border-border text-muted-foreground h-10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear Order
                    </Button>
                </div>
            </div>

            {/* Table Selection Dialog */}
            <Dialog open={showTableDialog} onOpenChange={onSetShowTableDialog}>
                <DialogContent className="bg-background border-border max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Select Table</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-4 gap-3 p-4">
                        {tables.map((table) => (
                            <button
                                key={table.id}
                                onClick={() => onSelectTable(table)}
                                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${table.status === 'occupied'
                                        ? 'bg-destructive/20 border-destructive/50 text-destructive'
                                        : 'bg-card border-border text-foreground hover:border-primary'}
                `}
                            >
                                <div className="text-lg font-bold">{table.name}</div>
                                <div className="text-xs mt-1 capitalize">{table.status}</div>
                                <div className="text-xs">{table.seats} seats</div>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={onSetShowPaymentDialog}>
                <DialogContent className="bg-background border-border">
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
                                className="h-16 bg-success hover:bg-success/90 text-lg flex flex-col gap-1 text-success-foreground"
                            >
                                <span>Cash</span>
                            </Button>
                            <Button
                                onClick={() => onHandlePayment('card')}
                                className="h-16 bg-primary hover:bg-primary/90 text-lg flex flex-col gap-1 text-primary-foreground"
                            >
                                <span>Card</span>
                            </Button>
                            <Button
                                onClick={() => onHandlePayment('split')}
                                className="h-16 bg-purple-600 hover:bg-purple-700 text-lg flex flex-col gap-1 text-foreground"
                            >
                                <span>Split Bill</span>
                                <span className="text-xs opacity-70">(Beta)</span>
                            </Button>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border">
                            {[total, 50, 100, 200].map(amount => (
                                <button
                                    key={amount}
                                    onClick={() => onHandlePayment('cash')}
                                    className="p-3 bg-muted hover:bg-accent rounded text-foreground font-mono"
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
                <DialogContent className="bg-background border-border max-w-6xl">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Floor Plan - Select Table</DialogTitle>
                    </DialogHeader>
                    {floorPlan ? (
                        <div className="p-4">
                            <div className="mb-4 flex gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-success rounded"></div>
                                    <span className="text-sm text-muted-foreground">Available</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-destructive rounded"></div>
                                    <span className="text-sm text-muted-foreground">Occupied</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-warning rounded"></div>
                                    <span className="text-sm text-muted-foreground">Reserved</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-6 gap-3">
                                {tables.map((table) => {
                                    const color = table.status === 'available' ? 'bg-success/20 border-success'
                                        : table.status === 'reserved' ? 'bg-warning/20 border-warning'
                                            : 'bg-destructive/20 border-destructive';

                                    return (
                                        <button
                                            key={table.id}
                                            onClick={() => {
                                                onSelectTable(table);
                                                onSetShowFloorPlanDialog(false);
                                            }}
                                            className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${color}`}
                                            disabled={table.status === 'occupied' && table.id !== selectedTable?.id}
                                        >
                                            <div className="text-foreground font-bold text-lg">{table.name}</div>
                                            <div className="text-xs text-muted-foreground mt-1">{table.seats} seats</div>
                                            <div className="text-xs text-muted-foreground capitalize mt-1">{table.status}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">
                            <p>No active floor plan configured</p>
                            <p className="text-sm mt-2">Create and activate a floor plan in Admin</p>
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
