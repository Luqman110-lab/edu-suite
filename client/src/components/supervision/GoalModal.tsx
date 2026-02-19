import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Teacher } from '../../../../types';
import { AppraisalGoal } from '../../types/supervision';

interface GoalModalProps {
    goal: AppraisalGoal | null;
    teachers: Teacher[];
    onClose: () => void;
    onSave: () => void;
    isDark: boolean;
}

export const GoalModal: React.FC<GoalModalProps> = ({
    goal,
    teachers,
    onClose,
    onSave,
    isDark,
}) => {
    const [formData, setFormData] = useState({
        teacherId: goal?.teacherId || '',
        goal: goal?.goal || '',
        category: goal?.category || '',
        targetDate: goal?.targetDate || '',
        progress: goal?.progress || 0,
        status: goal?.status || 'not_started',
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                ...formData,
                teacherId: parseInt(formData.teacherId as string),
                progress: parseInt(formData.progress as unknown as string),
            };

            const res = await fetch(goal ? `/api/appraisal-goals/${goal.id}` : '/api/appraisal-goals', {
                method: goal ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Failed to save');
            return res.json();
        },
        onSuccess: onSave,
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md rounded-xl shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="p-4 border-b flex justify-between items-center bg-inherit">
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{goal ? 'Edit Goal' : 'New Goal'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Teacher</label>
                        <select
                            value={formData.teacherId}
                            onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                            className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        >
                            <option value="">Select teacher</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Goal Description</label>
                        <textarea
                            value={formData.goal}
                            onChange={e => setFormData({ ...formData, goal: e.target.value })}
                            rows={3}
                            placeholder="Describe the professional goal..."
                            className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
                        <select
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        >
                            <option value="">Select category</option>
                            <option value="professional_development">Professional Development</option>
                            <option value="student_achievement">Student Achievement</option>
                            <option value="curriculum">Curriculum & Instruction</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Target Date</label>
                            <input
                                type="date"
                                value={formData.targetDate}
                                onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Status</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                                <option value="not_started">Not Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="deferred">Deferred</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Progress ({formData.progress}%)</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={formData.progress}
                            onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                            className="w-full"
                        />
                    </div>
                </div>
                <div className={`p-4 border-t bg-inherit flex justify-end gap-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <button onClick={onClose} className={`min-h-[44px] px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
                        Cancel
                    </button>
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending || !formData.teacherId || !formData.goal}
                        className="min-h-[44px] px-4 py-2 bg-[#7B1113] text-white rounded-lg disabled:opacity-50 hover:bg-[#a5171a]"
                    >
                        {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
