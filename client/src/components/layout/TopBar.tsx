
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, Sun, Moon, LogOut, Archive } from 'lucide-react';
import { useAuth } from '../../../../hooks/use-auth';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useAcademicYear } from '../../../../contexts/AcademicYearContext';
import { SchoolSelector } from './SchoolSelector';
import { AcademicYearSelector } from '../../../../components/AcademicYearSelector';

interface TopBarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    title: string;
}

export const TopBar: React.FC<TopBarProps> = ({
    setSidebarOpen,
    collapsed,
    setCollapsed,
    title
}) => {
    const { isDark, toggleTheme } = useTheme();
    const { logoutMutation } = useAuth();
    const { isArchiveMode, selectedYear } = useAcademicYear();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logoutMutation.mutateAsync();
        navigate('/login');
    };

    return (
        <>
            <header className="h-16 bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-100/80 dark:border-gray-800/50 flex items-center justify-between px-4 md:px-6 z-20 sticky top-0 shadow-soft">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="md:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="hidden md:flex items-center justify-center w-9 h-9 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                        title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="hidden sm:block">
                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {title}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search Bar Placeholder for future expansion */}
                    <div className="hidden lg:flex relative mx-4">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="pl-10 pr-4 py-2 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-xl text-sm w-64 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 dark:text-white transition-all placeholder:text-gray-400"
                        />
                    </div>

                    <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                    <SchoolSelector />

                    <AcademicYearSelector />

                    <button
                        onClick={toggleTheme}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>

                    <button
                        onClick={handleLogout}
                        disabled={logoutMutation.isPending}
                        className="flex items-center gap-2 px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-danger-600 dark:hover:text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {isArchiveMode && (
                <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center gap-2">
                    <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Viewing {selectedYear} archive data (read-only)
                    </span>
                </div>
            )}
        </>
    );
};
