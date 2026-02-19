import React from 'react';
import { BarChart2 } from 'lucide-react';

interface ReportStatsProps {
    stats: {
        total: number;
        withMarks: number;
        missingMarks: number;
        avgAggregate: number | string;
        divisions: { I: number; II: number; III: number; IV: number; U: number };
    };
}

export const ReportStats: React.FC<ReportStatsProps> = ({ stats }) => {
    return (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-xl shadow-sm text-white">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4" />
                Quick Stats
            </h3>

            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-indigo-100 text-sm">Total Students</span>
                    <span className="font-bold text-lg">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-indigo-100 text-sm">With Marks</span>
                    <span className="font-bold text-lg">{stats.withMarks}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-indigo-100 text-sm">Missing Marks</span>
                    <span className={`font-bold text-lg ${stats.missingMarks > 0 ? 'text-amber-300' : ''}`}>{stats.missingMarks}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-indigo-100 text-sm">Avg Aggregate</span>
                    <span className="font-bold text-lg">{stats.avgAggregate}</span>
                </div>

                <div className="border-t border-indigo-400/30 pt-3 mt-3">
                    <span className="text-indigo-100 text-xs block mb-2">Divisions</span>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center bg-white/10 rounded-lg py-1.5">
                            <div className="text-xs text-indigo-200">I</div>
                            <div className="font-bold">{stats.divisions.I}</div>
                        </div>
                        <div className="text-center bg-white/10 rounded-lg py-1.5">
                            <div className="text-xs text-indigo-200">II</div>
                            <div className="font-bold">{stats.divisions.II}</div>
                        </div>
                        <div className="text-center bg-white/10 rounded-lg py-1.5">
                            <div className="text-xs text-indigo-200">III</div>
                            <div className="font-bold">{stats.divisions.III}</div>
                        </div>
                        <div className="text-center bg-white/10 rounded-lg py-1.5">
                            <div className="text-xs text-indigo-200">U</div>
                            <div className="font-bold">{stats.divisions.U}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
