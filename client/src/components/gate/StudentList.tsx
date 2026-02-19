import React, { useState } from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Button } from '../../../../components/Button';
import { GateStudent, GateRecord, StudentStatus } from '../../types/gate';

interface StudentListProps {
    students: GateStudent[];
    records: GateRecord[];
    onManualCheckIn: (studentId: number) => void;
    onManualCheckOut: (studentId: number) => void;
    setScanMode: (mode: 'check-in' | 'check-out') => void;
}

export const StudentList: React.FC<StudentListProps> = ({
    students,
    records,
    onManualCheckIn,
    onManualCheckOut,
    setScanMode
}) => {
    const { isDark } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const getStudentStatus = (studentId: number): StudentStatus => {
        const record = records.find(r => r.studentId === studentId);
        if (!record) return { status: 'not_checked_in', record: null };
        return { status: record.status, record };
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.classLevel.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={`lg:col-span-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-4 md:px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Student List</h2>
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full sm:w-auto px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                    />
                </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredStudents.map(student => {
                        const { status, record } = getStudentStatus(student.id);
                        return (
                            <div key={student.id} className={`p-4 ${isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {student.photoUrl ? (
                                            <img src={student.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                                        ) : (
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                                {student.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</p>
                                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {student.classLevel}{student.stream ? ` ${student.stream}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                        status === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                status === 'left_early' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                        }`}>
                                        {status === 'not_checked_in' ? 'Waiting' : status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center justify-between">
                                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {record?.checkInTime && <span>In: {record.checkInTime}</span>}
                                        {record?.checkOutTime && <span className="ml-3">Out: {record.checkOutTime}</span>}
                                        {!record?.checkInTime && !record?.checkOutTime && <span>Not checked in</span>}
                                    </div>
                                    <div>
                                        {status === 'not_checked_in' ? (
                                            <Button
                                                size="sm"
                                                variant="success"
                                                onClick={() => { setScanMode('check-in'); onManualCheckIn(student.id); }}
                                            >
                                                Check In
                                            </Button>
                                        ) : !record?.checkOutTime ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => { setScanMode('check-out'); onManualCheckOut(student.id); }}
                                            >
                                                Check Out
                                            </Button>
                                        ) : (
                                            <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Done</span>
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
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Student</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Class</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Check-In</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Check-Out</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                            <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Action</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                        {filteredStudents.map(student => {
                            const { status, record } = getStudentStatus(student.id);
                            return (
                                <tr key={student.id} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {student.photoUrl ? (
                                                <img src={student.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                                    {student.name.charAt(0)}
                                                </div>
                                            )}
                                            <span className={isDark ? 'text-white' : 'text-gray-900'}>{student.name}</span>
                                        </div>
                                    </td>
                                    <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {student.classLevel}{student.stream ? ` ${student.stream}` : ''}
                                    </td>
                                    <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {record?.checkInTime || '-'}
                                        {record?.checkInMethod === 'face' && ' 📷'}
                                        {record?.checkInMethod === 'qr' && ' 📱'}
                                    </td>
                                    <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {record?.checkOutTime || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                            status === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                    status === 'left_early' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                            }`}>
                                            {status === 'not_checked_in' ? 'Not Checked In' : status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {status === 'not_checked_in' ? (
                                            <Button
                                                size="sm"
                                                variant="success"
                                                onClick={() => { setScanMode('check-in'); onManualCheckIn(student.id); }}
                                            >
                                                Check In
                                            </Button>
                                        ) : !record?.checkOutTime ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => { setScanMode('check-out'); onManualCheckOut(student.id); }}
                                            >
                                                Check Out
                                            </Button>
                                        ) : (
                                            <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Done</span>
                                        )}
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
