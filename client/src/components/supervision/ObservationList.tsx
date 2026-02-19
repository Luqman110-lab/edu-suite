import React from 'react';
import { Eye, Calendar, CheckCircle, Edit2, Plus, FileText } from 'lucide-react';
import { Observation, RATING_LABELS, ObservationCriteria } from '../../types/supervision';
import { Teacher } from '../../../../types';

interface ObservationListProps {
    observations: Observation[];
    teachers: Teacher[];
    criteria: ObservationCriteria[];
    isDark: boolean;
    onEdit: (obs: Observation) => void;
    onSchedule: () => void;
    onSeedCriteria: () => void;
    isSeeding: boolean;
}

export const ObservationList: React.FC<ObservationListProps> = ({
    observations,
    teachers,
    criteria,
    isDark,
    onEdit,
    onSchedule,
    onSeedCriteria,
    isSeeding
}) => {
    const getTeacherName = (id: number) => teachers.find(t => t.id === id)?.name || 'Unknown';

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={onSchedule}
                    className="min-h-[44px] px-4 py-3 bg-[#7B1113] text-white rounded-lg font-medium flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Schedule Observation
                </button>
                {criteria.length === 0 && (
                    <button
                        onClick={onSeedCriteria}
                        disabled={isSeeding}
                        className={`min-h-[44px] px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'}`}
                    >
                        <FileText className="w-4 h-4" /> Load Default Criteria
                    </button>
                )}
            </div>

            {observations.length === 0 ? (
                <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No Observations Yet</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Schedule your first classroom observation to get started.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {observations.map(obs => (
                        <div key={obs.id} className={`rounded-lg p-4 shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{getTeacherName(obs.teacherId)}</h3>
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {obs.subject} - {obs.classLevel}{obs.stream ? ` ${obs.stream}` : ''}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${obs.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    obs.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {obs.status}
                                </span>
                            </div>
                            <div className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                <p className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> {obs.observationDate}
                                </p>
                                {obs.status === 'completed' && (
                                    <p className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" /> Score: {obs.percentage}%
                                        {obs.overallRating && (
                                            <span className={RATING_LABELS[obs.overallRating]?.color}>
                                                ({RATING_LABELS[obs.overallRating]?.label})
                                            </span>
                                        )}
                                    </p>
                                )}
                            </div>
                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={() => onEdit(obs)}
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
