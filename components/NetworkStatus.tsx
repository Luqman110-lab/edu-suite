import React, { useState, useEffect } from 'react';
import { getPendingSyncCount, syncPendingData, isOnline } from '../client/src/lib/offlineStorage';

export const NetworkStatus: React.FC = () => {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = () => {
      setOnline(true);
      handleSync();
    };
    
    const handleOffline = () => {
      setOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkPending = async () => {
      try {
        const count = await getPendingSyncCount();
        setPendingCount(count);
        if (count > 0 && !showBanner) {
          setShowBanner(true);
        }
      } catch (e) {
        console.error('Error checking pending sync:', e);
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 10000);
    return () => clearInterval(interval);
  }, [showBanner]);

  const handleSync = async () => {
    if (!isOnline() || syncing) return;
    
    setSyncing(true);
    try {
      const result = await syncPendingData();
      if (result.success > 0) {
        const newCount = await getPendingSyncCount();
        setPendingCount(newCount);
        if (newCount === 0) {
          setTimeout(() => setShowBanner(false), 3000);
        }
      }
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      setSyncing(false);
    }
  };

  if (!showBanner && pendingCount === 0 && online) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 rounded-xl shadow-lg border p-3 transition-all duration-300 ${
      !online 
        ? 'bg-amber-50 dark:bg-amber-900/50 border-amber-200 dark:border-amber-700' 
        : pendingCount > 0 
          ? 'bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-700'
          : 'bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-700'
    }`}>
      <div className="flex items-center gap-3">
        {!online ? (
          <>
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">You're Offline</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Changes will sync when back online</p>
            </div>
          </>
        ) : pendingCount > 0 ? (
          <>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
              {syncing ? (
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                {syncing ? 'Syncing...' : `${pendingCount} changes pending`}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {syncing ? 'Please wait' : 'Tap to sync now'}
              </p>
            </div>
            {!syncing && (
              <button 
                onClick={handleSync}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Sync
              </button>
            )}
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">All synced!</p>
              <p className="text-xs text-green-600 dark:text-green-400">Your data is up to date</p>
            </div>
            <button 
              onClick={() => setShowBanner(false)}
              className="p-1.5 text-green-500 hover:text-green-700 dark:hover:text-green-300"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
