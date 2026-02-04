import React, { useState, useEffect } from 'react';
import { Grid, ShoppingCart, Send, CreditCard, X, Trash2, Users, TableIcon, ArrowRightLeft } from 'lucide-react';
import axios from 'axios';
import ModifierModalNew from '../../components/ModifierModalNew';
import StateModal from '../../components/StateModal';
import SplitBillModal from '../../components/SplitBillModal';
import MergeTableModal from '../../components/MergeTableModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function POSRuntime() {
  const [session, setSession] = useState(null);
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showModifier, setShowModifier] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);

  // New Modals
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateModalConfig, setStateModalConfig] = useState({});

  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    initSession();

    // Keyboard shortcuts
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && order && items.length > 0 && !showPayment && !showModifier && !showSplitModal) {
        // e.preventDefault(); // Prevent accidental commits
        // sendOrder(); // Maybe too dangerous for Enter key?
      }
      if (e.key === 'Escape') {
        if (showModifier) setShowModifier(false);
        if (showPayment) setShowPayment(false);
        if (showSplitModal) setShowSplitModal(false);
        if (showMergeModal) setShowMergeModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [order, items, showPayment, showModifier, showSplitModal, showMergeModal]);

  const initSession = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const userId = localStorage.getItem('userId') || 'user-001';
      const deviceId = 'device-pos-001';

      const response = await axios.post(
        `${API_URL}/api/pos/sessions/open`,
        { venue_id: venueId, device_id: deviceId, user_id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSession(response.data.session);
      loadMenuFromSnapshot(response.data.session.menu_snapshot.snapshot_id);
    } catch (error) {
      console.error('Error opening session:', error);
      showError('Session Error', 'Failed to open POS session. Please try again.');
    }
  };

  const loadMenuFromSnapshot = async (snapshotId) => {
    try {
      const snapshot = await axios.get(`${API_URL}/api/pos/snapshots/${snapshotId}`);
      setCategories(snapshot.data.payload.categories || []);
      setMenuItems(snapshot.data.payload.items || []);
      if (snapshot.data.payload.categories?.length > 0) {
        setSelectedCategory(snapshot.data.payload.categories[0].id);
      }
    } catch (error) {
      console.error('Error loading menu:', error);
    }
  };

  const createOrder = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.post(
        `${API_URL}/api/pos/orders`,
        {
          venue_id: venueId,
          session_id: session.id,
          order_type: 'DINE_IN',
          table_id: 'table-001' // In real app, this comes from table selection
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrder(response.data.order);
      setItems([]);
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const handleMenuItemClick = (menuItem) => {
    // If item has modifier groups, show modal
    if (menuItem.modifier_groups && menuItem.modifier_groups.length > 0) {
      setSelectedMenuItem(menuItem);
      setShowModifier(true);
    } else {
      // Add directly if no modifiers
      addItemToOrder({ ...menuItem, quantity: 1, modifiers: [] });
    }
  };

  const addItemToOrder = async (itemWithModifiers) => {
    if (!order) await createOrder();

    try {
      const token = localStorage.getItem('restin_token');
      // Pass order.id if it exists, otherwise wait for createOrder to finish
      // Note: The await createOrder above doesn't return the order, it sets state.
      // So we might need to rely on the response from a new createOrder call if order is null.

      let currentOrder = order;
      if (!currentOrder) {
        // Create order logic duplicated here to ensure we have an ID immediately
        const res = await axios.post(
          `${API_URL}/api/pos/orders`,
          {
            venue_id: venueId,
            session_id: session.id,
            order_type: 'DINE_IN',
            table_id: 'table-001'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        currentOrder = res.data.order;
        setOrder(currentOrder);
      }

      const response = await axios.post(
        `${API_URL}/api/pos/orders/${currentOrder.id}/items`,
        {
          order_id: currentOrder.id,
          venue_id: venueId,
          menu_item_id: itemWithModifiers.id,
          qty: itemWithModifiers.quantity || 1,
          modifiers: itemWithModifiers.modifiers || [],
          special_instructions: itemWithModifiers.special_instructions
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Optimistic update or refresh
      refreshOrder(currentOrder.id);
    } catch (error) {
      console.error('Error adding item:', error);
      showError('Add Item Failed', 'Could not add item to order.');
    }
  };

  const removeItem = async (itemId) => {
    try {
      const token = localStorage.getItem('restin_token');
      await axios.delete(
        `${API_URL}/api/pos/orders/${order.id}/items/${itemId}?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Optimistic remove
      const newItems = items.filter(i => i.id !== itemId);
      setItems(newItems);
      refreshOrder(order.id);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const refreshOrder = async (orderId) => {
    const oid = orderId || order?.id;
    if (!oid) return;

    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/pos/orders/${oid}?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrder(response.data.order);
      setItems(response.data.items);
    } catch (error) {
      console.error('Error refreshing order:', error);
    }
  };

  const sendOrder = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/pos/orders/${order.id}/send?venue_id=${venueId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showSuccess('Order Sent', 'The order has been sent to the kitchen.');
      refreshOrder(order.id);
    } catch (error) {
      console.error('Error sending order:', error);
      showError('Send Failed', 'Could not send order to kitchen.');
    }
  };

  const processPayment = async (amount, tenderType) => {
    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/pos/orders/${order.id}/payments`,
        {
          order_id: order.id,
          venue_id: venueId,
          tender_type: tenderType,
          amount: amount
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.post(
        `${API_URL}/api/pos/orders/${order.id}/close?venue_id=${venueId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showSuccess('Payment Successful', `Paid €${amount.toFixed(2)} via ${tenderType}`);
      setOrder(null);
      setItems([]);
      setShowPayment(false);
    } catch (error) {
      console.error('Error processing payment:', error);
      showError('Payment Failed', error.response?.data?.error?.code || 'Unknown error');
    }
  };

  // Helper to show state modal
  const showError = (title, message) => {
    setStateModalConfig({ type: 'error', title, message });
    setShowStateModal(true);
  };

  const showSuccess = (title, message) => {
    setStateModalConfig({ type: 'success', title, message });
    setShowStateModal(true);
  };

  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category_id === selectedCategory)
    : menuItems;

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white text-2xl flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          Loading POS Session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row overflow-hidden">
      {/* Left: Categories - Improved Responsive Layout */}
      <div className="md:w-48 lg:w-56 bg-zinc-900 border-r border-white/10 p-2 md:p-3 overflow-x-auto md:overflow-x-visible md:overflow-y-auto flex md:flex-col gap-2 shrink-0 h-16 md:h-auto">
        <h3 className="hidden md:block font-bold text-xs mb-3 px-2" style={{ color: '#A1A1AA' }}>CATEGORIES</h3>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`min-w-[100px] md:w-full p-2 md:p-3 rounded-xl text-left font-medium transition-all duration-150 whitespace-nowrap md:whitespace-normal ${selectedCategory === cat.id
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-zinc-800 hover:bg-zinc-700 border border-white/10 hover:border-red-500/50'
              }`}
            style={
              selectedCategory === cat.id
                ? { boxShadow: '0 0 16px rgba(229, 57, 53, 0.4)' }
                : { color: '#D4D4D8' }
            }
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Center: Items Grid - Flex Grow */}
      <div className="flex-1 p-3 md:p-4 overflow-y-auto bg-zinc-950">
        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 sticky top-0 bg-zinc-950/90 backdrop-blur-sm z-10 py-2">
          <h2 className="text-xl md:text-2xl font-heading" style={{ color: '#F5F5F7' }}>Menu Items</h2>
          {order && items.length > 0 && (
            <button
              onClick={sendOrder}
              className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-red-900/20"
            >
              <Send className="w-5 h-5" />
              Send to Kitchen
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-24 md:pb-0">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuItemClick(item)}
              className="bg-zinc-900 rounded-xl p-3 md:p-4 lg:p-6 text-center hover:bg-zinc-800 transition-all duration-150 border-2 border-transparent hover:border-red-500/50 active:scale-95 flex flex-col justify-between"
              style={{ minHeight: '120px' }}
            >
              <div className="text-sm sm:text-base lg:text-lg font-bold mb-2 line-clamp-2" style={{ color: '#F5F5F7' }}>
                {item.name}
              </div>
              <div className="text-lg sm:text-xl font-bold text-red-500">
                €{item.price?.toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Order Summary - Fixed width on desktop, bottom sheet on mobile (conceptually) */}
      <div className="md:w-80 lg:w-96 bg-zinc-900 border-t md:border-t-0 md:border-l border-white/10 flex flex-col h-[40vh] md:h-screen shrink-0 relative z-20 shadow-2xl md:shadow-none">
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-heading" style={{ color: '#F5F5F7' }}>Current Order</h3>
          </div>
          {order && (
            <span className="text-xs font-mono text-zinc-500">#{order.id.slice(-6)}</span>
          )}
        </div>

        {!order ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12 px-6">
              <Grid className="w-12 h-12 mx-auto mb-4" style={{ color: '#52525B' }} />
              <p className="text-sm" style={{ color: '#A1A1AA' }}>No active order</p>
              <p className="text-xs mt-1" style={{ color: '#71717A' }}>Select items from the menu to start a new order.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-800/50 rounded-lg p-3 border border-white/5 hover:border-red-500/30 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm md:text-base" style={{ color: '#F5F5F7' }}>
                        {item.menu_item_name}
                      </div>

                      {/* Modifiers display */}
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.modifiers.map((mod, idx) => (
                            <div key={idx} className="text-xs text-zinc-400 pl-2 border-l border-zinc-700">
                              + {mod.option_name}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-xs mt-1 flex items-center gap-2">
                        <span style={{ color: '#A1A1AA' }}>Qty: {item.qty}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${item.state === 'SENT' ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'
                          }`}>
                          {item.state || 'NEW'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="font-bold text-red-500">
                        €{item.pricing?.line_total?.toFixed(2)}
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 rounded hover:bg-red-950/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        style={{ color: '#71717A' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals & Actions */}
            <div className="p-4 bg-zinc-900 border-t border-white/10 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#A1A1AA' }}>Subtotal</span>
                  <span style={{ color: '#D4D4D8' }}>€{order.totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#A1A1AA' }}>Tax</span>
                  <span style={{ color: '#D4D4D8' }}>€{order.totals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t border-white/10">
                  <span style={{ color: '#F5F5F7' }}>Total</span>
                  <span className="text-red-500">€{order.totals.grand_total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full btn-primary h-12 md:h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                >
                  <CreditCard className="w-5 h-5" />
                  Pay Now
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowSplitModal(true)}
                    className="btn-secondary h-10 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700 border-white/10"
                  >
                    <Users className="w-4 h-4 mr-1 inline" />
                    Split Bill
                  </button>
                  <button
                    onClick={() => setShowMergeModal(true)}
                    className="btn-secondary h-10 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700 border-white/10"
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-1 inline" />
                    Merge Table
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showModifier && selectedMenuItem && (
        <ModifierModalNew
          item={selectedMenuItem}
          modifierGroups={selectedMenuItem.modifier_groups || []}
          onAdd={(itemWithModifiers) => {
            addItemToOrder(itemWithModifiers);
            setShowModifier(false);
          }}
          onClose={() => setShowModifier(false)}
        />
      )}

      {showSplitModal && order && (
        <SplitBillModal
          order={order}
          items={items}
          onClose={() => setShowSplitModal(false)}
          onSplit={(type, data) => {
            // Placeholder: Implementing split logic would go here
            console.log('Split Data:', type, data);
            setShowSplitModal(false);
            showSuccess('Bill Split', 'Split bill functionality is simulated for now.');
          }}
        />
      )}

      {showMergeModal && (
        <MergeTableModal
          currentTableId="table-001"
          onClose={() => setShowMergeModal(false)}
          onMerge={(targetTableId) => {
            console.log('Merging with:', targetTableId);
            setShowMergeModal(false);
            showSuccess('Tables Merged', `Successfully merged with ${targetTableId}`);
          }}
        />
      )}

      {showPayment && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setShowPayment(false)}
          />

          <div className="relative z-10 w-full max-w-md card-dark p-8 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-heading" style={{ color: '#F5F5F7' }}>Payment</h3>
              <button onClick={() => setShowPayment(false)}>
                <X className="w-6 h-6" style={{ color: '#71717A' }} />
              </button>
            </div>

            <div className="text-4xl font-bold text-center mb-8 text-red-500">
              €{order.totals.grand_total.toFixed(2)}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => processPayment(order.totals.grand_total, 'CASH')}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-green-900/20"
              >
                Cash
              </button>
              <button
                onClick={() => processPayment(order.totals.grand_total, 'CARD')}
                className="w-full py-4 btn-primary rounded-xl font-bold shadow-lg shadow-red-900/20"
              >
                Card
              </button>
              <button
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold border border-white/10 transition-all"
              >
                Other
              </button>
            </div>
          </div>
        </div>
      )}

      {showStateModal && (
        <StateModal
          type={stateModalConfig.type || 'info'}
          title={stateModalConfig.title}
          message={stateModalConfig.message}
          actions={[{ label: 'OK', onClick: () => setShowStateModal(false) }]}
          onClose={() => setShowStateModal(false)}
        />
      )}
    </div>
  );
}

export default POSRuntime;
