import React, { useState, useEffect } from 'react';
import { Grid, ShoppingCart, Send, CreditCard, X, Plus, Trash2, User } from 'lucide-react';
import axios from 'axios';
import ModifierModal from './ModifierModal';
import { logger } from '../../lib/logger';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function POSRuntimeEnhanced() {
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    initSession();
  }, []);

  const initSession = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const userId = user?.id || localStorage.getItem('userId') || 'user-001';
      const deviceId = 'device-pos-001';

      const response = await axios.post(
        `${API_URL}/api/pos/sessions/open`,
        { venue_id: venueId, device_id: deviceId, user_id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSession(response.data.session);
      loadMenuFromSnapshot(response.data.session.menu_snapshot.snapshot_id);
    } catch (error) {
      logger.error('Error opening session', { error });
    }
  };

  const loadMenuFromSnapshot = async (snapshotId) => {
    try {
      const token = localStorage.getItem('restin_token');
      const snapshot = await axios.get(
        `${API_URL}/api/pos/snapshots/${snapshotId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCategories(snapshot.data.payload.categories || []);
      setMenuItems(snapshot.data.payload.items || []);
      if (snapshot.data.payload.categories?.length > 0) {
        setSelectedCategory(snapshot.data.payload.categories[0].id);
      }
    } catch (error) {
      // Fallback: load from regular menu
      const token = localStorage.getItem('restin_token');
      const menuResponse = await axios.get(
        `${API_URL}/api/menu/categories?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const itemsResponse = await axios.get(
        `${API_URL}/api/menu/items?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCategories(menuResponse.data || []);
      setMenuItems(itemsResponse.data || []);
      if (menuResponse.data?.length > 0) {
        setSelectedCategory(menuResponse.data[0].id);
      }
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
      logger.error('Error creating order', { error });
    }
  };

  const handleItemClick = (menuItem) => {
    if (menuItem.modifier_groups && menuItem.modifier_groups.length > 0) {
      setSelectedMenuItem(menuItem);
      setShowModifierModal(true);
    } else {
      addItem(menuItem, { modifiers: [], instructions: '' });
    }
  };

  const addItem = async (menuItem, customizations) => {
    if (!order) await createOrder();

    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.post(
        `${API_URL}/api/pos/orders/${order?.id || (await createOrder()).id}/items`,
        {
          order_id: order?.id,
          venue_id: venueId,
          menu_item_id: menuItem.id,
          qty: 1,
          modifiers: customizations.modifiers || [],
          instructions: customizations.instructions
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await refreshOrder();
    } catch (error) {
      logger.error('Error adding item', { error });
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
      logger.error('Error refreshing order', { error });
    }
  };

  const voidItem = async (itemId) => {
    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/pos/orders/${order.id}/items/${itemId}/void?venue_id=${venueId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refreshOrder();
    } catch (error) {
      logger.error('Error voiding item', { error });
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

      // AUTO-PRINT Logic (Fire & Forget)
      try {
        // 1. Find a Kitchen Printer
        const printersRes = await axios.get(`${API_URL}/api/printers?venue_id=${venueId}&type=Kitchen`);
        const kitchenPrinter = printersRes.data?.[0];

        if (kitchenPrinter) {
          await axios.post(`${API_URL}/api/print/jobs`, {
            printer_id: kitchenPrinter.id,
            context_data: {
              order_id: order.id,
              table: 'Table 1',
              items: items.map(i => ({ name: i.menu_item_name, qty: i.qty }))
            }
          }, { headers: { Authorization: `Bearer ${token}` } });
          logger.info('Print job sent', { printer: kitchenPrinter.name });
        } else {
          logger.warn('No kitchen printer found for auto-print');
        }
      } catch (e) {
        logger.error('Auto-print failed', { error: e });
      }

      toast.success('Order sent to kitchen!');
      refreshOrder();
    } catch (error) {
      logger.error('Error sending order', { error });
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

      toast.success('Payment successful!');
      setOrder(null);
      setItems([]);
      setShowPayment(false);
    } catch (error) {
      logger.error('Error processing payment', { error });
      toast.error('Payment failed: ' + (error.response?.data?.error?.code || 'Unknown error'));
    }
  };

  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category_id === selectedCategory)
    : menuItems;

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-2xl">Loading POS...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left: Categories */}
      <div className="w-56 bg-gray-900 text-white p-3 space-y-2 overflow-y-auto">
        <h3 className="font-bold text-sm text-gray-400 mb-3 px-2">CATEGORIES</h3>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`w-full p-4 rounded-lg text-left font-semibold transition text-base ${selectedCategory === cat.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Center: Items Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-foreground">Menu</h2>
          {order && (
            <button
              onClick={sendOrder}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-lg shadow-lg"
            >
              <Send className="w-6 h-6" />
              Send to Kitchen
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="bg-white rounded-2xl p-6 text-center hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500 active:scale-95"
              style={{ minHeight: '140px' }}
            >
              <div className="text-lg font-bold text-foreground mb-3 line-clamp-2">{item.name}</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">€{item.price?.toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Order Summary */}
      <div className="w-[400px] bg-white border-l border-gray-200 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingCart className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          <h3 className="text-2xl font-bold text-foreground">Order</h3>
          {user && (
            <span className="ml-auto text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded flex items-center gap-1">
              <User className="w-3 h-3" /> {user.name}
            </span>
          )}
        </div>

        {!order ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Grid className="w-20 h-20 mb-4" />
            <p className="text-lg">No active order</p>
            <p className="text-sm">Tap items to start</p>
          </div>
        ) : (
          <>
            {/* Items List */}
            <div className="flex-1 space-y-3 mb-6 overflow-y-auto">
              {items.filter(i => i.state !== 'VOIDED').map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-xl p-4 relative">
                  <button
                    onClick={() => voidItem(item.id)}
                    className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded-lg text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="font-semibold text-foreground mb-1 pr-8">{item.menu_item_name}</div>
                  <div className="text-sm text-gray-600 mb-2">Qty: {item.qty}</div>

                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                      {item.modifiers.length} modifier(s)
                    </div>
                  )}

                  {item.instructions && (
                    <div className="text-xs text-gray-500 italic mb-2">"{item.instructions}"</div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${item.state === 'SENT' ? 'bg-green-100 text-green-700' :
                      item.state === 'FIRED' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                      {item.state}
                    </span>
                    <span className="font-bold text-foreground">€{item.pricing.line_total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-200 pt-4 space-y-3 mb-6">
              <div className="flex justify-between text-base text-gray-600">
                <span>Subtotal:</span>
                <span className="font-semibold">€{order.totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base text-gray-600">
                <span>Tax (18%):</span>
                <span className="font-semibold">€{order.totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold text-foreground">
                <span>Total:</span>
                <span>€{order.totals.grand_total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Button */}
            <button
              onClick={() => setShowPayment(true)}
              disabled={items.length === 0}
              className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xl shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-7 h-7" />
              Pay €{order.totals.grand_total.toFixed(2)}
            </button>
          </>
        )}
      </div>

      {/* Modifier Modal */}
      {showModifierModal && selectedMenuItem && (
        <ModifierModal
          menuItem={selectedMenuItem}
          onClose={() => {
            setShowModifierModal(false);
            setSelectedMenuItem(null);
          }}
          onConfirm={(customizations) => {
            addItem(selectedMenuItem, customizations);
            setSelectedMenuItem(null);
          }}
        />
      )}

      {/* Payment Modal */}
      {showPayment && order && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-[500px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-3xl font-bold text-foreground">Payment</h3>
              <button onClick={() => setShowPayment(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="text-5xl font-bold text-center mb-8 text-foreground">
              €{order.totals.grand_total.toFixed(2)}
            </div>

            <div className="space-y-4">
              <button
                onClick={() => processPayment(order.totals.grand_total, 'CASH')}
                className="w-full py-6 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-xl shadow-lg"
              >
                💵 Cash
              </button>
              <button
                onClick={() => processPayment(order.totals.grand_total, 'CARD')}
                className="w-full py-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xl shadow-lg"
              >
                💳 Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POSRuntimeEnhanced;
