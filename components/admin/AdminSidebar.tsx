import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    School,
    Users,
    FileText,
    Settings,
    LogOut,
    ChevronLeft
} from 'lucide-react';
import { LogoIcon } from '../Logo';
import { useAuth } from '../../hooks/use-auth';

interface AdminSidebarProps {
    collapsed: boolean;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed }) => {
    const location = useLocation();
    const { user, isSuperAdmin, switchSchoolMutation, activeSchool } = useAuth();
    const [schools, setSchools] = React.useState<{ id: number; name: string }[]>([]);
    const [showSwitcher, setShowSwitcher] = React.useState(false);

    React.useEffect(() => {
        if (isSuperAdmin) {
            fetch('/api/admin/schools')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setSchools(data);
                })
                .catch(err => console.error("Failed to load schools", err));
        }
    }, [isSuperAdmin]);

    const handleSwitchSchool = (schoolId: number) => {
        switchSchoolMutation.mutate(schoolId, {
            onSuccess: () => {
                setShowSwitcher(false);
                window.location.href = '/#/app';
                window.location.reload();
            }
        });
    };

    const navItems = [
        { path: '/app/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
        { path: '/app/admin/schools', label: 'Schools', icon: School },
        { path: '/app/admin/users', label: 'Users', icon: Users },
        { path: '/app/admin/audit', label: 'Audit Logs', icon: FileText },
        { path: '/app/admin/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <aside
            className={`
                fixed md:static inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-800/50
                flex flex-col sidebar-transition
                ${collapsed ? 'w-[72px]' : 'w-64'}
            `}
        >
            {/* Header */}
            <div className={`h-16 flex items-center px-4 border-b border-gray-100/50 dark:border-gray-800/50 ${collapsed ? 'justify-center' : 'justify-start'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="relative">
                        <LogoIcon className="w-8 h-8 flex-shrink-0" />
                        <div className="absolute inset-0 bg-primary-500/20 blur-xl -z-10" />
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white text-sm tracking-tight">Admin Console</span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">System Management</span>
                        </div>
                    )}
                </div>
            </div>

            {/* School Switcher for Super Admin */}
            {!collapsed && isSuperAdmin && (
                <div className="px-3 py-3 border-b border-gray-100/50 dark:border-gray-800/50">
                    <div className="relative">
                        <button
                            onClick={() => setShowSwitcher(!showSwitcher)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-lg border border-gray-200/50 dark:border-gray-700 transition-all text-sm group"
                        >
                            <span className="truncate max-w-[140px] text-gray-700 dark:text-gray-200 font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                {activeSchool?.name || "Select School"}
                            </span>
                            <ChevronLeft className={`w-4 h-4 text-gray-400 transition-transform ${showSwitcher ? '-rotate-90' : '-rotate-90'}`} />
                        </button>

                        {showSwitcher && (
                            <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 animate-fade-in-up">
                                {schools.map(school => (
                                    <button
                                        key={school.id}
                                        onClick={() => handleSwitchSchool(school.id)}
                                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0 ${activeSchool?.id === school.id ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20 font-medium' : 'text-gray-600 dark:text-gray-300'}`}
                                    >
                                        {school.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto hide-scrollbar">
                {navItems.map((item) => {
                    const isActive = item.exact
                        ? location.pathname === item.path
                        : location.pathname.startsWith(item.path);

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            title={collapsed ? item.label : ''}
                            className={`
                                flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                                ${isActive
                                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                                }
                                ${collapsed ? 'justify-center' : ''}
                            `}
                        >
                            {isActive && !collapsed && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-600 rounded-r-full" />
                            )}

                            <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />

                            {!collapsed && (
                                <span className={`ml-3 text-sm flex-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100/50 dark:border-gray-800/50">
                <Link
                    to="/app"
                    className={`
                        flex items-center px-3 py-2.5 rounded-xl transition-all duration-200
                        text-gray-500 hover:bg-danger-50 hover:text-danger-600 dark:text-gray-400 dark:hover:bg-danger-900/20 dark:hover:text-danger-400
                        ${collapsed ? 'justify-center' : ''}
                    `}
                    title="Exit Admin Console"
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="ml-3 text-sm font-medium">Exit Console</span>}
                </Link>
            </div>
        </aside>
    );
};
