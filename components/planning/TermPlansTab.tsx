
import { useState } from 'react';
import { Plus, Calendar, Edit2, Trash2, Target, BookOpen } from 'lucide-react';
import { TermPlan } from '../../types';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
    active: { bg: 'bg-green-100', text: 'text-green-700' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

interface TermPlansTabProps {
    termPlans: TermPlan[];
    onAdd: () => void;
    onEdit: (plan: TermPlan) => void;
    onDelete: (id: number) => void;
    isDark: boolean;
}

export function TermPlansTab({
    termPlans,
    onAdd,
    onEdit,
    onDelete,
    isDark,
}: TermPlansTabProps) {
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';
    const cardBg = isDark ? 'bg-gray-700' : 'bg-gray-50';

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className={`text-lg font-semibold ${textColor}`}>Term Work Plans</h2>
                <button
                    onClick={onAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Term Plan</span>
                </button>
            </div>

            {termPlans.length === 0 ? (
                <div className={`text-center py-12 ${mutedText}`}>
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No term plans yet. Create your first term plan to get started.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {termPlans.map((plan) => (
                        <div key={plan.id} className={`${cardBg} rounded-lg p-4 border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className={`font-semibold ${textColor}`}>{plan.name}</h3>
                                    <p className={`text-sm ${mutedText}`}>Term {plan.term}, {plan.year}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[plan.status]?.bg || 'bg-gray-100'} ${STATUS_COLORS[plan.status]?.text || 'text-gray-700'}`}>
                                    {plan.status}
                                </span>
                            </div>

                            <div className={`text-sm ${mutedText} mb-3`}>
                                <p>{plan.startDate} - {plan.endDate}</p>
                                {plan.theme && <p className="mt-1 italic">"{plan.theme}"</p>}
                            </div>

                            <div className="flex items-center gap-2 text-sm mb-3">
                                <Target className="w-4 h-4" />
                                <span>{(plan.objectives || []).length} objectives</span>
                                <BookOpen className="w-4 h-4 ml-2" />
                                <span>{(plan.keyActivities || []).length} activities</span>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => onEdit(plan)}
                                    className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 min-h-[44px]"
                                >
                                    <Edit2 className="w-3 h-3" /> Edit
                                </button>
                                <button
                                    onClick={() => onDelete(plan.id)}
                                    className="flex items-center gap-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 min-h-[44px]"
                                >
                                    <Trash2 className="w-3 h-3" /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface TermPlanModalProps {
    plan: TermPlan | null;
    onClose: () => void;
    onSave: (data: Partial<TermPlan>) => void;
    isDark: boolean;
}

export function TermPlanModal({
    plan,
    onClose,
    onSave,
    isDark,
}: TermPlanModalProps) {
    const [formData, setFormData] = useState<Partial<TermPlan>>({
        name: plan?.name || '',
        term: plan?.term || 1,
        year: plan?.year || new Date().getFullYear(),
        startDate: plan?.startDate || '',
        endDate: plan?.endDate || '',
        theme: plan?.theme || '',
        objectives: plan?.objectives || [],
        keyActivities: plan?.keyActivities || [],
        status: plan?.status || 'draft',
    });
    const [newObjective, setNewObjective] = useState('');

    const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
    const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
    const textColor = isDark ? 'text-white' : 'text-gray-900';

    const addObjective = () => {
        if (newObjective.trim()) {
            setFormData(prev => ({
                ...prev,
                objectives: [...(prev.objectives || []), newObjective.trim()],
            }));
            setNewObjective('');
        }
    };

    const removeObjective = (index: number) => {
        setFormData(prev => ({
            ...prev,
            objectives: (prev.objectives || []).filter((_, i) => i !== index),
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
                <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h2 className={`text-xl font-bold ${textColor}`}>{plan ? 'Edit Term Plan' : 'New Term Plan'}</h2>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Plan Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            placeholder="e.g., Term One Work Plan 2025"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Term</label>
                            <select
                                value={formData.term}
                                onChange={(e) => setFormData(prev => ({ ...prev, term: parseInt(e.target.value) }))}
                                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            >
                                <option value={1}>Term 1</option>
                                <option value={2}>Term 2</option>
                                <option value={3}>Term 3</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Year</label>
                            <input
                                type="number"
                                value={formData.year}
                                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Start Date</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${textColor}`}>End Date</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Theme</label>
                        <input
                            type="text"
                            value={formData.theme}
                            onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            placeholder="Term theme or focus area"
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                        >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Objectives</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={newObjective}
                                onChange={(e) => setNewObjective(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                                className={`flex-1 px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                                placeholder="Add an objective"
                            />
                            <button
                                type="button"
                                onClick={addObjective}
                                className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900"
                            >
                                Add
                            </button>
                        </div>
                        {(formData.objectives || []).map((obj, idx) => (
                            <div key={idx} className="flex items-center gap-2 mb-1">
                                <span className={`flex-1 text-sm ${textColor}`}>{idx + 1}. {obj}</span>
                                <button
                                    type="button"
                                    onClick={() => removeObjective(idx)}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg border ${inputBorder} ${textColor} min-h-[44px]`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave({ ...formData, id: plan?.id })}
                        className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
                    >
                        {plan ? 'Update' : 'Create'} Plan
                    </button>
                </div>
            </div>
        </div>
    );
}
