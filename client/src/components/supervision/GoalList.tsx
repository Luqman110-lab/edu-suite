import React from 'react';
import { Target, Plus, Edit2 } from 'lucide-react';
import { AppraisalGoal, GOAL_STATUS_LABELS } from '../../types/supervision';
import { Teacher } from '../../../../types';

interface GoalListProps {
    goals: AppraisalGoal[];
    teachers: Teacher[];
    isDark: boolean;
    onEdit: (goal: AppraisalGoal) => void;
    onAdd: () => void;
}

export const GoalList: React.FC<GoalListProps> = ({
    goals,
    teachers,
    isDark,
    onEdit,
    onAdd
}) => {
    const getTeacherName = (id: number) => teachers.find(t => t.id === id)?.name || 'Unknown';

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={onAdd}
                    className="min-h-[44px] px-4 py-3 bg-[#7B1113] text-white rounded-lg font-medium flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Goal
                </button>
            </div>

            {goals.length === 0 ? (
                <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} shadow`}>
                    <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No Goals Yet</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Set professional development goals for staff members.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {goals.map(goal => (
                        <div key={goal.id} className={`rounded-lg p-4 shadow ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{getTeacherName(goal.teacherId)}</h3>
                                    <p className={`text-sm line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {goal.goal}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${GOAL_STATUS_LABELS[goal.status]?.color}`}>
                                    {GOAL_STATUS_LABELS[goal.status]?.label}
                                </span>
                                {goal.targetDate && (
                                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Due: {goal.targetDate}
                                    </span>
                                )}
                            </div>
                            <div className={`w-full h-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <div
                                    className="h-full rounded-full bg-[#7B1113] transition-all"
                                    style={{ width: `${goal.progress}%` }}
                                />
                            </div>
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {goal.progress}% complete
                            </p>
                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={() => onEdit(goal)}
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
