
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  GraduationCap,
  Banknote,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Clock,
  MoreHorizontal,
  ArrowRight,
  UserPlus,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Gift
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

// Types
import { UserSchool } from '../hooks/use-auth';

// API Functions
const fetchDashboardStats = async () => {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
};

const fetchRevenueTrends = async () => {
  const res = await fetch('/api/dashboard/revenue-trends');
  if (!res.ok) throw new Error('Failed to fetch trends');
  return res.json();
};

const fetchUpcomingEvents = async () => {
  const res = await fetch('/api/dashboard/upcoming-events');
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
};

const fetchAcademicPerformance = async () => {
  const res = await fetch('/api/dashboard/academic-performance');
  if (!res.ok) throw new Error('Failed to fetch academics');
  return res.json();
};

const fetchDemographics = async () => {
  const res = await fetch('/api/dashboard/demographics');
  if (!res.ok) throw new Error('Failed to fetch demographics');
  return res.json();
};

const fetchRecentPayments = async () => {
  const res = await fetch(`/api/fee-payments?limit=5`);
  if (!res.ok) throw new Error('Failed to fetch payments');
  const data = await res.json();
  return data.slice(0, 5);
};

// --- Components ---

// Modern Stat Card with gradient backgrounds
const StatCard = ({ title, value, subtext, icon: Icon, trend, variant = 'primary' }: any) => {
  const gradients: Record<string, string> = {
    primary: 'from-primary-500 to-violet-500',
    success: 'from-success-500 to-success-600',
    warning: 'from-warning-500 to-warning-600',
    danger: 'from-danger-500 to-danger-600',
    purple: 'from-violet-500 to-purple-600',
    blue: 'from-blue-500 to-indigo-500',
    green: 'from-emerald-500 to-teal-500',
    orange: 'from-orange-500 to-amber-500',
  };

  const bgGradients: Record<string, string> = {
    primary: 'stat-gradient-primary',
    success: 'stat-gradient-success',
    warning: 'stat-gradient-warning',
    danger: 'stat-gradient-danger',
    purple: 'stat-gradient-primary',
    blue: 'stat-gradient-primary',
    green: 'stat-gradient-success',
    orange: 'stat-gradient-warning',
  };

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-card border border-gray-100 dark:border-gray-700/50 hover-lift overflow-hidden group">
      {/* Subtle gradient background */}
      <div className={`absolute inset-0 ${bgGradients[variant]} opacity-50 group-hover:opacity-70 transition-opacity`} />

      <div className="relative flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2 tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradients[variant]} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="relative mt-4 flex items-center text-sm">
        {trend !== undefined && trend !== 0 && (
          <span className={`flex items-center font-semibold ${trend > 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            {Math.abs(trend)}%
          </span>
        )}
        <span className="text-gray-500 dark:text-gray-400 ml-2">{subtext}</span>
      </div>
    </div>
  );
};

const CalendarWidget = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const startDay = startOfMonth(currentDate).getDay();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-card border border-gray-100 dark:border-gray-700/50">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-gray-900 dark:text-white">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-3">
        {weekDays.map(d => (
          <div key={d} className="text-xs font-semibold text-gray-400 dark:text-gray-500 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {daysInMonth.map(day => (
          <div
            key={day.toString()}
            className={`
              text-sm py-2 rounded-xl cursor-pointer transition-all relative
              ${isSameDay(day, new Date())
                ? 'bg-gradient-to-br from-primary-500 to-violet-500 text-white font-semibold shadow-lg shadow-primary-500/30'
                : 'text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400'}
            `}
          >
            {format(day, 'd')}
          </div>
        ))}
      </div>
    </div>
  );
};

const DashboardChart = ({ data, isDark }: { data: any[], isDark: boolean }) => {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#374151' : '#f3f4f6'} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1f2937' : '#fff',
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
          <Area type="monotone" dataKey="expenses" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" name="Expenses" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const DemographicsChart = ({ data, isDark }: { data: any[], isDark: boolean }) => {
  const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'];
  return (
    <div className="h-[250px] w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1f2937' : '#fff',
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const AcademicChart = ({ data, isDark }: { data: any[], isDark: boolean }) => {
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#374151' : '#f3f4f6'} />
          <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: 'transparent' }}
            contentStyle={{
              backgroundColor: isDark ? '#1f2937' : '#fff',
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Bar dataKey="average" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


export function Dashboard() {
  const { user, activeSchool } = useAuth();
  const [greeting, setGreeting] = useState('');
  const isDark = document.documentElement.classList.contains('dark');
  const schoolId = activeSchool?.id;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Queries using new endpoints
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats', schoolId],
    queryFn: fetchDashboardStats,
    enabled: !!schoolId,
    staleTime: 0,
  });

  const { data: revenueData } = useQuery({
    queryKey: ['revenueTrends', schoolId],
    queryFn: fetchRevenueTrends,
    enabled: !!schoolId,
    staleTime: 0,
  });

  const { data: events } = useQuery({
    queryKey: ['upcomingEvents', schoolId],
    queryFn: fetchUpcomingEvents,
    enabled: !!schoolId,
    staleTime: 0,
  });

  const { data: academicData } = useQuery({
    queryKey: ['academicPerformance', schoolId],
    queryFn: fetchAcademicPerformance,
    enabled: !!schoolId,
    staleTime: 0,
  });

  const { data: demographics } = useQuery({
    queryKey: ['demographics', schoolId],
    queryFn: fetchDemographics,
    enabled: !!schoolId,
    staleTime: 0,
  });

  const { data: recentPayments } = useQuery({
    queryKey: ['recentPayments', schoolId],
    queryFn: fetchRecentPayments,
    enabled: !!schoolId,
    staleTime: 0,
  });

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* Header with mesh gradient background */}
      <div className="relative -mx-4 -mt-4 px-4 pt-4 pb-8 mb-4 mesh-bg rounded-b-3xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {greeting}, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Here's what's happening at <span className="font-semibold text-primary-600 dark:text-primary-400">{activeSchool?.name}</span> today.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-soft border border-white/50 dark:border-gray-700/50">
            <CalendarIcon className="w-4 h-4 text-primary-500" />
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={stats?.students?.total || 0}
          subtext={`${stats?.students?.present || 0} Present Today`}
          icon={Users}
          variant="primary"
          trend={2.5}
        />
        <StatCard
          title="Total Teachers"
          value={stats?.teachers?.total || 0}
          subtext="Active Staff"
          icon={GraduationCap}
          variant="purple"
          trend={0}
        />
        <StatCard
          title="Total Revenue"
          value={`UGX ${(stats?.revenue?.total || 0).toLocaleString()}`}
          subtext="This Year"
          icon={Banknote}
          variant="success"
          trend={12.5}
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats?.attendance?.rate || 0}%`}
          subtext="Daily Average"
          icon={UserPlus}
          variant="orange"
          trend={-1.2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">

          {/* Revenue Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-card border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Financial Overview</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Revenue vs Expenses (Yearly)</p>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary-500"></span> Revenue</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-violet-500"></span> Expenses</span>
              </div>
            </div>
            <DashboardChart data={revenueData || []} isDark={isDark} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Demographics */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Student Composition</h3>
              <div className="flex justify-center border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">
                <span className="text-xs font-medium text-gray-500">Gender Distribution</span>
              </div>
              <DemographicsChart data={demographics?.gender || []} isDark={isDark} />
            </div>

            {/* Academic Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Academic Performance</h3>
              <div className="flex justify-center border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">
                <span className="text-xs font-medium text-gray-500">Average Score by Subject</span>
              </div>
              <AcademicChart data={academicData || []} isDark={isDark} />
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Transactions</h3>
              <button className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentPayments?.map((payment: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {payment.paymentDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        #{payment.studentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        UGX {parseInt(payment.amountPaid).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium 
                          ${payment.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            payment.status === 'partial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!recentPayments || recentPayments.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No recent transactions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">

          <CalendarWidget />

          {/* Upcoming Events & Birthdays */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Upcoming</h3>
              <MoreHorizontal className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
            </div>
            <div className="space-y-4">
              {events?.map((event: any, i: number) => (
                <div key={i} className={`flex items-start gap-4 p-3 rounded-xl border transition-colors ${event.type === 'birthday'
                  ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-800'
                  : 'bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800'
                  }`}>
                  <div className={`p-2 rounded-lg text-center min-w-[50px] shadow-sm ${event.type === 'birthday' ? 'bg-white dark:bg-gray-800 text-pink-500' : 'bg-white dark:bg-gray-800 text-primary-600'
                    }`}>
                    <div className="text-xs font-bold uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</div>
                    <div className="text-xl font-bold">{new Date(event.date).getDate()}</div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{event.title}</h4>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {event.type === 'birthday' ? <Gift className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {event.type === 'birthday' ? 'Birthday' : 'All Day'}
                    </div>
                  </div>
                </div>
              ))}

              {(!events || events.length === 0) && (
                <div className="text-center py-4 text-gray-500 text-sm">No upcoming events or birthdays</div>
              )}
            </div>
          </div>

          {/* Quick Actions - Premium styled */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-violet-500 rounded-2xl p-6 text-white shadow-glow">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />

            <h3 className="relative font-bold text-lg mb-4">Quick Actions</h3>
            <div className="relative grid grid-cols-2 gap-3">
              <button className="bg-white/15 hover:bg-white/25 backdrop-blur-sm p-4 rounded-xl flex flex-col items-center gap-2 transition-all hover:scale-105 border border-white/20">
                <UserPlus className="w-6 h-6" />
                <span className="text-xs font-semibold">Add Student</span>
              </button>
              <button className="bg-white/15 hover:bg-white/25 backdrop-blur-sm p-4 rounded-xl flex flex-col items-center gap-2 transition-all hover:scale-105 border border-white/20">
                <Banknote className="w-6 h-6" />
                <span className="text-xs font-semibold">Add Payment</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
