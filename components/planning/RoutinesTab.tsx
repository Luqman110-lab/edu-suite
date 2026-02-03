
import { useState } from 'react';
import { ListTodo, Plus, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { SchoolRoutine } from '../../types';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const ROUTINE_ACTIVITIES = [
    { value: 'wake_up', label: 'Wake Up' },
    { value: 'prayer', label: 'Prayer/Devotion' },
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'assembly', label: 'Assembly' },
    { value: 'lessons', label: 'Lessons' },
    { value: 'break', label: 'Break' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'games', label: 'Games/Sports' },
    { value: 'clubs', label: 'Clubs/Activities' },
    { value: 'prep', label: 'Prep/Study' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'lights_out', label: 'Lights Out' },
    { value: 'custom', label: 'Custom Activity' },
];

interface RoutinesTabProps {
    routines: SchoolRoutine[];
    onAdd: () => void;
    onEdit: (routine: SchoolRoutine) => void;
    onDelete: (id: number) => void;
    isDark: boolean;
}

export function RoutinesTab({
    routines,
    onAdd,
    onEdit,
    onDelete,
    isDark,
}: RoutinesTabProps) {
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';
    const cardBg = isDark ? 'bg-gray-700' : 'bg-gray-50';
    const [expandedRoutine, setExpandedRoutine] = useState<number | null>(null);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className={`text-lg font-semibold ${textColor}`}>Daily Routines</h2>
                <button
                    onClick={onAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
                >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Routine</span>
                </button>
            </div>

            {routines.length === 0 ? (
                <div className={`text-center py-12 ${mutedText}`}>
                    <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No routines defined. Create routines for boarding and day students.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {routines.map((routine) => (
                        <div key={routine.id} className={`${cardBg} rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer"
                                onClick={() => setExpandedRoutine(expandedRoutine === routine.id ? null : routine.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {expandedRoutine === routine.id ? (
                                        <ChevronDown className={`w-5 h-5 ${mutedText}`} />
                                    ) : (
                                        <ChevronRight className={`w-5 h-5 ${mutedText}`} />
                                    )}
                                    <div>
                                        <h3 className={`font-semibold ${textColor}`}>{routine.name}</h3>
                                        <p className={`text-sm ${mutedText}`}>
                                            {routine.appliesTo === 'all' ? 'All Students' : routine.appliesTo === 'boarders' ? 'Boarders Only' : 'Day Students Only'}
                                            {routine.isDefault && <span className="ml-2 text-green-600">(Default)</span>}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => onEdit(routine)}
                                        className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 min-h-[44px]"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(routine.id)}
                                        className="flex items-center gap-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 min-h-[44px]"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {expandedRoutine === routine.id && routine.slots && routine.slots.length > 0 && (
                                <div className={`px-4 pb-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                                    <table className="w-full text-sm mt-3">
                                        <thead>
                                            <tr className={mutedText}>
                                                <th className="text-left py-2">Time</th>
                                                <th className="text-left py-2">Activity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {routine.slots.map((slot, idx) => (
                                                <tr key={idx} className={`border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                                                    <td className={`py-2 ${textColor}`}>{slot.startTime} - {slot.endTime}</td>
                                                    <td className={`py-2 ${textColor}`}>
                                                        {ROUTINE_ACTIVITIES.find(a => a.value === slot.activity)?.label || slot.customActivity || slot.activity}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

interface RoutineModalProps {
    routine: SchoolRoutine | null;
    onClose: () => void;
    onSave: (data: Partial<SchoolRoutine>) => void;
    isDark: boolean;
}

export function RoutineModal({
    routine,
    onClose,
    onSave,
    isDark,
}: RoutineModalProps) {
    const [formData, setFormData] = useState<Partial<SchoolRoutine>>({
        name: routine?.name || '',
        description: routine?.description || '',
        appliesTo: routine?.appliesTo || 'all',
        dayOfWeek: routine?.dayOfWeek || DAYS_OF_WEEK,
        isDefault: routine?.isDefault ?? false,
        isActive: routine?.isActive ?? true,
        slots: routine?.slots || [],
    });

    const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
    const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';

    const addSlot = () => {
        setFormData(prev => ({
            ...prev,
            slots: [...(prev.slots || []), { activity: 'lessons', startTime: '', endTime: '' }],
        }));
    };

    const updateSlot = (index: number, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            slots: (prev.slots || []).map((s, i) => i === index ? { ...s, [field]: value } : s),
        }));
    };

    const removeSlot = (index: number) => {
        setFormData(prev => ({
            ...prev,
            slots: (prev.slots || []).filter((_, i) => i !== index),
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
                <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h2 className={`text-xl font-bold ${textColor}`}>{routine ? 'Edit Routine' : 'New Routine'}</h2>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Routine Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            placeholder="e.g., Boarders Daily Routine"
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Description</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Applies To</label>
                        <select
                            value={formData.appliesTo}
                            onChange={(e) => setFormData(prev => ({ ...prev, appliesTo: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                        >
                            <option value="all">All Students</option>
                            <option value="boarders">Boarders Only</option>
                            <option value="day">Day Students Only</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.isDefault}
                                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                                className="rounded"
                            />
                            <span className={textColor}>Default Routine</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                className="rounded"
                            />
                            <span className={textColor}>Active</span>
                        </label>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className={`text-sm font-medium ${textColor}`}>Time Slots</label>
                            <button
                                type="button"
                                onClick={addSlot}
                                className="flex items-center gap-1 px-2 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                                <Plus className="w-3 h-3" /> Add Slot
                            </button>
                        </div>
                        <div className="space-y-2">
                            {(formData.slots || []).map((slot, idx) => (
                                <div key={idx} className={`flex items-center gap-2 p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                    <input
                                        type="time"
                                        value={slot.startTime}
                                        onChange={(e) => updateSlot(idx, 'startTime', e.target.value)}
                                        className={`px-2 py-1 rounded border ${inputBg} ${inputBorder} ${textColor} w-28`}
                                    />
                                    <span className={mutedText}>-</span>
                                    <input
                                        type="time"
                                        value={slot.endTime}
                                        onChange={(e) => updateSlot(idx, 'endTime', e.target.value)}
                                        className={`px-2 py-1 rounded border ${inputBg} ${inputBorder} ${textColor} w-28`}
                                    />
                                    <select
                                        value={slot.activity}
                                        onChange={(e) => updateSlot(idx, 'activity', e.target.value)}
                                        className={`flex-1 px-2 py-1 rounded border ${inputBg} ${inputBorder} ${textColor}`}
                                    >
                                        {ROUTINE_ACTIVITIES.map(a => (
                                            <option key={a.value} value={a.value}>{a.label}</option>
                                        ))}
                                    </select>
                                    {slot.activity === 'custom' && (
                                        <input
                                            type="text"
                                            value={slot.customActivity || ''}
                                            onChange={(e) => updateSlot(idx, 'customActivity', e.target.value)}
                                            placeholder="Activity name"
                                            className={`px-2 py-1 rounded border ${inputBg} ${inputBorder} ${textColor} w-32`}
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeSlot(idx)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
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
                        onClick={() => onSave({ ...formData, id: routine?.id })}
                        className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
                    >
                        {routine ? 'Update' : 'Create'} Routine
                    </button>
                </div>
            </div>
        </div>
    );
}
