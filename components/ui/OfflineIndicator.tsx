import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, CheckCircle } from 'lucide-react';
import { processSyncQueue, getSyncQueueCount } from '../../services/supabaseService';

interface OfflineIndicatorProps {
  showSyncButton?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ showSyncButton = true }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  const handleSync = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    
    setSyncing(true);
    try {
      const result = await processSyncQueue();
      if (result.success > 0) {
        setShowSyncSuccess(true);
        setTimeout(() => setShowSyncSuccess(false), 3000);
      }
      setPendingCount(getSyncQueueCount());
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      if (wasOffline) {
        setTimeout(() => handleSync(), 1000);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending items periodically
    const checkQueue = () => setPendingCount(getSyncQueueCount());
    checkQueue();
    const interval = setInterval(checkQueue, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [wasOffline, handleSync]);

  // Show sync success message
  if (showSyncSuccess) {
    return (
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg bg-green-500 text-white animate-pulse">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm font-medium">All data synced!</span>
      </div>
    );
  }

  // Don't show if online and no pending items
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`fixed bottom-4 left-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg ${
      isOnline ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
    }`}>
      {isOnline ? (
        <>
          <Cloud className="w-4 h-4" />
          <span className="text-sm font-medium">{pendingCount} pending</span>
          {showSyncButton && pendingCount > 0 && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="ml-1 p-1 bg-white/20 rounded-full hover:bg-white/30"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Offline Mode</span>
          {pendingCount > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {pendingCount} queued
            </span>
          )}
        </>
      )}
    </div>
  );
};
