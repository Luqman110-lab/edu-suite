import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOffline) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
            <div className="bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 border border-slate-700">
                <div className="bg-red-500/20 p-2 rounded-full">
                    <WifiOff className="w-5 h-5 text-red-500" />
                </div>
                <div>
                    <h4 className="font-medium text-sm">You are offline</h4>
                    <p className="text-xs text-slate-400">Changes will sync when connection restores</p>
                </div>
            </div>
        </div>
    );
}
