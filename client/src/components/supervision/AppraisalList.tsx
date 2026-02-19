import React from 'react';
import { ClipboardCheck, Calendar, Plus, Edit2 } from 'lucide-react';
import { Appraisal, AppraisalCycle, RATING_LABELS } from '../../types/supervision';
import { Teacher } from '../../../../types';

interface AppraisalListProps {
    appraisals: Appraisal[];
    cycles: AppraisalCycle[];
    teachers: Teacher[];
    isDark: boolean;
    onEdit: (appraisal: Appraisal) => void;
    onManageCycles: () => void;
    onNewAppraisal: () => void;
}

export const AppraisalList: React.FC<AppraisalListProps> = ({
    appraisals,
    cycles,
    teachers,
    isDark,
    onEdit,
    onManageCycles,
    onNewAppraisal
}) => {
    const getTeacherName = (id: number) => teachers.find(t => t.id === id)?.name || 'Unknown';

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={onManageCycles}
                    className={`min-h-[44px] px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}`}
                >
                    <Calendar className="w-4 h-4" /> Manage Cycles
                </button>
                <button
                    onClick={onNewAppraisal}
                    className="min-h-[44px] px-4 py-3 bg-[#7B1113] text-white rounded-lg font-medium flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New Appraisal
                </button>
            </div>

            {cycles.length > 0 && (
                <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <Calendar className="w-5 h-5" /> Active Cycles
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {cycles.filter(c => c.status === 'active').map(cycle => (
                            <span key={cycle.id} className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                                {cycle.name} ({cycle.startDate} - {cycle.endDate})
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {appraisals.length === 0 ? (
                <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No Appraisals Yet</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Create an appraisal cycle and start evaluating staff performance.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {appraisals.map(apr => (
                        <div key={apr.id} className={`rounded-lg p-4 shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{getTeacherName(apr.teacherId)}</h3>
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {apr.appraisalDate}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${apr.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    apr.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                    {apr.status}
                                </span>
                            </div>
                            {apr.finalRating && (
                                <p className={`text-sm font-medium ${RATING_LABELS[apr.finalRating]?.color}`}>
                                    {RATING_LABELS[apr.finalRating]?.label}
                                </p>
                            )}
                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={() => onEdit(apr)}
                                    className={`min-h-[44px] flex-1 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                                >
                                    <Edit2 className="w-4 h-4 inline mr-1" /> Edit
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
