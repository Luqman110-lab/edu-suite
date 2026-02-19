import React from 'react';
import { Student, ClassLevel, Gender, SchoolSettings } from '../../../../types';
import { Button } from '../../../../components/Button';

interface StudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    formData: Partial<Student>;
    setFormData: (data: Partial<Student>) => void;
    isEdit: boolean;
    settings: SchoolSettings | null;
    isDark: boolean;
}

export const StudentModal: React.FC<StudentModalProps> = ({ isOpen, onClose, onSubmit, formData, setFormData, isEdit, settings, isDark }) => {
    if (!isOpen) return null;

    const inputClasses = `mt-1 block w-full rounded-lg border px-4 py-3 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 focus:outline-none text-base transition-all duration-200 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`;

    const currentStreams = settings?.streams[formData.classLevel || ClassLevel.P1] || [];

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className={`rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-2xl p-4 sm:p-6 border max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`flex justify-between items-center border-b pb-3 mb-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{isEdit ? 'Edit Student Profile' : 'Register New Student'}</h2>
                    <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-6">
                    <div>
                        <h3 className={`text-sm font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Academic Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Full Name (Uppercase)</label>
                                <input
                                    type="text"
                                    className={inputClasses}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                    required
                                    placeholder="e.g. MUKASA JOHN"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>School Paycode</label>
                                <input
                                    type="text"
                                    className={inputClasses}
                                    value={formData.paycode}
                                    onChange={e => setFormData({ ...formData, paycode: e.target.value })}
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
                                <select
                                    className={inputClasses}
                                    value={formData.classLevel}
                                    onChange={e => {
                                        const newClass = e.target.value as ClassLevel;
                                        const newStreams = settings?.streams[newClass] || [];
                                        setFormData({
                                            ...formData,
                                            classLevel: newClass,
                                            stream: newStreams.length > 0 ? newStreams[0] : ''
                                        });
                                    }}
                                >
                                    {Object.values(ClassLevel).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Stream</label>
                                <input
                                    type="text"
                                    list="streams-list-modal"
                                    className={inputClasses}
                                    value={formData.stream}
                                    onChange={e => setFormData({ ...formData, stream: e.target.value })}
                                    placeholder="Select or type stream..."
                                />
                                <datalist id="streams-list-modal">
                                    {currentStreams.map((s: string) => <option key={s} value={s} />)}
                                </datalist>
                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Type a new name to create a stream for this class.</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className={`text-sm font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Personal & Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Gender</label>
                                <select
                                    className={inputClasses}
                                    value={formData.gender}
                                    onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}
                                >
                                    <option value={Gender.Male}>Male</option>
                                    <option value={Gender.Female}>Female</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Boarding Status</label>
                                <select
                                    className={inputClasses}
                                    value={formData.boardingStatus || 'day'}
                                    onChange={e => setFormData({ ...formData, boardingStatus: e.target.value })}
                                >
                                    <option value="day">Day Scholar</option>
                                    <option value="boarding">Boarder</option>
                                </select>
                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Boarders can be assigned to dormitories and tracked via boarding roll calls.</p>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Parent/Guardian Name</label>
                                <input
                                    type="text"
                                    className={inputClasses}
                                    value={formData.parentName || ''}
                                    onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                                    placeholder="Mr. Parent Name"
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Contact Phone</label>
                                <input
                                    type="text"
                                    className={inputClasses}
                                    value={formData.parentContact || ''}
                                    onChange={e => setFormData({ ...formData, parentContact: e.target.value })}
                                    placeholder="07XX XXX XXX"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className={`text-sm font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Administrative Flags</h3>
                        <div className={`p-4 rounded-lg border grid grid-cols-1 sm:grid-cols-3 gap-3 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>

                            <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                                    checked={formData.specialCases?.sickness}
                                    onChange={e => setFormData({ ...formData, specialCases: { ...formData.specialCases!, sickness: e.target.checked } })}
                                />
                                <span className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Medical Condition</span>
                            </label>
                            <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                                    checked={formData.specialCases?.absenteeism}
                                    onChange={e => setFormData({ ...formData, specialCases: { ...formData.specialCases!, absenteeism: e.target.checked } })}
                                />
                                <span className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Chronic Absenteeism</span>
                            </label>
                        </div>
                    </div>

                    <div className={`flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t mt-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <Button variant="outline" type="button" onClick={onClose} className="w-full sm:w-auto py-3 text-base">Cancel</Button>
                        <Button type="submit" className="w-full sm:w-auto py-3 text-base">Save Student</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
