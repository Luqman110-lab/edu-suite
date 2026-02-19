import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Teacher } from '../../../../types';
import { Appraisal, AppraisalCycle } from '../../types/supervision';

interface AppraisalModalProps {
    appraisal: Appraisal | null;
    teachers: Teacher[];
    cycles: AppraisalCycle[];
    onClose: () => void;
    onSave: () => void;
    isDark: boolean;
}

export const AppraisalModal: React.FC<AppraisalModalProps> = ({
    appraisal,
    teachers,
    cycles,
    onClose,
    onSave,
    isDark,
}) => {
    const defaultAreas = [
        { area: 'Teaching & Learning', selfRating: 0, supervisorRating: 0, weight: 25 },
        { area: 'Classroom Management', selfRating: 0, supervisorRating: 0, weight: 20 },
        { area: 'Professional Conduct', selfRating: 0, supervisorRating: 0, weight: 20 },
        { area: 'Collaboration & Teamwork', selfRating: 0, supervisorRating: 0, weight: 15 },
        { area: 'Student Results & Achievement', selfRating: 0, supervisorRating: 0, weight: 20 },
    ];

    const [formData, setFormData] = useState({
        teacherId: appraisal?.teacherId || '',
        cycleId: appraisal?.cycleId || '',
        appraisalDate: appraisal?.appraisalDate || new Date().toISOString().split('T')[0],
        performanceAreas: appraisal?.performanceAreas?.length ? appraisal.performanceAreas : defaultAreas,
        achievements: appraisal?.achievements || '',
        challenges: appraisal?.challenges || '',
        status: appraisal?.status || 'draft',
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const totalWeight = formData.performanceAreas.reduce((sum, a) => sum + a.weight, 0);
            const selfTotal = formData.performanceAreas.reduce((sum, a) => sum + (a.selfRating * a.weight), 0) / totalWeight;
            const supervisorTotal = formData.performanceAreas.reduce((sum, a) => sum + (a.supervisorRating * a.weight), 0) / totalWeight;

            let finalRating = '';
            if (supervisorTotal >= 4.5) finalRating = 'outstanding';
            else if (supervisorTotal >= 3.5) finalRating = 'exceeds_expectations';
            else if (supervisorTotal >= 2.5) finalRating = 'meets_expectations';
            else if (supervisorTotal >= 1.5) finalRating = 'needs_improvement';
            else finalRating = 'unsatisfactory';

            const payload = {
                ...formData,
                teacherId: parseInt(formData.teacherId as string),
                cycleId: formData.cycleId ? parseInt(formData.cycleId as string) : null,
                overallSelfRating: Math.round(selfTotal * 10) / 10,
                overallSupervisorRating: Math.round(supervisorTotal * 10) / 10,
                finalRating: formData.status === 'completed' ? finalRating : null,
            };

            const res = await fetch(appraisal ? `/api/appraisals/${appraisal.id}` : '/api/appraisals', {
                method: appraisal ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Failed to save');
            return res.json();
        },
        onSuccess: onSave,
    });

    const updateAreaRating = (index: number, field: 'selfRating' | 'supervisorRating', value: number) => {
        setFormData(prev => ({
            ...prev,
            performanceAreas: prev.performanceAreas.map((area, i) =>
                i === index ? { ...area, [field]: value } : area
            ),
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="sticky top-0 p-4 border-b flex justify-between items-center bg-inherit z-10">
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{appraisal ? 'Edit Appraisal' : 'New Appraisal'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
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
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Appraisal Cycle</label>
                            <select
                                value={formData.cycleId}
                                onChange={e => setFormData({ ...formData, cycleId: e.target.value })}
                                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                                <option value="">Select cycle</option>
                                {cycles.filter(c => c.status === 'active').map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date</label>
                            <input
                                type="date"
                                value={formData.appraisalDate}
                                onChange={e => setFormData({ ...formData, appraisalDate: e.target.value })}
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
                                <option value="draft">Draft</option>
                                <option value="teacher_review">Teacher Review</option>
                                <option value="supervisor_review">Supervisor Review</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Performance Areas</h3>
                        {formData.performanceAreas.map((area, index) => (
                            <div key={index} className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{area.area}</h4>
                                    <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>Weight: {area.weight}%</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Self Rating (1-5)</label>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(score => (
                                                <button
                                                    key={`self-${score}`}
                                                    type="button"
                                                    onClick={() => updateAreaRating(index, 'selfRating', score)}
                                                    className={`w-8 h-8 rounded text-sm font-medium ${area.selfRating === score
                                                        ? 'bg-blue-600 text-white'
                                                        : isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                                                        }`}
                                                >
                                                    {score}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Supervisor Rating (1-5)</label>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map(score => (
                                                <button
                                                    key={`sup-${score}`}
                                                    type="button"
                                                    onClick={() => updateAreaRating(index, 'supervisorRating', score)}
                                                    className={`w-8 h-8 rounded text-sm font-medium ${area.supervisorRating === score
                                                        ? 'bg-[#7B1113] text-white'
                                                        : isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                                                        }`}
                                                >
                                                    {score}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Key Achievements</label>
                        <textarea
                            value={formData.achievements}
                            onChange={e => setFormData({ ...formData, achievements: e.target.value })}
                            rows={3}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Challenges / Areas of Support</label>
                        <textarea
                            value={formData.challenges}
                            onChange={e => setFormData({ ...formData, challenges: e.target.value })}
                            rows={3}
                            className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        />
                    </div>
                </div>
                <div className={`sticky bottom-0 p-4 border-t bg-inherit flex justify-end gap-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <button onClick={onClose} className={`min-h-[44px] px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
                        Cancel
                    </button>
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending || !formData.teacherId}
                        className="min-h-[44px] px-4 py-2 bg-[#7B1113] text-white rounded-lg disabled:opacity-50 hover:bg-[#a5171a]"
                    >
                        {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
