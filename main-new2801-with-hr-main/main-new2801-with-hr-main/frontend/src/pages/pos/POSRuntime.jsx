import React, { useState, useEffect } from 'react';
import { Grid, ShoppingCart, Send, CreditCard, X, Trash2, Users, TableIcon } from 'lucide-react';
import axios from 'axios';
import ModifierModalNew from '../../components/ModifierModalNew';
import StateModal from '../../components/StateModal';

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
  const [showSplitModal, setShowSplitModal] = useState(false);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    initSession();
    
    // Keyboard shortcuts
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && order && items.length > 0 && !showPayment && !showModifier) {
        sendOrder();
      }
      if (e.key === 'Escape' && showModifier) {
        setShowModifier(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [order, items, showPayment, showModifier]);

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
    }
  };

  const loadMenuFromSnapshot = async (snapshotId) => {
    const snapshot = await axios.get(`${API_URL}/api/pos/snapshots/${snapshotId}`);
    setCategories(snapshot.data.payload.categories || []);
    setMenuItems(snapshot.data.payload.items || []);
    if (snapshot.data.payload.categories?.length > 0) {
      setSelectedCategory(snapshot.data.payload.categories[0].id);
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
          table_id: 'table-001'
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
    setSelectedMenuItem(menuItem);
    setShowModifier(true);
  };

  const addItemToOrder = async (itemWithModifiers) => {
    if (!order) await createOrder();

    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.post(
        `${API_URL}/api/pos/orders/${order.id}/items`,
        {
          order_id: order.id,
          venue_id: venueId,
          menu_item_id: itemWithModifiers.id,
          qty: itemWithModifiers.quantity || 1,
          modifiers: itemWithModifiers.modifiers || []
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setItems([...items, response.data.item]);
      refreshOrder();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const removeItem = async (itemId) => {
    try {
      const newItems = items.filter(i => i.id !== itemId);
      setItems(newItems);
      refreshOrder();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const refreshOrder = async () => {
    if (!order) return;
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/pos/orders/${order.id}?venue_id=${venueId}`,
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
      alert('Order sent to kitchen!');
      refreshOrder();
    } catch (error) {
      console.error('Error sending order:', error);
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

      alert('Payment successful!');
      setOrder(null);
      setItems([]);
      setShowPayment(false);
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment failed: ' + error.response?.data?.error?.code);
    }
  };

  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category_id === selectedCategory)
    : menuItems;

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white text-2xl">Loading POS...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col lg:flex-row">
      {/* Left: Categories - Responsive */}
      <div className="lg:w-48 bg-zinc-900 border-r border-white/10 p-3 lg:p-2 overflow-x-auto lg:overflow-x-visible">
        <h3 className="font-bold text-xs mb-3" style={{ color: '#A1A1AA' }}>CATEGORIES</h3>
        <div className="flex lg:flex-col gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`min-w-[120px] lg:w-full p-3 rounded-xl text-left font-medium transition-all duration-150 ${
                selectedCategory === cat.id
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
      </div>

      {/* Center: Items Grid - Responsive */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-2xl font-heading" style={{ color: '#F5F5F7' }}>Menu Items</h2>
          {order && items.length > 0 && (
            <button
              onClick={sendOrder}
              className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl"
            >
              <Send className="w-5 h-5" />
              Send to Kitchen
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuItemClick(item)}
              className="bg-zinc-900 rounded-xl p-4 sm:p-6 text-center hover:bg-zinc-800 transition-all duration-150 border-2 border-transparent hover:border-red-500/50 active:scale-95"
              style={{ minHeight: '120px' }}
            >
              <div className="text-base sm:text-lg font-bold mb-2" style={{ color: '#F5F5F7' }}>
                {item.name}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-red-500">
                €{item.price?.toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Order Summary - Responsive */}
      <div className="lg:w-96 bg-zinc-900 border-t lg:border-t-0 lg:border-l border-white/10 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-6 h-6 text-red-500" />
          <h3 className="text-xl font-heading" style={{ color: '#F5F5F7' }}>Current Order</h3>
        </div>

        {!order ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              <Grid className="w-16 h-16 mx-auto mb-4" style={{ color: '#52525B' }} />
              <p className="text-sm" style={{ color: '#A1A1AA' }}>No active order</p>
              <p className="text-xs mt-1" style={{ color: '#71717A' }}>Add items to start</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-2 mb-4 overflow-y-auto max-h-[400px]">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-800 rounded-lg p-3 border border-white/5 hover:border-red-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium" style={{ color: '#F5F5F7' }}>
                        {item.menu_item_name}
                      </div>
                      <div className="text-sm mt-1" style={{ color: '#A1A1AA' }}>
                        Qty: {item.qty}
                      </div>
                      <div className="text-xs text-blue-400 mt-1">{item.state}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="font-bold text-red-500">
                        €{item.pricing.line_total.toFixed(2)}
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-white/10 pt-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span style={{ color: '#A1A1AA' }}>Subtotal:</span>
                <span style={{ color: '#D4D4D8' }}>€{order.totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#A1A1AA' }}>Tax:</span>
                <span style={{ color: '#D4D4D8' }}>€{order.totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold">
                <span style={{ color: '#F5F5F7' }}>Total:</span>
                <span className="text-red-500">€{order.totals.grand_total.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => setShowPayment(true)}
                className="w-full btn-primary h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
              >
                <CreditCard className="w-6 h-6" />
                Pay Now
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowSplitModal(true)}
                  className="btn-secondary h-10 rounded-lg text-sm"
                >
                  <Users className="w-4 h-4 mr-1 inline" />
                  Split
                </button>
                <button className="btn-secondary h-10 rounded-lg text-sm">
                  <TableIcon className="w-4 h-4 mr-1 inline" />
                  Transfer
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modifier Modal */}
      {showModifier && selectedMenuItem && (
        <ModifierModalNew
          item={selectedMenuItem}
          modifierGroups={[
            {
              id: 'cooking',
              name: 'How would you like it cooked?',
              required: false,
              multiple: false,
              options: [
                { id: 'rare', name: 'Rare', price_adjustment: 0 },
                { id: 'medium', name: 'Medium', price_adjustment: 0 },
                { id: 'well', name: 'Well Done', price_adjustment: 0 }
              ]
            },
            {
              id: 'extras',
              name: 'Add Extras',
              required: false,
              multiple: true,
              options: [
                { id: 'cheese', name: 'Extra Cheese', price_adjustment: 2.50 },
                { id: 'bacon', name: 'Bacon', price_adjustment: 3.00 },
                { id: 'sauce', name: 'Special Sauce', price_adjustment: 1.50 }
              ]
            }
          ]}
          onAdd={(itemWithModifiers) => {
            addItemToOrder(itemWithModifiers);
            setShowModifier(false);
          }}
          onClose={() => setShowModifier(false)}
        />
      )}

      {/* Payment Modal */}
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
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all active:scale-95"
              >
                Cash
              </button>
              <button
                onClick={() => processPayment(order.totals.grand_total, 'CARD')}
                className="w-full py-4 btn-primary rounded-xl font-bold"
              >
                Card
              </button>
              <button
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold border border-white/10 transition-all"
              >
                Split Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Modal */}
      {showSplitModal && (
        <StateModal
          type="info"
          title="Split Bill"
          message="Split bill functionality coming soon. You can split by seat or by item."
          actions={[
            { label: 'Close', onClick: () => setShowSplitModal(false) }
          ]}
          onClose={() => setShowSplitModal(false)}
        />
      )}
    </div>
  );
}

export default POSRuntime;
