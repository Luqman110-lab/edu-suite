import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Teacher } from '../../../../types';
import { Icons } from '../../lib/icons';
import { Button } from '../../../../components/Button';
import { useStaffAttendance } from '../../hooks/useHR';

interface StaffRollCallModalProps {
    isOpen: boolean;
    onClose: () => void;
    teachers: Teacher[];
    isDark: boolean;
}

export const StaffRollCallModal: React.FC<StaffRollCallModalProps> = ({
    isOpen,
    onClose,
    teachers,
    isDark,
}) => {
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const { attendance, isLoading, recordAttendance, isRecording } = useStaffAttendance(selectedDate);

    const [localAttendance, setLocalAttendance] = useState<Record<number, string>>({});

    // Sync server state with local state when date changes or data loads
    useEffect(() => {
        if (attendance && attendance.length > 0) {
            const state: Record<number, string> = {};
            attendance.forEach(record => {
                state[record.teacherId] = record.status;
            });
            setLocalAttendance(state);
        } else {
            // Default everyone to present if no records exist yet
            const state: Record<number, string> = {};
            teachers.forEach(t => {
                if (t.isActive && t.id) {
                    state[t.id] = 'Present';
                }
            });
            setLocalAttendance(state);
        }
    }, [attendance, teachers, selectedDate]);

    if (!isOpen) return null;

    const handleStatusChange = (teacherId: number, status: string) => {
        setLocalAttendance(prev => ({ ...prev, [teacherId]: status }));
    };

    const handleSave = async () => {
        // Process all teachers natively
        const activeTeachers = teachers.filter(t => t.isActive && t.id);

        // N.B: Real world app would batch this to avoid 50 distinct API calls.
        // For this prototype, we'll map them individually 
        try {
            const promises = activeTeachers.map(t => {
                const tId = t.id!;
                const status = localAttendance[tId] || 'Present';

                return recordAttendance({
                    teacherId: tId,
                    date: selectedDate,
                    status: status as any,
                    checkInTime: status === 'Present' || status === 'Late' || status === 'Half-day' ? new Date().toISOString() : undefined
                });
            });

            await Promise.all(promises);
            onClose();
        } catch (err) {
            console.error("Failed to save roll call", err);
            alert("Some records failed to save.");
        }
    };

    const getStatusColor = (status: string) => {
        if (status === 'Present') return isDark ? 'bg-green-900/40 text-green-400 border-green-800' : 'bg-green-100 text-green-700 border-green-200';
        if (status === 'Late') return isDark ? 'bg-amber-900/40 text-amber-400 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200';
        if (status === 'Half-day') return isDark ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200';
        return isDark ? 'bg-red-900/40 text-red-400 border-red-800' : 'bg-red-100 text-red-700 border-red-200';
    };

    const activeTeachers = teachers.filter(t => t.isActive).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-y-auto w-screen h-screen">
            <div className={`${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} rounded-xl w-full max-w-3xl m-4 flex flex-col max-h-[90vh]`}>

                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div>
                        <h2 className="text-xl font-bold">Daily Staff Roll Call</h2>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Mark attendance for all active staff members</p>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full hover:${isDark ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}>
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters / Controls */}
                <div className={`p-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex justify-between items-center`}>
                    <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">Date:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className={`text-sm rounded border px-3 py-1.5 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-[#7B1113] focus:border-[#7B1113] outline-none`}
                        />
                    </div>

                    <div className="flex gap-2 text-xs">
                        <Button variant="outline" size="sm" onClick={() => {
                            const allPresent: Record<number, string> = {};
                            activeTeachers.forEach(t => allPresent[t.id!] = 'Present');
                            setLocalAttendance(allPresent);
                        }}>Mark All Present</Button>
                    </div>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1 p-2">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin w-8 h-8 rounded-full border-4 border-[#7B1113] border-t-transparent"></div>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className={`${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'} sticky top-0 uppercase text-xs font-semibold`}>
                                <tr>
                                    <th className="px-4 py-3 rounded-tl">Staff Member</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3 rounded-tr text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {activeTeachers.map((teacher) => {
                                    const status = localAttendance[teacher.id!] || 'Present';

                                    return (
                                        <tr key={teacher.id} className={`hover:${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} transition-colors`}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{teacher.name}</div>
                                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{teacher.employeeId}</div>
                                            </td>
                                            <td className={`px-4 py-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {teacher.roles?.[0] || 'Teacher'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-max mx-auto border dark:border-gray-700">
                                                    {['Present', 'Late', 'Half-day', 'Absent'].map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => handleStatusChange(teacher.id!, opt)}
                                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${status === opt
                                                                    ? getStatusColor(opt) + ' shadow-sm'
                                                                    : isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                                                                }`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'} flex justify-end gap-3 rounded-b-xl`}>
                    <Button variant="outline" onClick={onClose} disabled={isRecording}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isRecording}>
                        {isRecording ? 'Saving...' : 'Save Roll Call'}
                    </Button>
                </div>

            </div>
        </div>
    );
};
