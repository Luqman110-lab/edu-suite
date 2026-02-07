import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, AlertCircle, ChevronRight, DollarSign, TrendingUp, MessageSquare, Bell, BookOpen, Clock, CalendarCheck } from "lucide-react";
import ParentChildCard from "../../components/parent/ParentChildCard";
import RecentActivityItem from "../../components/parent/RecentActivityItem";
import UpcomingEventItem from "../../components/parent/UpcomingEventItem";
import { DashboardSkeleton } from "../../components/parent/LoadingSkeletons";
import type { ParentDashboardData } from "../../types/parent";

export default function ParentDashboard() {
    const { data, isLoading, error } = useQuery<ParentDashboardData>({
        queryKey: ['parent-dashboard-stats'],
        queryFn: async () => {
            const res = await fetch('/api/parent/dashboard-stats', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch dashboard');
            return res.json();
        }
    });

    if (isLoading) return <DashboardSkeleton />;
    if (error) return (
        <div className="p-8 text-center text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-lg font-bold">Unable to load dashboard</h2>
            <p className="text-sm">Please try again later or contact support.</p>
        </div>
    );

    const { guardian, children, totals, recentActivity, upcomingEvents, unreadMessages, schoolInfo } = data || {};

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-[#0052CC] to-[#1E3A5F] rounded-xl p-6 text-white">
                <h1 className="text-2xl font-bold">Welcome back, {guardian?.name?.split(' ')[0] || 'Parent'}</h1>
                <p className="text-blue-100 mt-1">{today}</p>
                {schoolInfo && (
                    <p className="text-blue-200 text-sm mt-1">
                        {schoolInfo.name} &middot; Term {schoolInfo.currentTerm}, {schoolInfo.currentYear}
                    </p>
                )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">
                        <Users className="w-4 h-4" />
                        Children
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{totals?.childrenCount || 0}</p>
                </div>
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">
                        <TrendingUp className="w-4 h-4" />
                        Attendance
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{totals?.avgAttendance || 0}%</p>
                </div>
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">
                        <DollarSign className="w-4 h-4" />
                        Pending Fees
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {totals?.pendingFees > 0 ? `UGX ${totals.pendingFees.toLocaleString()}` : 'Cleared'}
                    </p>
                </div>
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">
                        <MessageSquare className="w-4 h-4" />
                        Messages
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{unreadMessages || 0} unread</p>
                </div>
            </div>

            {/* Children Summary Cards */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">My Children</h2>
                {(!children || children.length === 0) ? (
                    <div className="bg-white p-8 rounded-lg border text-center text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No children linked to your account.</p>
                        <p className="text-sm">Please contact the school administration.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {children.map((child: any) => (
                            <ParentChildCard key={child.id} child={child} />
                        ))}
                    </div>
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Activity */}
                <div className="bg-white rounded-lg border shadow-sm">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            Recent Activity
                        </h3>
                        <Link to="/parent/notifications" className="text-xs text-blue-600 hover:underline">View all</Link>
                    </div>
                    <div className="divide-y max-h-80 overflow-y-auto">
                        {(recentActivity || []).length === 0 ? (
                            <p className="p-4 text-sm text-gray-500 text-center">No recent activity</p>
                        ) : (
                            (recentActivity || []).slice(0, 5).map((activity: any, idx: number) => (
                                <RecentActivityItem key={idx} activity={activity} idx={idx} />
                            ))
                        )}
                    </div>
                </div>

                {/* Upcoming Events */}
                <div className="bg-white rounded-lg border shadow-sm">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <CalendarCheck className="w-4 h-4 text-purple-600" />
                            Upcoming Events
                        </h3>
                        <Link to="/parent/school-info" className="text-xs text-blue-600 hover:underline">View all</Link>
                    </div>
                    <div className="divide-y max-h-80 overflow-y-auto">
                        {(upcomingEvents || []).length === 0 ? (
                            <p className="p-4 text-sm text-gray-500 text-center">No upcoming events</p>
                        ) : (
                            (upcomingEvents || []).map((event: any) => (
                                <UpcomingEventItem key={event.id} event={event} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-4">
                <Link to="/parent/fees" className="bg-white rounded-lg border p-4 text-center hover:shadow-md transition-shadow">
                    <DollarSign className="w-8 h-8 mx-auto text-green-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">View Fees</p>
                </Link>
                <Link to="/parent/messages" className="bg-white rounded-lg border p-4 text-center hover:shadow-md transition-shadow">
                    <MessageSquare className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">Messages</p>
                </Link>
                <Link to="/parent/attendance" className="bg-white rounded-lg border p-4 text-center hover:shadow-md transition-shadow">
                    <CalendarCheck className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                    <p className="text-sm font-medium text-gray-900">Attendance</p>
                </Link>
            </div>
        </div>
    );
}
