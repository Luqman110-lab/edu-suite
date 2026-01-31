import React, { useEffect, useState } from 'react';
import { Building2, Users, GraduationCap, UserCheck, Activity } from 'lucide-react';
import { StatsCard } from '../../components/admin/StatsCard';
import { RecentActivityFeed, AuditLog } from '../../components/admin/RecentActivityFeed';
import { Link } from 'react-router-dom';

interface AdminStats {
    totalSchools: number;
    activeSchools: number;
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
    recentActivity: AuditLog[];
}

export const Overview: React.FC = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500">Failed to load dashboard data.</p>
                <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
                <p className="text-gray-500 dark:text-gray-400">Welcome back to the admin console.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Schools"
                    value={stats.totalSchools}
                    icon={Building2}
                    color="blue"
                />
                <StatsCard
                    title="Active Schools"
                    value={stats.activeSchools}
                    icon={Building2}
                    color="green"
                />
                <StatsCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={Users}
                    color="purple"
                />
                <StatsCard
                    title="Total Students"
                    value={stats.totalStudents}
                    icon={GraduationCap}
                    color="amber"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area - Could be a Chart later */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 dark:text-white">Platform Growth</h3>
                        <select className="text-sm border-gray-200 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">
                            <option>Last 30 Days</option>
                            <option>Last 3 Months</option>
                            <option>This Year</option>
                        </select>
                    </div>
                    <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
                        <p className="text-gray-400 text-sm">Analytics Charts Coming Soon</p>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-gray-400" />
                            Recent Activity
                        </h3>
                        <Link to="/app/admin/audit" className="text-sm text-blue-600 hover:underline">View All</Link>
                    </div>
                    <RecentActivityFeed logs={stats.recentActivity} />
                </div>
            </div>
        </div>
    );
};
