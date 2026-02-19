import React, { useState, useEffect } from 'react';
import { Student, ClassLevel, Gender, SchoolSettings } from '../../../../types';
import { Button } from '../../../../components/Button';
import { useQuery } from '@tanstack/react-query';

interface Dormitory { id: number; name: string; gender?: string; capacity?: number; }
interface Bed { id: number; dormitoryId: number; bedNumber: string; level: string; status: string; currentStudentId: number | null; studentName: string | null; }

interface StudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    formData: Partial<Student>;
    setFormData: (data: Partial<Student>) => void;
    isEdit: boolean;
    settings: SchoolSettings | null;
    isDark: boolean;
    studentId?: number; // needed to pre-load current bed when editing
}

export const StudentModal: React.FC<StudentModalProps> = ({ isOpen, onClose, onSubmit, formData, setFormData, isEdit, settings, isDark, studentId }) => {
    if (!isOpen) return null;

    // Dormitory assignment state
    const [selectedDormId, setSelectedDormId] = useState<number | null>(null);
    const [selectedBedId, setSelectedBedId] = useState<number | null>(null);
    const [bedActionError, setBedActionError] = useState<string | null>(null);
    const [bedActionSuccess, setBedActionSuccess] = useState<string | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);

    const isBoarding = formData.boardingStatus === 'boarding';

    // Fetch dormitories
    const { data: dormitories = [] } = useQuery<Dormitory[]>({
        queryKey: ['dormitories'],
        queryFn: async () => {
            const res = await fetch('/api/dormitories', { credentials: 'include' });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: isBoarding,
        staleTime: 2 * 60 * 1000,
    });

    // Fetch beds for selected dormitory
    const { data: beds = [] } = useQuery<Bed[]>({
        queryKey: ['beds', selectedDormId],
        queryFn: async () => {
            if (!selectedDormId) return [];
            const res = await fetch(`/api/beds?dormitoryId=${selectedDormId}`, { credentials: 'include' });
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!selectedDormId && isBoarding,
        staleTime: 30 * 1000,
    });

    // Fetch current bed assignment when editing a boarder
    const { data: currentAssignment, refetch: refetchAssignment } = useQuery<{ bed: Bed; dormitory: Dormitory } | null>({
        queryKey: ['student-bed', studentId],
        queryFn: async () => {
            if (!studentId) return null;
            const res = await fetch(`/api/students/${studentId}/bed`, { credentials: 'include' });
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!studentId && isBoarding,
        staleTime: 30 * 1000,
    });

    // Pre-populate dormitory/bed dropdowns from current assignment
    useEffect(() => {
        if (currentAssignment?.dormitory && currentAssignment?.bed) {
            setSelectedDormId(currentAssignment.dormitory.id);
            setSelectedBedId(currentAssignment.bed.id);
        }
    }, [currentAssignment]);

    const handleAssignBed = async () => {
        if (!selectedBedId || !studentId) return;
        setIsAssigning(true);
        setBedActionError(null);
        setBedActionSuccess(null);
        try {
            const res = await fetch(`/api/beds/${selectedBedId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ studentId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to assign bed');
            setBedActionSuccess('Bed assigned successfully!');
            refetchAssignment();
        } catch (e: any) {
            setBedActionError(e.message);
        }
        setIsAssigning(false);
    };

    const handleUnassignBed = async () => {
        if (!currentAssignment?.bed?.id) return;
        setIsAssigning(true);
        setBedActionError(null);
        setBedActionSuccess(null);
        try {
            const res = await fetch(`/api/beds/${currentAssignment.bed.id}/unassign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to unassign bed');
            setBedActionSuccess('Removed from dormitory.');
            setSelectedDormId(null);
            setSelectedBedId(null);
            refetchAssignment();
        } catch (e: any) {
            setBedActionError(e.message);
        }
        setIsAssigning(false);
    };

    const inputClasses = `mt-1 block w-full rounded-lg border px-4 py-3 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/50 focus:outline-none text-base transition-all duration-200 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`;
    const currentStreams = settings?.streams[formData.classLevel || ClassLevel.P1] || [];

    const bedChanged = selectedBedId !== (currentAssignment?.bed?.id ?? null);
    const currentDorm = dormitories.find(d => d.id === selectedDormId);

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
                    {/* Academic Details */}
                    <div>
                        <h3 className={`text-sm font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Academic Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Full Name (Uppercase)</label>
                                <input type="text" className={inputClasses} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} required placeholder="e.g. MUKASA JOHN" />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>School Paycode</label>
                                <input type="text" className={inputClasses} value={formData.paycode} onChange={e => setFormData({ ...formData, paycode: e.target.value })} placeholder="Optional" />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
                                <select className={inputClasses} value={formData.classLevel} onChange={e => {
                                    const newClass = e.target.value as ClassLevel;
                                    const newStreams = settings?.streams[newClass] || [];
                                    setFormData({ ...formData, classLevel: newClass, stream: newStreams.length > 0 ? newStreams[0] : '' });
                                }}>
                                    {Object.values(ClassLevel).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Stream</label>
                                <input type="text" list="streams-list-modal" className={inputClasses} value={formData.stream} onChange={e => setFormData({ ...formData, stream: e.target.value })} placeholder="Select or type stream..." />
                                <datalist id="streams-list-modal">
                                    {currentStreams.map((s: string) => <option key={s} value={s} />)}
                                </datalist>
                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Type a new name to create a stream for this class.</p>
                            </div>
                        </div>
                    </div>

                    {/* Personal & Contact */}
                    <div>
                        <h3 className={`text-sm font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Personal & Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Gender</label>
                                <select className={inputClasses} value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}>
                                    <option value={Gender.Male}>Male</option>
                                    <option value={Gender.Female}>Female</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Boarding Status</label>
                                <select className={inputClasses} value={formData.boardingStatus || 'day'} onChange={e => setFormData({ ...formData, boardingStatus: e.target.value })}>
                                    <option value="day">Day Scholar</option>
                                    <option value="boarding">Boarder</option>
                                </select>
                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Boarders can be assigned to dormitories below.</p>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Parent/Guardian Name</label>
                                <input type="text" className={inputClasses} value={formData.parentName || ''} onChange={e => setFormData({ ...formData, parentName: e.target.value })} placeholder="Mr. Parent Name" />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Contact Phone</label>
                                <input type="text" className={inputClasses} value={formData.parentContact || ''} onChange={e => setFormData({ ...formData, parentContact: e.target.value })} placeholder="07XX XXX XXX" />
                            </div>
                        </div>
                    </div>

                    {/* Dormitory Assignment — only visible for Boarders */}
                    {isBoarding && (
                        <div>
                            <h3 className={`text-sm font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                🏠 Dormitory Assignment
                            </h3>
                            <div className={`p-4 rounded-lg border space-y-4 ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-blue-50/50 border-blue-200'}`}>

                                {/* Current assignment badge */}
                                {currentAssignment?.bed && (
                                    <div className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-gray-600' : 'bg-white border border-blue-200'}`}>
                                        <div>
                                            <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Current Assignment</p>
                                            <p className={`font-semibold mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {currentAssignment.dormitory?.name} — Bed {currentAssignment.bed.bedNumber}
                                                {currentAssignment.bed.level && currentAssignment.bed.level !== 'Single' && ` (${currentAssignment.bed.level})`}
                                            </p>
                                        </div>
                                        {isEdit && studentId && (
                                            <button
                                                type="button"
                                                onClick={handleUnassignBed}
                                                disabled={isAssigning}
                                                className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors font-medium disabled:opacity-50"
                                            >
                                                {isAssigning ? '...' : 'Remove'}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Dormitory selector */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Dormitory
                                        </label>
                                        <select
                                            className={inputClasses}
                                            value={selectedDormId ?? ''}
                                            onChange={e => {
                                                setSelectedDormId(e.target.value ? parseInt(e.target.value) : null);
                                                setSelectedBedId(null);
                                            }}
                                        >
                                            <option value="">Select dormitory...</option>
                                            {dormitories.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}{d.gender ? ` (${d.gender})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Bed selector */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Bed
                                        </label>
                                        <select
                                            className={inputClasses}
                                            value={selectedBedId ?? ''}
                                            onChange={e => setSelectedBedId(e.target.value ? parseInt(e.target.value) : null)}
                                            disabled={!selectedDormId}
                                        >
                                            <option value="">{selectedDormId ? 'Select bed...' : 'Select dormitory first'}</option>
                                            {beds.map(bed => {
                                                const isCurrentBed = currentAssignment?.bed?.id === bed.id;
                                                const isOccupied = bed.status === 'occupied' && !isCurrentBed;
                                                return (
                                                    <option key={bed.id} value={bed.id} disabled={isOccupied}>
                                                        Bed {bed.bedNumber}{bed.level && bed.level !== 'Single' ? ` - ${bed.level}` : ''}
                                                        {isCurrentBed ? ' ✓ (current)' : isOccupied ? ` — ${bed.studentName || 'Occupied'}` : ' (vacant)'}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>

                                {/* Assign button - only shown when editing an existing student and bed has changed */}
                                {isEdit && studentId && selectedBedId && bedChanged && (
                                    <button
                                        type="button"
                                        onClick={handleAssignBed}
                                        disabled={isAssigning}
                                        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                    >
                                        {isAssigning ? 'Assigning...' : `Assign to ${currentDorm?.name ?? 'Dormitory'}, Bed ${beds.find(b => b.id === selectedBedId)?.bedNumber ?? ''}`}
                                    </button>
                                )}

                                {!isEdit && (
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        💡 Save the student first, then edit their profile to assign a bed.
                                    </p>
                                )}

                                {/* Feedback messages */}
                                {bedActionSuccess && (
                                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">{bedActionSuccess}</p>
                                )}
                                {bedActionError && (
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">{bedActionError}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Administrative Flags */}
                    <div>
                        <h3 className={`text-sm font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Administrative Flags</h3>
                        <div className={`p-4 rounded-lg border grid grid-cols-1 sm:grid-cols-3 gap-3 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                                <input type="checkbox" className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500" checked={formData.specialCases?.sickness} onChange={e => setFormData({ ...formData, specialCases: { ...formData.specialCases!, sickness: e.target.checked } })} />
                                <span className={`text-base ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Medical Condition</span>
                            </label>
                            <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                                <input type="checkbox" className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500" checked={formData.specialCases?.absenteeism} onChange={e => setFormData({ ...formData, specialCases: { ...formData.specialCases!, absenteeism: e.target.checked } })} />
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
