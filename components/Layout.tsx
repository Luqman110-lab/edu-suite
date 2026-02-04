import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserSchool } from '../hooks/use-auth';
import { useTheme } from '../contexts/ThemeContext';
import { LogoIcon } from './Logo';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { NetworkStatus } from './NetworkStatus';
import { MobileBottomNav } from './MobileBottomNav';
import { QRScanner } from './QRScanner';
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
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  UserRound,
  BookOpen,
  Briefcase,
  Sun,
  Moon,
  School,
  Check,
  CalendarCheck2,
  Home,
  BedDouble,
  CalendarX,
  UserPlus,
  MessageSquare,
  Eye,
  Calendar,
  FileBadge,
  Search,
  School2,
  Layers,
  Camera
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const FAVORITES_KEY = 'edusuite_favorite_schools';
const RECENTS_KEY = 'edusuite_recent_schools';
const MAX_RECENTS = 5;

const SchoolSelector: React.FC = () => {
  const { user, activeSchool, switchSchoolMutation, isSuperAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [recents, setRecents] = useState<number[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedFavorites = localStorage.getItem(FAVORITES_KEY);
    const savedRecents = localStorage.getItem(RECENTS_KEY);
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedRecents) setRecents(JSON.parse(savedRecents));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const schools = user?.schools || [];
  const hasMultipleSchools = schools.length > 1 || isSuperAdmin;

  const filteredSchools = useMemo(() => {
    if (!searchQuery.trim()) return schools;
    const query = searchQuery.toLowerCase();
    return schools.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.code && s.code.toLowerCase().includes(query))
    );
  }, [schools, searchQuery]);

  const favoriteSchools = useMemo(() =>
    schools.filter(s => favorites.includes(s.id)),
    [schools, favorites]
  );

  const recentSchools = useMemo(() =>
    recents
      .map(id => schools.find(s => s.id === id))
      .filter((s): s is UserSchool => s !== undefined && !favorites.includes(s.id) && s.id !== activeSchool?.id)
      .slice(0, 3),
    [schools, recents, favorites, activeSchool]
  );

  if (!activeSchool && schools.length === 0) {
    return null;
  }

  const toggleFavorite = (schoolId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = favorites.includes(schoolId)
      ? favorites.filter(id => id !== schoolId)
      : [...favorites, schoolId];
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  };

  const addToRecents = (schoolId: number) => {
    const newRecents = [schoolId, ...recents.filter(id => id !== schoolId)].slice(0, MAX_RECENTS);
    setRecents(newRecents);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(newRecents));
  };

  const handleSwitch = async (school: UserSchool) => {
    if (school.id === activeSchool?.id) {
      setIsOpen(false);
      setSearchQuery('');
      return;
    }
    try {
      await switchSchoolMutation.mutateAsync(school.id);
      addToRecents(school.id);
      setIsOpen(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to switch school:', error);
    }
  };

  const renderSchoolItem = (school: UserSchool, showFavorite = true) => (
    <button
      key={school.id}
      onClick={() => handleSwitch(school)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group ${school.id === activeSchool?.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
        }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${school.id === activeSchool?.id
        ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-400'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}>
        <School className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{school.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{school.role}</p>
      </div>
      <div className="flex items-center gap-1">
        {showFavorite && (
          <button
            onClick={(e) => toggleFavorite(school.id, e)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title={favorites.includes(school.id) ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg className={`w-4 h-4 ${favorites.includes(school.id) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        )}
        {school.id === activeSchool?.id && (
          <Check className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
        )}
      </div>
    </button>
  );

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => hasMultipleSchools && setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${hasMultipleSchools
          ? 'border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 cursor-pointer'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-default'
          }`}
        disabled={!hasMultipleSchools}
      >
        <School className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[150px] truncate">
          {activeSchool?.name || 'Select School'}
        </span>
        {hasMultipleSchools && (
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && hasMultipleSchools && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search schools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {searchQuery ? (
              <div className="py-1">
                {filteredSchools.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No schools found matching "{searchQuery}"
                  </p>
                ) : (
                  filteredSchools.map(school => renderSchoolItem(school))
                )}
              </div>
            ) : (
              <>
                {favoriteSchools.length > 0 && (
                  <div className="py-1">
                    <div className="px-3 py-2 flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Favorites</p>
                    </div>
                    {favoriteSchools.map(school => renderSchoolItem(school, false))}
                  </div>
                )}

                {recentSchools.length > 0 && (
                  <div className="py-1 border-t border-gray-100 dark:border-gray-700">
                    <div className="px-3 py-2 flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full border border-gray-400 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                      </div>
                      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recent</p>
                    </div>
                    {recentSchools.map(school => renderSchoolItem(school))}
                  </div>
                )}

                <div className={`py-1 ${(favoriteSchools.length > 0 || recentSchools.length > 0) ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">All Schools</p>
                  </div>
                  {schools.map(school => renderSchoolItem(school))}
                </div>
              </>
            )}
          </div>

          {isSuperAdmin && (
            <div className="border-t border-gray-100 dark:border-gray-700 p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery('');
                  navigate('/app/settings?tab=schools');
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Manage Schools</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutMutation, activeSchool, isSuperAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate('/login');
  };

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

  type NavItem = { path: string; label: string; icon: React.FC<{ className?: string }> };
  type NavGroup = { id: string; label: string; icon: React.FC<{ className?: string }>; items: NavItem[] };
  type NavEntry = NavItem | NavGroup;

  const navStructure: NavEntry[] = [
    { path: '/app', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'people',
      label: 'People',
      icon: UserRound,
      items: [
        { path: '/app/students', label: 'Students', icon: Users },
        { path: '/app/teachers', label: 'Teachers', icon: GraduationCap },
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
        { path: '/app/p7', label: 'P7 Exam Sets', icon: FileBadge },
      ]
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: CalendarCheck2,
      items: [
        { path: '/app/gate-attendance', label: 'Gate Attendance', icon: CalendarCheck2 },
        { path: '/app/class-attendance', label: 'Class Attendance', icon: CalendarCheck2 },
        { path: '/app/teacher-attendance', label: 'Staff Attendance', icon: CalendarCheck2 },
        { path: '/app/attendance-settings', label: 'Settings', icon: Settings },
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
        { path: '/app/planning', label: 'Planning', icon: Calendar },
        { path: '/app/supervision', label: 'Supervision', icon: Eye },
        { path: '/app/messages', label: 'Messages', icon: MessageSquare },
        { path: '/app/parents', label: 'Parent Access', icon: UserRound },
      ]
    },
    { path: '/app/finance-hub', label: 'Finance', icon: BadgeDollarSign },
    { path: '/app/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/app/settings', label: 'Settings', icon: Settings },
    ...(isSuperAdmin ? [{ path: '/app/admin', label: 'Admin Console', icon: School2 }] : []),
  ];

  const allNavItems = useMemo(() => {
    const items: NavItem[] = [];
    navStructure.forEach(entry => {
      if ('items' in entry) {
        items.push(...entry.items);
      } else {
        items.push(entry);
      }
    });
    return items;
  }, []);

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => location.pathname === item.path);
  };

  useEffect(() => {
    const findActiveGroup = () => {
      for (const entry of navStructure) {
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
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 font-sans overflow-hidden">

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
          {navStructure.map((entry) => {
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

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100/50 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">

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
                {allNavItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
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
