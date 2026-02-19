import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AppraisalCycle } from '../../types/supervision';

interface CycleModalProps {
    cycles: AppraisalCycle[];
    onClose: () => void;
    onSave: () => void;
    isDark: boolean;
}

export const CycleModal: React.FC<CycleModalProps> = ({
    cycles,
    onClose,
    onSave,
    isDark,
}) => {
    const [formData, setFormData] = useState({
        name: '',
        cycleType: 'annual',
        startDate: '',
        endDate: '',
        status: 'active',
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/appraisal-cycles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });
            if (!res.ok) throw new Error('Failed to create cycle');
            return res.json();
        },
        onSuccess: onSave,
    });

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md rounded-xl shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="p-4 border-b flex justify-between items-center bg-inherit">
                    <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Manage Appraisal Cycles</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div className="p-4 space-y-6">
                    <div className="space-y-4">
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Cycle</h3>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Term 1 2024 Appraisal"
                                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Type</label>
                            <select
                                value={formData.cycleType}
                                onChange={e => setFormData({ ...formData, cycleType: e.target.value })}
                                className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                                <option value="termly">Termly</option>
                                <option value="annual">Annual</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Start Date</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>End Date</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    className={`w-full min-h-[44px] px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => createMutation.mutate()}
                            disabled={createMutation.isPending || !formData.name || !formData.startDate}
                            className="w-full min-h-[44px] px-4 py-2 bg-[#7B1113] text-white rounded-lg disabled:opacity-50 hover:bg-[#a5171a]"
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Cycle'}
                        </button>
                    </div>

                    <div className={`border-t pt-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Existing Cycles</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {cycles.map(cycle => (
                                <div key={cycle.id} className={`p-3 rounded-lg flex justify-between items-center ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                    <div>
                                        <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{cycle.name}</div>
                                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {cycle.startDate} - {cycle.endDate}
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${cycle.status === 'active'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {cycle.status}
                                    </span>
                                </div>
                            ))}
                            {cycles.length === 0 && (
                                <p className={`text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No cycles found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
