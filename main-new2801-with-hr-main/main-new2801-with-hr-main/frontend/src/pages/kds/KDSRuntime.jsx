import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, ChefHat, CheckCircle, XCircle, AlertTriangle, Undo2 } from 'lucide-react';
import axios from 'axios';
import CountdownTimer, { formatTime } from '../../components/kds/CountdownTimer';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function KDSRuntime() {
  const { stationKey } = useParams();
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [undoToast, setUndoToast] = useState(null);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    bootstrap();
    const interval = setInterval(fetchTickets, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [stationKey]);

  const bootstrap = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/kds/runtime/${stationKey}/bootstrap?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSettings(response.data.settings);
      await fetchTickets();
    } catch (error) {
      console.error('Error bootstrapping:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/kds/runtime/${stationKey}/tickets?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const bumpTicket = async (ticketId, newStatus) => {
    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/kds/runtime/${stationKey}/tickets/${ticketId}/bump?venue_id=${venueId}`,
        { new_status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUndoToast({ ticketId, action: 'bump', timestamp: Date.now() });
      setTimeout(() => setUndoToast(null), 30000);
      toast.success(`Ticket updated to ${newStatus}`);
      await fetchTickets();
    } catch (error) {
      console.error('Error bumping ticket:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to update ticket status';
      toast.error(`Error: ${errorMsg}`);
    }
  };

  const undoLastAction = async () => {
    if (!undoToast) return;
    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/kds/runtime/${stationKey}/undo?ticket_id=${undoToast.ticketId}&venue_id=${venueId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUndoToast(null);
      await fetchTickets();
    } catch (error) {
      console.error('Error undoing:', error);
      alert('Cannot undo - time window expired');
    }
  };

  const getWaitTimeColor = (waitTime) => {
    if (!waitTime) return { color: '#71717A' };
    switch (waitTime.visual_state) {
      case 'late':
        return { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', border: '1px solid rgba(239, 68, 68, 0.3)' };
      case 'delayed':
        return { backgroundColor: 'rgba(251, 140, 0, 0.2)', color: '#FDB86C', border: '1px solid rgba(251, 140, 0, 0.3)' };
      default:
        return { backgroundColor: 'rgba(74, 222, 128, 0.2)', color: '#86EFAC', border: '1px solid rgba(74, 222, 128, 0.3)' };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'NEW':
        return { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#93C5FD', border: '1px solid rgba(59, 130, 246, 0.3)' };
      case 'WORKING':
        return { backgroundColor: 'rgba(251, 140, 0, 0.15)', color: '#FDB86C', border: '1px solid rgba(251, 140, 0, 0.3)' };
      case 'READY':
        return { backgroundColor: 'rgba(74, 222, 128, 0.15)', color: '#86EFAC', border: '1px solid rgba(74, 222, 128, 0.3)' };
      case 'COMPLETED':
        return { backgroundColor: 'rgba(161, 161, 170, 0.15)', color: '#A1A1AA', border: '1px solid rgba(161, 161, 170, 0.3)' };
      default:
        return { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#D4D4D8', border: '1px solid rgba(255, 255, 255, 0.1)' };
    }
  };

  const getNextStatus = (currentStatus) => {
    const flow = {
      'NEW': 'PREPARING',
      'PREPARING': 'READY',
      'READY': 'COMPLETED',
    };
    return flow[currentStatus] || 'COMPLETED';
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'ALL') return ticket.status !== 'COMPLETED';
    return ticket.status === filter;
  });

  if (loading) {
    return (
      <div  className="min-h-screen flex items-center justify-center " style={{ backgroundColor: '#0A0A0B' }}>
        <div  className="text-center\">
          <div  className="text-2xl font-bold " style={{ color: '#F5F5F7' }}>Loading KDS...</div>
        </div>
      </div>
    );
  }

  return (
    <div  className="min-h-screen p-4 " style={{ backgroundColor: '#0A0A0B', color: '#F5F5F7' }}>
      {/* Header */}
      <div  className="mb-6 flex items-center justify-between\">
        <div>
          <h1  className="text-3xl font-bold " style={{ color: '#F5F5F7' }}>{stationKey} Station</h1>
          <p style={{ color: '#A1A1AA' }}>Active Orders: {filteredTickets.length}</p>
        </div>

        {/* Status Filters */}
        <div  className="flex gap-2\">
          {['ALL', 'NEW', 'PREPARING', 'READY', 'ON_HOLD'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-150`}
              style={
                filter === status
                  ? { 
                      backgroundColor: '#E53935', 
                      color: '#FFFFFF',
                      boxShadow: '0 0 12px rgba(229, 57, 53, 0.4)',
                      border: '1px solid rgba(229, 57, 53, 0.5)'
                    }
                  : { 
                      backgroundColor: '#27272A',
                      color: '#A1A1AA',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }
              }
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Grid */}
      <div  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4\">
        {filteredTickets.map((ticket) => (
          <div
            key={ticket.id}
             className="rounded-xl p-4 shadow-lg transition-all\"
            style={{
              backgroundColor: '#18181B',
              border: ticket.wait_time?.visual_state === 'late' ? '2px solid #E53935' :
                      ticket.wait_time?.visual_state === 'delayed' ? '2px solid #FB8C00' :
                      '2px solid rgba(255, 255, 255, 0.1)',
              animation: ticket.wait_time?.visual_state === 'late' ? 'pulse 2s infinite' : 'none'
            }}
          >
            {/* Ticket Header */}
            <div  className="flex items-center justify-between mb-3\">
              <div  className="flex items-center gap-2\">
                <span 
                   className="px-3 py-1 rounded-full text-sm font-bold\"
                  style={getStatusColor(ticket.status)}
                >
                  {ticket.status}
                </span>
                <span 
                   className="px-2 py-1 rounded text-xs font-medium\"
                  style={getWaitTimeColor(ticket.wait_time)}
                >
                  {ticket.wait_time?.minutes || 0}min
                </span>
              </div>
            </div>

            {/* Order Details */}
            {ticket.order_details && (
              <div  className="mb-3 pb-3 " style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div  className="flex items-center justify-between text-sm\">
                  <span  className="font-semibold " style={{ color: '#F5F5F7' }}>{ticket.order_details.table_name}</span>
                  <span style={{ color: '#A1A1AA' }}>{ticket.order_details.server_name}</span>
                </div>
                <div  className="text-xs mt-1 " style={{ color: '#71717A' }}>
                  Covers: {ticket.order_details.guest_count}
                </div>
              </div>
            )}

            {/* Items */}
            <div className="space-y-2 mb-4">
              {ticket.order_details?.items?.map((item, idx) => (
                <div key={idx} className="bg-gray-700 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.menu_item_name}</span>
                    <span className="text-sm text-gray-400">x{item.quantity}</span>
                  </div>
                  {item.notes && (
                    <p className="text-xs mt-1" style={{ color: '#FDB86C' }}>{item.notes}</p>
                  )}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-xs mt-1" style={{ color: '#A1A1AA' }}>
                      {item.modifiers.map(m => m?.name || 'Unknown').join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {ticket.status !== 'COMPLETED' && (
                <button
                  onClick={() => bumpTicket(ticket.id, getNextStatus(ticket.status))}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
                >
                  <CheckCircle className="w-5 h-5" />
                  {getNextStatus(ticket.status)}
                </button>
              )}
              {ticket.status !== 'ON_HOLD' && ticket.status !== 'COMPLETED' && (
                <button
                  onClick={() => bumpTicket(ticket.id, 'ON_HOLD')}
                  className="px-3 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition"
                >
                  <AlertTriangle className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTickets.length === 0 && (
        <div className="text-center py-20">
          <ChefHat className="w-20 h-20 mx-auto text-gray-600 mb-4" />
          <p className="text-2xl font-medium text-gray-400">No orders in {filter} status</p>
        </div>
      )}

      {/* Undo Toast */}
      {undoToast && (
        <div className="fixed bottom-6 right-6 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-4 flex items-center gap-4 animate-fade-in">
          <div>
            <p className="font-medium">Action completed</p>
            <p className="text-sm text-gray-400">Click undo within 30 seconds</p>
          </div>
          <button
            onClick={undoLastAction}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default KDSRuntime;
