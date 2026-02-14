import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useParams, useNavigate } from 'react-router-dom';

import { ArrowLeft, Save, Trash2 } from 'lucide-react';

import axios from 'axios';

import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function KDSStationDetail() {
  const { stationKey } = useParams();
  const navigate = useNavigate();
  const [station, setStation] = useState(null);
  const [settings, setSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('routing');
  const [loading, setLoading] = useState(true);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    fetchStation();
    fetchSettings();
  }, [stationKey]);

  const fetchStation = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/kds/stations/${stationKey}?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStation(response.data);
    } catch (error) {
      logger.error('Error fetching station:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/kds/stations/${stationKey}/settings?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSettings(response.data);
    } catch (error) {
      logger.error('Error fetching settings:', error);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      const token = localStorage.getItem('restin_token');
      await axios.patch(
        `${API_URL}/api/kds/stations/${stationKey}/settings?venue_id=${venueId}`,
        newSettings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Settings saved successfully');
      fetchSettings();
    } catch (error) {
      logger.error('Error updating settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const resetStation = async () => {
    if (!confirm('Reset station? This will complete all active tickets.')) return;
    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/kds/stations/${stationKey}/reset?venue_id=${venueId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Station reset successfully');
    } catch (error) {
      logger.error('Error resetting station:', error);
    }
  };

  if (loading || !station || !settings) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/manager/kds/stations')}
          className="flex items-center gap-2 text-gray-600 hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Stations
        </button>
        <h1 className="text-4xl font-bold text-foreground">{station.name}</h1>
        <p className="text-gray-600">{station.station_key}</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          {['routing', 'summary', 'status', 'theme', 'wait-times'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-medium capitalize transition ${activeTab === tab
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-foreground'
                }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'routing' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Routing Rules</h3>
              <p className="text-sm text-gray-600">Define which items appear on this station</p>
              <div className="space-y-2">
                {station.routing_rules?.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{rule.type}:</span>
                    <span className="text-gray-600">{rule.values.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Ticket Summary Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(settings.ticket_summary || {}).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => {
                        const newSettings = {
                          ticket_summary: {
                            ...settings.ticket_summary,
                            [key]: e.target.checked
                          }
                        };
                        updateSettings(newSettings);
                      }}
                      className="w-5 h-5 text-blue-600 dark:text-blue-400 rounded"
                    />
                    <span className="capitalize">{key.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Order Status Filters</h3>
              <p className="text-sm text-gray-600">Choose which statuses to display</p>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(settings.order_status_enabled || {}).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={value}
                      disabled={['preparing', 'on_hold', 'completed'].includes(key)}
                      onChange={(e) => {
                        const newSettings = {
                          order_status_enabled: {
                            ...settings.order_status_enabled,
                            [key]: e.target.checked
                          }
                        };
                        updateSettings(newSettings);
                      }}
                      className="w-5 h-5 text-blue-600 dark:text-blue-400 rounded"
                    />
                    <span className="capitalize">{key.replace('_', ' ')}</span>
                    {['preparing', 'on_hold', 'completed'].includes(key) && (
                      <span className="text-xs text-gray-400">(Always enabled)</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Theme</h3>
                <div className="flex gap-4">
                  {['LIGHT', 'DARK'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => updateSettings({ theme })}
                      className={`px-6 py-3 rounded-lg font-medium transition ${settings.theme === theme
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Layout</h3>
                <div className="flex gap-4">
                  {['DIRECT_LINE', 'EQUAL'].map((layout) => (
                    <button
                      key={layout}
                      onClick={() => updateSettings({ layout })}
                      className={`px-6 py-3 rounded-lg font-medium transition ${settings.layout === layout
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {layout.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Time Format</h3>
                <div className="flex gap-4">
                  {['24H', 'AMPM'].map((format) => (
                    <button
                      key={format}
                      onClick={() => updateSettings({ time_format: format })}
                      className={`px-6 py-3 rounded-lg font-medium transition ${settings.time_format === format
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wait-times' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={settings.wait_times?.enabled}
                    onChange={(e) => {
                      updateSettings({
                        wait_times: { ...settings.wait_times, enabled: e.target.checked }
                      });
                    }}
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 rounded"
                  />
                  <span className="font-medium">Enable Wait Time Indicators</span>
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delayed After (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.wait_times?.delayed_after_min || 10}
                    onChange={(e) => {
                      updateSettings({
                        wait_times: {
                          ...settings.wait_times,
                          delayed_after_min: parseInt(e.target.value)
                        }
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Late After (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.wait_times?.late_after_min || 20}
                    onChange={(e) => {
                      updateSettings({
                        wait_times: {
                          ...settings.wait_times,
                          late_after_min: parseInt(e.target.value)
                        }
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
        <button
          onClick={resetStation}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          <Trash2 className="w-5 h-5" />
          Reset Station
        </button>
        <p className="text-sm text-gray-600 mt-2">This will complete all active tickets</p>
      </div>
    </div>
  );
}

export default KDSStationDetail;