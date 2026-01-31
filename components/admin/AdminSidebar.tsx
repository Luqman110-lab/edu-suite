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
    const { user, isSuperAdmin, switchSchoolMutation, activeSchool } = useAuth(); // Assuming useAuth exposes these
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
                window.location.reload(); // Force reload to ensure all queries reset with new context
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
                fixed md:static inset-y-0 left-0 z-50 bg-slate-900 text-white transition-all duration-300
                ${collapsed ? 'w-[72px]' : 'w-64'}
                flex flex-col border-r border-slate-800
            `}
        >
            {/* Header */}
            <div className={`flex flex-col border-b border-slate-800`}>
                <div className={`h-16 flex items-center px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <LogoIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                        {!collapsed && (
                            <div>
                                <span className="font-bold text-lg tracking-tight whitespace-nowrap">Admin Console</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* School Switcher for Super Admin */}
                {!collapsed && isSuperAdmin && (
                    <div className="px-3 pb-3">
                        <div className="relative">
                            <button
                                onClick={() => setShowSwitcher(!showSwitcher)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-sm"
                            >
                                <span className="truncate max-w-[140px] text-slate-200">
                                    {activeSchool?.name || "Select School"}
                                </span>
                                <ChevronLeft className={`w-4 h-4 text-slate-400 transition-transform ${showSwitcher ? '-rotate-90' : '-rotate-90'}`} />
                            </button>

                            {showSwitcher && (
                                <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                                    {schools.map(school => (
                                        <button
                                            key={school.id}
                                            onClick={() => handleSwitchSchool(school.id)}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${activeSchool?.id === school.id ? 'text-blue-400 bg-slate-700/50' : 'text-slate-300'}`}
                                        >
                                            {school.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
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
                                    ? 'bg-blue-600/10 text-blue-400'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }
                                ${collapsed ? 'justify-center' : ''}
                            `}
                        >
                            <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'}`} />

                            {!collapsed && (
                                <span className={`ml-3 text-sm font-medium whitespace-nowrap flex-1`}>
                                    {item.label}
                                </span>
                            )}

                            {isActive && !collapsed && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800">
                <Link
                    to="/app"
                    className={`
                        flex items-center px-3 py-2.5 rounded-xl transition-all duration-200
                        text-slate-400 hover:bg-red-500/10 hover:text-red-400
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
