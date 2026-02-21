// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSafeMode } from "../../context/SafeModeContext";
import { venueAPI, menuAPI, orderAPI } from "../../lib/api";
import api from "../../lib/api";
import { logger } from "../../lib/logger";
import { toast } from "sonner";
import { safeNumber, safeArray, safeString } from "../../lib/safe";
import { useVenueSettings } from "../../hooks/useVenueSettings";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Checkbox } from "../../components/ui/checkbox";
import { ScrollArea } from "../../components/ui/scroll-area";
import ModifierModalNew from "../../components/ModifierModalNew"; // Updated Component
import SplitBillModal from "../../components/SplitBillModal"; // New Feature
import syncService from "../../services/SyncService";
import {
  LogOut, X, Send, Trash2, Users, Grid3x3, Map, // Added Map
  UtensilsCrossed, Coffee, Pizza, Wine, Dessert, Plus, Minus, Loader2, AlertTriangle, Printer
} from "lucide-react";

import FloorPlanWidget from "../../components/pos/FloorPlanWidget"; // New Widget

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

export default function POSRuntime() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { setSafeMode, setOrderActive, setSendInProgress, sendInProgress } = useSafeMode();
  const sendInFlightRef = useRef(false);

  // Data states
  const [viewMode, setViewMode] = useState('grid'); // grid | map
  const [venue, setVenue] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);

  // UI states
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showModifierDialog, setShowModifierDialog] = useState(false);
  const [showFloorPlanDialog, setShowFloorPlanDialog] = useState(false);
  const [showSplitBillDialog, setShowSplitBillDialog] = useState(false); // NEW STATE
  const [selectedItem, setSelectedItem] = useState(null);
  const [floorPlan, setFloorPlan] = useState(null);
  const [menuVersion, setMenuVersion] = useState(0);

  // Send options state
  const [sendOptions, setSendOptions] = useState({
    do_print: true,
    do_kds: true,
    do_stock: false
  });

  const venueId = localStorage.getItem("restin_pos_venue") || localStorage.getItem("currentVenueId") || "venue-caviar-bull";
  const { settings, loading: settingsLoading } = useVenueSettings(venueId);

  // Initialize send options from venue settings
  useEffect(() => {
    if (!settingsLoading && settings?.pos) {
      setSendOptions({
        do_print: settings.pos.send_checkbox_print !== false,
        do_kds: settings.pos.send_checkbox_kds !== false,
        do_stock: settings.pos.send_checkbox_stock !== false
      });
    }
  }, [settings, settingsLoading]);

  // Auto-refresh for menu/config updates
  useEffect(() => {
    const pollConfigVersion = async () => {
      try {
        const { data } = await api.get(`/venues/${venueId}/active-config-version`);
        if (data.menu_version !== menuVersion && menuVersion !== 0) {
          toast.info("Menu updated! Refreshing...");
          loadMenuData();
        }
      } catch (error: any) {
        logger.error('Failed to poll config version', { error });
      }
    };
    // PERF: Visibility-aware polling
    let pollInterval = setInterval(pollConfigVersion, 60000);
    const handleVisibility = () => {
      clearInterval(pollInterval);
      if (document.visibilityState === 'visible') {
        pollConfigVersion();
        pollInterval = setInterval(pollConfigVersion, 60000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [venueId, menuVersion]);

  useEffect(() => {
    // Activate Safe Mode
    setSafeMode(true, 'POS Main mounted');

    return () => {
      setSafeMode(false, 'POS Main unmounted');
    };
  }, []);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      logger.debug('[POS] Waiting for auth');
      return;
    }

    // TEMPORARY BYPASS FOR DEVELOPMENT IF NO AUTH
    // if (!isAuthenticated) { ... }

    logger.info('[POS] Loading data for venue', { venueId });
    loadData();
  }, [isAuthenticated, authLoading, venueId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadingError(null);

      logger.debug('[POS] Loading venue data');
      // Safe Promise.allSettled to avoid full crash
      const results = await Promise.allSettled([
        venueAPI.get(venueId),
        venueAPI.getTables(venueId),
        api.get(`/venues/${venueId}/active-floor-plan`)
      ]);

      if (results[0].status === 'fulfilled') setVenue(results[0].value.data);
      if (results[1].status === 'fulfilled') setTables(results[1].value.data || []);
      if (results[2].status === 'fulfilled') setFloorPlan(results[2].value.data);

      logger.debug('[POS] Venue data loaded, loading menu');
      await loadMenuData();

      logger.info('[POS] All data loaded successfully');
    } catch (error: any) {
      logger.error('[POS] Failed to load data', { error });
      setLoadingError(error.message || "Failed to load POS data");
      toast.error("Failed to load POS data.");
    } finally {
      setLoading(false);
    }
  };

  const loadMenuData = async () => {
    try {
      logger.debug('[POS] Loading categories');
      const categoriesRes = await menuAPI.getCategories(venueId);
      setCategories(categoriesRes.data || []);

      if (categoriesRes.data && categoriesRes.data.length > 0) {
        const firstCat = categoriesRes.data[0];
        setActiveCategory(firstCat.id);

        logger.debug('[POS] Loading items for category', { name: firstCat.name });
        const itemsRes = await menuAPI.getItems(venueId, firstCat.id);
        setMenuItems(itemsRes.data || []);
      } else {
        logger.warn('[POS] No categories found');
        setMenuItems([]);
      }

      // Get menu version for polling
      try {
        const { data } = await api.get(`/venues/${venueId}/active-config-version`);
        setMenuVersion(data.menu_version);
      } catch (error: any) {
        logger.warn('[POS] Failed to get menu version', { error });
      }
    } catch (error: any) {
      logger.error('[POS] Failed to load menu', { error });
      toast.error("Failed to load menu data");
    }
  };

  const loadCategoryItems = async (categoryId) => {
    setActiveCategory(categoryId);
    try {
      const response = await menuAPI.getItems(venueId, categoryId);
      setMenuItems(response.data);
    } catch (error: any) {
      logger.error('Failed to load items', { error });
      toast.error("Failed to load items");
    }
  };

  const selectTable = async (table) => {
    try {
      setSelectedTable(table);
      setOrderActive(true);

      // Load existing order if present
      if (table.current_order_id) {
        setLoading(true);
        const response = await orderAPI.get(table.current_order_id);
        setCurrentOrder(response.data);
        setOrderItems(response.data.items || []);
        toast.success(`Loaded order for ${table.name}`);
      } else {
        setCurrentOrder(null);
        setOrderItems([]);
        toast.info(`New order for ${table.name}`);
      }
    } catch (error: any) {
      logger.error('Failed to load order', { error });
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
      setShowTableDialog(false); // Close AFTER all operations complete
    }
  };

  const addItemToOrder = async (item) => {
    if (!selectedTable) {
      setShowTableDialog(true);
      return;
    }

    // Show modifier dialog
    setSelectedItem(item);
    setShowModifierDialog(true);
  };

  // UPDATED: Use new modifier logic (compatible with ModifierModalNew)
  const confirmItemWithModifiers = (itemWithModifiers) => {
    // ModifierModalNew returns a different structure, we normalize it here
    const modifiers = itemWithModifiers.modifiers || [];

    const existingIndex = orderItems.findIndex(
      oi => oi.item_id === itemWithModifiers.id &&
        JSON.stringify(oi.modifiers) === JSON.stringify(modifiers)
    );

    const price = itemWithModifiers.price || itemWithModifiers.final_price || 0;

    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += (itemWithModifiers.quantity || 1);
      updated[existingIndex].total_price = updated[existingIndex].quantity * price;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        item_id: itemWithModifiers.id,
        name: itemWithModifiers.name,
        price: price,
        quantity: itemWithModifiers.quantity || 1,
        total_price: price * (itemWithModifiers.quantity || 1),
        seat: 1,
        course: 1,
        modifiers: modifiers,
        notes: itemWithModifiers.special_instructions || ""
      }]);
    }

    toast.success(`Added ${itemWithModifiers.name}`);
    setShowModifierDialog(false);
  };

  const updateItemQuantity = (index, delta) => {
    const updated = [...orderItems];
    updated[index].quantity += delta;

    if (updated[index].quantity <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].total_price = updated[index].quantity * updated[index].price;
    }

    setOrderItems(updated);
  };

  const removeItem = (index) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
  };

  const calculateTotal = () => {
    const items = safeArray(orderItems);
    const subtotal = items.reduce((sum, item) => {
      const qty = safeNumber(item.quantity, 1);
      const price = safeNumber(item.price, 0);
      const total = safeNumber(item.total_price, qty * price);
      return sum + total;
    }, 0);
    const tax = subtotal * 0.18;
    return { subtotal, tax, total: subtotal + tax };
  };


  // --- SEND ORDER (Offline-First Wrapper) ---
  const sendOrder = async () => {
    if (!selectedTable || orderItems.length === 0) {
      toast.error("No items in order");
      return;
    }

    // In-flight lock (prevent double-send)
    if (sendInFlightRef.current) {
      logger.warn('[POS] Send already in progress');
      return;
    }

    sendInFlightRef.current = true;
    setSendInProgress(true); // Safe mode: send in progress
    setLoading(true);

    try {
      // 1. Prepare Payload
      const orderPayload = {
        items: orderItems,
        tableId: selectedTable.id,
        waiterId: user?.id,
        timestamp: new Date().toISOString()
      };

      // 2. Try Online Send via SyncService logic (manual check here for clarity)
      if (navigator.onLine) {
        // Try Direct API first for speed
        const orderId = currentOrder?.id;

        // If no ID, create it first (traditional flow)
        let finalOrderId = orderId;
        if (!finalOrderId) {
          const res = await orderAPI.create({
            venue_id: venueId,
            status: 'OPEN',
            table_id: selectedTable.id
          });
          finalOrderId = res.data.id;
        }

        // Add items loop (traditional)
        for (const item of orderItems) {
          await orderAPI.addItem(finalOrderId, {
            menu_item_id: item.item_id,
            quantity: item.quantity,
            seat_number: item.seat || 1,
            modifiers: item.modifiers || [],
            notes: item.notes || "",
            course: item.course || 1
          });
        }

        // Send to kitchen
        await api.post(`/orders/${finalOrderId}/send`, {
          do_print: sendOptions.do_print,
          do_kds: sendOptions.do_kds
        });

        toast.success(`Order Sent!`);
      } else {
        // Offline Mode: Queue the composite command
        await syncService.queuePOSOrder(orderPayload);
        toast.warning("Offline: Order Queued for Sync 🟡");
        // Trigger background sync attempt immediately
        syncService.startSync();
      }

      // 3. Clear Local State
      setOrderItems([]);
      setOrderActive(false);

      // Reload table status (if online)
      if (navigator.onLine) {
        try {
          const tablesRes = await venueAPI.getTables(venueId);
          setTables(tablesRes.data);
        } catch (e: any) { logger.warn("Failed to refresh tables", e); }
      }

    } catch (error: any) {
      logger.error('Send failed:', error);

      // Safety Net: Queue if it was a network error during the process
      if (!navigator.onLine || error.code === 'ERR_NETWORK' || error.message.includes('timeout')) {
        const orderPayload = { items: orderItems, tableId: selectedTable.id, waiterId: user?.id };
        await syncService.queuePOSOrder(orderPayload);
        toast.warning("Network Error: Order Queued 🟡");
        setOrderItems([]);
        setOrderActive(false);
      } else {
        setLoadingError(error.message || "Failed to send order");
        toast.error("Failed to send order. Server rejected request.");
        // Do NOT clear items so user can try again
      }
    } finally {
      sendInFlightRef.current = false;
      setSendInProgress(false);
      setLoading(false);
    }
  };

  const handlePayment = async (method) => {
    if (!currentOrder) {
      toast.error("No active order");
      return;
    }

    try {
      await orderAPI.close(currentOrder.id);
      toast.success("Payment processed!");

      setSelectedTable(null);
      setCurrentOrder(null);
      setOrderItems([]);
      setShowPaymentDialog(false);

      // Reload tables
      const tablesRes = await venueAPI.getTables(venueId);
      setTables(tablesRes.data);
    } catch (error: any) {
      logger.error("Payment failed:", error);
      toast.error("Failed to process payment");
    }
  };

  const getCategoryIcon = (categoryName) => {
    const name = categoryName.toLowerCase();
    for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
      if (name.includes(key)) return Icon;
    }
    return CATEGORY_ICONS.default;
  };

  if (loading && !venue) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const { subtotal, tax, total } = calculateTotal();

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* LEFT COLUMN - Categories (Purple/Legacy Style) */}
      <div className="hidden md:flex w-48 bg-card border-r border-border flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h1 className="text-foreground font-heading font-bold text-lg">RESTIN.AI</h1>
          <p className="text-muted-foreground text-xs">{venue?.name || 'Loading...'}</p>
          <p className="text-muted-foreground text-xs mt-1">{user?.name || 'Staff'}</p>
        </div>

        {/* Categories */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.name);
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => loadCategoryItems(cat.id)}
                  className={`
                    w-full p-3 rounded-lg flex flex-col items-center gap-2
                    transition-all duration-200
                    ${isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary hover:text-foreground'}
                  `}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium text-center leading-tight">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-border space-y-1">
          <button
            onClick={() => setShowTableDialog(true)}
            className="w-full p-3 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground flex items-center justify-center gap-2"
          >
            <Grid3x3 className="w-5 h-5" />
            <span className="text-sm">Tables</span>
          </button>
        </div>
      </div>

      {/* CENTER COLUMN - Menu Items Grid */}
      <div className="flex-1 bg-background p-4 overflow-auto">
        {/* Simple Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-4 pb-4 border-b border-border">
          <h2 className="text-foreground font-bold text-lg">Menu</h2>
          <button className="text-primary">
            <Grid3x3 className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => addItemToOrder(item)}
              className="
                aspect-square bg-secondary
                hover:bg-secondary/80 hover:border-red-500/50
                rounded-2xl p-4 flex flex-col items-center justify-center gap-2
                transition-all duration-200 hover:scale-[1.02] active:scale-95
                shadow-lg border border-border group
              "
            >
              <span className="text-foreground group-hover:text-foreground font-bold text-center leading-tight">
                {item.name}
              </span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400 group-hover:text-red-400 mt-auto">
                €{safeNumber(item.price, 0).toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN - Order Summary */}
      <div className="w-96 bg-card border-l border-border flex flex-col absolute md:relative right-0 h-full z-40 transform transition-transform duration-300 translate-x-0">
        {/* Table Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-foreground font-heading font-bold text-xl">
              {selectedTable ? selectedTable.name : "Walk-in"}
            </h2>
            {selectedTable && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedTable(null);
                  setCurrentOrder(null);
                  setOrderItems([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Order Items */}
        <ScrollArea className="flex-1 p-4">
          {/* Send Rounds Logic Here... (Simulated) */}

          {orderItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No items yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orderItems.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-secondary/50 rounded-lg border border-border"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <span className="text-foreground font-medium">
                        {safeString(item.menu_item_name || item.name, "Item")}
                      </span>
                      {safeArray(item.modifiers).length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {safeArray(item.modifiers).map((mod, i) => (
                            <p key={i} className="text-xs text-primary/70">• {mod.option_name || mod.name || mod}</p>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeItem(index)} className="text-muted-foreground hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-secondary rounded px-2 text-foreground text-sm">x{item.quantity}</div>
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
          <div className="flex items-center justify-between text-foreground text-xl font-bold">
            <span>Total</span>
            <span className="text-primary">€{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setShowSplitBillDialog(true)}
              variant="outline"
              className="border-border text-secondary-foreground hover:bg-secondary"
            >
              <Users className="w-4 h-4 mr-2" />
              Split Bill
            </Button>
            <Button
              onClick={sendOrder}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={sendInProgress}
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>

          <Button
            onClick={() => setShowPaymentDialog(true)}
            disabled={!currentOrder || orderItems.length === 0}
            className="w-full bg-primary hover:bg-primary/90 h-12 text-base text-primary-foreground font-bold shadow-lg shadow-primary/20"
          >
            Pay €{total.toFixed(2)}
          </Button>
        </div>
      </div>

      {/* Table Selection Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="bg-card border-border max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Select Table</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col h-[600px]">
            <div className="flex justify-end px-4 mb-4">
              <div className="flex bg-secondary p-1 rounded-lg">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? "secondary" : "ghost"}
                  onClick={() => setViewMode('grid')}
                  className="h-7 text-xs"
                >
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  GRID
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'map' ? "secondary" : "ghost"}
                  onClick={() => setViewMode('map')}
                  className="h-7 text-xs"
                >
                  <Map className="w-4 h-4 mr-2" />
                  MAP
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-background/50 rounded-xl border border-border mx-4 mb-4">
              {viewMode === 'map' ? (
                <FloorPlanWidget
                  tables={tables.map((t, i) => ({
                    ...t,
                    // Demo positioning until backend supports it
                    position: t.position || {
                      x: (i % 4) * 160 + 50,
                      y: Math.floor(i / 4) * 160 + 50
                    }
                  }))}
                  onTableSelect={selectTable}
                />
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {tables.map((table) => (
                    <button
                      key={table.id}
                      onClick={() => selectTable(table)}
                      className={`
                      p-4 rounded-lg border-2 transition-all h-32 flex flex-col items-center justify-center gap-2
                      ${table.status === 'occupied'
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-secondary border-border text-foreground hover:border-primary'}
                    `}
                    >
                      <div className="text-xl font-bold">{table.name}</div>
                      <div className="flex items-center gap-2 text-xs opacity-70">
                        {table.status === 'occupied' ? <Timer className="w-3 h-3 animate-pulse" /> : <Users className="w-3 h-3" />}
                        <span className="capitalize">{table.status || 'Free'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modifiers (NEW Component) */}
      {showModifierDialog && selectedItem && (
        <ModifierModalNew
          item={selectedItem}
          modifierGroups={selectedItem.modifier_groups || []}
          onAdd={confirmItemWithModifiers}
          onClose={() => setShowModifierDialog(false)}
        />
      )}

      {/* Split Bill (NEW Feature) */}
      {showSplitBillDialog && currentOrder && (
        <SplitBillModal
          order={currentOrder}
          items={orderItems} // Should ideally be order items + sent items
          onClose={() => setShowSplitBillDialog(false)}
          onSplit={async (type, data) => {
            try {
              // Call backend split endpoint
              await api.post(`/orders/${currentOrder.id}/split`, {
                strategy: type, // 'items' or 'seats'
                items: type === 'items' ? data : [],
                seats: type === 'seats' ? data : 1
              });

              toast.success("Bill split successfully created");
              setShowSplitBillDialog(false);

              // Reload order to reflect split state (or payment flow)
              const res = await orderAPI.get(currentOrder.id);
              setCurrentOrder(res.data);
              setOrderItems(res.data.items || []);

            } catch (error: any) {
              logger.error("Split failed:", error);
              toast.error("Failed to split bill");
            }
          }}
        />
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="text-foreground">Payment</DialogTitle></DialogHeader>
          <div className="p-4 space-y-4">
            <div className="text-center text-4xl font-bold text-foreground">€{total.toFixed(2)}</div>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => handlePayment('cash')} className="bg-green-600 h-16 text-xl">CASH</Button>
              <Button onClick={() => handlePayment('card')} className="bg-blue-600 h-16 text-xl">CARD</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
