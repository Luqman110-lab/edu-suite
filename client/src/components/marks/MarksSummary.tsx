import React from 'react';
import { useTheme } from '../../../../contexts/ThemeContext';
// import { Button } from '../../../../components/Button';
import { Student } from '../../../../types';

interface MarksSummaryProps {
    progressStats: {
        total: number;
        withMarks: number;
        complete: number;
        absent: number;
        sick: number;
        percentage: number;
    };
    classStats: {
        totalStudents: number;
        studentsWithMarks: number;
        avgAggregate: string;
        passRate: string;
        divCounts: { I: number; II: number; III: number; IV: number; U: number };
        bestStudent: Student | null;
        bestAggregate: number | null;
    } | null;
    showStats: boolean;
    setShowStats: (show: boolean) => void;
    isDark: boolean;
}

export const MarksSummary: React.FC<MarksSummaryProps> = ({
    progressStats,
    classStats,
    showStats,
    setShowStats,
    isDark
}) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{progressStats.complete}/{progressStats.total}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Complete</div>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{progressStats.percentage}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                                style={{ width: `${progressStats.percentage}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span className="text-gray-600 dark:text-gray-400">Complete: {progressStats.complete}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                        <span className="text-gray-600 dark:text-gray-400">Partial: {progressStats.withMarks - progressStats.complete}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                        <span className="text-gray-600 dark:text-gray-400">Empty: {progressStats.total - progressStats.withMarks - progressStats.absent - progressStats.sick}</span>
                    </div>
                    {progressStats.absent > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-gray-600"></span>
                            <span className="text-gray-600 dark:text-gray-400">Absent: {progressStats.absent}</span>
                        </div>
                    )}
                    {progressStats.sick > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                            <span className="text-gray-600 dark:text-gray-400">Sick: {progressStats.sick}</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setShowStats(!showStats)}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                    {showStats ? 'Hide Stats' : 'Show Stats'}
                </button>
            </div>

            {showStats && classStats && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="text-xl font-bold text-primary-600 dark:text-primary-400">{classStats.avgAggregate}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Avg Aggregate</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="text-xl font-bold text-green-600 dark:text-green-400">{classStats.passRate}%</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Pass Rate</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex gap-2 text-sm font-bold">
                            <span className="text-green-600 dark:text-green-400">I:{classStats.divCounts.I}</span>
                            <span className="text-blue-600 dark:text-blue-400">II:{classStats.divCounts.II}</span>
                            <span className="text-amber-600 dark:text-amber-400">III:{classStats.divCounts.III}</span>
                            <span className="text-red-600 dark:text-red-400">U:{classStats.divCounts.U}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Divisions</div>
                    </div>
                    {classStats.bestStudent && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 col-span-2">
                            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{classStats.bestStudent.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Best: Aggregate {classStats.bestAggregate}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
