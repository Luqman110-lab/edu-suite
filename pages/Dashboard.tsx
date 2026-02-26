
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Banknote,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  CalendarCheck,
  ArrowRight,
  UserPlus,
  MoreHorizontal
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
import { format } from 'date-fns';

// New Components
import { AnalyticsCard } from '../components/dashboard/AnalyticsCard';
import { UpcomingExamWidget } from '../components/dashboard/UpcomingExamWidget';
import { AttendanceWidget } from '../components/dashboard/AttendanceWidget';
import { AlertsPanel } from '../components/dashboard/AlertsPanel';
import { AcademicSnapshot } from '../components/dashboard/AcademicSnapshot';

// API Functions (Reused)
const fetchDashboardStats = async () => {
  const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
};

const fetchRevenueTrends = async () => {
  const res = await fetch('/api/dashboard/revenue-trends', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch trends');
  return res.json();
};

const fetchUpcomingEvents = async () => {
  const res = await fetch('/api/dashboard/upcoming-events', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
};

const fetchAcademicPerformance = async () => {
  const res = await fetch('/api/dashboard/academic-performance', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch academics');
  return res.json();
};

const fetchDemographics = async () => {
  const res = await fetch('/api/dashboard/demographics', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch demographics');
  return res.json();
};

const fetchRecentPayments = async () => {
  const res = await fetch(`/api/fee-payments?limit=5`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch payments');
  const result = await res.json();
  return result.data || [];
};

const fetchClassPerformance = async () => {
  const res = await fetch('/api/dashboard/class-performance', { credentials: 'include' });
  if (!res.ok) return [];
  return res.json();
};

const fetchDivisionDistribution = async () => {
  const res = await fetch('/api/dashboard/division-distribution', { credentials: 'include' });
  if (!res.ok) return [];
  return res.json();
};

const fetchAlerts = async () => {
  const res = await fetch('/api/dashboard/alerts', { credentials: 'include' });
  if (!res.ok) return [];
  return res.json();
};

// --- Sub-components used locally ---

const DashboardChart = ({ data, isDark }: { data: any[], isDark: boolean }) => {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
          <Legend verticalAlign="top" height={36} />
          <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
          <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" name="Expenses" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export function Dashboard() {
  const { user, activeSchool } = useAuth();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const isDark = document.documentElement.classList.contains('dark');
  const schoolId = activeSchool?.id;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // Queries
  const { data: stats } = useQuery({ queryKey: ['dashboardStats', schoolId], queryFn: fetchDashboardStats, enabled: !!schoolId, staleTime: 0 });
  const { data: revenueData } = useQuery({ queryKey: ['revenueTrends', schoolId], queryFn: fetchRevenueTrends, enabled: !!schoolId, staleTime: 0 });
  const { data: events } = useQuery({ queryKey: ['upcomingEvents', schoolId], queryFn: fetchUpcomingEvents, enabled: !!schoolId, staleTime: 0 });
  const { data: academicData } = useQuery({ queryKey: ['academicPerformance', schoolId], queryFn: fetchAcademicPerformance, enabled: !!schoolId, staleTime: 0 });
  const { data: recentPayments } = useQuery({ queryKey: ['recentPayments', schoolId], queryFn: fetchRecentPayments, enabled: !!schoolId, staleTime: 0 });
  const { data: classPerformance } = useQuery({ queryKey: ['classPerformance', schoolId], queryFn: fetchClassPerformance, enabled: !!schoolId, staleTime: 0 });
  const { data: divisionDistribution } = useQuery({ queryKey: ['divisionDist', schoolId], queryFn: fetchDivisionDistribution, enabled: !!schoolId, staleTime: 0 });
  const { data: alerts } = useQuery({ queryKey: ['alerts', schoolId], queryFn: fetchAlerts, enabled: !!schoolId, staleTime: 0 });

  const { data: demographics } = useQuery({ queryKey: ['demographics', schoolId], queryFn: fetchDemographics, enabled: !!schoolId, staleTime: 0 });

  const avgPerformance = academicData && academicData.length > 0
    ? Math.round(academicData.reduce((sum: number, s: any) => sum + s.average, 0) / academicData.length)
    : 0;

  const upcomingEventsList = events ? events.map((event: any, idx: number) => ({
    id: idx,
    subject: event.title,
    date: event.date ? format(new Date(event.date), 'yyyy-MM-dd') : '',
    startTime: 'All Day',
    endTime: '',
    status: 'confirmed'
  })) : [];


  return (
    <div className="space-y-6 animate-fade-in-up pb-8">
      {/* Context Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span className="font-semibold text-gray-900 dark:text-white">Overview</span>
            <span>•</span>
            <span>{activeSchool?.name || 'School'}</span>
            <span>•</span>
            <span className="text-violet-600 dark:text-violet-400 font-medium">
              Term {activeSchool?.currentTerm || '1'}, {activeSchool?.currentYear || new Date().getFullYear()}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {greeting}, {user?.name?.split(' ')[0]}
          </h1>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <CalendarCheck className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {format(new Date(), 'EEEE, dd MMM yyyy')}
          </span>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title="Total Students"
          value={stats?.students?.total || 0}
          icon={Users}
          color="purple"
          subtext="Enrolled this year"
        />
        <AnalyticsCard
          title="Revenue"
          value={`UGX ${(stats?.revenue?.total / 1000000 || 0).toFixed(1)}M`}
          icon={Banknote}
          color="success"
          subtext="Total collected"
        />
        <AnalyticsCard
          title="Outstanding"
          value={`UGX ${(stats?.revenue?.outstanding / 1000000 || 0).toFixed(1)}M`}
          icon={TrendingUp}
          color="warning"
          subtext="Fees pending"
        />
        <AnalyticsCard
          title="Avg. Performance"
          value={`${avgPerformance}%`}
          icon={Activity}
          color="info"
          subtext="Class average"
        />
      </div>

      {/* Actionable Alerts Panel */}
      <div className="w-full">
        <AlertsPanel alerts={alerts || []} />
      </div>

      {/* Pulse Section (Student & Teachers) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AttendanceWidget
          presentCount={stats?.students?.present || 0}
          absentCount={stats?.students?.absent || 0}
          lateCount={stats?.students?.late || 0}
          totalStudents={stats?.students?.total || 1}
          isDark={isDark}
          title="Student Attendance"
        />
        <AttendanceWidget
          presentCount={stats?.teachers?.present || 0}
          absentCount={stats?.teachers?.absent || 0}
          lateCount={stats?.teachers?.late || 0}
          totalStudents={stats?.teachers?.total || 1}
          isDark={isDark}
          title="Teacher Attendance"
        />
      </div>

      {/* Middle Section: Academic & Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AcademicSnapshot
            divisionData={divisionDistribution || []}
            classPerformance={classPerformance || []}
            subjectAverages={academicData || []}
            genderData={demographics?.gender || [{ name: 'M', value: 0 }, { name: 'F', value: 0 }]}
            isDark={isDark}
          />
        </div>
        <div className="lg:col-span-1">
          <UpcomingExamWidget exams={upcomingEventsList} isDark={isDark} onViewAll={() => navigate('/app/planning')} />
        </div>
      </div>

      {/* Bottom Section: Financials & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Graph */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Financial Overview</h3>
            <select className="text-sm border-none bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1 outline-none cursor-pointer">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
          <DashboardChart data={revenueData || []} isDark={isDark} />
        </div>

        {/* Transactions / Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-1">Quick Actions</h3>
              <p className="text-indigo-100 text-sm mb-4">Manage your school efficiently</p>
              <div className="grid grid-cols-2 gap-3">
                {/* Admin / Headteacher Actions */}
                {(user?.role === 'admin' || user?.role === 'headteacher' || user?.isSuperAdmin) && (
                  <>
                    <button onClick={() => navigate('/app/students')} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-xl flex flex-col items-center gap-2 transition-all border border-white/10">
                      <UserPlus className="w-5 h-5 text-indigo-300" />
                      <span className="text-xs font-semibold text-center">Add Student</span>
                    </button>
                    <button onClick={() => navigate('/app/finance')} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-xl flex flex-col items-center gap-2 transition-all border border-white/10">
                      <TrendingUp className="w-5 h-5 text-red-300" />
                      <span className="text-xs font-semibold text-center">View Debtors</span>
                    </button>
                    <button onClick={() => navigate('/app/reports')} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-xl flex flex-col items-center gap-2 transition-all border border-white/10">
                      <PieChartIcon className="w-5 h-5 text-blue-300" />
                      <span className="text-xs font-semibold text-center">Reports</span>
                    </button>
                  </>
                )}

                {/* Bursar Actions */}
                {user?.role === 'bursar' && (
                  <>
                    <button onClick={() => navigate('/app/finance/record-payment')} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-xl flex flex-col items-center gap-2 transition-all border border-white/10">
                      <Banknote className="w-5 h-5 text-green-300" />
                      <span className="text-xs font-semibold text-center">Record Payment</span>
                    </button>
                    <button onClick={() => navigate('/app/finance')} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-xl flex flex-col items-center gap-2 transition-all border border-white/10">
                      <TrendingUp className="w-5 h-5 text-red-300" />
                      <span className="text-xs font-semibold text-center">View Debtors</span>
                    </button>
                  </>
                )}

                {/* Teacher / DOS Actions */}
                {(user?.role === 'teacher' || user?.role === 'dos') && (
                  <>
                    <button onClick={() => navigate('/app/academics')} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-xl flex flex-col items-center gap-2 transition-all border border-white/10">
                      <Activity className="w-5 h-5 text-green-300" />
                      <span className="text-xs font-semibold text-center">Enter Marks</span>
                    </button>
                    <button onClick={() => navigate('/app/students/attendance')} className="bg-white/10 hover:bg-white/20 backdrop-blur-md p-3 rounded-xl flex flex-col items-center gap-2 transition-all border border-white/10">
                      <Users className="w-5 h-5 text-yellow-300" />
                      <span className="text-xs font-semibold text-center">Attendance</span>
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl transform -translate-x-5 translate-y-5"></div>
          </div>

          {/* Recent Transactions List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Recent Payments</h3>
              <ArrowRight className="w-4 h-4 text-gray-400 cursor-pointer" onClick={() => navigate('/app/finance')} />
            </div>
            <div className="space-y-4">
              {recentPayments?.map((payment: any, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">#{payment.studentId}</div>
                      <div className="text-xs text-gray-500">{payment.paymentDate}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">+{parseInt(payment.amountPaid).toLocaleString()}</div>
                    <span className="text-[10px] uppercase font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400">Paid</span>
                  </div>
                </div>
              ))}
              {(!recentPayments || recentPayments.length === 0) && (
                <div className="text-center py-2 text-gray-400 text-sm">No recent transactions</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
