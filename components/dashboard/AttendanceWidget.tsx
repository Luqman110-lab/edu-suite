
import { Users, UserMinus, Clock } from 'lucide-react';

interface AttendanceWidgetProps {
    presentCount: number;
    absentCount: number;
    lateCount?: number;
    totalStudents: number;
    isDark?: boolean;
}

export function AttendanceWidget({
    presentCount,
    absentCount,
    lateCount = 0,
    totalStudents,
    isDark = false
}: AttendanceWidgetProps) {

    const presentPercent = Math.round((presentCount / totalStudents) * 100) || 0;
    const absentPercent = Math.round((absentCount / totalStudents) * 100) || 0;
    const latePercent = Math.round((lateCount / totalStudents) * 100) || 0;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 h-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Attendance</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Daily Overview</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Total: {totalStudents}</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                {/* Present */}
                <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-3 border border-green-100 dark:border-green-800/30 text-center">
                    <div className="mx-auto w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 mb-2">
                        <Users className="w-4 h-4" />
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{presentCount}</div>
                    <div className="text-xs font-medium text-green-600 dark:text-green-400">Present</div>
                </div>

                {/* Absent */}
                <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-3 border border-red-100 dark:border-red-800/30 text-center">
                    <div className="mx-auto w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 mb-2">
                        <UserMinus className="w-4 h-4" />
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{absentCount}</div>
                    <div className="text-xs font-medium text-red-600 dark:text-red-400">Absent</div>
                </div>

                {/* Late */}
                <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-3 border border-orange-100 dark:border-orange-800/30 text-center">
                    <div className="mx-auto w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 mb-2">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{lateCount}</div>
                    <div className="text-xs font-medium text-orange-600 dark:text-orange-400">Late</div>
                </div>
            </div>

            {/* Visual Bars */}
            <div className="space-y-3">
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Attendance Rate</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{presentPercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${presentPercent}%` }}></div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Absence Rate</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{absentPercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${absentPercent}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
