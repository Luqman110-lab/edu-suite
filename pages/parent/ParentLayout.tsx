import { Outlet, Link, useLocation } from "react-router-dom";
import { User, LogOut, LayoutDashboard, Menu, X, BookOpen, DollarSign, CalendarCheck, MessageSquare, Bell, School } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ParentErrorBoundary from "../../components/parent/ParentErrorBoundary";

interface ParentUser {
    id: number;
    username: string;
    name: string;
    role: string;
}

export default function ParentLayout() {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { data: user, isLoading } = useQuery<ParentUser>({
        queryKey: ['user'],
        queryFn: async () => {
            const res = await fetch('/api/user', { credentials: 'include' });
            if (!res.ok) throw new Error("Not logged in");
            return res.json();
        }
    });

    // Poll for unread message count
    const { data: statsData } = useQuery({
        queryKey: ['parent-nav-stats'],
        queryFn: async () => {
            const res = await fetch('/api/parent/dashboard-stats', { credentials: 'include' });
            if (!res.ok) return { unreadMessages: 0, notifications: [] };
            return res.json();
        },
        refetchInterval: 30000,
    });

    const unreadMessages = statsData?.unreadMessages || 0;
    const notificationCount = statsData?.recentActivity?.length || 0;

    const handleLogout = async () => {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/login';
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/parent' },
        { icon: BookOpen, label: 'Academics', path: '/parent/student' },
        { icon: DollarSign, label: 'Fees', path: '/parent/fees', },
        { icon: CalendarCheck, label: 'Attendance', path: '/parent/attendance' },
        { icon: MessageSquare, label: 'Messages', path: '/parent/messages', badge: unreadMessages },
        { icon: Bell, label: 'Notifications', path: '/parent/notifications', badge: notificationCount },
        { icon: User, label: 'My Profile', path: '/parent/profile' },
        { icon: School, label: 'School Info', path: '/parent/school-info' },
    ];

    const isActive = (path: string) => {
        if (path === '/parent') return location.pathname === '/parent';
        return location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r h-screen fixed">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-[#0052CC]">Parent Portal</h1>
                    <p className="text-sm text-gray-500 mt-1">Broadway Primary</p>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive(item.path)
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="flex-1">{item.label}</span>
                            {item.badge ? (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            ) : null}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                            {user?.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.username}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 mt-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden bg-white border-b p-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#0052CC] rounded-lg flex items-center justify-center text-white font-bold">
                        B
                    </div>
                    <span className="font-bold text-gray-900">Parent Portal</span>
                </div>
                <div className="flex items-center gap-2">
                    {unreadMessages > 0 && (
                        <Link to="/parent/messages" className="relative p-2">
                            <MessageSquare className="w-5 h-5 text-gray-600" />
                            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                {unreadMessages > 9 ? '9+' : unreadMessages}
                            </span>
                        </Link>
                    )}
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-10 bg-white pt-20 px-4">
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${isActive(item.path)
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="flex-1">{item.label}</span>
                                {item.badge ? (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        {item.badge}
                                    </span>
                                ) : null}
                            </Link>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 bg-red-50 rounded-lg"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </button>
                    </nav>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-auto">
                <ParentErrorBoundary>
                    <Outlet />
                </ParentErrorBoundary>
            </main>
        </div>
    );
}
