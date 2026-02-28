
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../hooks/use-auth';
import { LogoIcon } from '../../../../components/Logo';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    ClipboardList,
    FileText,
    CheckSquare,
    BarChart3,
    TestTube2,
    BadgeDollarSign,
    Settings,
    X,
    ChevronRight,
    UserRound,
    BookOpen,
    Briefcase,
    School2,
    Layers,
    Archive,
    CalendarCheck2,
    Home,
    BedDouble,
    CalendarX,
    UserPlus,
    Eye,
    MessageSquare,
    Calendar,
    FileBadge
} from 'lucide-react';

interface SidebarProps {
    collapsed: boolean;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    unreadMessages: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, sidebarOpen, setSidebarOpen, unreadMessages }) => {
    const location = useLocation();
    const { user, activeSchool, isSuperAdmin } = useAuth();

    const userInitials = user?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('expandedMenuGroups');
            return saved ? new Set(JSON.parse(saved)) : new Set(['people', 'academics']);
        } catch {
            return new Set(['people', 'academics']);
        }
    });

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            try {
                localStorage.setItem('expandedMenuGroups', JSON.stringify([...next]));
            } catch { }
            return next;
        });
    };

    type NavItem = { path: string; label: string; icon: React.FC<{ className?: string }>; allowedRoles?: string[] };
    type NavGroup = { id: string; label: string; icon: React.FC<{ className?: string }>; items: NavItem[]; allowedRoles?: string[] };
    type NavEntry = NavItem | NavGroup;

    const navStructure: NavEntry[] = [
        { path: '/app', label: 'Dashboard', icon: LayoutDashboard },
        {
            id: 'people',
            label: 'People',
            icon: UserRound,
            items: [
                { path: '/app/students', label: 'Students', icon: Users },
                { path: '/app/teachers', label: 'Teachers', icon: GraduationCap, allowedRoles: ['admin'] },
            ]
        },
        {
            id: 'academics',
            label: 'Academics',
            icon: BookOpen,
            items: [
                { path: '/app/classes', label: 'Classes', icon: Layers },
                { path: '/app/marks', label: 'Marks Entry', icon: ClipboardList },
                { path: '/app/reports', label: 'Reports', icon: FileText },
                { path: '/app/assessments', label: 'Assessments', icon: CheckSquare },
                { path: '/app/tests', label: 'Weekly Tests', icon: TestTube2 },
            ]
        },
        {
            id: 'attendance',
            label: 'Attendance',
            icon: CalendarCheck2,
            items: [
                { path: '/app/gate-attendance', label: 'Gate Attendance', icon: CalendarCheck2 },
                { path: '/app/teacher-attendance', label: 'Staff Attendance', icon: CalendarCheck2 },
                { path: '/app/attendance-settings', label: 'Settings', icon: Settings, allowedRoles: ['admin'] },
            ]
        },
        {
            id: 'boarding',
            label: 'Boarding',
            icon: Home,
            items: [
                { path: '/app/boarding', label: 'Overview', icon: Home },
                { path: '/app/dormitory-manager', label: 'Dormitories', icon: BedDouble },
                { path: '/app/boarding-attendance', label: 'Roll Call', icon: CalendarCheck2 },
                { path: '/app/leave-management', label: 'Leave Requests', icon: CalendarX },
                { path: '/app/visitor-log', label: 'Visitor Log', icon: UserPlus },
            ]
        },
        {
            id: 'operations',
            label: 'Operations',
            icon: Briefcase,
            items: [
                { path: '/app/messages', label: 'Messages', icon: MessageSquare },
                { path: '/app/parents', label: 'Parent Access', icon: UserRound, allowedRoles: ['admin'] },
            ]
        },
        {
            id: 'finance',
            label: 'Finance',
            icon: BadgeDollarSign,
            items: [
                { path: '/app/finance-hub', label: 'Finance Hub', icon: BadgeDollarSign, allowedRoles: ['admin'] },
                { path: '/app/finance-accounting', label: 'Accounting', icon: FileText, allowedRoles: ['admin'] },
                { path: '/app/finance-budgets', label: 'Budgets', icon: Layers, allowedRoles: ['admin'] },
                { path: '/app/finance-petty-cash', label: 'Petty Cash', icon: ClipboardList, allowedRoles: ['admin'] },
            ]
        },
        { path: '/app/archive', label: 'Archive', icon: Archive, allowedRoles: ['admin'] },
        { path: '/app/settings', label: 'Settings', icon: Settings, allowedRoles: ['admin'] },
        ...(isSuperAdmin ? [{ path: '/app/admin', label: 'Admin Console', icon: School2 }] : []),
    ];

    const userRole = activeSchool?.role || 'teacher';

    const filteredNavStructure = useMemo(() => {
        return navStructure.map(entry => {
            if ('items' in entry) {
                // Filter group items
                const filteredItems = entry.items.filter(item =>
                    !item.allowedRoles || item.allowedRoles.includes(userRole)
                );

                if (entry.allowedRoles && !entry.allowedRoles.includes(userRole)) return null;
                if (filteredItems.length === 0) return null;

                return { ...entry, items: filteredItems };
            } else {
                // Single item
                if (entry.allowedRoles && !entry.allowedRoles.includes(userRole)) return null;
                return entry;
            }
        }).filter((entry): entry is NavEntry => entry !== null);
    }, [navStructure, userRole]);

    const isGroupActive = (group: NavGroup) => {
        return group.items.some(item => location.pathname === item.path);
    };

    useEffect(() => {
        const findActiveGroup = () => {
            for (const entry of filteredNavStructure) {
                if ('items' in entry) {
                    if (entry.items.some(item => item.path === location.pathname)) {
                        return entry.id;
                    }
                }
            }
            return null;
        };

        const activeGroupId = findActiveGroup();
        if (activeGroupId && !expandedGroups.has(activeGroupId)) {
            setExpandedGroups(prev => {
                const next = new Set(prev);
                next.add(activeGroupId);
                try {
                    localStorage.setItem('expandedMenuGroups', JSON.stringify([...next]));
                } catch { }
                return next;
            });
        }
    }, [location.pathname]);

    return (
        <>
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={`
          fixed md:static inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-200/80 dark:border-gray-800/50
          flex flex-col sidebar-transition
          ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0 md:shadow-none'}
          ${collapsed ? 'md:w-[72px]' : 'md:w-64'}
          w-64
        `}
            >
                <div className={`h-16 flex items-center px-4 border-b border-gray-100/80 dark:border-gray-800/50 ${collapsed ? 'justify-center' : 'justify-between'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="relative">
                            <LogoIcon className="w-9 h-9 flex-shrink-0" />
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-400/20 to-violet-500/20 rounded-lg blur-sm -z-10" />
                        </div>
                        {!collapsed && (
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-900 dark:text-white text-sm tracking-tight whitespace-nowrap leading-tight">
                                    Luqman EduTech
                                </span>
                                <span className="text-[10px] bg-gradient-to-r from-primary-600 to-violet-500 bg-clip-text text-transparent font-semibold uppercase tracking-wider">Solutions</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto hide-scrollbar">
                    {!collapsed && (
                        <div className="px-3 mb-2 mt-2">
                            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest">Menu</span>
                        </div>
                    )}
                    {filteredNavStructure.map((entry) => {
                        if ('items' in entry) {
                            const group = entry;
                            const isExpanded = expandedGroups.has(group.id);
                            const groupActive = isGroupActive(group);

                            return (
                                <div key={group.id} className="space-y-0.5">
                                    <button
                                        onClick={() => toggleGroup(group.id)}
                                        title={collapsed ? group.label : ''}
                                        className={`
                      w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                      ${groupActive
                                                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                                            }
                      ${collapsed ? 'justify-center' : ''}
                    `}
                                    >
                                        {groupActive && !collapsed && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-600 dark:bg-primary-500 rounded-r-full" />
                                        )}
                                        <group.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${groupActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />

                                        {!collapsed && (
                                            <>
                                                <span className={`ml-3 text-sm whitespace-nowrap flex-1 text-left ${groupActive ? 'font-semibold' : 'font-medium'}`}>
                                                    {group.label}
                                                </span>
                                                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                            </>
                                        )}
                                    </button>

                                    {!collapsed && isExpanded && (
                                        <div className="ml-4 pl-4 border-l-2 border-gray-100 dark:border-gray-800 space-y-0.5 my-1">
                                            {group.items.map((item) => {
                                                const isActive = location.pathname === item.path;
                                                const hasUnread = item.path === '/app/messages' && unreadMessages > 0;
                                                return (
                                                    <Link
                                                        key={item.path}
                                                        to={item.path}
                                                        className={`
                              flex items-center px-3 py-2 rounded-lg transition-all duration-200 group relative text-sm
                              ${isActive
                                                                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 font-semibold'
                                                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white font-medium'
                                                            }
                            `}
                                                    >
                                                        <item.icon className={`w-4 h-4 flex-shrink-0 mr-2.5 transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                                        <span className="flex-1">{item.label}</span>
                                                        {hasUnread && (
                                                            <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                                                                {unreadMessages > 99 ? '99+' : unreadMessages}
                                                            </span>
                                                        )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        } else {
                            const item = entry;
                            const isActive = location.pathname === item.path ||
                                (item.path === '/app' && location.pathname === '/app/');
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    title={collapsed ? item.label : ''}
                                    className={`
                    flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                    ${isActive
                                            ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                                        }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                                >
                                    {isActive && !collapsed && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-600 dark:bg-primary-500 rounded-r-full" />
                                    )}
                                    <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />

                                    {!collapsed && (
                                        <span className={`ml-3 text-sm whitespace-nowrap flex-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                            {item.label}
                                        </span>
                                    )}

                                    {collapsed && isActive && (
                                        <div className="absolute left-0 w-1 h-6 bg-primary-600 dark:bg-primary-500 rounded-r-full" />
                                    )}
                                </Link>
                            );
                        }
                    })}
                </nav>

                <div className="p-3 border-t border-gray-100/80 dark:border-gray-800/50">
                    {!collapsed ? (
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/70 dark:to-gray-800/50 hover:from-primary-50 hover:to-primary-100/50 dark:hover:from-primary-900/20 dark:hover:to-primary-900/10 transition-all cursor-pointer group border border-gray-100/50 dark:border-gray-700/30">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-primary-500/20 ring-2 ring-white dark:ring-gray-800">
                                {userInitials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name || 'User'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role || 'User'}</p>
                            </div>
                            <Settings className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-primary-500/20">
                                {userInitials}
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};
