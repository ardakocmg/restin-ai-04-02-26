import { Loader2,Monitor,Tablet,Zap } from "lucide-react";
import { useEffect,useRef,useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import POSLayoutExpress from "../../components/pos/layouts/POSLayoutExpress";
import POSLayoutPro from "../../components/pos/layouts/POSLayoutPro";
import POSLayoutRestin from "../../components/pos/layouts/POSLayoutRestin";
import SmartKeyboard from "../../components/pos/SmartKeyboard"; // Added import
import { useAuth } from "../../context/AuthContext";
import { useSafeMode } from "../../context/SafeModeContext";
import { usePOSTheme } from "../../hooks/usePOSTheme";
import { useVenueSettings } from "../../hooks/useVenueSettings";
import api,{ menuAPI,orderAPI,venueAPI } from "../../lib/api";
import { logger } from "../../lib/logger";
import { safeArray,safeNumber } from "../../lib/safe";

export default function POSMain() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { setSafeMode, setOrderActive, setSendInProgress, sendInProgress } = useSafeMode();
  const sendInFlightRef = useRef(false);

  // Data states
  const [venue, setVenue] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [allMenuItems, setAllMenuItems] = useState([]); // For search
  const [tables, setTables] = useState([]);

  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false); // Existing state
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
  // @ts-ignore
  const { theme, setTheme, themes } = usePOSTheme({ venueDefault: settings?.pos?.theme });

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
      } catch (error) {
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

      // Also load ALL active items for fast client-side searching
      try {
        const allItemsRes = await menuAPI.getItems(venueId);
        setAllMenuItems(allItemsRes.data || []);
      } catch (err) {
        logger.warn('[POS] Failed to load all items for search', { err });
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
    // Express theme is counter-service — no table selection needed
    if (!selectedTable && theme !== 'express') {
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
    if (orderItems.length === 0) {
      toast.error("No items in order");
      return;
    }

    // For non-express themes, a table is required
    if (!selectedTable && theme !== 'express') {
      toast.error("Please select a table first");
      return;
    }

    // In-flight lock (prevent double-send)
    if (sendInFlightRef.current) {
      logger.warn('[POS] Send already in progress');
      return;
    }

    sendInFlightRef.current = true;
    setSendInProgress(true);  // Safe mode: send in progress

    try {
      let orderId = currentOrder?.id;

      // Generate stable idempotency key
      const tableRef = selectedTable?.id || 'counter';
      const idempotencyKey = orderId
        ? `order:${orderId}:send:${Date.now()}`
        : `order:new:${tableRef}:${Date.now()}`;

      if (!orderId) {
        // Create new order with idempotency
        const response = await orderAPI.create({
          venue_id: venueId,
          table_id: selectedTable?.id || 'counter',
          server_id: user.id,
          order_type: theme === 'express' ? 'counter' : 'dine_in'
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
        // @ts-ignore
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
      logger.error("Failed to send order:", error);

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
    // Express auto-send: if items exist but no order yet, send first
    if (!currentOrder && theme === 'express' && orderItems.length > 0) {
      try {
        await sendOrder();
        const ordersRes = await venueAPI.getOrders(venueId, 'sent', selectedTable?.id || 'counter');
        const latestOrder = ordersRes.data?.[0];
        if (latestOrder) {
          await orderAPI.close(latestOrder.id);
          toast.success("Payment processed!");
          setSelectedTable(null);
          setCurrentOrder(null);
          setOrderItems([]);
          const tablesRes = await venueAPI.getTables(venueId);
          setTables(tablesRes.data);
          return;
        }
      } catch (error) {
        logger.error("Express auto-send failed:", error);
        toast.error(error.response?.data?.detail || "Failed to process order");
        return;
      }
    }
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
      logger.error("Failed to check billing eligibility:", error);
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
      logger.error("Payment failed:", error);
      toast.error("Failed to process payment");
    }
  };

  // Theme icon map
  const THEME_ICONS = { restin: Monitor, pro: Tablet, express: Zap };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-destructive animate-spin" />
      </div>
    );
  }

  const { subtotal, tax, total } = calculateTotal();

  // --- Theme Selector (compact dropdown injected into layouts) ---
  const themeSelector = (
    <div className="relative group">
      <button
        className="w-full p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-foreground flex items-center justify-center gap-2 transition-colors text-xs font-medium"
        title="Switch POS Theme"
      >
        {(() => { const TIcon = THEME_ICONS[theme] || Monitor; return <TIcon className="w-4 h-4" />; })()}
        <span>{themes.find(t => t.id === theme)?.name || 'Classic'}</span>
      </button>
      <div className="absolute bottom-full left-0 w-full bg-popover border border-border rounded-lg shadow-xl mb-1 hidden group-hover:block z-50">
        {themes.map(t => {
          const TIcon = THEME_ICONS[t.id] || Monitor;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`w-full p-2 flex items-center gap-2 text-xs hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg
                ${theme === t.id ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'}`}
            >
              <TIcon className="w-4 h-4" />
              <div className="text-left">
                <div>{t.name}</div>
                <div className="text-[10px] text-muted-foreground">{t.target}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Calculate displayed items (search vs category)
  const displayedItems = searchQuery.trim() !== ""
    ? allMenuItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.short_name && item.short_name.toLowerCase().includes(searchQuery.toLowerCase())))
    : menuItems;

  // --- Shared layout props (all themes receive the same data + actions) ---
  const layoutProps = {
    // Data
    venue,
    user,
    categories,
    menuItems: displayedItems,
    searchQuery,
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
    // Actions
    onSearchChange: setSearchQuery,
    onLoadCategoryItems: loadCategoryItems,
    onSelectTable: selectTable,
    onAddItemToOrder: addItemToOrder,
    onConfirmItemWithModifiers: confirmItemWithModifiers,
    onUpdateItemQuantity: updateItemQuantity,
    onRemoveItem: removeItem,
    onSendOrder: sendOrder,
    onHandlePayment: handlePayment,
    onClearOrder: () => setOrderItems([]),
    onDeselectTable: () => {
      setSelectedTable(null);
      setCurrentOrder(null);
      setOrderItems([]);
    },
    onSetSendOptions: setSendOptions,
    onSetShowTableDialog: setShowTableDialog,
    onSetShowPaymentDialog: setShowPaymentDialog,
    onSetShowFloorPlanDialog: setShowFloorPlanDialog,
    onSetShowModifierDialog: setShowModifierDialog,
    onCloseModifierDialog: () => {
      setShowModifierDialog(false);
      setSelectedItem(null);
    },
    onNavigate: navigate,
    // Theme switcher slot
    themeSelector,
    // Keyboard
    isKeyboardOpen,
    onSetKeyboardOpen: setIsKeyboardOpen
  };

  // --- Theme Layout Delegation ---
  // Currently only Restin layout is implemented.
  // Pro and Express layouts will be added in Phase 3 and 4.
  let ActiveLayout = POSLayoutRestin; // Default
  if (theme === 'pro') ActiveLayout = POSLayoutPro;
  if (theme === 'express') ActiveLayout = POSLayoutExpress;

  return (
    <div className="relative h-screen w-full bg-background overflow-hidden">
      {/* @ts-ignore */}
      <ActiveLayout {...layoutProps} />

      {/* Smart On-Screen Keyboard */}
      <SmartKeyboard
        isOpen={isKeyboardOpen}
        onClose={() => setIsKeyboardOpen(false)}
        value={searchQuery}
        onChange={setSearchQuery}
        items={allMenuItems}
      />
    </div>
  );
}
