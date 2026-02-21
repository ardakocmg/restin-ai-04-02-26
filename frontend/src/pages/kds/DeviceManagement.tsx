import { logger } from '@/lib/logger';
import { useEffect,useState } from 'react';

import { Monitor,Plus,Smartphone,Wifi,WifiOff } from 'lucide-react';

import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function DeviceManagement() {
  const [devices, setDevices] = useState([]);
  const [pairingCodes, setPairingCodes] = useState([]);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    fetchDevices();
    fetchPairingCodes();
  }, []);

  const fetchDevices = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/devices?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDevices(response.data);
    } catch (error) {
      logger.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPairingCodes = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/devices/pairing/codes?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPairingCodes(response.data);
    } catch (error) {
      logger.error('Error fetching pairing codes:', error);
    }
  };

  const generatePairingCode = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/devices/pairing/codes?venue_id=${venueId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPairingCodes();
      setShowPairingModal(true);
    } catch (error) {
      logger.error('Error generating code:', error);
    }
  };

  const trustDevice = async (deviceId, trusted) => {
    try {
      const token = localStorage.getItem('restin_token');
      await axios.patch(
        `${API_URL}/api/devices/${deviceId}?venue_id=${venueId}`,
        { trusted },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDevices();
    } catch (error) {
      logger.error('Error updating device:', error);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold text-foreground">Device Management</h1>
          <button
            onClick={generatePairingCode}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-foreground rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Generate Pairing Code
          </button>
        </div>
        <p className="text-gray-600">Manage KDS displays and POS terminals</p>
      </div>

      {/* Active Pairing Codes */}
      {pairingCodes.length > 0 && (
        <div className="mb-8 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-blue-900 mb-4">Active Pairing Codes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pairingCodes.map((code) => (
              <div key={code.id} className="bg-white rounded-lg p-4 text-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">{code.code_4_digit}</div>
                <p className="text-sm text-gray-600">
                  Expires: {new Date(code.expires_at).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Devices List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-foreground">Registered Devices</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {devices.map((device) => (
            <div key={device.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${device.type === 'KDS_SCREEN' ? 'bg-blue-100 text-blue-600 dark:text-blue-400' :
                  device.type === 'POS' ? 'bg-green-100 text-green-600 dark:text-green-400' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                  {device.type === 'KDS_SCREEN' ? <Monitor className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{device.name}</h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="font-medium text-gray-700">{device.model || 'Unknown Model'}</span>
                    <span>•</span>
                    <span>{device.os || 'Unknown OS'}</span>
                    <span>•</span>
                    <span>{device.browser || 'Unknown Browser'}</span>
                  </div>
                  {device.ip_address ? (
                    <p className="text-xs text-muted-foreground font-mono mt-1">IP: {device.ip_address}</p>
                  ) : (
                    <p className="text-xs text-red-300 font-mono mt-1">IP: Not Captured</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {device.last_seen_at && (
                  <div className="flex items-center gap-2">
                    {new Date(device.last_seen_at) > new Date(Date.now() - 60000) ? (
                      <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="text-sm text-gray-600">
                      {new Date(device.last_seen_at).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => trustDevice(device.id, !device.trusted)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${device.trusted
                    ? 'bg-green-100 text-green-700 dark:text-green-400 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 dark:text-red-400 hover:bg-red-200'
                    }`}
                >
                  {device.trusted ? 'Trusted' : 'Untrusted'}
                </button>
              </div>
            </div>
          ))}

          {devices.length === 0 && (
            <div className="p-12 text-center">
              <Monitor className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-gray-600">{"No "}devices registered yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeviceManagement;