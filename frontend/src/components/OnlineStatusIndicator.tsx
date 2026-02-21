import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, HardDrive, Activity, Network, Layers } from 'lucide-react';
import syncService from '../services/SyncService';
import offlineDB from '../services/OfflineDB';
import resilienceManager from '../services/ResilienceManager';
import { logger } from '@/lib/logger';

/**
 * OnlineStatusIndicator - Multi-Layer Resilience Status Display
 * 
 * Shows:
 * - Online (Cloud connected)
 * - Edge (Venue gateway available)
 * - Device (Local offline)
 * - Mesh (Peer-to-peer mode)
 * - Pending sync count
 */
export default function OnlineStatusIndicator({ position = 'top-right' }) {
  const [status, setStatus] = useState({
    mode: 'unknown',
    cloudReachable: false,
    edgeReachable: false,
    meshActive: false,
  });
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Initialize resilience manager
    resilienceManager.init();

    // Subscribe to resilience status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = resilienceManager.onStatusChange((newStatus: unknown) => {
      setStatus(newStatus);
    });

    // Subscribe to sync events
    const unsubscribeSync = syncService.onStatusChange((status, online) => {
      if (status === 'sync_complete') {
        loadStats();
      }
    });

    loadStats();

    // PERF: Visibility-aware polling — pause when tab is hidden
    let interval = setInterval(loadStats, 10000);

    const handleVisibility = () => {
      clearInterval(interval);
      if (document.visibilityState === 'visible') {
        loadStats(); // Refresh immediately when tab becomes visible
        interval = setInterval(loadStats, 10000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribe();
      unsubscribeSync();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const loadStats = async () => {
    try {
      const stats = await offlineDB.getStats();
      setPendingCount(stats.pending_commands);
      setLastSync(stats.last_sync);
    } catch (error) {
      logger.error('Failed to load sync stats:', error);
    }
  };

  const handleManualSync = async () => {
    if (!status.cloudReachable) return;
    await syncService.forceSyncNow();
    loadStats();
  };

  const getStatusColor = () => {
    switch (status.mode) {
      case 'online':
        return pendingCount === 0 ? '#4ADE80' : '#FB8C00'; // Green or Orange
      case 'edge':
        return '#3B82F6'; // Blue
      case 'mesh':
        return '#A855F7'; // Purple
      case 'device':
        return '#E53935'; // Red
      default:
        return '#71717A'; // Gray
    }
  };

  const getStatusText = () => {
    switch (status.mode) {
      case 'online':
        return pendingCount > 0 ? `Syncing (${pendingCount})` : 'Cloud Online';
      case 'edge':
        return 'Edge Gateway';
      case 'mesh':
        return 'Device Mesh';
      case 'device':
        return 'Device Offline';
      default:
        return 'Initializing...';
    }
  };

  const getStatusIcon = () => {
    switch (status.mode) {
      case 'online':
        return <Cloud className="w-4 h-4" />;
      case 'edge':
        return <Network className="w-4 h-4" />;
      case 'mesh':
        return <Layers className="w-4 h-4" />;
      case 'device':
        return <HardDrive className="w-4 h-4" />;
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  const positionClasses = {
    'top-right': 'relative',
    'top-left': 'relative',
    'bottom-right': 'relative',
    'inline': 'relative'
  };

  return (
    <div className={positionClasses[position]}>
      {/* keep-inline: dynamic border/shadow color from runtime getStatusColor() */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-300 hover:scale-[1.02] active:scale-95 group bg-zinc-900/40 backdrop-blur-xl"
        style={{
          border: `1px solid ${getStatusColor()}40`,
          boxShadow: `0 0 20px ${getStatusColor()}15`
        }}
      >
        {/* keep-inline: dynamic backgroundColor from runtime getStatusColor() */}
        <div
          className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor]"
          style={{ backgroundColor: getStatusColor(), color: getStatusColor() }}
        />
        {getStatusIcon()}
        <span className="text-[11px] font-black uppercase tracking-widest text-foreground group-hover:text-foreground transition-colors">
          {getStatusText()}
        </span>
        {pendingCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-500">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Details Dropdown */}
      {showDetails && (
        <div className="absolute top-full mt-2 right-0 w-80 card-dark p-4 rounded-xl shadow-2xl border border-white/10">
          <h3 className="font-heading text-sm mb-3 text-zinc-100">
            SYNC STATUS
          </h3>

          <div className="space-y-3">
            {/* Resilience Mode */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Mode:</span>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                {/* keep-inline: dynamic color from runtime getStatusColor() */}
                <span className="text-sm font-medium" style={{ color: getStatusColor() }}>
                  {getStatusText()}
                </span>
              </div>
            </div>

            {/* Cloud Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Cloud:</span>
              <div className="flex items-center gap-2">
                {status.cloudReachable ? (
                  <>
                    <Cloud className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-500">Unreachable</span>
                  </>
                )}
              </div>
            </div>

            {/* Edge Gateway Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Edge Gateway:</span>
              <div className="flex items-center gap-2">
                {status.edgeReachable ? (
                  <>
                    <Network className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-500">Available</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm text-zinc-500">Unavailable</span>
                  </>
                )}
              </div>
            </div>

            {/* Pending Commands */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Pending:</span>
              <span className={`text-sm font-bold ${pendingCount > 0 ? 'text-red-500' : 'text-green-400'}`}>
                {pendingCount} commands
              </span>
            </div>

            {/* Last Sync */}
            {lastSync && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Last Sync:</span>
                <span className="text-xs text-zinc-500">
                  {new Date(lastSync).toLocaleTimeString()}
                </span>
              </div>
            )}

            {/* Manual Sync Button */}
            {status.cloudReachable && pendingCount > 0 && (
              <button
                onClick={handleManualSync}
                className="w-full btn-primary h-10 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Sync Now
              </button>
            )}

            {/* Mode Info */}
            {status.mode === 'edge' && (
              <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs text-zinc-300">
                  Operating via Edge Gateway. Commands queued locally and synced via venue server.
                </p>
              </div>
            )}

            {status.mode === 'mesh' && (
              <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <p className="text-xs text-zinc-300">
                  Device mesh active. Commands replicated across peer devices for redundancy.
                </p>
              </div>
            )}

            {status.mode === 'device' && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-xs text-zinc-300">
                  Full offline mode. All operations queued locally and will sync when connection restored.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
