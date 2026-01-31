import React, { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { dbService } from '../services/api';
import { ClassLevel, Student, MarkRecord, SchoolSettings } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface AnalyticsData {
  students: Student[];
  marks: MarkRecord[];
  settings: SchoolSettings;
}

const COLORS = {
  primary: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  teal: '#14B8A6',
};

const DIVISION_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444'];
const SUBJECT_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#3B82F6'];

const StatCard = ({ title, value, subtitle, icon, color, isDark }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  isDark: boolean;
}) => (
  <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-soft border p-6`}>
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
        <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>{value}</p>
        {subtitle && <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-1`}>{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

const ChartCard = ({ title, children, className = "", isDark }: { title: string; children: React.ReactNode; className?: string; isDark: boolean }) => (
  <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-soft border p-6 ${className}`}>
    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-4`}>{title}</h3>
    {children}
  </div>
);

export const Analytics: React.FC = () => {
  const { isDark } = useTheme();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedTerm, setSelectedTerm] = useState<number | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedClass, setSelectedClass] = useState<ClassLevel | 'all'>('all');
  const [selectedType, setSelectedType] = useState<'BOT' | 'EOT' | 'all'>('all');

  useEffect(() => {
    const loadData = async () => {
      const [students, marks, settings] = await Promise.all([
        dbService.getStudents(),
        dbService.getMarks(),
        dbService.getSettings()
      ]);
      setData({ students, marks, settings });
      setLoading(false);
    };
    loadData();
  }, []);

  const availableYears = useMemo(() => {
    if (!data) return [];
    const years = [...new Set(data.marks.map(m => m.year))] as number[];
    return years.sort((a, b) => b - a);
  }, [data]);

  const filteredMarks = useMemo(() => {
    if (!data) return [];
    return data.marks.filter(m => {
      if (selectedTerm !== 'all' && m.term !== selectedTerm) return false;
      if (selectedYear !== 'all' && m.year !== selectedYear) return false;
      if (selectedType !== 'all' && m.type !== selectedType) return false;
      if (selectedClass !== 'all') {
        const student = data.students.find(s => s.id === m.studentId);
        if (!student || student.classLevel !== selectedClass) return false;
      }
      return true;
    });
  }, [data, selectedTerm, selectedYear, selectedClass, selectedType]);

  const getStudentById = (id: number) => data?.students.find(s => s.id === id);

  const summaryStats = useMemo(() => {
    if (!filteredMarks.length) return { totalAssessed: 0, avgAggregate: 0, passRate: 0, bestClass: '-' };

    const totalAssessed = filteredMarks.length;
    const avgAggregate = filteredMarks.reduce((sum, m) => sum + (m.aggregate || 0), 0) / totalAssessed;
    const passed = filteredMarks.filter(m => m.division && ['I', 'II', 'III'].includes(m.division)).length;
    const passRate = (passed / totalAssessed) * 100;

    const classCounts: { [key: string]: { total: number; aggregate: number } } = {};
    filteredMarks.forEach(m => {
      const student = getStudentById(m.studentId);
      if (student) {
        if (!classCounts[student.classLevel]) {
          classCounts[student.classLevel] = { total: 0, aggregate: 0 };
        }
        classCounts[student.classLevel].total++;
        classCounts[student.classLevel].aggregate += m.aggregate || 0;
      }
    });

    let bestClass = '-';
    let bestAvg = Infinity;
    Object.entries(classCounts).forEach(([cls, stats]) => {
      const avg = stats.aggregate / stats.total;
      if (avg < bestAvg) {
        bestAvg = avg;
        bestClass = cls;
      }
    });

    return { totalAssessed, avgAggregate: avgAggregate.toFixed(1), passRate: passRate.toFixed(1), bestClass };
  }, [filteredMarks, data]);

  const divisionData = useMemo(() => {
    const counts = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
    filteredMarks.forEach(m => {
      if (m.division && m.division in counts) {
        counts[m.division as keyof typeof counts]++;
      }
    });
    return [
      { name: 'Division I', value: counts.I, fill: DIVISION_COLORS[0] },
      { name: 'Division II', value: counts.II, fill: DIVISION_COLORS[1] },
      { name: 'Division III', value: counts.III, fill: DIVISION_COLORS[2] },
      { name: 'Division IV', value: counts.IV, fill: DIVISION_COLORS[3] },
      { name: 'Ungraded', value: counts.U, fill: DIVISION_COLORS[4] || '#94a3b8' },
    ];
  }, [filteredMarks]);

  const classPerformanceData = useMemo(() => {
    const classStats: { [key: string]: { total: number; aggregate: number; count: number } } = {};

    filteredMarks.forEach(m => {
      const student = getStudentById(m.studentId);
      if (student) {
        if (!classStats[student.classLevel]) {
          classStats[student.classLevel] = { total: 0, aggregate: 0, count: 0 };
        }
        classStats[student.classLevel].aggregate += m.aggregate || 0;
        classStats[student.classLevel].count++;
      }
    });

    return Object.values(ClassLevel).map(cls => ({
      class: cls,
      avgAggregate: classStats[cls] ? (classStats[cls].aggregate / classStats[cls].count).toFixed(1) : 0,
      students: classStats[cls]?.count || 0,
    }));
  }, [filteredMarks, data]);

  const subjectPerformanceData = useMemo(() => {
    const subjects: { [key: string]: { total: number; count: number } } = {
      english: { total: 0, count: 0 },
      maths: { total: 0, count: 0 },
      science: { total: 0, count: 0 },
      sst: { total: 0, count: 0 },
      literacy1: { total: 0, count: 0 },
      literacy2: { total: 0, count: 0 },
    };

    filteredMarks.forEach(m => {
      if (m.marks) {
        Object.entries(m.marks).forEach(([subject, mark]) => {
          if (mark !== undefined && mark !== null && subjects[subject] && typeof mark === 'number') {
            subjects[subject].total += mark;
            subjects[subject].count++;
          }
        });
      }
    });

    return [
      { subject: 'English', avg: subjects.english.count ? (subjects.english.total / subjects.english.count).toFixed(1) : 0 },
      { subject: 'Maths', avg: subjects.maths.count ? (subjects.maths.total / subjects.maths.count).toFixed(1) : 0 },
      { subject: 'Science', avg: subjects.science.count ? (subjects.science.total / subjects.science.count).toFixed(1) : 0 },
      { subject: 'SST', avg: subjects.sst.count ? (subjects.sst.total / subjects.sst.count).toFixed(1) : 0 },
      { subject: 'Literacy 1', avg: subjects.literacy1.count ? (subjects.literacy1.total / subjects.literacy1.count).toFixed(1) : 0 },
      { subject: 'Literacy 2', avg: subjects.literacy2.count ? (subjects.literacy2.total / subjects.literacy2.count).toFixed(1) : 0 },
    ].filter(s => Number(s.avg) > 0);
  }, [filteredMarks]);

  const genderPerformanceData = useMemo(() => {
    const genderStats: { [key: string]: { divI: number; divII: number; divIII: number; divIV: number; divU: number; total: number } } = {
      M: { divI: 0, divII: 0, divIII: 0, divIV: 0, divU: 0, total: 0 },
      F: { divI: 0, divII: 0, divIII: 0, divIV: 0, divU: 0, total: 0 },
    };

    filteredMarks.forEach(m => {
      const student = getStudentById(m.studentId);
      if (student && genderStats[student.gender]) {
        genderStats[student.gender].total++;
        if (m.division === 'I') genderStats[student.gender].divI++;
        else if (m.division === 'II') genderStats[student.gender].divII++;
        else if (m.division === 'III') genderStats[student.gender].divIII++;
        else if (m.division === 'IV') genderStats[student.gender].divIV++;
        else genderStats[student.gender].divU++;
      }
    });

    return [
      { gender: 'Male', ...genderStats.M },
      { gender: 'Female', ...genderStats.F },
    ];
  }, [filteredMarks, data]);

  const streamComparisonData = useMemo(() => {
    if (selectedClass === 'all') return [];

    const streamStats: { [key: string]: { aggregate: number; count: number } } = {};

    filteredMarks.forEach(m => {
      const student = getStudentById(m.studentId);
      if (student && student.classLevel === selectedClass) {
        if (!streamStats[student.stream]) {
          streamStats[student.stream] = { aggregate: 0, count: 0 };
        }
        streamStats[student.stream].aggregate += m.aggregate || 0;
        streamStats[student.stream].count++;
      }
    });

    return Object.entries(streamStats).map(([stream, stats]) => ({
      stream,
      avgAggregate: (stats.aggregate / stats.count).toFixed(1),
      students: stats.count,
    }));
  }, [filteredMarks, data, selectedClass]);

  const termTrendData = useMemo(() => {
    if (!data) return [];

    const termStats: { [key: string]: { aggregate: number; count: number } } = {};

    data.marks.forEach(m => {
      const key = `${m.year} T${m.term}`;
      if (!termStats[key]) {
        termStats[key] = { aggregate: 0, count: 0 };
      }
      termStats[key].aggregate += m.aggregate || 0;
      termStats[key].count++;
    });

    return Object.entries(termStats)
      .map(([term, stats]) => ({
        term,
        avgAggregate: stats.count ? (stats.aggregate / stats.count).toFixed(1) : 0,
        students: stats.count,
      }))
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [data]);

  const topPerformers = useMemo(() => {
    if (!data) return [];

    const studentBest: { [key: number]: { aggregate: number; division: string; student: Student } } = {};

    filteredMarks.forEach(m => {
      const student = getStudentById(m.studentId);
      if (student) {
        if (!studentBest[m.studentId] || m.aggregate < studentBest[m.studentId].aggregate) {
          studentBest[m.studentId] = { aggregate: m.aggregate, division: m.division, student };
        }
      }
    });

    return Object.values(studentBest)
      .sort((a, b) => a.aggregate - b.aggregate)
      .slice(0, 10);
  }, [filteredMarks, data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const hasData = filteredMarks.length > 0;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Performance Analytics</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Comprehensive insights into student performance</p>
        </div>
      </div>

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-soft border p-4`}>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Year</label>
            <select
              className={`block w-32 px-3 py-2 border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500`}
              value={selectedYear === 'all' ? 'all' : selectedYear}
              onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">All Years</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Term</label>
            <select
              className={`block w-32 px-3 py-2 border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500`}
              value={selectedTerm === 'all' ? 'all' : selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">All Terms</option>
              <option value={1}>Term 1</option>
              <option value={2}>Term 2</option>
              <option value={3}>Term 3</option>
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Class</label>
            <select
              className={`block w-32 px-3 py-2 border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500`}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as ClassLevel | 'all')}
            >
              <option value="all">All Classes</option>
              {Object.values(ClassLevel).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Assessment</label>
            <select
              className={`block w-32 px-3 py-2 border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500`}
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'BOT' | 'EOT' | 'all')}
            >
              <option value="all">All Types</option>
              <option value="BOT">Beginning of Term</option>
              <option value="EOT">End of Term</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Students Assessed"
          value={summaryStats.totalAssessed}
          subtitle="Total assessments"
          color="bg-primary-100 text-primary-600"
          isDark={isDark}
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <StatCard
          title="Average Aggregate"
          value={summaryStats.avgAggregate}
          subtitle="Lower is better"
          color="bg-success-100 text-success-600"
          isDark={isDark}
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
        <StatCard
          title="Pass Rate"
          value={`${summaryStats.passRate}%`}
          subtitle="Div I, II, III"
          color="bg-warning-100 text-warning-600"
          isDark={isDark}
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
        />
        <StatCard
          title="Best Class"
          value={summaryStats.bestClass}
          subtitle="Lowest avg aggregate"
          color="bg-purple-100 text-purple-600"
          isDark={isDark}
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>}
        />
      </div>

      {!hasData ? (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-soft border p-12 text-center`}>
          <div className={`w-16 h-16 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <svg className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>No Data Available</h3>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>No assessment data found for the selected filters. Try adjusting your filters or add some marks first.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Division Distribution" isDark={isDark}>
              <div className="h-64 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={divisionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {divisionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Students']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Subject Performance (Average Marks)" isDark={isDark}>
              <div className="h-64 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectPerformanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="subject" width={80} />
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Average']} />
                    <Bar dataKey="avg" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Class Performance Comparison" isDark={isDark}>
              <div className="h-64 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="class" />
                    <YAxis domain={[0, 36]} reversed label={{ value: 'Avg Aggregate', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value: number) => [value, 'Avg Aggregate']} />
                    <Bar dataKey="avgAggregate" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Gender Performance" isDark={isDark}>
              <div className="h-64 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={genderPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="gender" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="divI" name="Division I" fill={DIVISION_COLORS[0]} stackId="stack" />
                    <Bar dataKey="divII" name="Division II" fill={DIVISION_COLORS[1]} stackId="stack" />
                    <Bar dataKey="divIII" name="Division III" fill={DIVISION_COLORS[2]} stackId="stack" />
                    <Bar dataKey="divIV" name="Division IV" fill={DIVISION_COLORS[3]} stackId="stack" />
                    <Bar dataKey="divU" name="Ungraded" fill={DIVISION_COLORS[4]} stackId="stack" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {selectedClass !== 'all' && streamComparisonData.length > 0 && (
            <ChartCard title={`Stream Comparison - ${selectedClass}`} isDark={isDark}>
              <div className="h-64 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={streamComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="stream" />
                    <YAxis domain={[0, 36]} reversed label={{ value: 'Avg Aggregate', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === 'avgAggregate' ? value : value,
                        name === 'avgAggregate' ? 'Avg Aggregate' : 'Students'
                      ]}
                    />
                    <Bar dataKey="avgAggregate" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {termTrendData.length > 1 && (
            <ChartCard title="Performance Trend Over Time" isDark={isDark}>
              <div className="h-64 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={termTrendData}>
                    <defs>
                      <linearGradient id="colorAggregate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="term" />
                    <YAxis domain={[0, 36]} reversed label={{ value: 'Avg Aggregate', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value: number) => [value, 'Avg Aggregate']} />
                    <Area
                      type="monotone"
                      dataKey="avgAggregate"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorAggregate)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          <ChartCard title="Top 10 Performers" isDark={isDark}>
            {topPerformers.length === 0 ? (
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-center py-8`}>No data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className={`w-full text-sm ${isDark ? 'text-gray-300' : ''}`}>
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                      <th className={`text-left py-3 px-4 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rank</th>
                      <th className={`text-left py-3 px-4 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Student Name</th>
                      <th className={`text-left py-3 px-4 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Class</th>
                      <th className={`text-left py-3 px-4 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Stream</th>
                      <th className={`text-center py-3 px-4 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Aggregate</th>
                      <th className={`text-center py-3 px-4 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Division</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPerformers.map((item, index) => (
                      <tr key={item.student.id} className={`border-b ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-50 hover:bg-gray-50'}`}>
                        <td className="py-3 px-4">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                              index === 1 ? (isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-700') :
                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                  (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-500')
                            }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className={`py-3 px-4 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.student.name}</td>
                        <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.student.classLevel}</td>
                        <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.student.stream}</td>
                        <td className="py-3 px-4 text-center font-semibold text-primary-600">{item.aggregate}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.division === 'I' ? 'bg-success-100 text-success-700' :
                              item.division === 'II' ? 'bg-info-100 text-info-700' :
                                item.division === 'III' ? 'bg-warning-100 text-warning-700' :
                                  (isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')
                            }`}>
                            Division {item.division}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
};
