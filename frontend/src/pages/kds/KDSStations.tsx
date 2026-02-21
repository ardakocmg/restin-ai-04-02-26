// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useNavigate } from 'react-router-dom';

import { Plus, Monitor, Settings, Play, Pause } from 'lucide-react';

import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function KDSStations() {
  const navigate = useNavigate();
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/kds/stations?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStations(response.data);
    } catch (error) {
      logger.error('Error fetching stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStation = async (stationKey, enabled) => {
    try {
      const token = localStorage.getItem('restin_token');
      await axios.patch(
        `${API_URL}/api/kds/stations/${stationKey}?venue_id=${venueId}`,
        { enabled: !enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchStations();
    } catch (error) {
      logger.error('Error toggling station:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-foreground">KDS Stations</h1>
          <button
            onClick={() => navigate('/manager/kds/stations/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-foreground rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            New Station
          </button>
        </div>
        <p className="text-gray-600">Manage kitchen display stations and their configurations</p>
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map((station) => (
          <div
            key={station.id}
            className="bg-white rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition cursor-pointer"
            onClick={() => navigate(`/manager/kds/stations/${station.station_key}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${
                  station.enabled ? 'bg-green-100 text-green-600 dark:text-green-400' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{station.name}</h3>
                  <p className="text-sm text-gray-500">{station.station_key}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStation(station.station_key, station.enabled);
                }}
                className={`p-2 rounded-lg transition ${
                  station.enabled
                    ? 'bg-green-100 text-green-600 dark:text-green-400 hover:bg-green-200'
                    : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                }`}
              >
                {station.enabled ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            </div>

            {/* Routing Rules */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Routing Rules:</p>
              {station.routing_rules && station.routing_rules.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {station.routing_rules.map((rule, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded"
                    >
                      {rule.type}: {rule.values.join(', ')}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Default (catches all)</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-border flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/kds/runtime/${station.station_key}`);
                }}
                className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 rounded-lg hover:bg-blue-100 transition"
              >
                Open Display
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/manager/kds/stations/${station.station_key}`);
                }}
                className="p-2 text-muted-foreground bg-background rounded-lg hover:bg-gray-100 transition"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {stations.length === 0 && (
          <div className="col-span-full">
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
              <Monitor className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No stations configured</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first KDS station</p>
              <button
                onClick={() => navigate('/manager/kds/stations/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-foreground rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5" />
                Create Station
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default KDSStations;