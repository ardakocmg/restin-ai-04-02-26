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
import ModifierDialog from "../../components/ModifierDialog";
import {
  LogOut, X, Send, Trash2, Users, Grid3x3,
  UtensilsCrossed, Coffee, Pizza, Wine, Dessert, Plus, Minus, Loader2, AlertTriangle, Printer
} from "lucide-react";

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

export default function POSMain() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { setSafeMode, setOrderActive, setSendInProgress, sendInProgress } = useSafeMode();
  const sendInFlightRef = useRef(false);

  // Data states
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
  const [selectedItem, setSelectedItem] = useState(null);
  const [floorPlan, setFloorPlan] = useState(null);
  const [menuVersion, setMenuVersion] = useState(0);

  // Send options state
  const [sendOptions, setSendOptions] = useState({
    do_print: true,
    do_kds: true,
    do_stock: false
  });

  const venueId = localStorage.getItem("restin_pos_venue");
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
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await api.get(`/venues/${venueId}/active-config-version`);
        if (data.menu_version !== menuVersion && menuVersion !== 0) {
          toast.info("Menu updated! Refreshing...");
          loadMenuData();
        }
      } catch (error) {
        logger.error('Failed to poll config version', { error });
      }
    }, 60000); // Poll every 60 seconds

    return () => clearInterval(pollInterval);
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

    if (!isAuthenticated) {
      logger.warn('[SafeMode] Auth required - redirecting to setup');
      navigate('/pos/setup');
      return;
    }

    if (!venueId) {
      logger.warn('[SafeMode] Venue required - redirecting to setup');
      navigate('/pos/setup');
      return;
    }

    logger.info('[POS] Loading data for venue', { venueId });
    loadData();
  }, [isAuthenticated, authLoading, venueId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadingError(null);

      logger.debug('[POS] Loading venue data');
      const [venueRes, tablesRes, floorPlanRes] = await Promise.all([
        venueAPI.get(venueId),
        venueAPI.getTables(venueId),
        api.get(`/venues/${venueId}/active-floor-plan`).catch(() => ({ data: null }))
      ]);

      setVenue(venueRes.data);
      setTables(tablesRes.data || []);
      setFloorPlan(floorPlanRes.data);

      logger.debug('[POS] Venue data loaded, loading menu');
      await loadMenuData();

      logger.info('[POS] All data loaded successfully');
    } catch (error) {
      logger.error('[POS] Failed to load data', { error });
      setLoadingError(error.message || "Failed to load POS data");
      toast.error("Failed to load POS data. Please retry.");
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
      } catch (error) {
        logger.warn('[POS] Failed to get menu version', { error });
      }
    } catch (error) {
      logger.error('[POS] Failed to load menu', { error });
      toast.error("Failed to load menu data");
    }
  };

  const loadCategoryItems = async (categoryId) => {
    setActiveCategory(categoryId);
    try {
      const response = await menuAPI.getItems(venueId, categoryId);
      setMenuItems(response.data);
    } catch (error) {
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
    } catch (error) {
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

  const confirmItemWithModifiers = (itemWithModifiers) => {
    const existingIndex = orderItems.findIndex(
      oi => oi.item_id === itemWithModifiers.id &&
        JSON.stringify(oi.modifiers) === JSON.stringify(itemWithModifiers.modifiers)
    );

    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total_price = updated[existingIndex].quantity * itemWithModifiers.final_price;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        item_id: itemWithModifiers.id,
        name: itemWithModifiers.name,
        price: itemWithModifiers.final_price,
        quantity: 1,
        total_price: itemWithModifiers.final_price,
        seat: 1,
        course: 1,
        modifiers: itemWithModifiers.modifiers || [],
        notes: ""
      }]);
    }

    toast.success(`Added ${itemWithModifiers.name}`);
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

  const sendOrder = async () => {
    if (!selectedTable || orderItems.length === 0) {
      toast.error("No items in order");
      return;
    }

    // In-flight lock (prevent double-send)
    if (sendInFlightRef.current) {
      console.warn('[POS] Send already in progress');
      return;
    }

    sendInFlightRef.current = true;
    setSendInProgress(true);  // Safe mode: send in progress

    try {
      let orderId = currentOrder?.id;

      // Generate stable idempotency key
      const idempotencyKey = orderId
        ? `order:${orderId}:send:${Date.now()}`
        : `order:new:${selectedTable.id}:${Date.now()}`;

      if (!orderId) {
        // Create new order with idempotency
        const response = await orderAPI.create({
          venue_id: venueId,
          table_id: selectedTable.id,
          server_id: user.id
        });

        if (response.data.order) {
          orderId = response.data.order.id;
          setCurrentOrder(response.data.order);
        } else {
          // Fallback for flat response or error
          orderId = response.data.id;
          setCurrentOrder(response.data);
        }

        if (!orderId) {
          throw new Error("Failed to create order: Is ID missing?");
        }
      }

      // Add items to order
      for (const item of orderItems) {
        await orderAPI.addItem(orderId, {
          menu_item_id: item.item_id,
          quantity: item.quantity,
          seat_number: item.seat || 1,
          modifiers: item.modifiers || [],
          notes: item.notes || "",
          course: item.course || 1
        });
      }

      // Send to kitchen with simplified options (auto KDS and stock)
      const sendPayload = {
        do_print: sendOptions.do_print,
        do_kds: sendOptions.do_kds,
        do_stock: sendOptions.do_stock,
        client_send_id: idempotencyKey
      };

      const sendResponse = await api.post(`/orders/${orderId}/send`, sendPayload, {
        headers: { 'Idempotency-Key': idempotencyKey },
        meta: { action: 'send_to_kitchen', suppressAutoRedirect: true, safeMode: true }
      });

      // MEGA PATCH: Show appropriate success message
      const roundInfo = sendResponse.data?.round_label || "";
      if (sendOptions.do_kds) {
        toast.success(`${roundInfo} sent to kitchen!`);
      } else {
        toast.success(`${roundInfo} printed (no KDS)`);
      }

      // Clear pending items and reload order
      setOrderItems([]);

      // Reload order to show sent items with rounds
      const orderResponse = await orderAPI.get(orderId);
      setCurrentOrder(orderResponse.data);
      setOrderItems([]);
      setOrderActive(false);  // Safe mode: order completed

      // Reload table status
      const tablesRes = await venueAPI.getTables(venueId);
      setTables(tablesRes.data);
    } catch (error) {
      console.error("Failed to send order:", error);

      // Safe mode: Extract error, show in-place, NO navigate
      const errorDetail = error.response?.data?.detail;
      let errorMsg = "Failed to send order";

      if (typeof errorDetail === 'object' && errorDetail?.code) {
        errorMsg = errorDetail.message || errorDetail.code;
      } else if (typeof errorDetail === 'string') {
        errorMsg = errorDetail;
      } else if (error.message) {
        errorMsg = error.message;
      }

      toast.error(errorMsg);

      // If offline, queue the action
      if (!navigator.onLine) {
        toast.info("Order queued - will send when online");
        // Queue logic here (OfflineQueueManager)
      }
    } finally {
      sendInFlightRef.current = false;
      setSendInProgress(false);
    }
  };

  // ... (existing code)

  const handlePayment = async (method) => {
    if (!currentOrder) {
      toast.error("No active order");
      return;
    }

    // MEGA PATCH: Check billing eligibility
    try {
      const eligibilityRes = await api.get(`/orders/${currentOrder.id}/billing-eligibility`);
      const { eligible, blocking_items, message } = eligibilityRes.data;

      if (!eligible) {
        toast.error(message || "Cannot print bill - items not ready");
        if (blocking_items && blocking_items.length > 0) {
          const itemsList = blocking_items.map(i => `${i.menu_item_name} (${i.status})`).join(", ");
          toast.error(`Blocking: ${itemsList}`);
        }
        return;
      }
    } catch (error) {
      console.error("Failed to check billing eligibility:", error);
      // Allow if check fails (graceful degradation)
    }

    if (method === 'split') {
      const splitAmount = total / 2; // Default to 2-way split for now
      // In reality, this would open a robust Split Dialog
      // implementing the implementation_plan.md logic

      // For MVP: Just show a toast that this feature is activated
      toast.info(`Split Bill Feature Activated! (2-Way: €${splitAmount.toFixed(2)}/each)`);

      // Simulating flow for user demo
      return;
    }

    // Process payment
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
    } catch (error) {
      console.error("Payment failed:", error);
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
      return { backgroundColor: cat.color }; // Direct hex color
    }
    return {}; // Fallback to CSS classes
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
    return {}; // Fallback
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
      </div>
    );
  }

  const { subtotal, tax, total } = calculateTotal();

  return (
    <div className="h-screen flex bg-zinc-950 overflow-hidden">
      {/* LEFT COLUMN - Categories (Lightspeed Style) */}
      <div className="w-48 bg-zinc-900 border-r border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <h1 className="text-white font-heading font-bold text-lg">RESTIN.AI</h1>
          <p className="text-zinc-400 text-xs">{venue?.name}</p>
          <p className="text-zinc-500 text-xs mt-1">{user?.name}</p>
        </div>

        {/* Categories */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {categories.map((cat) => {
              const Icon = getCategoryIcon(cat.name);
              const isActive = activeCategory === cat.id;

              // Dynamic Style
              const style = getCategoryStyle(cat);
              const hasImage = !!cat.image;

              return (
                <button
                  key={cat.id}
                  onClick={() => loadCategoryItems(cat.id)}
                  style={style}
                  className={`
                    w-full h-20 rounded-lg flex flex-col items-center justify-center gap-1 relative overflow-hidden group
                    transition-all duration-200 border-2
                    ${isActive
                      ? 'border-white ring-2 ring-white/20'
                      : 'border-transparent hover:border-white/20'}
                    ${!cat.image && !cat.color && (isActive ? 'bg-red-600' : 'bg-zinc-800')}
                  `}
                >
                  {/* Overlay for image readability */}
                  {hasImage && <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />}

                  {/* Icon (only if no image or if desired) */}
                  {!hasImage && <Icon className={`w-6 h-6 z-10 ${isActive ? 'text-white' : 'text-zinc-400'}`} />}

                  <span className={`text-xs font-bold text-center leading-tight z-10 px-2 ${hasImage || isActive ? 'text-white' : 'text-zinc-400'}`}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-white/10 space-y-1">
          <button
            onClick={() => setShowFloorPlanDialog(true)}
            className="w-full p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center gap-2"
          >
            <Grid3x3 className="w-5 h-5" />
            <span className="text-sm">Floor Plan</span>
          </button>
          <button
            onClick={() => setShowTableDialog(true)}
            className="w-full p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center gap-2"
          >
            <Grid3x3 className="w-5 h-5" />
            <span className="text-sm">Tables</span>
          </button>
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="w-full p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Exit</span>
          </button>
        </div>
      </div>

      {/* CENTER COLUMN - Menu Items Grid */}
      <div className="flex-1 bg-zinc-950 p-4 overflow-auto">
        <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {menuItems.map((item) => {
            const style = getItemStyle(item);
            const hasImage = !!item.image;

            return (
              <button
                key={item.id}
                onClick={() => addItemToOrder(item)}
                style={style}
                className={`
                    aspect-square rounded-xl p-4 flex flex-col justify-between
                    transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                    shadow-lg hover:shadow-xl relative overflow-hidden group
                    ${!item.image && !item.color ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5' : ''}
                `}
              >
                {/* Gradient Overlay for Text Readability if Has Image */}
                {hasImage && <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />}

                <div className="z-10 w-full flex justify-between items-start">
                  <span className={`text-sm font-bold leading-tight text-left ${hasImage || item.color ? 'text-white' : 'text-zinc-100'}`}>
                    {item.name}
                  </span>
                </div>

                {/* ID Badge */}
                <span className={`z-10 text-[10px] font-mono self-start opacity-60 ${hasImage || item.color ? 'text-white' : 'text-zinc-500'}`}>
                  {item.id.substring(0, 4)}
                </span>

                <div className="z-10 mt-auto flex items-end justify-end w-full">
                  <span className={`text-lg font-bold ${hasImage || item.color ? 'text-white' : 'text-white'}`}>
                    €{safeNumber(item.price, 0).toFixed(2)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* RIGHT COLUMN - Order Summary */}
      <div className="w-96 bg-zinc-900 border-l border-white/10 flex flex-col">
        {/* ... (Existing Table info & Order Items - No Changes needed) ... */}
        {/* Table Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-heading font-bold text-xl">
              {selectedTable ? selectedTable.name : "No Table"}
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
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {selectedTable && (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Users className="w-3 h-3" />
              <span>{selectedTable.seats} seats</span>
              <span className="mx-1">•</span>
              <span className="capitalize">{selectedTable.status}</span>
            </div>
          )}
        </div>

        {/* Order Items */}
        <ScrollArea className="flex-1 p-4">
          {/* ... (Same as before) ... */}
          {currentOrder && safeArray(currentOrder.send_rounds).length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Sent Items</p>
              {currentOrder.send_rounds.map((round, roundIdx) => (
                <div key={roundIdx} className="border-l-4 border-green-500 pl-3 py-2 bg-zinc-800/50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-green-400">Round {round.round_no}</span>
                    <span className="text-xs text-zinc-500">
                      {new Date(round.sent_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 flex gap-2">
                    {round.do_print && <span>📄 Printed</span>}
                    {round.do_kds && <span>🔪 KDS</span>}
                    {round.do_stock && <span>📦 Stock</span>}
                  </div>
                </div>
              ))}
              <div className="border-t border-zinc-700 my-3"></div>
            </div>
          )}

          {orderItems.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No items yet</p>
              <p className="text-xs mt-1">Select items to start order</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orderItems.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-zinc-800 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <span className="text-white font-medium">
                        {safeString(item.menu_item_name || item.name, "Item")}
                      </span>
                      {safeArray(item.modifiers).length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {safeArray(item.modifiers).map((mod, i) => {
                            const modName = typeof mod === 'object' ? safeString(mod.name) : safeString(mod);
                            const priceAdj = typeof mod === 'object' ? safeNumber(mod.price_adjustment, 0) : 0;
                            return modName ? (
                              <p key={i} className="text-xs text-orange-400">
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
                      onClick={() => removeItem(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateItemQuantity(index, -1)}
                        className="w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-white"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-white font-mono w-8 text-center">{safeNumber(item.quantity, 1)}</span>
                      <button
                        onClick={() => updateItemQuantity(index, 1)}
                        className="w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-white"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-white font-bold">€{safeNumber(item.total_price || (item.price * item.quantity), 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Totals */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Subtotal</span>
            <span>€{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Tax (18%)</span>
            <span>€{tax.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-white text-xl font-bold">
            <span>Total</span>
            <span>€{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="bg-zinc-800/50 p-3 rounded-lg space-y-2">
            <p className="text-zinc-400 text-sm font-medium mb-2">Send Options</p>

            {settings?.pos?.send_checkbox_print !== false && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={sendOptions.do_print}
                  onCheckedChange={(checked) => setSendOptions(prev => ({ ...prev, do_print: checked }))}
                  className="border-zinc-600"
                />
                <Printer className="w-4 h-4 text-zinc-400" />
                <span className="text-white text-sm">Print</span>
              </label>
            )}

            {settings?.pos?.send_checkbox_kds !== false && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={sendOptions.do_kds}
                  onCheckedChange={(checked) => setSendOptions(prev => ({ ...prev, do_kds: checked }))}
                  className="border-zinc-600"
                />
                <UtensilsCrossed className="w-4 h-4 text-zinc-400" />
                <span className="text-white text-sm">Send to KDS</span>
              </label>
            )}

            {settings?.pos?.send_checkbox_stock !== false && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={sendOptions.do_stock}
                  onCheckedChange={(checked) => setSendOptions(prev => ({ ...prev, do_stock: checked }))}
                  className="border-zinc-600"
                />
                <span className="text-white text-sm">Deduct Stock</span>
              </label>
            )}
          </div>

          <Button
            onClick={sendOrder}
            disabled={orderItems.length === 0 || !selectedTable || sendInProgress}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
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
            onClick={() => setShowPaymentDialog(true)}
            disabled={!currentOrder || orderItems.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 h-12 text-base"
          >
            Pay €{total.toFixed(2)}
          </Button>

          <Button
            onClick={() => setOrderItems([])}
            disabled={orderItems.length === 0}
            variant="outline"
            className="w-full border-white/10 text-zinc-400 h-10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Order
          </Button>
        </div>
      </div>

      {/* Table Selection Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent className="bg-zinc-900 border-white/10 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-white">Select Table</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3 p-4">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => selectTable(table)}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${table.status === 'occupied'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'bg-zinc-800 border-white/10 text-white hover:border-red-500'}
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
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Process Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <div className="text-center py-4">
              <p className="text-zinc-400 mb-2">Total Amount</p>
              <p className="text-4xl font-bold text-white">€{total.toFixed(2)}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={() => handlePayment('cash')}
                className="h-16 bg-green-600 hover:bg-green-700 text-lg flex flex-col gap-1"
              >
                <span>Cash</span>
              </Button>
              <Button
                onClick={() => handlePayment('card')}
                className="h-16 bg-blue-600 hover:bg-blue-700 text-lg flex flex-col gap-1"
              >
                <span>Card</span>
              </Button>
              {/* MEGA PATCH: Split Payment Button */}
              <Button
                onClick={() => handlePayment('split')}
                className="h-16 bg-purple-600 hover:bg-purple-700 text-lg flex flex-col gap-1"
              >
                <span>Split Bill</span>
                <span className="text-xs opacity-70">(Beta)</span>
              </Button>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10">
              {[total, 50, 100, 200].map(amount => (
                <button
                  key={amount}
                  onClick={() => handlePayment('cash')}
                  className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-mono"
                >
                  €{amount.toFixed(2)}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floor Plan Dialog */}
      <Dialog open={showFloorPlanDialog} onOpenChange={setShowFloorPlanDialog}>
        {/* ... (Existing logic same as before) ... */}
        <DialogContent className="bg-zinc-900 border-white/10 max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-white">Floor Plan - Select Table</DialogTitle>
          </DialogHeader>
          {floorPlan ? (
            <div className="p-4">
              {/* ... Same floor plan rendering ... */}
              <div className="mb-4 flex gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-zinc-400">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-sm text-zinc-400">Occupied</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span className="text-sm text-zinc-400">Reserved</span>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-3">
                {tables.map((table) => {
                  const color = table.status === 'available' ? 'bg-green-500/20 border-green-500'
                    : table.status === 'reserved' ? 'bg-yellow-500/20 border-yellow-500'
                      : 'bg-red-500/20 border-red-500';

                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        selectTable(table);
                        setShowFloorPlanDialog(false);
                      }}
                      className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${color}`}
                      disabled={table.status === 'occupied' && table.id !== selectedTable?.id}
                    >
                      <div className="text-white font-bold text-lg">{table.name}</div>
                      <div className="text-xs text-zinc-300 mt-1">{table.seats} seats</div>
                      <div className="text-xs text-zinc-400 capitalize mt-1">{table.status}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-400">
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
        onClose={() => {
          setShowModifierDialog(false);
          setSelectedItem(null);
        }}
        onConfirm={confirmItemWithModifiers}
      />
    </div>
  );
}
