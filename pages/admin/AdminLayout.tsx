import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';

export const AdminLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const { user, isSuperAdmin } = useAuth();

    if (!isSuperAdmin) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-danger-600 mb-2">Access Denied</h2>
                    <p className="text-gray-600 dark:text-gray-400">You must be a Super Admin to view this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-sans">
            {/* Mesh Background */}
            <div className="fixed inset-0 z-0 bg-mesh-gradient dark:bg-mesh-gradient-dark opacity-40 pointer-events-none" />

            <AdminSidebar collapsed={collapsed} />

            <div className="flex-1 flex flex-col min-w-0 z-10 relative">
                <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 flex items-center justify-between px-6 z-20 shadow-soft sticky top-0">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                                <p className="text-xs text-primary-600 font-medium">Super Admin</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/20">
                                {user?.name?.[0].toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="max-w-7xl mx-auto animate-fade-in-up">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
