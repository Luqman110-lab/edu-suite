import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../../../components/Button';
import { AttendanceTeacher, TeacherRecord, TeacherStatus } from '../../types/attendance';

interface StaffListProps {
    teachers: AttendanceTeacher[];
    records: TeacherRecord[];
    onManualCheckIn: (teacherId: number) => void;
    onManualCheckOut: (teacherId: number) => void;
    onMarkLeave: (teacherId: number) => void;
}

export const StaffList: React.FC<StaffListProps> = ({
    teachers,
    records,
    onManualCheckIn,
    onManualCheckOut,
    onMarkLeave
}) => {
    const { isDark } = useTheme();

    const getTeacherStatus = (teacherId: number): TeacherStatus => {
        const record = records.find(r => r.teacherId === teacherId);
        if (!record) return { status: 'not_checked_in', record: null };
        return { status: record.status, record };
    };

    return (
        <div className={`lg:col-span-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-4 md:px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Staff List</h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                    {teachers.map(teacher => {
                        const { status, record } = getTeacherStatus(teacher.id);
                        return (
                            <div key={teacher.id} className={`p-4 ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {teacher.photoUrl ? (
                                            <img src={teacher.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                        ) : (
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                                {teacher.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.name}</p>
                                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {teacher.classAssigned || 'Staff'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                        status === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            status === 'on_leave' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>
                                        {status === 'not_checked_in' ? 'Waiting' :
                                            status === 'on_leave' ? 'On Leave' :
                                                status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {record?.checkInTime && <span>In: {record.checkInTime}</span>}
                                        {record?.checkOutTime && <span className="ml-3">Out: {record.checkOutTime}</span>}
                                        {status === 'on_leave' && <span>{record?.leaveType}</span>}
                                        {status === 'not_checked_in' && <span>Not checked in</span>}
                                    </div>
                                    <div className="flex gap-2">
                                        {status === 'not_checked_in' && (
                                            <>
                                                <Button onClick={() => onManualCheckIn(teacher.id)} size="sm" variant="success">
                                                    Check In
                                                </Button>
                                                <Button onClick={() => onMarkLeave(teacher.id)} size="sm" variant="outline">
                                                    Leave
                                                </Button>
                                            </>
                                        )}
                                        {(status === 'present' || status === 'late') && !record?.checkOutTime && (
                                            <Button onClick={() => onManualCheckOut(teacher.id)} size="sm" variant="outline">
                                                Check Out
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Desktop Table View */}
                <table className="hidden md:table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={`sticky top-0 ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                        <tr>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Teacher</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Check-In</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Check-Out</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        {teachers.map(teacher => {
                            const { status, record } = getTeacherStatus(teacher.id);
                            return (
                                <tr key={teacher.id} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            {teacher.photoUrl ? (
                                                <img src={teacher.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                                                    {teacher.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{teacher.name}</div>
                                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{teacher.classAssigned}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {record?.checkInTime || '-'}
                                        {record?.checkInMethod === 'face' && ' 📷'}
                                        {record?.checkInMethod === 'qr' && ' 📱'}
                                    </td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {record?.checkOutTime || '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                            status === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                status === 'on_leave' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                            }`}>
                                            {status === 'not_checked_in' ? 'Waiting' :
                                                status === 'on_leave' ? 'On Leave' :
                                                    status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                        <div className="flex gap-2">
                                            {status === 'not_checked_in' && (
                                                <>
                                                    <button onClick={() => onManualCheckIn(teacher.id)} className="text-green-600 hover:text-green-900 dark:hover:text-green-400">Check In</button>
                                                    <button onClick={() => onMarkLeave(teacher.id)} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400">Leave</button>
                                                </>
                                            )}
                                            {(status === 'present' || status === 'late') && !record?.checkOutTime && (
                                                <button onClick={() => onManualCheckOut(teacher.id)} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400">Check Out</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
