import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Clock, Award, FileText, Download, DollarSign, CalendarCheck, TrendingUp } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ParentStudentView() {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'fees' | 'attendance'>('overview');
    const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().toISOString().slice(0, 7));

    const { data: info, isLoading, error } = useQuery({
        queryKey: ['parent-student', id],
        queryFn: async () => {
            const res = await fetch(`/api/parent/student/${id}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch student details');
            return res.json();
        }
    });

    const { data: feeData } = useQuery({
        queryKey: ['parent-student-fees', id],
        queryFn: async () => {
            const res = await fetch(`/api/parent/student/${id}/fees`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch fees');
            return res.json();
        },
        enabled: activeTab === 'fees'
    });

    const { data: attendanceData } = useQuery({
        queryKey: ['parent-student-attendance', id, attendanceMonth],
        queryFn: async () => {
            const res = await fetch(`/api/parent/student/${id}/attendance?month=${attendanceMonth}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch attendance');
            return res.json();
        },
        enabled: activeTab === 'attendance'
    });

    if (isLoading) return <div className="p-8 text-center">Loading student details...</div>;
    if (error || !info) return <div className="p-8 text-center text-red-500">Student not found</div>;

    const { student, academic } = info;

    // Prepare chart data from academic history
    const chartData = (academic.history || [])
        .slice()
        .reverse()
        .map((rec: any) => ({
            period: `T${rec.term} ${rec.year}`,
            aggregate: rec.aggregate
        }));

    // Subject breakdown from latest marks
    const latestMarks = academic.latest?.marks;
    const subjectBreakdown = latestMarks && typeof latestMarks === 'object'
        ? Object.entries(latestMarks).map(([subject, score]) => ({ subject, score }))
        : [];

    const tabs = [
        { key: 'overview', label: 'Overview', icon: BookOpen },
        { key: 'academics', label: 'Academic History', icon: Award },
        { key: 'fees', label: 'Fees', icon: DollarSign },
        { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <Link to="/parent" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
            </Link>

            {/* Student Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col md:flex-row gap-6 items-center md:items-start">
                <div className="w-24 h-24 bg-gray-100 rounded-full border-4 border-white shadow-lg overflow-hidden flex-shrink-0">
                    {student.photoBase64 ? (
                        <img src={student.photoBase64} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
                            <BookOpen className="w-8 h-8" />
                        </div>
                    )}
                </div>
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                    <p className="text-gray-500">{student.classLevel}{student.stream ? ` - ${student.stream}` : ''}</p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                            {student.classLevel} {student.stream}
                        </span>
                        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium capitalize">
                            {student.boardingStatus}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-white px-4 rounded-t-lg overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="space-y-6">
                {activeTab === 'overview' && (
                    <>
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Latest Result Card */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Award className="w-5 h-5 text-yellow-600" />
                                        <h3 className="font-bold text-gray-900">Latest Performance</h3>
                                    </div>
                                    {academic.latest ? (
                                        <div className="text-center py-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">
                                                Term {academic.latest.term} {academic.latest.year}
                                            </p>
                                            <div className="flex justify-center gap-8 items-end">
                                                <div>
                                                    <p className="text-3xl font-bold text-gray-900">{academic.latest.aggregate}</p>
                                                    <p className="text-xs text-gray-500">Aggregate</p>
                                                </div>
                                                <div className="h-8 w-px bg-gray-300"></div>
                                                <div>
                                                    <p className="text-3xl font-bold text-gray-900">{academic.latest.division}</p>
                                                    <p className="text-xs text-gray-500">Division</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm text-center py-4">No recent marks available.</p>
                                    )}
                                </div>
                            </div>

                            {/* Recent Tests */}
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                <div className="p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Clock className="w-5 h-5 text-blue-600" />
                                        <h3 className="font-bold text-gray-900">Recent Tests</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {(academic.tests || []).slice(0, 3).map((test: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded">
                                                <div>
                                                    <p className="font-medium text-gray-900">{test.sessionName}</p>
                                                    <p className="text-xs text-gray-500">{test.testType}</p>
                                                </div>
                                                <span className="font-bold text-gray-900">{test.score}</span>
                                            </div>
                                        ))}
                                        {(!academic.tests || academic.tests.length === 0) && (
                                            <p className="text-center text-gray-500 py-2">No recent test scores.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance Trend Chart */}
                        {chartData.length > 1 && (
                            <div className="bg-white rounded-lg border shadow-sm p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    <h3 className="font-bold text-gray-900">Performance Trend</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="period" fontSize={12} />
                                        <YAxis fontSize={12} domain={[0, 'auto']} />
                                        <Tooltip />
                                        <Line
                                            type="monotone"
                                            dataKey="aggregate"
                                            stroke="#0052CC"
                                            strokeWidth={2}
                                            dot={{ fill: '#0052CC', r: 4 }}
                                            name="Aggregate"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Subject Breakdown */}
                        {subjectBreakdown.length > 0 && (
                            <div className="bg-white rounded-lg border shadow-sm p-6">
                                <h3 className="font-bold text-gray-900 mb-4">Subject Breakdown (Latest Term)</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {subjectBreakdown.map((item: any, idx: number) => (
                                        <div key={idx} className="bg-gray-50 rounded-lg p-3 text-center">
                                            <p className="text-xs text-gray-500 truncate">{item.subject}</p>
                                            <p className="text-xl font-bold text-gray-900 mt-1">{item.score}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'academics' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-6">
                                <h3 className="font-bold text-gray-900 mb-4">Term Reports</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium">Period</th>
                                                <th className="px-4 py-3 text-center font-medium">Agg</th>
                                                <th className="px-4 py-3 text-center font-medium">Div</th>
                                                <th className="px-4 py-3 text-right font-medium">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {academic.history.map((rec: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">Term {rec.term} {rec.year}</td>
                                                    <td className="px-4 py-3 text-center font-medium">{rec.aggregate}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-xs ${['1', 'I'].includes(rec.division) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                            {rec.division}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center">
                                                            <Download className="w-3 h-3 mr-1" />
                                                            Download PDF
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-6">
                                <h3 className="font-bold text-gray-900 mb-4">All Test Scores</h3>
                                <div className="space-y-3">
                                    {academic.tests.map((test: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-sm p-3 border rounded hover:bg-gray-50 transition-colors">
                                            <div>
                                                <p className="font-medium text-gray-900">{test.sessionName}</p>
                                                <p className="text-xs text-gray-500">
                                                    {test.testType} - Term {test.term} {test.year}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-xl text-gray-900">{test.score}</p>
                                                {test.division && <p className="text-xs text-gray-500">Div {test.division}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'fees' && (
                    <div className="space-y-6">
                        {/* Fee Summary */}
                        {feeData && (
                            <>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white rounded-lg border p-4 shadow-sm text-center">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Total Due</p>
                                        <p className="text-xl font-bold text-gray-900 mt-1">UGX {feeData.summary.totalDue.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white rounded-lg border p-4 shadow-sm text-center">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Total Paid</p>
                                        <p className="text-xl font-bold text-green-700 mt-1">UGX {feeData.summary.totalPaid.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white rounded-lg border p-4 shadow-sm text-center">
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Balance</p>
                                        <p className={`text-xl font-bold mt-1 ${feeData.summary.balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                            UGX {feeData.summary.balance.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Invoices */}
                                {feeData.invoices.length > 0 && (
                                    <div className="bg-white rounded-lg border shadow-sm">
                                        <div className="p-4 border-b">
                                            <h3 className="font-bold text-gray-900">Invoices</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 text-gray-500">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                                                        <th className="px-4 py-3 text-left font-medium">Term</th>
                                                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                                                        <th className="px-4 py-3 text-right font-medium">Paid</th>
                                                        <th className="px-4 py-3 text-center font-medium">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {feeData.invoices.map((inv: any) => (
                                                        <tr key={inv.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                                                            <td className="px-4 py-3">T{inv.term} {inv.year}</td>
                                                            <td className="px-4 py-3 text-right">UGX {inv.totalAmount.toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-right">UGX {inv.amountPaid.toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                                    inv.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-red-100 text-red-800'}`}>
                                                                    {inv.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Payment History */}
                                {feeData.payments.length > 0 && (
                                    <div className="bg-white rounded-lg border shadow-sm">
                                        <div className="p-4 border-b">
                                            <h3 className="font-bold text-gray-900">Payment History</h3>
                                        </div>
                                        <div className="divide-y">
                                            {feeData.payments.map((p: any) => (
                                                <div key={p.id} className="p-4 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{p.feeType}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {p.paymentDate || 'N/A'} {p.paymentMethod ? `- ${p.paymentMethod}` : ''}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-green-700">UGX {p.amountPaid.toLocaleString()}</p>
                                                        {p.receiptNumber && <p className="text-xs text-gray-400">#{p.receiptNumber}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {feeData.payments.length === 0 && feeData.invoices.length === 0 && (
                                    <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
                                        <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                        <p>No fee records found for this student.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="space-y-6">
                        {/* Month Navigator */}
                        <div className="bg-white rounded-lg border shadow-sm p-4 flex items-center justify-between">
                            <button
                                onClick={() => {
                                    const d = new Date(attendanceMonth + '-01');
                                    d.setMonth(d.getMonth() - 1);
                                    setAttendanceMonth(d.toISOString().slice(0, 7));
                                }}
                                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <h3 className="font-bold text-gray-900">
                                {new Date(attendanceMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h3>
                            <button
                                onClick={() => {
                                    const d = new Date(attendanceMonth + '-01');
                                    d.setMonth(d.getMonth() + 1);
                                    setAttendanceMonth(d.toISOString().slice(0, 7));
                                }}
                                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>

                        {attendanceData && (
                            <>
                                {/* Stats Bar */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="bg-green-50 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-green-700">{attendanceData.stats.present}</p>
                                        <p className="text-xs text-green-600">Present</p>
                                    </div>
                                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-yellow-700">{attendanceData.stats.late}</p>
                                        <p className="text-xs text-yellow-600">Late</p>
                                    </div>
                                    <div className="bg-red-50 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-red-700">{attendanceData.stats.absent}</p>
                                        <p className="text-xs text-red-600">Absent</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-blue-700">{attendanceData.stats.rate}%</p>
                                        <p className="text-xs text-blue-600">Rate</p>
                                    </div>
                                </div>

                                {/* Calendar Grid */}
                                <div className="bg-white rounded-lg border shadow-sm p-6">
                                    <h3 className="font-bold text-gray-900 mb-4">Attendance Calendar</h3>
                                    <div className="grid grid-cols-7 gap-1 text-center">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                            <div key={d} className="text-xs font-medium text-gray-500 py-2">{d}</div>
                                        ))}
                                        {(() => {
                                            const [y, m] = attendanceMonth.split('-').map(Number);
                                            const firstDay = new Date(y, m - 1, 1).getDay();
                                            const daysInMonth = new Date(y, m, 0).getDate();
                                            const cells = [];

                                            // Empty cells for days before month starts
                                            for (let i = 0; i < firstDay; i++) {
                                                cells.push(<div key={`empty-${i}`} className="h-10"></div>);
                                            }

                                            for (let day = 1; day <= daysInMonth; day++) {
                                                const dateStr = `${attendanceMonth}-${String(day).padStart(2, '0')}`;
                                                const record = attendanceData.gate.find((r: any) => r.date === dateStr);
                                                const isWeekend = new Date(y, m - 1, day).getDay() === 0 || new Date(y, m - 1, day).getDay() === 6;

                                                let bgColor = 'bg-gray-50 text-gray-400';
                                                if (record) {
                                                    if (record.status === 'present') bgColor = 'bg-green-100 text-green-800';
                                                    else if (record.status === 'late') bgColor = 'bg-yellow-100 text-yellow-800';
                                                    else if (record.status === 'absent') bgColor = 'bg-red-100 text-red-800';
                                                } else if (!isWeekend) {
                                                    bgColor = 'bg-gray-50 text-gray-300';
                                                }

                                                cells.push(
                                                    <div key={day} className={`h-10 rounded flex items-center justify-center text-sm font-medium ${bgColor}`} title={record?.status || ''}>
                                                        {day}
                                                    </div>
                                                );
                                            }
                                            return cells;
                                        })()}
                                    </div>
                                    <div className="flex gap-4 mt-4 text-xs">
                                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 rounded"></div> Present</div>
                                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 rounded"></div> Late</div>
                                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 rounded"></div> Absent</div>
                                    </div>
                                </div>

                                {/* Daily Records */}
                                {attendanceData.gate.length > 0 && (
                                    <div className="bg-white rounded-lg border shadow-sm">
                                        <div className="p-4 border-b">
                                            <h3 className="font-bold text-gray-900">Daily Records</h3>
                                        </div>
                                        <div className="divide-y">
                                            {attendanceData.gate.map((r: any) => (
                                                <div key={r.id} className="p-4 flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{r.date}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {r.checkInTime ? `In: ${r.checkInTime}` : ''} {r.checkOutTime ? `Out: ${r.checkOutTime}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${r.status === 'present' ? 'bg-green-100 text-green-800' :
                                                        r.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'}`}>
                                                        {r.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
