import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Teacher } from '../../../../types';
import { Observation, ObservationCriteria, CATEGORY_LABELS } from '../../types/supervision';

interface ObservationModalProps {
    observation: Observation | null;
    teachers: Teacher[];
    criteria: ObservationCriteria[];
    groupedCriteria: Record<string, ObservationCriteria[]>;
    onClose: () => void;
    onSave: () => void;
    isDark: boolean;
}

export const ObservationModal: React.FC<ObservationModalProps> = ({
    observation,
    teachers,
    criteria,
    groupedCriteria,
    onClose,
    onSave,
    isDark,
}) => {
    const [formData, setFormData] = useState({
        teacherId: observation?.teacherId || '',
        observationDate: observation?.observationDate || new Date().toISOString().split('T')[0],
        classLevel: observation?.classLevel || '',
        stream: observation?.stream || '',
        subject: observation?.subject || '',
        lessonTopic: observation?.lessonTopic || '',
        numberOfLearners: observation?.numberOfLearners || '',
        scores: observation?.scores || criteria.map(c => ({ criteriaId: c.id, score: 0, comment: '' })),
        strengths: observation?.strengths || '',
        areasForImprovement: observation?.areasForImprovement || '',
        recommendations: observation?.recommendations || '',
        status: observation?.status || 'scheduled',
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const totalScore = formData.scores.reduce((sum, s) => sum + (s.score || 0), 0);
            const maxPossibleScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);
            const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
            let overallRating = '';
            if (percentage >= 90) overallRating = 'excellent';
            else if (percentage >= 75) overallRating = 'very_good';
            else if (percentage >= 60) overallRating = 'good';
            else if (percentage >= 50) overallRating = 'satisfactory';
            else overallRating = 'needs_improvement';

            const payload = {
                ...formData,
                teacherId: parseInt(formData.teacherId as string),
                numberOfLearners: formData.numberOfLearners ? parseInt(formData.numberOfLearners as string) : null,
                totalScore,
                maxPossibleScore,
                percentage,
                overallRating: formData.status === 'completed' ? overallRating : null,
            };

            const res = await fetch(observation ? `/api/observations/${observation.id}` : '/api/observations', {
                method: observation ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Failed to save');
            return res.json();
        },
        onSuccess: onSave,
    });

    const updateScore = (criteriaId: number, score: number) => {
        setFormData(prev => ({
            ...prev,
            scores: prev.scores.map(s =>
                s.criteriaId === criteriaId ? { ...s, score } : s
            ),
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="sticky top-0 p-4 border-b flex justify-between items-center bg-inherit z-10">
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{observation ? 'Edit Observation' : 'Schedule Observation'}</h2>
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
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date</label>
                            <input
                                type="date"
                                value={formData.observationDate}
                                onChange={e => setFormData({ ...formData, observationDate: e.target.value })}
                                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
                            <select
                                value={formData.classLevel}
                                onChange={e => setFormData({ ...formData, classLevel: e.target.value })}
                                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                                <option value="">Select class</option>
                                {['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Subject</label>
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                placeholder="e.g., Mathematics"
                                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Lesson Topic</label>
                        <input
                            type="text"
                            value={formData.lessonTopic}
                            onChange={e => setFormData({ ...formData, lessonTopic: e.target.value })}
                            placeholder="Topic being taught"
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
                            <option value="scheduled">Scheduled</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    {(formData.status === 'in_progress' || formData.status === 'completed') && Object.keys(groupedCriteria).length > 0 && (
                        <div className="space-y-4">
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Observation Scores</h3>
                            {Object.entries(groupedCriteria).map(([category, items]) => (
                                <div key={category} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                    <h4 className={`font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{CATEGORY_LABELS[category] || category}</h4>
                                    <div className="space-y-2">
                                        {items.map(item => {
                                            const currentScore = formData.scores.find(s => s.criteriaId === item.id)?.score || 0;
                                            return (
                                                <div key={item.id} className="flex items-center justify-between gap-4">
                                                    <span className={`text-sm flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.criterion}</span>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map(score => (
                                                            <button
                                                                key={score}
                                                                type="button"
                                                                onClick={() => updateScore(item.id, score)}
                                                                className={`w-8 h-8 rounded text-sm font-medium ${currentScore >= score
                                                                    ? 'bg-[#7B1113] text-white'
                                                                    : isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                                                                    }`}
                                                            >
                                                                {score}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {formData.status === 'completed' && (
                        <>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Strengths Observed</label>
                                <textarea
                                    value={formData.strengths}
                                    onChange={e => setFormData({ ...formData, strengths: e.target.value })}
                                    rows={3}
                                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Areas for Improvement</label>
                                <textarea
                                    value={formData.areasForImprovement}
                                    onChange={e => setFormData({ ...formData, areasForImprovement: e.target.value })}
                                    rows={3}
                                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Recommendations</label>
                                <textarea
                                    value={formData.recommendations}
                                    onChange={e => setFormData({ ...formData, recommendations: e.target.value })}
                                    rows={3}
                                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                />
                            </div>
                        </>
                    )}
                </div>
                <div className={`sticky bottom-0 p-4 border-t bg-inherit flex justify-end gap-2 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <button onClick={onClose} className={`min-h-[44px] px-4 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
                        Cancel
                    </button>
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending || !formData.teacherId || !formData.classLevel || !formData.subject}
                        className="min-h-[44px] px-4 py-2 bg-[#7B1113] text-white rounded-lg disabled:opacity-50 hover:bg-[#a5171a]"
                    >
                        {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};
