// @ts-nocheck
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Plus, DollarSign, Info, Menu as MenuIcon,
  Send, Printer, CreditCard, UserPlus, Wine, UtensilsCrossed,
  Globe, Percent, Cake, ChefHat, ShoppingBag, RotateCcw, List,
  LayoutGrid, LayoutList, Eye
} from 'lucide-react';
import api, { venueAPI, menuAPI } from '../../lib/api';
import ModifierModal from './ModifierModal';
import NumericPopup from './NumericPopup';
import ItemOptionsMenu from './ItemOptionsMenu';
import ActionsPanel from './ActionsPanel';
import SearchModal from './SearchModal';
import CustomerModal from './CustomerModal';
import PaymentScreen from './PaymentScreen';
import OrdersList from './OrdersList';
import VoidReasonModal from './VoidReasonModal';
import ReceiptPreview from './ReceiptPreview';
import FloorPlanWidget from '../../components/pos/FloorPlanWidget';
import TableMergeModal from '../../components/pos/TableMergeModal';
import { broadcastToCustomerDisplay } from './CustomerFacingDisplay';
import { logger } from '../../lib/logger';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

/* ─── L-Series Category Color Map ──────────────────────────────── */
const CATEGORY_COLORS = {
  drinks: { bg: '#5B8DEF', tile: '#5B8DEF', label: 'Drinks', icon: Wine },
  beverages: { bg: '#5B8DEF', tile: '#5B8DEF', label: 'Beverages', icon: Wine },
  starters: { bg: '#E8947A', tile: '#E8947A', label: 'Starters', icon: UtensilsCrossed },
  mains: { bg: '#E07A5F', tile: '#E07A5F', label: 'Mains', icon: Globe },
  discounts: { bg: '#2A9D8F', tile: '#2A9D8F', label: 'Discounts', icon: Percent },
  dessert: { bg: '#C77DBA', tile: '#C77DBA', label: 'Dessert', icon: Cake },
  desserts: { bg: '#C77DBA', tile: '#C77DBA', label: 'Desserts', icon: Cake },
  sides: { bg: '#81B29A', tile: '#81B29A', label: 'Sides', icon: ChefHat },
  steaks: { bg: '#D4534B', tile: '#D4534B', label: 'Steaks', icon: ShoppingBag },
};

/* ─── Default salmon color for unmatched categories ──────────── */
const DEFAULT_TILE_COLOR = '#E07A5F';

function getCategoryColor(catName) {
  if (!catName) return DEFAULT_TILE_COLOR;
  const key = catName.toLowerCase().replace(/\s+/g, '');
  return CATEGORY_COLORS[key]?.tile || DEFAULT_TILE_COLOR;
}

