import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, TrendingUp, Activity, Timer } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const chartTheme = {
  background: '#18181B',
  text: '#D4D4D8',
  grid: 'rgba(255, 255, 255, 0.1)',
  primary: '#E53935',
  success: '#4ADE80',
  warning: '#FB8C00'
};

export default function KDSPerformance() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/reports/kds/station-summary?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(response.data);
    } catch (error) {
      console.error('Error loading KDS stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data for visualization
  const throughputData = [
    { hour: '11:00', tickets: 12, avgTime: 8.5 },
    { hour: '12:00', tickets: 28, avgTime: 9.2 },
    { hour: '13:00', tickets: 35, avgTime: 11.3 },
    { hour: '14:00', tickets: 22, avgTime: 8.8 },
    { hour: '15:00', tickets: 8, avgTime: 7.2 }
  ];

  const stationData = [
    { station: 'GRILL', completed: 45, avgTime: 12.3 },
    { station: 'COLD', completed: 38, avgTime: 6.5 },
    { station: 'FRY', completed: 28, avgTime: 8.2 },
    { station: 'EXPO', completed: 52, avgTime: 4.1 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center">
        <div className="text-white">Loading KDS Performance...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-heading mb-2" style={{ color: '#F5F5F7' }}>
          KDS PERFORMANCE
        </h1>
        <p style={{ color: '#A1A1AA' }}>Kitchen display system analytics and insights</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card-dark p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-red-500" />
            <span className="text-xs" style={{ color: '#71717A' }}>Today</span>
          </div>
          <div className="text-3xl font-bold text-red-500 mb-1">156</div>
          <div className="text-sm" style={{ color: '#A1A1AA' }}>Total Tickets</div>
        </div>

        <div className="stat-card-dark p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Timer className="w-5 h-5 text-green-500" />
            <span className="text-xs" style={{ color: '#71717A' }}>Avg</span>
          </div>
          <div className="text-3xl font-bold text-green-500 mb-1">8.7m</div>
          <div className="text-sm" style={{ color: '#A1A1AA' }}>Prep Time</div>
        </div>

        <div className="stat-card-dark p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="text-xs" style={{ color: '#71717A' }}>Peak</span>
          </div>
          <div className="text-3xl font-bold text-blue-500 mb-1">35</div>
          <div className="text-sm" style={{ color: '#A1A1AA' }}>Tickets/Hour</div>
        </div>

        <div className="stat-card-dark p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="text-xs" style={{ color: '#71717A' }}>Late</span>
          </div>
          <div className="text-3xl font-bold text-yellow-500 mb-1">3</div>
          <div className="text-sm" style={{ color: '#A1A1AA' }}>Delayed Orders</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Throughput */}
        <div className="chart-container-dark">
          <h3 className="text-xl font-heading mb-4" style={{ color: '#F5F5F7' }}>Ticket Throughput</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={throughputData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="hour" stroke={chartTheme.text} />
              <YAxis stroke={chartTheme.text} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                labelStyle={{ color: '#F5F5F7' }}
              />
              <Legend wrapperStyle={{ color: chartTheme.text }} />
              <Line type="monotone" dataKey="tickets" stroke={chartTheme.primary} strokeWidth={2} name="Tickets" />
              <Line type="monotone" dataKey="avgTime" stroke={chartTheme.success} strokeWidth={2} name="Avg Time (min)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Station Performance */}
        <div className="chart-container-dark">
          <h3 className="text-xl font-heading mb-4" style={{ color: '#F5F5F7' }}>Station Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stationData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="station" stroke={chartTheme.text} />
              <YAxis stroke={chartTheme.text} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                labelStyle={{ color: '#F5F5F7' }}
              />
              <Legend wrapperStyle={{ color: chartTheme.text }} />
              <Bar dataKey="completed" fill={chartTheme.primary} name="Completed Tickets" />
              <Bar dataKey="avgTime" fill={chartTheme.success} name="Avg Time (min)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
