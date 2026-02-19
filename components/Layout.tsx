
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { NetworkStatus } from './NetworkStatus';
import { MobileBottomNav } from './MobileBottomNav';
import { QRScanner } from './QRScanner';
import { Camera } from 'lucide-react';
import { Sidebar } from '../client/src/components/layout/Sidebar';
import { TopBar } from '../client/src/components/layout/TopBar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { activeSchool } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch('/api/conversations/unread-count', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUnreadMessages(data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Error fetching unread messages:', err);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [activeSchool]);

  // Determine title based on location (simplified logic from original)
  // In a real app, this might be better handled by a context or route metadata
  const getTitle = () => {
    // This logic was inside the original Layout, but it used `allNavItems` which we moved to Sidebar.
    // For now, we can pass a simple title or let TopBar handle it if we pass the nav structure or just leave it generic.
    // Or we can reconstruct a simple title map.
    // Let's rely on a simple default or maybe we can improve this later.
    // For now, let's just pass "Dashboard" or similar if we can't easily derive it without duplicating nav structure.
    // Actually, let's keep it simple.
    if (location.pathname.includes('/students')) return 'Students';
    if (location.pathname.includes('/teachers')) return 'Teachers';
    if (location.pathname.includes('/classes')) return 'Classes';
    if (location.pathname.includes('/marks')) return 'Marks Entry';
    if (location.pathname.includes('/reports')) return 'Reports';
    if (location.pathname.includes('/settings')) return 'Settings';
    if (location.pathname.includes('/finance')) return 'Finance';
    return 'Dashboard';
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 font-sans overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        unreadMessages={unreadMessages}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100/50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <TopBar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          title={getTitle()}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-8 scroll-smooth">
          <div className={`max-w-7xl mx-auto transition-all duration-300 ${collapsed ? 'max-w-[1600px]' : ''}`}>
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav unreadMessages={unreadMessages} />
      <PWAInstallPrompt />
      <NetworkStatus />

      {/* Floating QR Scanner Button */}
      <button
        onClick={() => setShowScanner(true)}
        className="fixed bottom-20 md:bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-[#0052CC] to-[#003D99] text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center group"
        title="Scan QR Code"
      >
        <Camera className="w-6 h-6" />
        <span className="absolute -top-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Scan QR Code
        </span>
      </button>

      {/* QR Scanner Modal */}
      {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
    </div>
  );
};
