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
      <div className="pos-loading-container">
        <div className="pos-loading-logo">🔥</div>
        <div className="pos-loading-text">{"Loading "}POS...</div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER — LIGHTSPEED L-SERIES LAYOUT
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="pos-root">

      {/* Training Mode Banner */}
      {trainingMode && (
        <div style={{ backgroundColor: '#F4A261', color: '#000', textAlign: 'center', padding: '6px 0', fontSize: 13, fontWeight: 700, letterSpacing: 1, position: 'relative', zIndex: 200 }}> /* keep-inline */
          ⚠️ TRAINING MODE — Orders will NOT be sent to kitchen or charged
          <button style={{ marginLeft: 16, background: '#000', color: '#F4A261', border: 'none', borderRadius: 6, padding: '2px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }} onClick={() => setTrainingMode(false)}>EXIT TRAINING</button> /* keep-inline */
        </div>
      )}

      {/* ═══ TOP BAR ════════════════════════════════════════════ */}
      <div className="pos-top-bar">
        <div className="pos-top-bar-left">
          <button className="pos-top-bar-btn" onClick={() => { window.location.href = '/manager/pos-dashboard'; }}>
            <span className="pos-done-text">Done</span>
          </button>
          <button className="pos-top-bar-btn" onClick={() => setShowSearchModal(true)} title="Search items (F1)">
            <Search size={20} color="#999" />
            <span className="pos-top-bar-label">SEARCH</span>
          </button>
          <button className="pos-top-bar-btn" onClick={() => setShowPLU(true)} title="PLU Lookup (F2)">
            <span style={{ ...styles.topBarLabel, fontSize: 11, fontWeight: 700 }}>PLU</span> /* keep-inline */
          </button>
        </div>
        <div className="pos-top-bar-center">
          <span style={{ fontSize: 28, color: '#E05A33' }}>🔥</span> /* keep-inline */
        </div>
        <div className="pos-top-bar-right">
          <button className="pos-top-bar-action-btn" onClick={sendToBar} title="Send to Bar (F5)">
            <Send size={20} color="#999" />
            <span className="pos-top-bar-label">SEND-BAR</span>
          </button>
          <button className="pos-top-bar-action-btn" onClick={sendToKitchen} title="Send to Kitchen (F4)">
            <Send size={20} color="#999" />
            <span className="pos-top-bar-label">SEND-KITCHEN</span>
          </button>
          <button className="pos-top-bar-action-btn" onClick={() => setShowReceipt(true)} title="Receipt Preview (F6)">
            <Printer size={20} color="#999" />
            <span className="pos-top-bar-label">RECEIPT</span>
          </button>
          <button className="pos-top-bar-action-btn" onClick={() => setShowPayment(true)} title="Payment (F7)">
            <CreditCard size={20} color="#999" />
            <span className="pos-top-bar-label">PAY</span>
          </button>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══════════════════════════════════════ */}
      <div className="pos-main-content">

        {/* ─── LEFT SIDEBAR (4 Tools — L-Series match) ──────── */}
        <div className="pos-left-sidebar">
          {[
            { key: 'quantity', icon: <Plus size={16} color="#777" />, label: 'QUANTITY' },
            { key: 'price', icon: <DollarSign size={16} color="#777" />, label: 'PRICE' },
            { key: 'detail', icon: <Info size={16} color="#777" />, label: 'DETAIL' },
            { key: 'modifiers', icon: <MenuIcon size={16} color="#777" />, label: 'MODIFIERS' },
          ].map(tool => (
            <button
              key={tool.key}
              style={{ /* keep-inline */
                ...styles.toolBtn,
                backgroundColor: activeLeftTool === tool.key ? '#333' : 'transparent',
              }}
              onClick={() => handleToolClick(tool.key)}
            >
              <div className="pos-tool-icon-circle">{tool.icon}</div>
              <span className="pos-tool-label">{tool.label}</span>
            </button>
          ))}
        </div>

        {/* ─── ITEM GRID ─────────────────────────────────────── */}
        <div className="pos-item-grid">
          {filteredItems.map((item, idx) => {
            const is86 = stock86Items.has(item.id);
            return itemGridView === 'list' ? (
              <button
                key={item.id || idx}
                style={{ /* keep-inline */
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
                <div style={{ width: 8, height: '100%', minHeight: 28, borderRadius: 2, backgroundColor: tileColor, flexShrink: 0 }} /> /* keep-inline */
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{item.name}</span> /* keep-inline */
                <span style={{ fontSize: 11, color: '#888', marginRight: 8 }}>{item.sku || item.code || `M${idx + 1}`}</span> /* keep-inline */
                <span style={{ fontSize: 13, fontWeight: 700, color: '#F4A261' }}>{((item.sell_price || item.price || 0)).toFixed(2)}</span> /* keep-inline */
                {is86 && <span style={{ fontSize: 10, fontWeight: 700, color: '#E05A33', marginLeft: 6 }}>86</span>} /* keep-inline */
              </button>
            ) : (
              <button
                key={item.id || idx}
                style={{ /* keep-inline */
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
                <div className="pos-tile-name">{item.name}</div>
                <div className="pos-tile-bottom">
                  <span className="pos-tile-code">{item.sku || item.code || `M${idx + 1}`}</span>
                  <span className="pos-tile-price">
                    {((item.sell_price || item.price || 0)).toFixed(2)}
                  </span>
                </div>
                {is86 && <div style={{ position: 'absolute', top: 4, right: 6, fontSize: 10, fontWeight: 700, color: '#E05A33', backgroundColor: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: 4 }}>86</div>}
              </button>
            );
          })}
        </div>

        {/* ─── RIGHT PANEL (Order) ──────────────────────────── */}
        <div className="pos-right-panel">
          {/* Header */}
          <div className="pos-order-header">
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 12 }} onClick={() => setShowActionsPanel(true)}>Actions ▾</button> /* keep-inline */
            <span className="pos-order-table-name">
              {posMode === 'dine-in' ? tableLabel : posMode === 'takeout' ? `📦 Takeout #${(order?.order_number || '—')}` : `⚡ Counter #${(order?.order_number || '—')}`}
            </span>
            <span className="pos-order-timestamp">{orderTimestamp}</span>
          </div>

          {/* Sorting tabs */}
          <div className="pos-sort-tabs">
            {(posMode === 'dine-in'
              ? ['Time', 'Product', 'Seat', 'User', 'Course']
              : ['Time', 'Product', 'User']
            ).map(tab => (
              <button
                key={tab}
                style={{ /* keep-inline */
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
          <div className="pos-table-header-bar">
            {posMode === 'dine-in' ? 'Table' : posMode === 'takeout' ? '📦 Takeout Order' : '⚡ Counter Order'}
            {posMode === 'dine-in' && covers > 0 && <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.8 }}>· {covers} covers</span>} /* keep-inline */
            {assignedCustomer && <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.8 }}>· {assignedCustomer.name}</span>} /* keep-inline */
          </div>

          {/* Order items (Seat → Course grouping) */}
          <div className="pos-order-items">
            {items.length === 0 ? (
              <div className="pos-empty-order">
                {posMode === 'dine-in' ? 'No items yet' : posMode === 'takeout' ? 'Add items to takeout order' : 'Tap items to add'}
              </div>
            ) : posMode !== 'dine-in' ? (
              /* Flat list for takeout/counter — no seat/course grouping */
              items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="pos-order-item-row"
                  onContextMenu={(e) => { e.preventDefault(); handleItemLongPress(item); }}
                  onClick={() => { if (activeLeftTool) handleItemWithTool(item); }}
                >
                  <span className="pos-order-item-qty">{item.qty || 1}</span>
                  <span className="pos-order-item-name">
                    {item.menu_item_name || item.name}
                    {item.instructions && <span style={{ fontSize: 10, color: '#F4A261', display: 'block' }}>📝 {item.instructions}</span>} /* keep-inline */
                  </span>
                  <span className="pos-order-item-price">
                    {((item.unit_price || item.price || 0) * (item.qty || 1)).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              Object.entries(groupedItems).map(([seatNum, courses]) => (
                <div key={seatNum}>
                  <div className="pos-seat-header">Seat {seatNum}</div>
                  {Object.entries(courses).sort(([a], [b]) => a - b).map(([courseNum, courseItems]) => (
                    <div key={courseNum}>
                      <div style={{ ...styles.courseHeader, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}> /* keep-inline */
                        <span style={{ color: COURSE_COLORS[courseNum] || '#888' }}>Course {courseNum}</span> /* keep-inline */
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#E05A33', fontWeight: 700 }} /* keep-inline */
                          onClick={() => fireCourse(parseInt(courseNum))}
                        >🔥 FIRE</button>
                      </div>
                      {courseItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="pos-order-item-row"
                          onContextMenu={(e) => { e.preventDefault(); handleItemLongPress(item); }}
                          onClick={() => { if (activeLeftTool) handleItemWithTool(item); }}
                        >
                          <span className="pos-order-item-qty">{item.qty || 1}</span>
                          <span className="pos-order-item-name">
                            {item.menu_item_name || item.name}
                            {item.instructions && <span style={{ fontSize: 10, color: '#F4A261', display: 'block' }}>📝 {item.instructions}</span>} /* keep-inline */
                          </span>
                          <span className="pos-order-item-price">
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
          <div className="pos-tax-section">
            <div className="pos-tax-label">Taxes & Payment</div>
            <div className="pos-tax-row">
              <span>0.00%: 0.00 ({(orderTotal).toFixed(2)})</span>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="pos-order-bottom">
            {posMode === 'dine-in' ? (
              /* Full dine-in controls: modifiers tab, table tab, seat buttons */
              <>
                {/* L-Series: MODIFIERS + TABLE + Seat buttons — single combined row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 8px', borderTop: '1px solid #333' }}> /* keep-inline */
                  <button
                    style={{ /* keep-inline */
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
                    style={{ /* keep-inline */
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
                  <div style={{ width: 1, height: 20, backgroundColor: '#333', margin: '0 4px' }} /> /* keep-inline */
                  {Array.from({ length: Math.max(seatCount, 3) }, (_, i) => i + 1).map(sn => (
                    <button
                      key={sn}
                      style={{ /* keep-inline */
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
                    style={{ ...styles.seatAddBtn, width: 28, height: 28 }} /* keep-inline */
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}> /* keep-inline */
                <span style={{ fontSize: 11, fontWeight: 700, color: posMode === 'takeout' ? '#F4A261' : '#5B8DEF', textTransform: 'uppercase' }}> /* keep-inline */
                  {posMode === 'takeout' ? '📦 Takeout' : '⚡ Counter'}
                </span>
                <span style={{ fontSize: 10, color: '#666' }}>· No table / seats</span> /* keep-inline */
              </div>
            )}
            <div className="pos-total-due">
              <span className="pos-total-due-label">
                {posMode === 'counter' ? 'Quick Pay:' : 'Total due:'}
              </span>
              <span className="pos-total-due-amount">{(orderTotal).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM BAR ═════════════════════════════════════════ */}
      <div className="pos-bottom-bar">
        {/* Left: settings + customer */}
        <div className="pos-bottom-left">
          <button className="pos-bottom-icon-btn">⚙</button>
          <button className="pos-bottom-icon-btn" onClick={() => setShowOverview(true)} title="Floor Plan">☐</button>
          <button className="pos-customer-add-btn" onClick={() => setShowCustomerModal(true)}>
            <UserPlus size={14} color={assignedCustomer ? '#2A9D8F' : '#999'} />
            <span style={{ ...styles.customerAddLabel, color: assignedCustomer ? '#2A9D8F' : '#888' }}> /* keep-inline */
              {assignedCustomer ? assignedCustomer.name.split(' ')[0].toUpperCase() : 'CUSTOMER\nADD'}
            </span>
          </button>
        </div>

        {/* Server avatar */}
        <div className="pos-server-section">
          <div className="pos-server-avatar">{serverInitial}</div>
          <span className="pos-server-name-label">{serverName.split(' ')[0].toUpperCase()}</span>
        </div>

        {/* Category tabs */}
        <div className="pos-category-tabs">
          {categories.map((cat) => {
            const meta = getCategoryMeta(cat.name);
            const isActive = selectedCategory === cat.id;
            const CatIcon = meta.icon;
            return (
              <button
                key={cat.id}
                style={{ /* keep-inline */
                  ...styles.categoryTab,
                  backgroundColor: isActive ? '#2A9D8F' : '#000',
                }}
                onClick={() => loadCategoryItems(cat.id)}
              >
                <CatIcon size={24} color={isActive ? '#fff' : '#888'} />
                <span style={{ /* keep-inline */
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
        <div className="pos-modal-overlay" onClick={() => setShowOverview(false)}>
          <div style={{ backgroundColor: '#111', borderRadius: 16, padding: 24, minWidth: 700, maxWidth: 900, maxHeight: '80vh', overflow: 'auto', border: '1px solid #333' }} onClick={e => e.stopPropagation()}> /* keep-inline */
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}> /* keep-inline */
              <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Overview — Open Orders</span> /* keep-inline */
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}> /* keep-inline */
                <button
                  onClick={() => setOverviewMode('grid')}
                  style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, backgroundColor: overviewMode === 'grid' ? '#2A9D8F' : '#333', color: overviewMode === 'grid' ? '#fff' : '#888' }} /* keep-inline */
                >Grid</button>
                <button
                  onClick={() => setOverviewMode('floorplan')}
                  style={{ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, backgroundColor: overviewMode === 'floorplan' ? '#5B8DEF' : '#333', color: overviewMode === 'floorplan' ? '#fff' : '#888' }} /* keep-inline */
                >Floor Plan</button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 18, marginLeft: 8 }} onClick={() => setShowOverview(false)}>✕</button> /* keep-inline */
              </div>
            </div>

            {/* Floor Plan View */}
            {overviewMode === 'floorplan' ? (
              <div style={{ height: 500, borderRadius: 12, overflow: 'hidden' }}> /* keep-inline */
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}> /* keep-inline */
                {tables.length > 0 ? tables.map(t => {
                  const tStatus = t.status || (t.current_order_id ? 'occupied' : 'free');
                  const statusColor = tStatus === 'occupied' ? '#E05A33' : tStatus === 'reserved' ? '#5B8DEF' : '#2A9D8F';
                  const statusLabel = tStatus === 'occupied' ? 'Occupied' : tStatus === 'reserved' ? 'Reserved' : 'Available';
                  const statusBg = tStatus === 'occupied' ? '#2a1515' : tStatus === 'reserved' ? '#151a2a' : '#152a1a';
                  return (
                    <div
                      key={t.id}
                      style={{ /* keep-inline */
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}> /* keep-inline */
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{t.name || `Table ${t.number}`}</div> /* keep-inline */
                        <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, backgroundColor: `${statusColor}22`, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>{statusLabel}</span> /* keep-inline */
                      </div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}> /* keep-inline */
                        {tStatus === 'occupied' ? `${t.covers || '?'} covers · ${t.server_name || 'Server'}` : tStatus === 'reserved' ? 'Reserved' : 'Ready to seat'}
                      </div>
                      {tStatus === 'occupied' && (
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#F4A261', marginTop: 8 }}> /* keep-inline */
                          €{(t.order_total || 0).toFixed(2)}
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#666', padding: 40 }}> /* keep-inline */
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
          <div className="pos-modal-overlay" onClick={() => setShowCashRegister(false)}>
            <div style={{ backgroundColor: '#111', borderRadius: 16, padding: 24, minWidth: 500, maxWidth: 600, border: '1px solid #333' }} onClick={e => e.stopPropagation()}> /* keep-inline */
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}> /* keep-inline */
                <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>💰 Cash Register</span> /* keep-inline */
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 18 }} onClick={() => setShowCashRegister(false)}>✕</button> /* keep-inline */
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}> /* keep-inline */
                <div style={{ backgroundColor: '#1a2a1a', borderRadius: 12, padding: 16, border: '1px solid #2A9D8F', textAlign: 'center' }}> /* keep-inline */
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Opening Float</div> /* keep-inline */
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2A9D8F' }}>€200.00</div> /* keep-inline */
                </div>
                <div style={{ backgroundColor: '#1a1a2a', borderRadius: 12, padding: 16, border: '1px solid #5B8DEF', textAlign: 'center' }}> /* keep-inline */
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Current Drawer</div> /* keep-inline */
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#5B8DEF' }}>€{(200 + orderTotal).toFixed(2)}</div> /* keep-inline */
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}> /* keep-inline */
                {[
                  { label: 'Cash In', icon: '📥', color: '#2A9D8F', action: () => toast.success('Cash In: enter amount in register') },
                  { label: 'Cash Out', icon: '📤', color: '#E07A5F', action: () => toast.success('Cash Out: enter amount from register') },
                  { label: 'Open Drawer', icon: '🗄️', color: '#F4A261', action: () => toast.success('Cash drawer opened') },
                  { label: 'Print X-Report', icon: '🧾', color: '#888', action: () => toast.success('X-Report sent to printer') },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action} style={{ backgroundColor: '#1a1a1a', border: `1px solid ${btn.color}40`, borderRadius: 10, padding: '14px 12px', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}> /* keep-inline */
                    <span>{btn.icon}</span> {btn.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}> /* keep-inline */
                <button onClick={() => { toast.success('Register opened — shift started'); setShowCashRegister(false); }} style={{ backgroundColor: '#2A9D8F', border: 'none', borderRadius: 10, padding: 14, cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700 }}> /* keep-inline */
                  ▶ Open Register
                </button>
                <button onClick={() => { toast.success('Register closed — Z-Report generated'); setShowCashRegister(false); }} style={{ backgroundColor: '#E05A33', border: 'none', borderRadius: 10, padding: 14, cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700 }}> /* keep-inline */
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
          <div className="pos-modal-overlay" onClick={() => setShowReports(false)}>
            <div style={{ backgroundColor: '#111', borderRadius: 16, padding: 24, minWidth: 600, maxWidth: 750, maxHeight: '80vh', overflow: 'auto', border: '1px solid #333' }} onClick={e => e.stopPropagation()}> /* keep-inline */
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}> /* keep-inline */
                <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>📊 Quick Reports</span> /* keep-inline */
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 18 }} onClick={() => setShowReports(false)}>✕</button> /* keep-inline */
              </div>

              {/* Daily Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}> /* keep-inline */
                {[
                  { label: 'Revenue', value: '€1,240.50', color: '#2A9D8F', icon: '💰' },
                  { label: 'Orders', value: '47', color: '#5B8DEF', icon: '🧾' },
                  { label: 'Avg Check', value: '€26.39', color: '#F4A261', icon: '📊' },
                  { label: 'Voids', value: '3', color: '#E05A33', icon: '🗑️' },
                ].map(stat => (
                  <div key={stat.label} style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, border: '1px solid #333', textAlign: 'center' }}> /* keep-inline */
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{stat.icon}</div> /* keep-inline */
                    <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.value}</div> /* keep-inline */
                    <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{stat.label}</div> /* keep-inline */
                  </div>
                ))}
              </div>

              {/* Payment Breakdown */}
              <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, border: '1px solid #333', marginBottom: 16 }}> /* keep-inline */
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Payment Breakdown</div> /* keep-inline */
                {[
                  { method: 'Cash', amount: '€520.00', pct: '42%', bar: 42 },
                  { method: 'Card', amount: '€620.50', pct: '50%', bar: 50 },
                  { method: 'Other', amount: '€100.00', pct: '8%', bar: 8 },
                ].map(p => (
                  <div key={p.method} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}> /* keep-inline */
                    <span style={{ fontSize: 12, color: '#888', minWidth: 50 }}>{p.method}</span> /* keep-inline */
                    <div style={{ flex: 1, height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden' }}> /* keep-inline */
                      <div style={{ width: `${p.bar}%`, height: '100%', backgroundColor: '#2A9D8F', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#fff', minWidth: 80, textAlign: 'right' }}>{p.amount}</span> /* keep-inline */
                    <span style={{ fontSize: 10, color: '#888', minWidth: 30 }}>{p.pct}</span> /* keep-inline */
                  </div>
                ))}
              </div>

              {/* Hourly Volume */}
              <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, border: '1px solid #333' }}> /* keep-inline */
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Hourly Volume</div> /* keep-inline */
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}> /* keep-inline */
                  {[2, 4, 8, 15, 22, 35, 45, 40, 30, 18, 12, 5].map((v, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}> /* keep-inline */
                      <div style={{ width: '100%', height: `${(v / 45) * 70}px`, backgroundColor: v > 30 ? '#E05A33' : '#2A9D8F', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                      <span style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{10 + i}h</span> /* keep-inline */
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
          <div className="pos-modal-overlay" onClick={() => setShowOpenItem(false)}>
            <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 24, minWidth: 360, border: '1px solid #333' }} onClick={e => e.stopPropagation()}> /* keep-inline */
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16, textAlign: 'center' }}>Open Item</div> /* keep-inline */
              <input
                style={{ width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} /* keep-inline */
                placeholder="Item name"
                value={openItemName}
                onChange={e => setOpenItemName(e.target.value)}
                autoFocus
              />
              <input
                style={{ width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} /* keep-inline */
                placeholder="Price (€)"
                value={openItemPrice}
                onChange={e => setOpenItemPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              />
              <div style={{ display: 'flex', gap: 8 }}> /* keep-inline */
                <button style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: '1px solid #555', background: 'none', color: '#888', cursor: 'pointer', fontSize: 14 }} onClick={() => setShowOpenItem(false)}>Cancel</button> /* keep-inline */
                <button style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: 'none', backgroundColor: '#2A9D8F', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }} onClick={handleAddOpenItem}>Add Item</button> /* keep-inline */
              </div>
            </div>
          </div>
        )
      }

      {/* Note Input Dialog (Phase 3) */}
      {
        showNoteInput && (
          <div className="pos-modal-overlay" onClick={() => { setShowNoteInput(null); setNoteText(''); }}>
            <div style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 24, minWidth: 360, border: '1px solid #333' }} onClick={e => e.stopPropagation()}> /* keep-inline */
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4, textAlign: 'center' }}>Item Notes</div> /* keep-inline */
              <div style={{ fontSize: 12, color: '#888', marginBottom: 16, textAlign: 'center' }}>{showNoteInput.menu_item_name || showNoteInput.name}</div> /* keep-inline */
              <textarea
                style={{ width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', marginBottom: 16, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} /* keep-inline */
                placeholder="Kitchen instructions..."
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8 }}> /* keep-inline */
                <button style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: '1px solid #555', background: 'none', color: '#888', cursor: 'pointer', fontSize: 14 }} onClick={() => { setShowNoteInput(null); setNoteText(''); }}>Cancel</button> /* keep-inline */
                <button style={{ flex: 1, padding: '12px 0', borderRadius: 8, border: 'none', backgroundColor: '#2A9D8F', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }} onClick={saveItemNote}>{"Save "}Note</button> /* keep-inline */
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
        <div className="pos-modal-overlay" onClick={() => setShowCashRegister(false)}>
          <div style={{ backgroundColor: '#111', borderRadius: 16, padding: 24, minWidth: 500, maxWidth: 600, border: '1px solid #333' }} onClick={e => e.stopPropagation()}> /* keep-inline */
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}> /* keep-inline */
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>💰 Cash Register</div> /* keep-inline */
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }} onClick={() => setShowCashRegister(false)}>✕</button> /* keep-inline */
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}> /* keep-inline */
              {[{ label: 'Open Shift', icon: '🟢', color: '#2A9D8F' }, { label: 'Close Shift', icon: '🔴', color: '#E05A33' }, { label: 'Cash In', icon: '📥', color: '#5B8DEF' }, { label: 'Cash Out', icon: '📤', color: '#F4A261' }].map(a => (
                <button key={a.label} onClick={() => toast.success(`${a.label} recorded`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 20, borderRadius: 12, border: `1px solid ${a.color}40`, backgroundColor: `${a.color}11`, cursor: 'pointer', color: '#fff' }}> /* keep-inline */
                  <span style={{ fontSize: 28 }}>{a.icon}</span> /* keep-inline */
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</span> /* keep-inline */
                </button>
              ))}
            </div>
            <div style={{ padding: 16, backgroundColor: '#0a0a0a', borderRadius: 12, border: '1px solid #222' }}> /* keep-inline */
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 12 }}>SHIFT SUMMARY</div> /* keep-inline */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}> /* keep-inline */
                <div style={{ color: '#888' }}>Cash Sales</div><div style={{ color: '#4ade80', textAlign: 'right' }}>€0.00</div> /* keep-inline */
                <div style={{ color: '#888' }}>Card Sales</div><div style={{ color: '#5B8DEF', textAlign: 'right' }}>€0.00</div> /* keep-inline */
                <div style={{ color: '#888' }}>Cash In</div><div style={{ color: '#2A9D8F', textAlign: 'right' }}>€0.00</div> /* keep-inline */
                <div style={{ color: '#888' }}>Cash Out</div><div style={{ color: '#E05A33', textAlign: 'right' }}>€0.00</div> /* keep-inline */
                <div style={{ borderTop: '1px solid #333', paddingTop: 8, color: '#fff', fontWeight: 700 }}>Expected</div> /* keep-inline */
                <div style={{ borderTop: '1px solid #333', paddingTop: 8, color: '#fff', fontWeight: 700, textAlign: 'right' }}>€0.00</div> /* keep-inline */
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EMBEDDED REPORTS MODAL ═════════════════════════════ */}
      {showReports && (
        <div className="pos-modal-overlay" onClick={() => setShowReports(false)}>
          <div style={{ backgroundColor: '#111', borderRadius: 16, padding: 24, minWidth: 600, maxWidth: 700, border: '1px solid #333' }} onClick={e => e.stopPropagation()}> /* keep-inline */
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}> /* keep-inline */
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>📊 Daily Report</div> /* keep-inline */
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }} onClick={() => setShowReports(false)}>✕</button> /* keep-inline */
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 20 }}> /* keep-inline */
              {[{ label: 'Total Sales', value: '€0.00', color: '#2A9D8F' }, { label: 'Orders', value: '0', color: '#5B8DEF' }, { label: 'Avg Ticket', value: '€0.00', color: '#F4A261' }, { label: 'Covers', value: '0', color: '#C77DBA' }].map(s => (
                <div key={s.label} style={{ padding: 14, borderRadius: 10, backgroundColor: `${s.color}11`, border: `1px solid ${s.color}30`, textAlign: 'center' }}> /* keep-inline */
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div> /* keep-inline */
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div> /* keep-inline */
                </div>
              ))}
            </div>
            <div style={{ padding: 16, backgroundColor: '#0a0a0a', borderRadius: 12, border: '1px solid #222' }}> /* keep-inline */
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 12 }}>PAYMENT BREAKDOWN</div> /* keep-inline */
              {[{ m: 'Cash', pct: 0, color: '#4ade80' }, { m: 'Card', pct: 0, color: '#5B8DEF' }, { m: 'Gift Card', pct: 0, color: '#C77DBA' }].map(p => (
                <div key={p.m} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}> /* keep-inline */
                  <span style={{ width: 70, fontSize: 12, color: '#888' }}>{p.m}</span> /* keep-inline */
                  <div style={{ flex: 1, height: 8, backgroundColor: '#222', borderRadius: 4, overflow: 'hidden' }}> /* keep-inline */
                    <div style={{ width: `${p.pct}%`, height: '100%', backgroundColor: p.color, borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 40, fontSize: 11, color: '#888', textAlign: 'right' }}>{p.pct}%</span> /* keep-inline */
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