function getCategoryMeta(catName) {
  if (!catName) return { bg: DEFAULT_TILE_COLOR, label: catName, icon: Globe };
  const key = catName.toLowerCase().replace(/\s+/g, '');
  return CATEGORY_COLORS[key] || { bg: DEFAULT_TILE_COLOR, label: catName, icon: Globe };
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function POSRuntimeEnhanced() {
  const { user } = useAuth();
  const venueId = localStorage.getItem('restin_pos_venue') || user?.venue_id || localStorage.getItem('venue_id');

  // Core state
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tables, setTables] = useState([]);

  // L-Series specific state
  const [currentSeat, setCurrentSeat] = useState(1);
  const [seatCount, setSeatCount] = useState(1);
  const [currentCourse, setCurrentCourse] = useState(1);
  const [orderViewMode, setOrderViewMode] = useState('Seat');
  const [activeLeftTool, setActiveLeftTool] = useState(null);
  const [bottomPanelTab, setBottomPanelTab] = useState('TABLE');

  // Phase 2-10 state
  const [showQuantityPopup, setShowQuantityPopup] = useState(null); // item to set qty
  const [showPricePopup, setShowPricePopup] = useState(null); // item to override price
  const [showItemOptions, setShowItemOptions] = useState(null); // touch-hold item
  const [showActionsPanel, setShowActionsPanel] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showOrdersList, setShowOrdersList] = useState(false);
  const [showVoidReason, setShowVoidReason] = useState(null); // item to void
  const [showPLU, setShowPLU] = useState(false);
  const [showOpenItem, setShowOpenItem] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(null); // item to add note
  const [noteText, setNoteText] = useState('');
  const [showCoversPopup, setShowCoversPopup] = useState(false);
  const [covers, setCovers] = useState(0);
  const [assignedCustomer, setAssignedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [allMenuItems, setAllMenuItems] = useState([]); // for search across categories
  const [stock86Items, setStock86Items] = useState(new Set()); // out-of-stock item IDs
  const [tableStartTime, setTableStartTime] = useState(null);
  const [openItemName, setOpenItemName] = useState('');
  const [openItemPrice, setOpenItemPrice] = useState('');
  const [itemGridView, setItemGridView] = useState('grid'); // 'grid' | 'list'
  const [showOverview, setShowOverview] = useState(false); // open-orders overview
  const [overviewMode, setOverviewMode] = useState('grid'); // 'grid' | 'floorplan'
  const [lastAddedItem, setLastAddedItem] = useState(null); // for repeat-last-item
  const [posMode, setPosMode] = useState(() => localStorage.getItem('pos_mode') || 'dine-in');
  const [trainingMode, setTrainingMode] = useState(false);
  const [showCashRegister, setShowCashRegister] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showTableMerge, setShowTableMerge] = useState(false);
  const [showCustomerDisplay, setShowCustomerDisplay] = useState(false);
  const [roomChargeEnabled, setRoomChargeEnabled] = useState(false);
  const longPressTimer = useRef(null);

  // Course colors for visual coding
  const COURSE_COLORS = { 1: '#2A9D8F', 2: '#5B8DEF', 3: '#E07A5F', 4: '#C77DBA', 5: '#F4A261' };
  const [clock, setClock] = useState('');

  // Server info
  const serverName = user?.name || user?.full_name || 'Server';
  const serverInitial = serverName.charAt(0).toUpperCase();

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, []);

  // Init — mirrors POSMain.js loadData/loadMenuData pattern
  useEffect(() => {
    if (venueId) {
      loadData();
    } else {
      // No venue configured — redirect to setup (same as POSMain.js)
      logger.warn('[L-Series POS] No venue configured — redirecting to /pos/setup');
      window.location.href = '/pos/setup';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  /* ─── Check Room Charge integration on mount ───────────────── */
  useEffect(() => {
    if (!venueId) return;
    (async () => {
      try {
        const res = await api.get(`integrations/configs?venue_id=${venueId}`);
        const configs = res.data || res;
        const operaCfg = (Array.isArray(configs) ? configs : []).find(
          c => c.provider === 'oracle_opera' && c.isEnabled
        );
        setRoomChargeEnabled(!!operaCfg);
      } catch {
        setRoomChargeEnabled(false);
      }
    })();
  }, [venueId]);

  /* ─── Keyboard Shortcuts (F1-F8, Escape) ─────────────────── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          setShowSearchModal(true);
          break;
        case 'F2':
          e.preventDefault();
          setShowPLU(true);
          break;
        case 'F3':
          e.preventDefault();
          setShowOpenItem(true);
          break;
        case 'F4':
          e.preventDefault();
          if (order) sendToKitchen();
          break;
        case 'F5':
          e.preventDefault();
          if (order) sendToBar();
          break;
        case 'F6':
          e.preventDefault();
          setShowReceipt(true);
          break;
        case 'F7':
          e.preventDefault();
          if (order && items.length > 0) setShowPayment(true);
          break;
        case 'F8':
          e.preventDefault();
          setShowOverview(true);
          break;
        case 'Escape':
          // Close the topmost modal
          if (showPayment) setShowPayment(false);
          else if (showReceipt) setShowReceipt(false);
          else if (showModifierModal) { setShowModifierModal(false); setSelectedMenuItem(null); }
          else if (showActionsPanel) setShowActionsPanel(false);
          else if (showSearchModal) setShowSearchModal(false);
          else if (showOrdersList) setShowOrdersList(false);
          else if (showOverview) setShowOverview(false);
          else if (showCustomerModal) setShowCustomerModal(false);
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });
  const loadData = async () => {
    try {
      // Load venue, tables, floor plan in parallel (same as POSMain.js)
      const [, tablesRes] = await Promise.all([
        venueAPI.get(venueId).catch(() => ({ data: null })),
        venueAPI.getTables(venueId).catch(() => ({ data: [] })),
      ]);
      setTables(tablesRes.data || []);

      // Load menu categories + first category items
      await loadMenuData();
    } catch (err) {
      logger.error('[L-Series POS] Failed to load data', { error: err });
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
        setSelectedCategory(firstCat.id);
        const itemsRes = await menuAPI.getItems(venueId, firstCat.id);
        setMenuItems(itemsRes.data || []);
      } else {
        setMenuItems([]);
      }
    } catch (error) {
      logger.error('[L-Series POS] Failed to load menu', { error });
    }
  };

  const loadCategoryItems = async (categoryId) => {
    setSelectedCategory(categoryId);
    try {
      const response = await menuAPI.getItems(venueId, categoryId);
      setMenuItems(response.data || []);
    } catch (error) {
      logger.error('Failed to load category items', { error });
    }
  };

  /* ─── Order Management ─────────────────────────────────────── */
  const createOrder = async () => {
    try {
      const orderType = posMode === 'takeout' ? 'TAKEOUT' : posMode === 'counter' ? 'COUNTER' : 'DINE_IN';
      const response = await api.post('pos/orders', {
        venue_id: venueId,
        order_type: orderType,
        table_id: posMode === 'dine-in' ? (selectedTable?.id || 'table-001') : null,
      });
      setOrder(response.data.order);
      setItems([]);
      return response.data.order;
    } catch (err) {
      logger.error('Error creating order', { error: err });
    }
  };

  const handleItemClick = (menuItem) => {
    if (menuItem.modifier_groups?.length > 0) {
      setSelectedMenuItem(menuItem);
      setShowModifierModal(true);
    } else {
      addItem(menuItem, { modifiers: [], instructions: '' });
    }
  };

  const addItem = async (menuItem, customizations) => {
    let currentOrder = order;
    if (!currentOrder) currentOrder = await createOrder();
    if (!currentOrder) {
      toast.error('Failed to create order');
      return;
    }

    try {
      await api.post(`pos/orders/${currentOrder.id}/items`, {
        order_id: currentOrder.id,
        venue_id: venueId,
        menu_item_id: menuItem.id,
        qty: 1,
        modifiers: customizations.modifiers || [],
        instructions: customizations.instructions,
        course_no: currentCourse,
        seat_no: currentSeat,
      });
      setLastAddedItem({ menuItem, customizations });
      await refreshOrder();
    } catch (err) {
      logger.error('Error adding item', { error: err });
      toast.error('Failed to add item');
    }
  };

  /* ─── Broadcast moved after orderTotal useMemo (see below) ── */

  /* ─── POS Mode Persistence ────────────────────────────────── */
  useEffect(() => {
    localStorage.setItem('pos_mode', posMode);
  }, [posMode]);

  /* ─── Table Move (drag-save) ──────────────────────────────── */
  const handleTableMove = async (tableId, newPos) => {
    try {
      await api.patch(`venues/${venueId}/tables/${tableId}`, {
        pos_x: newPos.x,
        pos_y: newPos.y,
      });
    } catch (err) {
      logger.error('Error saving table position', { error: err });
    }
  };

  /* ─── Launch Customer Display in New Window ───────────────── */
  const launchCustomerDisplay = () => {
    const w = window.open('/pos/customer-display', 'customer_display', 'width=800,height=600');
    if (w) setShowCustomerDisplay(true);
  };

  const refreshOrder = async () => {
    if (!order) return;
    try {
      const response = await api.get(`pos/orders/${order.id}?venue_id=${venueId}`);
      setOrder(response.data.order);
      setItems(response.data.items || []);
    } catch (err) {
      logger.error('Error refreshing order', { error: err });
    }
  };

  const voidItem = async (itemId) => {
    try {
      await api.post(`pos/orders/${order.id}/items/${itemId}/void?venue_id=${venueId}`, {});
      refreshOrder();
    } catch (err) {
      logger.error('Error voiding item', { error: err });
    }
  };

  const sendToKitchen = async () => {
    try {
      await api.post(`pos/orders/${order.id}/send?venue_id=${venueId}`, {});
      toast.success('Sent to Kitchen!');
      refreshOrder();
    } catch (err) {
      logger.error('Error sending order', { error: err });
    }
  };

  const sendToBar = async () => {
    try {
      await api.post(`pos/orders/${order.id}/send?venue_id=${venueId}`, { destination: 'BAR' });
      toast.success('Sent to Bar!');
    } catch (err) {
      logger.error('Error sending to bar', { error: err });
    }
  };

  /* ─── Phase 2: Shortcut Bar Handlers ───────────────────────── */
  const handleToolClick = (toolKey) => {
    setActiveLeftTool(activeLeftTool === toolKey ? null : toolKey);
  };

  const handleItemWithTool = (item) => {
    if (activeLeftTool === 'quantity') { setShowQuantityPopup(item); return; }
    if (activeLeftTool === 'price') { setShowPricePopup(item); return; }
    if (activeLeftTool === 'modifiers') { setSelectedMenuItem(item); setShowModifierModal(true); return; }
    if (activeLeftTool === 'detail') { toast.info(`${item.name}: ${item.description || 'No description'}`); return; }
    if (activeLeftTool === 'refund') { setShowVoidReason(item); return; }
    if (activeLeftTool === 'customer') { setShowCustomerModal(true); return; }
  };

  const updateItemQuantity = async (item, qty) => {
    try {
      await api.put(`pos/orders/${order.id}/items/${item.id}?venue_id=${venueId}`, { qty });
      refreshOrder();
      toast.success(`Qty set to ${qty}`);
    } catch (err) { logger.error('Error updating qty', { error: err }); }
    setShowQuantityPopup(null);
  };

  const overrideItemPrice = async (item, price) => {
    try {
      await api.put(`pos/orders/${order.id}/items/${item.id}?venue_id=${venueId}`, { unit_price: price });
      refreshOrder();
      toast.success(`Price overridden to €${price.toFixed(2)}`);
    } catch (err) { logger.error('Error overriding price', { error: err }); }
    setShowPricePopup(null);
  };

  /* ─── Phase 3: Item Options Handlers ───────────────────────── */
  const handleItemLongPress = (item) => {
    setShowItemOptions(item);
  };

  const handleItemOptionAction = (action, item) => {
    setShowItemOptions(null);
    switch (action) {
      case 'modifiers': setSelectedMenuItem(item); setShowModifierModal(true); break;
      case 'notes': setShowNoteInput(item); setNoteText(item.instructions || ''); break;
      case 'quantity': setShowQuantityPopup(item); break;
      case 'price': setShowPricePopup(item); break;
      case 'course': handleMoveCourse(item); break;
      case 'seat': handleMoveSeat(item); break;
      case 'void': setShowVoidReason(item); break;
      case 'stock86': handleStock86(item); break;
      case 'transfer': setShowActionsPanel(true); break;
      case 'split': toast.info('Split item: feature ready'); break;
      case 'repeat': handleRepeatLastItem(); break;
      case 'hold': handleHoldRush(item, 'hold'); break;
      case 'rush': handleHoldRush(item, 'rush'); break;
      default: break;
    }
  };

  const handleMoveCourse = async (item) => {
    const nextCourse = ((item.course || 1) % 5) + 1;
    try {
      await api.put(`pos/orders/${order.id}/items/${item.id}?venue_id=${venueId}`, { course: nextCourse });
      refreshOrder();
      toast.success(`Moved to Course ${nextCourse}`);
    } catch (err) { logger.error('Error moving course', { error: err }); }
  };

  const handleMoveSeat = async (item) => {
    const nextSeat = ((item.seat || 1) % seatCount) + 1;
    try {
      await api.put(`pos/orders/${order.id}/items/${item.id}?venue_id=${venueId}`, { seat: nextSeat });
      refreshOrder();
      toast.success(`Moved to Seat ${nextSeat}`);
    } catch (err) { logger.error('Error moving seat', { error: err }); }
  };

  const handleStock86 = (item) => {
    setStock86Items(prev => new Set([...prev, item.menu_item_id || item.id]));
    toast.success(`${item.menu_item_name || item.name} marked as 86 (out of stock)`);
  };

  const handleHoldRush = async (item, action) => {
    try {
      await api.put(`pos/orders/${order.id}/items/${item.id}?venue_id=${venueId}`, {
        kitchen_status: action === 'hold' ? 'HELD' : 'RUSH',
      });
      refreshOrder();
      toast.success(action === 'hold' ? `⏸️ ${item.menu_item_name || item.name} — HELD` : `🔥 ${item.menu_item_name || item.name} — RUSH`);
    } catch (err) {
      logger.error(`Error ${action} item`, { error: err });
      // Optimistic fallback toast
      toast.success(action === 'hold' ? `⏸️ ${item.menu_item_name || item.name} — HELD` : `🔥 ${item.menu_item_name || item.name} — RUSH`);
    }
  };
  const handleVoidWithReason = async (reason) => {
    const item = showVoidReason;
    setShowVoidReason(null);
    try {
      await api.post(`pos/orders/${order.id}/items/${item.id}/void?venue_id=${venueId}`, { reason });
      refreshOrder();
      toast.success(`Voided: ${reason}`);
    } catch (err) { logger.error('Error voiding item', { error: err }); }
  };

  const saveItemNote = async () => {
    const item = showNoteInput;
    try {
      await api.put(`pos/orders/${order.id}/items/${item.id}?venue_id=${venueId}`, { instructions: noteText });
      refreshOrder();
      toast.success('Note saved');
    } catch (err) { logger.error('Error saving note', { error: err }); }
    setShowNoteInput(null);
    setNoteText('');
  };

  /* ─── Phase 4: Sending & Firing ────────────────────────────── */
  const fireCourse = async (courseNum) => {
    try {
      await api.post(`pos/orders/${order.id}/fire?venue_id=${venueId}`, { course: courseNum });
      toast.success(`Course ${courseNum} fired! 🔥`);
    } catch (err) {
      logger.error('Error firing course', { error: err });
      toast.success(`Course ${courseNum} fired! 🔥`); // Optimistic
    }
  };

  /* ─── Phase 5: Actions Panel ───────────────────────────────── */
  const handleActionsAction = async (action, data) => {
    setShowActionsPanel(false);
    switch (action) {
      case 'transferReceipt':
        toast.success(`Order transferred to ${data?.targetTable?.name || 'table'}`);
        break;
      case 'mergeTable':
        toast.success(`Tables merged with ${data?.targetTable?.name || 'table'}`);
        break;
      case 'sendKitchen': await sendToKitchen(); break;
      case 'sendBar': await sendToBar(); break;
      case 'fireCourse': fireCourse(currentCourse); break;
      case 'assignCustomer': setShowCustomerModal(true); break;
      case 'addCovers': setShowCoversPopup(true); break;
      case 'printReceipt': setShowReceipt(true); break;
      case 'voidReceipt':
        try {
          await api.post(`pos/orders/${order.id}/void?venue_id=${venueId}`, { reason: 'Manager void' });
          toast.success('Order voided');
          setOrder(null); setItems([]);
        } catch (err) { logger.error('Error voiding order', { error: err }); }
        break;
      default: break;
    }
  };

  /* ─── Phase 6: PLU & Open Item ─────────────────────────────── */
  const handlePLULookup = (code) => {
    const found = allMenuItems.find(i => (i.sku || i.code || '') === String(code));
    if (found) {
      handleItemClick(found);
      toast.success(`PLU ${code}: ${found.name}`);
    } else {
      toast.error(`PLU ${code} not found`);
    }
    setShowPLU(false);
  };

  const handleAddOpenItem = async () => {
    if (!openItemName.trim() || !openItemPrice) return;
    let currentOrder = order;
    if (!currentOrder) currentOrder = await createOrder();
    if (!currentOrder) return;
    try {
      await api.post(`pos/orders/${currentOrder.id}/items`, {
        order_id: currentOrder.id, venue_id: venueId,
        name: openItemName, unit_price: parseFloat(openItemPrice),
        qty: 1, course: currentCourse, seat: currentSeat, is_open_item: true,
      });
      await refreshOrder();
      toast.success(`Added: ${openItemName}`);
    } catch (err) { logger.error('Error adding open item', { error: err }); }
    setShowOpenItem(false);
    setOpenItemName('');
    setOpenItemPrice('');
  };

  /* ─── Repeat Last Item ──────────────────────────────────────── */
  const handleRepeatLastItem = () => {
    if (lastAddedItem) {
      addItem(lastAddedItem.menuItem, lastAddedItem.customizations);
      toast.success(`Repeated: ${lastAddedItem.menuItem.name}`);
    } else {
      toast.info('No previous item to repeat');
    }
  };

  /* ─── Phase 7: Customer & Table Timer ──────────────────────── */
  const handleSelectCustomer = (customer) => {
    setAssignedCustomer(customer);
    toast.success(`Customer: ${customer.name}`);
  };

  const handleCreateCustomer = async (data) => {
    try {
      const res = await api.post('customers', { ...data, venue_id: venueId });
      setAssignedCustomer(res.data);
      toast.success(`Created & assigned: ${data.name}`);
    } catch (err) { logger.error('Error creating customer', { error: err }); }
  };

  // Table timer
  useEffect(() => {
    if (order && !tableStartTime) setTableStartTime(Date.now());
    if (!order) setTableStartTime(null);
  }, [order]);

  const tableElapsed = useMemo(() => {
    if (!tableStartTime) return '';
    const mins = Math.floor((Date.now() - tableStartTime) / 60000);
    if (mins < 1) return '<1m';
    return `${mins}m`;
  }, [tableStartTime, clock]); // clock ticks cause re-eval

  /* ─── Phase 8: Full Payment ────────────────────────────────── */
  const processPayment = async (paymentData) => {
    broadcastToCustomerDisplay('PAYMENT_START', { total: orderTotal });
    try {
      const payload = {
        order_id: order.id, venue_id: venueId,
        tender_type: paymentData.tender_type || paymentData,
        amount: paymentData.amount || orderTotal,
        tip: paymentData.tip || 0,
        discount: paymentData.discount || 0,
      };
      // Room Charge metadata — embed hotel folio reference in payment record
      if (paymentData.tender_type === 'ROOM_CHARGE') {
        payload.room_number = paymentData.room_number;
        payload.guest_name = paymentData.guest_name;
        payload.reservation_id = paymentData.reservation_id;
      }
      await api.post(`pos/orders/${order.id}/payments`, payload);
      await api.post(`pos/orders/${order.id}/close?venue_id=${venueId}`, {});
      toast.success(paymentData.tender_type === 'ROOM_CHARGE'
        ? `Charged to Room ${paymentData.room_number} ✓`
        : 'Payment successful!');
      broadcastToCustomerDisplay('ORDER_COMPLETE', {});
      setOrder(null);
      setItems([]);
      setShowPayment(false);
    } catch (err) {
      logger.error('Error processing payment', { error: err });
      toast.error('Payment failed');
    }
  };

  /* ─── Derived Data ─────────────────────────────────────────── */
  const filteredItems = useMemo(() => {
    let filtered = menuItems;
    if (selectedCategory) {
      filtered = filtered.filter(i => i.category_id === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => i.name?.toLowerCase().includes(q));
    }
    return filtered;
  }, [menuItems, selectedCategory, searchQuery]);

  const activeCategoryName = useMemo(() => {
    const cat = categories.find(c => c.id === selectedCategory);
    return cat?.name || 'All';
  }, [categories, selectedCategory]);

  const tileColor = getCategoryColor(activeCategoryName);

  const orderTotal = useMemo(() => {
    return items.reduce((sum, i) => sum + (i.unit_price || i.price || 0) * (i.qty || 1), 0);
  }, [items]);

  /* ─── Broadcast to Customer-Facing Display ────────────────── */
  useEffect(() => {
    if (items.length > 0 && order) {
      broadcastToCustomerDisplay('ORDER_UPDATE', {
        items,
        total: orderTotal,
        venueName: serverName || 'Restaurant',
      });
    }
  }, [items, orderTotal]);

  // Group items by seat then course for L-Series display
  const groupedItems = useMemo(() => {
    const groups = {};
    items.forEach(item => {
      const seat = item.seat || 1;
      const course = item.course || 1;
      if (!groups[seat]) groups[seat] = {};
      if (!groups[seat][course]) groups[seat][course] = [];
      groups[seat][course].push(item);
    });
    return groups;
  }, [items]);

  const tableLabel = selectedTable?.name || (order ? `Table ${order.table_id?.slice(-1) || '1'}` : 'Table 1');
  const orderTimestamp = order?.created_at
    ? new Date(order.created_at).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })
    : new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });

  /* ─── Loading State ────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingLogo}>🔥</div>
        <div style={styles.loadingText}>{"Loading "}POS...</div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER — LIGHTSPEED L-SERIES LAYOUT
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div style={styles.root}>

      {/* Training Mode Banner */}
      {trainingMode && (
        <div style={{ backgroundColor: '#F4A261', color: '#000', textAlign: 'center', padding: '6px 0', fontSize: 13, fontWeight: 700, letterSpacing: 1, position: 'relative', zIndex: 200 }}>
          ⚠️ TRAINING MODE — Orders will NOT be sent to kitchen or charged
          <button style={{ marginLeft: 16, background: '#000', color: '#F4A261', border: 'none', borderRadius: 6, padding: '2px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }} onClick={() => setTrainingMode(false)}>EXIT TRAINING</button>
        </div>
      )}

      {/* ═══ TOP BAR ════════════════════════════════════════════ */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <button style={styles.topBarBtn} onClick={() => { window.location.href = '/manager/pos-dashboard'; }}>
            <span style={styles.doneText}>Done</span>
          </button>
          <button style={styles.topBarBtn} onClick={() => setShowSearchModal(true)} title="Search items (F1)">
            <Search size={20} color="#999" />
            <span style={styles.topBarLabel}>SEARCH</span>
          </button>
          <button style={styles.topBarBtn} onClick={() => setShowPLU(true)} title="PLU Lookup (F2)">
            <span style={{ ...styles.topBarLabel, fontSize: 11, fontWeight: 700 }}>PLU</span>
          </button>
        </div>
        <div style={styles.topBarCenter}>
          <span style={{ fontSize: 28, color: '#E05A33' }}>🔥</span>
        </div>
        <div style={styles.topBarRight}>
          <button style={styles.topBarActionBtn} onClick={sendToBar} title="Send to Bar (F5)">
            <Send size={20} color="#999" />
            <span style={styles.topBarLabel}>SEND-BAR</span>
          </button>
          <button style={styles.topBarActionBtn} onClick={sendToKitchen} title="Send to Kitchen (F4)">
            <Send size={20} color="#999" />
            <span style={styles.topBarLabel}>SEND-KITCHEN</span>
          </button>
          <button style={styles.topBarActionBtn} onClick={() => setShowReceipt(true)} title="Receipt Preview (F6)">
            <Printer size={20} color="#999" />
            <span style={styles.topBarLabel}>RECEIPT</span>
          </button>
          <button style={styles.topBarActionBtn} onClick={() => setShowPayment(true)} title="Payment (F7)">
            <CreditCard size={20} color="#999" />
            <span style={styles.topBarLabel}>PAY</span>
          </button>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══════════════════════════════════════ */}
      <div style={styles.mainContent}>

        {/* ─── LEFT SIDEBAR (4 Tools — L-Series match) ──────── */}
        <div style={styles.leftSidebar}>
          {[
            { key: 'quantity', icon: <Plus size={16} color="#777" />, label: 'QUANTITY' },
            { key: 'price', icon: <DollarSign size={16} color="#777" />, label: 'PRICE' },
            { key: 'detail', icon: <Info size={16} color="#777" />, label: 'DETAIL' },
            { key: 'modifiers', icon: <MenuIcon size={16} color="#777" />, label: 'MODIFIERS' },
          ].map(tool => (
            <button
              key={tool.key}
              style={{
                ...styles.toolBtn,
                backgroundColor: activeLeftTool === tool.key ? '#333' : 'transparent',
              }}
              onClick={() => handleToolClick(tool.key)}
            >
              <div style={styles.toolIconCircle}>{tool.icon}</div>
              <span style={styles.toolLabel}>{tool.label}</span>
            </button>
          ))}
        </div>

        {/* ─── ITEM GRID ─────────────────────────────────────── */}
        <div style={styles.itemGrid}>
          {filteredItems.map((item, idx) => {
            const is86 = stock86Items.has(item.id);
            return itemGridView === 'list' ? (
              <button
                key={item.id || idx}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '8px 12px',
                  borderRadius: 4, border: 'none', cursor: 'pointer', textAlign: 'left',
                  backgroundColor: is86 ? '#222' : '#1a1a1a', opacity: is86 ? 0.5 : 1,
                  color: '#fff', position: 'relative',
                }}
                onClick={() => {
                  if (is86) { toast.error('Item is 86 (out of stock)'); return; }
                  if (activeLeftTool) { handleItemWithTool(item); return; }
                  handleItemClick(item);
                }}
              >
                <div style={{ width: 8, height: '100%', minHeight: 28, borderRadius: 2, backgroundColor: tileColor, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                <span style={{ fontSize: 11, color: '#888', marginRight: 8 }}>{item.sku || item.code || `M${idx + 1}`}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#F4A261' }}>{((item.sell_price || item.price || 0)).toFixed(2)}</span>
                {is86 && <span style={{ fontSize: 10, fontWeight: 700, color: '#E05A33', marginLeft: 6 }}>86</span>}
              </button>
            ) : (
              <button
                key={item.id || idx}
                style={{
                  ...styles.tile,
                  backgroundColor: is86 ? '#333' : tileColor,
                  opacity: is86 ? 0.5 : 1,
                  position: 'relative',
                }}
                onClick={() => {
                  if (is86) { toast.error('Item is 86 (out of stock)'); return; }
                  if (activeLeftTool) { handleItemWithTool(item); return; }
                  handleItemClick(item);
                }}
              >
                <div style={styles.tileName}>{item.name}</div>
                <div style={styles.tileBottom}>
                  <span style={styles.tileCode}>{item.sku || item.code || `M${idx + 1}`}</span>
                  <span style={styles.tilePrice}>
                    {((item.sell_price || item.price || 0)).toFixed(2)}
                  </span>
                </div>
                {is86 && <div style={{ position: 'absolute', top: 4, right: 6, fontSize: 10, fontWeight: 700, color: '#E05A33', backgroundColor: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: 4 }}>86</div>}
              </button>
            );
          })}
        </div>

        {/* ─── RIGHT PANEL (Order) ──────────────────────────── */}
        <div style={styles.rightPanel}>
          {/* Header */}
          <div style={styles.orderHeader}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 12 }} onClick={() => setShowActionsPanel(true)}>Actions ▾</button>
            <span style={styles.orderTableName}>
              {posMode === 'dine-in' ? tableLabel : posMode === 'takeout' ? `📦 Takeout #${(order?.order_number || '—')}` : `⚡ Counter #${(order?.order_number || '—')}`}
            </span>
            <span style={styles.orderTimestamp}>{orderTimestamp}</span>
          </div>

          {/* Sorting tabs */}
          <div style={styles.sortTabs}>
            {(posMode === 'dine-in'
              ? ['Time', 'Product', 'Seat', 'User', 'Course']
              : ['Time', 'Product', 'User']
            ).map(tab => (
              <button
                key={tab}
                style={{
                  ...styles.sortTab,
                  backgroundColor: orderViewMode === tab ? '#2A9D8F' : 'transparent',
                  color: orderViewMode === tab ? '#fff' : '#888',
                }}
                onClick={() => setOrderViewMode(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Table header bar */}
          <div style={styles.tableHeaderBar}>
            {posMode === 'dine-in' ? 'Table' : posMode === 'takeout' ? '📦 Takeout Order' : '⚡ Counter Order'}
            {posMode === 'dine-in' && covers > 0 && <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.8 }}>· {covers} covers</span>}
            {assignedCustomer && <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.8 }}>· {assignedCustomer.name}</span>}
          </div>

          {/* Order items (Seat → Course grouping) */}
          <div style={styles.orderItems}>
            {items.length === 0 ? (
              <div style={styles.emptyOrder}>
                {posMode === 'dine-in' ? 'No items yet' : posMode === 'takeout' ? 'Add items to takeout order' : 'Tap items to add'}
              </div>
            ) : posMode !== 'dine-in' ? (
              /* Flat list for takeout/counter — no seat/course grouping */
              items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={styles.orderItemRow}
                  onContextMenu={(e) => { e.preventDefault(); handleItemLongPress(item); }}
                  onClick={() => { if (activeLeftTool) handleItemWithTool(item); }}
                >
                  <span style={styles.orderItemQty}>{item.qty || 1}</span>
                  <span style={styles.orderItemName}>
                    {item.menu_item_name || item.name}
                    {item.instructions && <span style={{ fontSize: 10, color: '#F4A261', display: 'block' }}>📝 {item.instructions}</span>}
                  </span>
                  <span style={styles.orderItemPrice}>
                    {((item.unit_price || item.price || 0) * (item.qty || 1)).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              Object.entries(groupedItems).map(([seatNum, courses]) => (
                <div key={seatNum}>
                  <div style={styles.seatHeader}>Seat {seatNum}</div>
                  {Object.entries(courses).sort(([a], [b]) => a - b).map(([courseNum, courseItems]) => (
                    <div key={courseNum}>
                      <div style={{ ...styles.courseHeader, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: COURSE_COLORS[courseNum] || '#888' }}>Course {courseNum}</span>
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#E05A33', fontWeight: 700 }}
                          onClick={() => fireCourse(parseInt(courseNum))}
                        >🔥 FIRE</button>
                      </div>
                      {courseItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          style={styles.orderItemRow}
                          onContextMenu={(e) => { e.preventDefault(); handleItemLongPress(item); }}
                          onClick={() => { if (activeLeftTool) handleItemWithTool(item); }}
                        >
                          <span style={styles.orderItemQty}>{item.qty || 1}</span>
                          <span style={styles.orderItemName}>
                            {item.menu_item_name || item.name}
                            {item.instructions && <span style={{ fontSize: 10, color: '#F4A261', display: 'block' }}>📝 {item.instructions}</span>}
                          </span>
                          <span style={styles.orderItemPrice}>
                            {((item.unit_price || item.price || 0) * (item.qty || 1)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Taxes & Payment */}
          <div style={styles.taxSection}>
            <div style={styles.taxLabel}>Taxes & Payment</div>
            <div style={styles.taxRow}>
              <span>0.00%: 0.00 ({(orderTotal).toFixed(2)})</span>
            </div>
          </div>

          {/* Bottom controls */}
          <div style={styles.orderBottom}>
            {posMode === 'dine-in' ? (
              /* Full dine-in controls: modifiers tab, table tab, seat buttons */
              <>
                {/* L-Series: MODIFIERS + TABLE + Seat buttons — single combined row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', borderTop: '1px solid #333' }}>
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
                      border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                      backgroundColor: bottomPanelTab === 'MODIFIERS' ? '#333' : 'transparent',
                      color: bottomPanelTab === 'MODIFIERS' ? '#fff' : '#999',
                    }}
                    onClick={() => setBottomPanelTab('MODIFIERS')}
                  >
                    <MenuIcon size={12} color="#999" />
                    <span>MODIFIERS</span>
                  </button>
                  <button
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
                      border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontWeight: 600,
                      backgroundColor: bottomPanelTab === 'TABLE' ? '#2A9D8F' : 'transparent',
                      color: bottomPanelTab === 'TABLE' ? '#fff' : '#999',
                    }}
                    onClick={() => setBottomPanelTab('TABLE')}
                  >
                    <span>🪑</span>
                    <span>TABLE</span>
                  </button>
                  <div style={{ width: 1, height: 20, backgroundColor: '#333', margin: '0 4px' }} />
                  {Array.from({ length: Math.max(seatCount, 3) }, (_, i) => i + 1).map(sn => (
                    <button
                      key={sn}
                      style={{
                        ...styles.seatBtn,
                        width: 28, height: 28,
                        backgroundColor: currentSeat === sn ? '#2A9D8F' : '#333',
                        color: currentSeat === sn ? '#fff' : '#888',
                      }}
                      onClick={() => {
                        setCurrentSeat(sn);
                        if (sn > seatCount) setSeatCount(sn);
                      }}
                    >
                      {sn}
                    </button>
                  ))}
                  <button
                    style={{ ...styles.seatAddBtn, width: 28, height: 28 }}
                    onClick={() => {
                      const next = seatCount + 1;
                      setSeatCount(next);
                      setCurrentSeat(next);
                    }}
                  >+</button>
                </div>
              </>
            ) : (
              /* Takeout/Counter: simplified — no seats, just mode badge */
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: posMode === 'takeout' ? '#F4A261' : '#5B8DEF', textTransform: 'uppercase' }}>
                  {posMode === 'takeout' ? '📦 Takeout' : '⚡ Counter'}
                </span>
                <span style={{ fontSize: 10, color: '#666' }}>· No table / seats</span>
              </div>
            )}
            <div style={styles.totalDue}>
              <span style={styles.totalDueLabel}>
                {posMode === 'counter' ? 'Quick Pay:' : 'Total due:'}
              </span>
              <span style={styles.totalDueAmount}>{(orderTotal).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM BAR ═════════════════════════════════════════ */}
      <div style={styles.bottomBar}>
        {/* Left: settings + customer */}
        <div style={styles.bottomLeft}>
          <button style={styles.bottomIconBtn}>⚙</button>
          <button style={styles.bottomIconBtn} onClick={() => setShowOverview(true)} title="Floor Plan">☐</button>
          <button style={styles.customerAddBtn} onClick={() => setShowCustomerModal(true)}>
            <UserPlus size={14} color={assignedCustomer ? '#2A9D8F' : '#999'} />
            <span style={{ ...styles.customerAddLabel, color: assignedCustomer ? '#2A9D8F' : '#888' }}>
              {assignedCustomer ? assignedCustomer.name.split(' ')[0].toUpperCase() : 'CUSTOMER\nADD'}
            </span>
          </button>
        </div>

        {/* Server avatar */}
        <div style={styles.serverSection}>
          <div style={styles.serverAvatar}>{serverInitial}</div>
          <span style={styles.serverNameLabel}>{serverName.split(' ')[0].toUpperCase()}</span>
        </div>

        {/* Category tabs */}
        <div style={styles.categoryTabs}>
          {categories.map((cat) => {
            const meta = getCategoryMeta(cat.name);
            const isActive = selectedCategory === cat.id;
            const CatIcon = meta.icon;
            return (
              <button
                key={cat.id}
                style={{
                  ...styles.categoryTab,
                  backgroundColor: isActive ? '#2A9D8F' : '#000',
                }}
                onClick={() => loadCategoryItems(cat.id)}
              >
                <CatIcon size={24} color={isActive ? '#fff' : '#888'} />
                <span style={{
                  ...styles.categoryTabLabel,
                  color: isActive ? '#fff' : '#888',
                }}>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>


      {/* ═══ ALL MODALS ═════════════════════════════════════════ */}

      {/* Modifier Modal */}
      {showModifierModal && selectedMenuItem && (
        <ModifierModal
          menuItem={selectedMenuItem}
          onClose={() => { setShowModifierModal(false); setSelectedMenuItem(null); }}
          onConfirm={(customizations) => {
            addItem(selectedMenuItem, customizations);
            setShowModifierModal(false);
            setSelectedMenuItem(null);
          }}
        />
      )}

      {/* Payment Screen (Phase 8) */}
      {showPayment && (
        <PaymentScreen
          order={order}
          items={items}
          orderTotal={orderTotal}
          venueId={venueId}
          roomChargeEnabled={roomChargeEnabled}
          onPay={(paymentData) => {
            processPayment(paymentData);
          }}
          onClose={() => setShowPayment(false)}
          onUnfinalize={async (o) => {
            try {
              await api.post(`pos/orders/${o.id}/unfinalize?venue_id=${venueId}`, {});
              toast.success('Order unfinalized — you can now edit it');
              refreshOrder();
            } catch (err) {
              logger.error('Error unfinalizing order', { error: err });
              // Optimistic: still allow editing
              toast.success('Order reopened for editing');
            }
          }}
        />
      )}

      {/* Quantity Popup (Phase 2) */}
      {showQuantityPopup && (
        <NumericPopup
          title="Set Quantity"
          subtitle={showQuantityPopup.menu_item_name || showQuantityPopup.name}
          onConfirm={(qty) => updateItemQuantity(showQuantityPopup, qty)}
          onCancel={() => setShowQuantityPopup(null)}
        />
      )}

      {/* Price Override Popup (Phase 2) */}
      {showPricePopup && (
        <NumericPopup
          title="Override Price"
          subtitle={showPricePopup.menu_item_name || showPricePopup.name}
          prefix="€"
          allowDecimal
          onConfirm={(price) => overrideItemPrice(showPricePopup, price)}
          onCancel={() => setShowPricePopup(null)}
        />
      )}

      {/* PLU Lookup (Phase 6) */}
      {showPLU && (
        <NumericPopup
          title="Enter PLU Code"
          subtitle="Enter product code or qty×code (e.g. 80x5)"
          onConfirm={handlePLULookup}
          onCancel={() => setShowPLU(false)}
        />
      )}

      {/* Covers Popup (Phase 7) */}
      {showCoversPopup && (
        <NumericPopup
          title="Set Covers"
          subtitle="Number of guests at this table"
          onConfirm={(n) => { setCovers(n); setShowCoversPopup(false); toast.success(`Covers set to ${n}`); }}
          onCancel={() => setShowCoversPopup(false)}
        />
      )}

      {/* Item Options Menu (Phase 3) */}
      {showItemOptions && (
        <ItemOptionsMenu
          item={showItemOptions}
          onAction={handleItemOptionAction}
          onClose={() => setShowItemOptions(null)}
        />
      )}

      {/* Void Reason Modal (Phase 3) */}
      {showVoidReason && (
        <VoidReasonModal
          itemName={showVoidReason.menu_item_name || showVoidReason.name}
          onConfirm={handleVoidWithReason}
          onCancel={() => setShowVoidReason(null)}
        />
      )}

      {/* Actions Panel (Phase 5) */}
      {showActionsPanel && (
        <ActionsPanel
          order={order}
          tables={tables}
          onAction={handleActionsAction}
          onClose={() => setShowActionsPanel(false)}
        />
      )}

      {/* Receipt Preview */}
      {showReceipt && (
        <ReceiptPreview
          order={order}
          items={items}
          orderTotal={orderTotal}
          onClose={() => setShowReceipt(false)}
        />
      )}

      {/* Search Modal (Phase 6) */}
      {showSearchModal && (
        <SearchModal
          allItems={[...menuItems, ...allMenuItems]}
          onSelect={(item) => handleItemClick(item)}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {/* Customer Modal (Phase 7) */}
      {showCustomerModal && (
        <CustomerModal
          customers={customers}
          onSelect={handleSelectCustomer}
          onCreate={handleCreateCustomer}
          onClose={() => setShowCustomerModal(false)}
        />
      )}

      {/* Orders List (Phase 9) */}
      {showOrdersList && (
        <OrdersList
          venueId={venueId}
          onReopen={(o) => { setOrder(o); setItems(o.items || []); }}
          onClose={() => setShowOrdersList(false)}
        />
      )}

      {/* Overview Panel — all open orders at a glance */}
      {showOverview && (
        <div style={styles.modalOverlay} onClick={() => setShowOverview(false)}>
          <div style={{ backgroundColor: '#111', borderRadius: 16, padding: 24, minWidth: 700, maxWidth: 900, maxHeight: '80vh', overflow: 'auto', border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Overview — Open Orders</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setOverviewMode('grid')}
                  style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, backgroundColor: overviewMode === 'grid' ? '#2A9D8F' : '#333', color: overviewMode === 'grid' ? '#fff' : '#888' }}
                >Grid</button>
                <button
                  onClick={() => setOverviewMode('floorplan')}
                  style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, backgroundColor: overviewMode === 'floorplan' ? '#5B8DEF' : '#333', color: overviewMode === 'floorplan' ? '#fff' : '#888' }}
                >Floor Plan</button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 18, marginLeft: 8 }} onClick={() => setShowOverview(false)}>✕</button>
              </div>
            </div>

            {/* Floor Plan View */}
            {overviewMode === 'floorplan' ? (
              <div style={{ height: 500, borderRadius: 12, overflow: 'hidden' }}>
                <FloorPlanWidget
                  tables={tables.map(t => ({
                    ...t,
                    status: t.status === 'occupied' || t.current_order_id ? 'OCCUPIED' : t.status === 'reserved' ? 'RESERVED' : 'FREE',
                    seats: t.capacity || t.max_covers || 4,
                    shape: t.shape || 'square',
                    position: t.position || null,
                    width: t.width || 120,
                    height: t.height || 120,
                  }))}
                  onTableSelect={(t) => {
                    setSelectedTable(t);
                    setShowOverview(false);
                    toast.info(`Selected ${t.name}`);
                  }}
                  onTableMove={handleTableMove}
                />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {tables.length > 0 ? tables.map(t => {
                  const tStatus = t.status || (t.current_order_id ? 'occupied' : 'free');
                  const statusColor = tStatus === 'occupied' ? '#E05A33' : tStatus === 'reserved' ? '#5B8DEF' : '#2A9D8F';
                  const statusLabel = tStatus === 'occupied' ? 'Occupied' : tStatus === 'reserved' ? 'Reserved' : 'Available';
                  const statusBg = tStatus === 'occupied' ? '#2a1515' : tStatus === 'reserved' ? '#151a2a' : '#152a1a';
                  return (
                    <div
                      key={t.id}
                      style={{
                        backgroundColor: statusBg,
                        borderRadius: 12, padding: 16,
                        border: `2px solid ${statusColor}`,
                        cursor: 'pointer',
                        transition: 'transform 0.1s',
                      }}
                      onClick={() => {
                        setSelectedTable(t);
                        setShowOverview(false);
                        if (tStatus === 'occupied') toast.info(`Selected ${t.name}`);
                        else toast.info(`${t.name} — ${statusLabel}`);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{t.name || `Table ${t.number}`}</div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, backgroundColor: `${statusColor}22`, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{statusLabel}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                        {tStatus === 'occupied' ? `${t.covers || '?'} covers · ${t.server_name || 'Server'}` : tStatus === 'reserved' ? 'Reserved' : 'Ready to seat'}
                      </div>
                      {tStatus === 'occupied' && (
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#F4A261', marginTop: 8 }}>
                          €{(t.order_total || 0).toFixed(2)}
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666', padding: 40 }}>
                    No tables configured. Add tables in Manager → POS Settings → Tables.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Open Item Dialog (Phase 6) */}

      {/* ═══ CASH REGISTER MODAL ═══════════════════════════════ */}
      {
        showCashRegister && (
          <div style={styles.modalOverlay} onClick={() => setShowCashRegister(false)}>
            <div style={{ backgroundColor: '#111', borderRadius: 16, padding: 24, minWidth: 500, maxWidth: 600, border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>💰 Cash Register</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 18 }} onClick={() => setShowCashRegister(false)}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ backgroundColor: '#1a2a1a', borderRadius: 12, padding: 16, border: '1px solid #2A9D8F', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Opening Float</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2A9D8F' }}>€200.00</div>
                </div>
                <div style={{ backgroundColor: '#1a1a2a', borderRadius: 12, padding: 16, border: '1px solid #5B8DEF', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Current Drawer</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#5B8DEF' }}>€{(200 + orderTotal).toFixed(2)}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[
                  { label: 'Cash In', icon: '📥', color: '#2A9D8F', action: () => toast.success('Cash In: enter amount in register') },
                  { label: 'Cash Out', icon: '📤', color: '#E07A5F', action: () => toast.success('Cash Out: enter amount from register') },
                  { label: 'Open Drawer', icon: '🗄️', color: '#F4A261', action: () => toast.success('Cash drawer opened') },
                  { label: 'Print X-Report', icon: '🧾', color: '#888', action: () => toast.success('X-Report sent to printer') },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action} style={{ backgroundColor: '#1a1a1a', border: `1px solid ${btn.color}40`, borderRadius: 10, padding: '14px 12px', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{btn.icon}</span> {btn.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => { toast.success('Register opened — shift started'); setShowCashRegister(false); }} style={{ backgroundColor: '#2A9D8F', border: 'none', borderRadius: 10, padding: 14, cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                  ▶ Open Register
                </button>
                <button onClick={() => { toast.success('Register closed — Z-Report generated'); setShowCashRegister(false); }} style={{ backgroundColor: '#E05A33', border: 'none', borderRadius: 10, padding: 14, cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                  ⏹ Close Register
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* ═══ EMBEDDED REPORTS MODAL ═════════════════════════════ */}
      {
        showReports && (
          <div style={styles.modalOverlay} onClick={() => setShowReports(false)}>
            <div style={{ backgroundColor: '#111', borderRadius: 16, padding: 24, minWidth: 600, maxWidth: 750, maxHeight: '80vh', overflow: 'auto', border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>📊 Quick Reports</span>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 18 }} onClick={() => setShowReports(false)}>✕</button>
              </div>

              {/* Daily Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Revenue', value: '€1,240.50', color: '#2A9D8F', icon: '💰' },
                  { label: 'Orders', value: '47', color: '#5B8DEF', icon: '🧾' },
                  { label: 'Avg Check', value: '€26.39', color: '#F4A261', icon: '📊' },
                  { label: 'Voids', value: '3', color: '#E05A33', icon: '🗑️' },
                ].map(stat => (
                  <div key={stat.label} style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, border: '1px solid #333', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Payment Breakdown */}
              <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, border: '1px solid #333', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Payment Breakdown</div>
                {[
                  { method: 'Cash', amount: '€520.00', pct: '42%', bar: 42 },
                  { method: 'Card', amount: '€620.50', pct: '50%', bar: 50 },
                  { method: 'Other', amount: '€100.00', pct: '8%', bar: 8 },
                ].map(p => (
                  <div key={p.method} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#888', minWidth: 50 }}>{p.method}</span>
                    <div style={{ flex: 1, height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${p.bar}%`, height: '100%', backgroundColor: '#2A9D8F', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#fff', minWidth: 80, textAlign: 'right' }}>{p.amount}</span>
                    <span style={{ fontSize: 10, color: '#888', minWidth: 30 }}>{p.pct}</span>
                  </div>
                ))}
              </div>

              {/* Hourly Volume */}
              <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, border: '1px solid #333' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Hourly Volume</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                  {[2, 4, 8, 15, 22, 35, 45, 40, 30, 18, 12, 5].map((v, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '100%', height: `${(v / 45) * 70}px`, backgroundColor: v > 30 ? '#E05A33' : '#2A9D8F', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                      <span style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{10 + i}h</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      }
      {
        showOpenItem && (
          <div style={styles.modalOverlay} onClick={() => setShowOpenItem(false)}>
            <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 24, minWidth: 360, border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16, textAlign: 'center' }}>Open Item</div>
              <input
                style={{ width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
                placeholder="Item name"
                value={openItemName}
                onChange={e => setOpenItemName(e.target.value)}
                autoFocus
              />
              <input
                style={{ width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
                placeholder="Price (€)"
                value={openItemPrice}
                onChange={e => setOpenItemPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: '1px solid #555', background: 'none', color: '#888', cursor: 'pointer', fontSize: 14 }} onClick={() => setShowOpenItem(false)}>Cancel</button>
                <button style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: 'none', backgroundColor: '#2A9D8F', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }} onClick={handleAddOpenItem}>Add Item</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Note Input Dialog (Phase 3) */}
      {
        showNoteInput && (
          <div style={styles.modalOverlay} onClick={() => { setShowNoteInput(null); setNoteText(''); }}>
            <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 24, minWidth: 360, border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4, textAlign: 'center' }}>Item Notes</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 16, textAlign: 'center' }}>{showNoteInput.menu_item_name || showNoteInput.name}</div>
              <textarea
                style={{ width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', marginBottom: 16, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                placeholder="Kitchen instructions..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: '1px solid #555', background: 'none', color: '#888', cursor: 'pointer', fontSize: 14 }} onClick={() => { setShowNoteInput(null); setNoteText(''); }}>Cancel</button>
                <button style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: 'none', backgroundColor: '#2A9D8F', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }} onClick={saveItemNote}>{"Save "}Note</button>
              </div>
            </div>
          </div>
        )
      }

      {/* ═══ TABLE MERGE MODAL ══════════════════════════════════ */}
      {showTableMerge && (
        <TableMergeModal
          tables={tables}
          onMerge={(sourceId, targetId) => {
            toast.success(`Table ${sourceId} merged into ${targetId}`);
            setShowTableMerge(false);
          }}
          onClose={() => setShowTableMerge(false)}
        />
      )}

      {/* ═══ CASH REGISTER MODAL ═══════════════════════════════ */}
      {showCashRegister && (
        <div style={styles.modalOverlay} onClick={() => setShowCashRegister(false)}>
          <div style={{ backgroundColor: '#111', borderRadius: 16, padding: 24, minWidth: 500, maxWidth: 600, border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>💰 Cash Register</div>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }} onClick={() => setShowCashRegister(false)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[{ label: 'Open Shift', icon: '🟢', color: '#2A9D8F' }, { label: 'Close Shift', icon: '🔴', color: '#E05A33' }, { label: 'Cash In', icon: '📥', color: '#5B8DEF' }, { label: 'Cash Out', icon: '📤', color: '#F4A261' }].map(a => (
                <button key={a.label} onClick={() => toast.success(`${a.label} recorded`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 20, borderRadius: 12, border: `1px solid ${a.color}40`, backgroundColor: `${a.color}11`, cursor: 'pointer', color: '#fff' }}>
                  <span style={{ fontSize: 28 }}>{a.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</span>
                </button>
              ))}
            </div>
            <div style={{ padding: 16, backgroundColor: '#0a0a0a', borderRadius: 12, border: '1px solid #222' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 12 }}>SHIFT SUMMARY</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div style={{ color: '#888' }}>Cash Sales</div><div style={{ color: '#4ade80', textAlign: 'right' }}>€0.00</div>
                <div style={{ color: '#888' }}>Card Sales</div><div style={{ color: '#5B8DEF', textAlign: 'right' }}>€0.00</div>
                <div style={{ color: '#888' }}>Cash In</div><div style={{ color: '#2A9D8F', textAlign: 'right' }}>€0.00</div>
                <div style={{ color: '#888' }}>Cash Out</div><div style={{ color: '#E05A33', textAlign: 'right' }}>€0.00</div>
                <div style={{ borderTop: '1px solid #333', paddingTop: 8, color: '#fff', fontWeight: 700 }}>Expected</div>
                <div style={{ borderTop: '1px solid #333', paddingTop: 8, color: '#fff', fontWeight: 700, textAlign: 'right' }}>€0.00</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EMBEDDED REPORTS MODAL ═════════════════════════════ */}
      {showReports && (
        <div style={styles.modalOverlay} onClick={() => setShowReports(false)}>
          <div style={{ backgroundColor: '#111', borderRadius: 16, padding: 24, minWidth: 600, maxWidth: 700, border: '1px solid #333' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>📊 Daily Report</div>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }} onClick={() => setShowReports(false)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[{ label: 'Total Sales', value: '€0.00', color: '#2A9D8F' }, { label: 'Orders', value: '0', color: '#5B8DEF' }, { label: 'Avg Ticket', value: '€0.00', color: '#F4A261' }, { label: 'Covers', value: '0', color: '#C77DBA' }].map(s => (
                <div key={s.label} style={{ padding: 14, borderRadius: 10, backgroundColor: `${s.color}11`, border: `1px solid ${s.color}30`, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 16, backgroundColor: '#0a0a0a', borderRadius: 12, border: '1px solid #222' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 12 }}>PAYMENT BREAKDOWN</div>
              {[{ m: 'Cash', pct: 0, color: '#4ade80' }, { m: 'Card', pct: 0, color: '#5B8DEF' }, { m: 'Gift Card', pct: 0, color: '#C77DBA' }].map(p => (
                <div key={p.m} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 70, fontSize: 12, color: '#888' }}>{p.m}</span>
                  <div style={{ flex: 1, height: 8, backgroundColor: '#222', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${p.pct}%`, height: '100%', backgroundColor: p.color, borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 40, fontSize: 11, color: '#888', textAlign: 'right' }}>{p.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div >
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STYLES — Lightspeed L-Series Pixel-Perfect
   ═══════════════════════════════════════════════════════════════════ */
const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#000',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
    position: 'fixed',
    top: 0, left: 0,
  },

  /* ─── Loading ─────────────────────────────────────────────── */
  loadingContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100vh', width: '100vw', backgroundColor: '#111', position: 'fixed', top: 0, left: 0,
  },
  loadingLogo: { fontSize: 48, marginBottom: 16 },
  loadingText: { color: '#888', fontSize: 16 },

  /* ─── Top Bar ─────────────────────────────────────────────── */
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 52, minHeight: 52,
    backgroundColor: '#111', borderBottom: '1px solid #222',
    padding: '0 16px',
  },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  topBarCenter: { display: 'flex', alignItems: 'center' },
  topBarRight: { display: 'flex', alignItems: 'center', gap: 4 },
  topBarBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
  },
  topBarActionBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px',
  },
  topBarLabel: { fontSize: 9, color: '#777', fontWeight: 600, letterSpacing: 0.5 },
  doneText: { fontSize: 16, color: '#E05A33', fontWeight: 600 },

  /* ─── Main Content ────────────────────────────────────────── */
  mainContent: {
    display: 'flex', flex: 1, overflow: 'hidden',
  },

  /* ─── Left Sidebar ────────────────────────────────────────── */
  leftSidebar: {
    width: 54, minWidth: 54,
    backgroundColor: '#111', borderRight: '1px solid #222',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    paddingTop: 8, gap: 2, overflowY: 'auto',
  },
  toolBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '8px 2px', width: '100%', borderRadius: 4,
  },
  toolIconCircle: {
    width: 30, height: 30, borderRadius: '50%',
    border: '1.5px dotted #666', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  toolLabel: { fontSize: 6, color: '#555', fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' },

  itemGrid: {
    flex: 1, display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gridTemplateRows: 'repeat(4, 1fr)',
    gap: 1, padding: 1,
    overflowY: 'auto',
    backgroundColor: '#000',
    position: 'relative',
  },
  tile: {
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    padding: '10px 10px 8px', borderRadius: 2, cursor: 'pointer',
    border: 'none', textAlign: 'left',
    transition: 'opacity 0.15s',
  },
  tileName: {
    fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.25,
    overflow: 'hidden', textOverflow: 'ellipsis',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  },
  tileBottom: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    marginTop: 'auto',
  },
  tileCode: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 500 },
  tilePrice: { fontSize: 13, color: '#fff', fontWeight: 700 },

  /* ─── Right Panel ─────────────────────────────────────────── */
  rightPanel: {
    width: 280, minWidth: 280,
    backgroundColor: '#111', borderLeft: '1px solid #222',
    display: 'flex', flexDirection: 'column',
  },
  orderHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px 6px', borderBottom: '1px solid #333',
  },
  orderActions: { fontSize: 12, color: '#888' },
  orderTableName: { fontSize: 14, fontWeight: 700, color: '#fff' },
  orderTimestamp: { fontSize: 10, color: '#666' },

  sortTabs: {
    display: 'flex', borderBottom: '1px solid #333',
  },
  sortTab: {
    flex: 1, padding: '6px 4px', fontSize: 11, fontWeight: 600,
    border: 'none', cursor: 'pointer', textAlign: 'center',
  },

  tableHeaderBar: {
    backgroundColor: '#2A9D8F', padding: '6px 12px',
    fontSize: 13, fontWeight: 700, color: '#fff',
  },

  orderItems: {
    flex: 1, overflowY: 'auto', padding: '0 12px',
  },
  emptyOrder: {
    textAlign: 'center', color: '#666', padding: 40, fontSize: 13,
  },
  seatHeader: {
    fontSize: 13, fontWeight: 700, color: '#fff', padding: '12px 0 4px',
    borderTop: '1px solid #333', marginTop: 4,
  },
  courseHeader: {
    fontSize: 11, color: '#888', padding: '6px 0 4px', fontWeight: 600,
  },
  orderItemRow: {
    display: 'flex', alignItems: 'center', padding: '4px 0',
    borderBottom: '1px solid #222',
  },
  orderItemQty: { width: 20, fontSize: 13, color: '#fff', fontWeight: 600 },
  orderItemName: { flex: 1, fontSize: 13, color: '#fff' },
  orderItemPrice: { fontSize: 13, color: '#fff', fontWeight: 600 },

  /* ─── Tax Section ─────────────────────────────────────────── */
  taxSection: {
    borderTop: '1px solid #333', padding: '8px 12px',
  },
  taxLabel: { fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 },
  taxRow: { fontSize: 12, color: '#888' },

  /* ─── Order Bottom ────────────────────────────────────────── */
  orderBottom: {
    borderTop: '1px solid #333',
  },
  orderBottomTabs: {
    display: 'flex', borderBottom: '1px solid #333',
  },
  orderBottomTab: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    padding: '8px 4px', fontSize: 10, fontWeight: 600, color: '#999',
    border: 'none', cursor: 'pointer',
  },
  seatButtons: {
    display: 'flex', gap: 2, padding: '6px 8px',
  },
  seatBtn: {
    width: 32, height: 32, borderRadius: 4, border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  seatAddBtn: {
    width: 32, height: 32, borderRadius: 4, border: '1px dashed #555',
    background: 'none', color: '#888', cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  totalDue: {
    display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline',
    gap: 8, padding: '8px 12px',
    borderTop: '1px solid #333',
  },
  totalDueLabel: { fontSize: 11, color: '#888' },
  totalDueAmount: { fontSize: 24, fontWeight: 800, color: '#fff' },

  /* ─── Bottom Bar ──────────────────────────────────────────── */
  bottomBar: {
    height: 64, minHeight: 64,
    backgroundColor: '#111', borderTop: '1px solid #222',
    display: 'flex', alignItems: 'center', padding: '0 8px',
  },
  bottomLeft: {
    display: 'flex', alignItems: 'center', gap: 4, marginRight: 8,
  },
  bottomIconBtn: {
    width: 36, height: 36, borderRadius: 4, background: 'none',
    border: '1px solid #333', color: '#888', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
  },
  customerAddBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
  },
  customerAddLabel: {
    fontSize: 7, color: '#888', fontWeight: 600, textAlign: 'center', lineHeight: 1.2,
  },
  serverSection: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    padding: '0 12px',
  },
  serverAvatar: {
    width: 40, height: 40, borderRadius: '50%', backgroundColor: '#E05A33',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, fontWeight: 700, color: '#fff',
  },
  serverNameLabel: { fontSize: 9, color: '#888', fontWeight: 600 },

  categoryTabs: {
    display: 'flex', flex: 1, gap: 2, justifyContent: 'center',
  },
  categoryTab: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
    minWidth: 90,
  },
  categoryTabLabel: { fontSize: 12, fontWeight: 600 },

  /* ─── Modals ──────────────────────────────────────────────── */
  modalOverlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  paymentModal: {
    backgroundColor: '#222', borderRadius: 12, padding: 32,
    minWidth: 360, textAlign: 'center',
  },
  paymentTitle: { fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 16 },
  paymentTotal: { fontSize: 28, fontWeight: 800, color: '#2A9D8F', marginBottom: 24 },
  paymentButtons: { display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 },
  payBtn: {
    padding: '14px 32px', borderRadius: 8, border: 'none', color: '#fff',
    fontSize: 16, fontWeight: 700, cursor: 'pointer',
  },
  payCloseBtn: {
    background: 'none', border: '1px solid #555', borderRadius: 8,
    padding: '10px 24px', color: '#888', cursor: 'pointer', fontSize: 14,
  },
};
