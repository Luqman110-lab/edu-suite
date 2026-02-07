import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarCheck, Users, ChevronLeft, ChevronRight } from "lucide-react";

export default function ParentAttendance() {
    const [selectedChild, setSelectedChild] = useState<number | null>(null);
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

    const { data: dashboard, isLoading: loadingDash } = useQuery({
        queryKey: ['parent-dashboard-stats'],
        queryFn: async () => {
            const res = await fetch('/api/parent/dashboard-stats', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        }
    });

    const children = dashboard?.children || [];
    const activeChild = selectedChild || children[0]?.id;

    const { data: attendanceData, isLoading: loadingAtt } = useQuery({
        queryKey: ['parent-student-attendance', activeChild, month],
        queryFn: async () => {
            const res = await fetch(`/api/parent/student/${activeChild}/attendance?month=${month}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!activeChild
    });

    const navigateMonth = (direction: number) => {
        const d = new Date(month + '-01');
        d.setMonth(d.getMonth() + direction);
        setMonth(d.toISOString().slice(0, 7));
    };

    if (loadingDash) return <div className="p-8 text-center text-gray-500">Loading...</div>;

    if (children.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No children linked to your account.</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
                <p className="text-gray-500">View daily attendance records and monthly overview.</p>
            </div>

            {/* Child Selector */}
            {children.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {children.map((child: any) => (
                        <button
                            key={child.id}
                            onClick={() => setSelectedChild(child.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-colors ${activeChild === child.id
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {child.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Month Navigator */}
            <div className="bg-white rounded-lg border shadow-sm p-4 flex items-center justify-between">
                <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-gray-900 text-lg">
                    {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {loadingAtt ? (
                <div className="p-8 text-center text-gray-500">Loading attendance...</div>
            ) : attendanceData ? (
                <>
                    {/* Stats Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white rounded-lg border p-4 text-center shadow-sm">
                            <p className="text-3xl font-bold text-gray-900">{attendanceData.stats.total}</p>
                            <p className="text-xs text-gray-500 mt-1">Total Days</p>
                        </div>
                        <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
                            <p className="text-3xl font-bold text-green-700">{attendanceData.stats.present}</p>
                            <p className="text-xs text-green-600 mt-1">Present</p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 text-center">
                            <p className="text-3xl font-bold text-yellow-700">{attendanceData.stats.late}</p>
                            <p className="text-xs text-yellow-600 mt-1">Late</p>
                        </div>
                        <div className="bg-red-50 rounded-lg border border-red-200 p-4 text-center">
                            <p className="text-3xl font-bold text-red-700">{attendanceData.stats.absent}</p>
                            <p className="text-xs text-red-600 mt-1">Absent</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
                            <p className="text-3xl font-bold text-blue-700">{attendanceData.stats.rate}%</p>
                            <p className="text-xs text-blue-600 mt-1">Attendance Rate</p>
                        </div>
                    </div>

                    {/* Calendar Heatmap */}
                    <div className="bg-white rounded-lg border shadow-sm p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Calendar View</h3>
                        <div className="grid grid-cols-7 gap-2 text-center">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="text-xs font-medium text-gray-500 py-2">{d}</div>
                            ))}
                            {(() => {
                                const [y, m] = month.split('-').map(Number);
                                const firstDay = new Date(y, m - 1, 1).getDay();
                                const daysInMonth = new Date(y, m, 0).getDate();
                                const cells = [];

                                for (let i = 0; i < firstDay; i++) {
                                    cells.push(<div key={`empty-${i}`} className="h-12"></div>);
                                }

                                for (let day = 1; day <= daysInMonth; day++) {
                                    const dateStr = `${month}-${String(day).padStart(2, '0')}`;
                                    const record = attendanceData.gate.find((r: any) => r.date === dateStr);
                                    const dayOfWeek = new Date(y, m - 1, day).getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                                    let bgColor = isWeekend ? 'bg-gray-100 text-gray-400' : 'bg-gray-50 text-gray-300';
                                    let statusText = '';
                                    if (record) {
                                        if (record.status === 'present') {
                                            bgColor = 'bg-green-100 text-green-800 border-green-200';
                                            statusText = 'P';
                                        } else if (record.status === 'late') {
                                            bgColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                                            statusText = 'L';
                                        } else if (record.status === 'absent') {
                                            bgColor = 'bg-red-100 text-red-800 border-red-200';
                                            statusText = 'A';
                                        } else if (record.status === 'left_early') {
                                            bgColor = 'bg-orange-100 text-orange-800 border-orange-200';
                                            statusText = 'E';
                                        }
                                    }

                                    cells.push(
                                        <div key={day} className={`h-12 rounded-lg border flex flex-col items-center justify-center ${bgColor}`}>
                                            <span className="text-sm font-medium">{day}</span>
                                            {statusText && <span className="text-[10px] font-bold">{statusText}</span>}
                                        </div>
                                    );
                                }
                                return cells;
                            })()}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-4 text-xs">
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div> Present (P)</div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div> Late (L)</div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div> Absent (A)</div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div> Left Early (E)</div>
                        </div>
                    </div>

                    {/* Daily Records Table */}
                    {attendanceData.gate.length > 0 && (
                        <div className="bg-white rounded-lg border shadow-sm">
                            <div className="p-4 border-b">
                                <h3 className="font-bold text-gray-900">Daily Records</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Date</th>
                                            <th className="px-4 py-3 text-center font-medium">Check In</th>
                                            <th className="px-4 py-3 text-center font-medium">Check Out</th>
                                            <th className="px-4 py-3 text-center font-medium">Method</th>
                                            <th className="px-4 py-3 text-center font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {attendanceData.gate.map((r: any) => (
                                            <tr key={r.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">
                                                    {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-3 text-center">{r.checkInTime || '-'}</td>
                                                <td className="px-4 py-3 text-center">{r.checkOutTime || '-'}</td>
                                                <td className="px-4 py-3 text-center capitalize">{r.checkInMethod || '-'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${r.status === 'present' ? 'bg-green-100 text-green-800' :
                                                        r.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                                            r.status === 'absent' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Boarding Records */}
                    {attendanceData.boarding.length > 0 && (
                        <div className="bg-white rounded-lg border shadow-sm">
                            <div className="p-4 border-b">
                                <h3 className="font-bold text-gray-900">Boarding Roll Calls</h3>
                            </div>
                            <div className="divide-y">
                                {attendanceData.boarding.map((r: any) => (
                                    <div key={r.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{r.date}</p>
                                            <p className="text-xs text-gray-500 capitalize">{r.session} session{r.sessionTime ? ` at ${r.sessionTime}` : ''}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${r.status === 'present' ? 'bg-green-100 text-green-800' :
                                            r.status === 'absent' ? 'bg-red-100 text-red-800' :
                                                r.status === 'sick_bay' ? 'bg-purple-100 text-purple-800' :
                                                    r.status === 'on_leave' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                            {r.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}
