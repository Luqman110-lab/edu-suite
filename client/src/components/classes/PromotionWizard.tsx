import React, { useState, useMemo } from 'react';
import { useStudents } from '../../hooks/useStudents';
import { useSettings } from '../../hooks/useSettings';
import { X, ArrowRight, Loader2, GraduationCap } from 'lucide-react';
import { useToast } from '../../../../hooks/use-toast';

interface PromotionWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

const CLASS_ORDER = ['Baby', 'Middle', 'Top', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'Alumni'];

export function PromotionWizard({ isOpen, onClose }: PromotionWizardProps) {
    const { students, promoteStudents, graduateStudents } = useStudents();
    const { settings } = useSettings();
    const { toast } = useToast();

    // Source selection
    const [sourceClass, setSourceClass] = useState<string>('');
    const [sourceStream, setSourceStream] = useState<string>('');

    // Target selection
    const [targetClass, setTargetClass] = useState<string>('');
    const [targetStream, setTargetStream] = useState<string>('');

    // Student selection
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());

    const isProcessing = promoteStudents.isPending || graduateStudents.isPending;

    // Derived data
    const availableClasses = useMemo(() => {
        if (!settings?.streams) return [];
        return Object.keys(settings.streams).sort((a, b) => CLASS_ORDER.indexOf(a) - CLASS_ORDER.indexOf(b));
    }, [settings?.streams]);

    const sourceAvailableStreams = useMemo(() => {
        if (!sourceClass || !settings?.streams) return [];
        return settings.streams[sourceClass] || [];
    }, [sourceClass, settings?.streams]);

    const targetAvailableStreams = useMemo(() => {
        if (!targetClass || !settings?.streams || targetClass === 'Alumni') return [];
        return settings.streams[targetClass] || [];
    }, [targetClass, settings?.streams]);

    const sourceStudents = useMemo(() => {
        if (!students || !sourceClass || !sourceStream) return [];
        return students.filter(s => s.classLevel === sourceClass && s.stream === sourceStream && s.isActive).sort((a, b) => a.name.localeCompare(b.name));
    }, [students, sourceClass, sourceStream]);

    // Handlers
    const handleSourceClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newClass = e.target.value;
        setSourceClass(newClass);
        setSourceStream('');
        setSelectedStudentIds(new Set());

        // Auto-suggest next class
        const currentIndex = CLASS_ORDER.indexOf(newClass);
        if (currentIndex !== -1 && currentIndex < CLASS_ORDER.length - 1) {
            setTargetClass(CLASS_ORDER[currentIndex + 1]);
            setTargetStream('');
        } else {
            setTargetClass('');
        }
    };

    const handlePromote = async () => {
        if (selectedStudentIds.size === 0 || !targetClass) return;

        try {
            const ids = Array.from(selectedStudentIds);

            if (targetClass === 'Alumni' || sourceClass === 'P7') {
                await graduateStudents.mutateAsync(ids);
                toast({ title: 'Success', description: `Graduated ${ids.length} students` });
            } else {
                if (!targetStream) {
                    toast({ title: 'Error', description: 'Please select a target stream', variant: 'destructive' });
                    return;
                }

                await promoteStudents.mutateAsync({
                    studentIds: ids,
                    targetClassLevel: targetClass,
                    targetStream: targetStream
                });
                toast({ title: 'Success', description: `Promoted ${ids.length} students to ${targetClass} ${targetStream}` });
            }

            setSelectedStudentIds(new Set());
        } catch (error: any) {
            toast({ title: 'Action failed', description: error.message, variant: 'destructive' });
        }
    };

    const toggleSelection = (id: number) => {
        const next = new Set(selectedStudentIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedStudentIds(next);
    };

    const toggleSelectAll = () => {
        selectedStudentIds.size === sourceStudents.length
            ? setSelectedStudentIds(new Set())
            : setSelectedStudentIds(new Set(sourceStudents.map(s => s.id!)));
    };

    if (!isOpen) return null;

    const isGraduating = targetClass === 'Alumni' || sourceClass === 'P7';
    const canSubmit = selectedStudentIds.size > 0 && targetClass && (isGraduating || targetStream);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl my-8 flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
                            Promotion Wizard
                        </h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">
                            Move students to the next class or graduate them.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-500 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col flex-1 overflow-hidden">

                    {/* Configuration Panel */}
                    <div className="flex gap-6 mb-6">
                        {/* Source Box */}
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                                Select Source
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">Class</label>
                                    <select
                                        value={sourceClass}
                                        onChange={handleSourceClassChange}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                    >
                                        <option value="">-- Choose Class --</option>
                                        {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className={!sourceClass ? 'opacity-50 pointer-events-none' : ''}>
                                    <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">Stream</label>
                                    <select
                                        value={sourceStream}
                                        onChange={e => setSourceStream(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                    >
                                        <option value="">-- Choose Stream --</option>
                                        {sourceAvailableStreams.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-full border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-400">
                                <ArrowRight className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Target Box */}
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">2</span>
                                Select Target
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">Target Class / Action</label>
                                    <select
                                        value={targetClass}
                                        onChange={e => {
                                            setTargetClass(e.target.value);
                                            setTargetStream('');
                                        }}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium"
                                    >
                                        <option value="">-- Target --</option>
                                        {availableClasses.filter(c => CLASS_ORDER.indexOf(c) > CLASS_ORDER.indexOf(sourceClass)).map(c => <option key={c} value={c}>{c}</option>)}
                                        <option value="Alumni" className="text-indigo-600 font-bold">🎓 Graduate (Alumni)</option>
                                    </select>
                                </div>
                                {!isGraduating && (
                                    <div className={!targetClass ? 'opacity-50 pointer-events-none' : ''}>
                                        <label className="block text-xs text-gray-500 uppercase font-semibold mb-1">Target Stream</label>
                                        <select
                                            value={targetStream}
                                            onChange={e => setTargetStream(e.target.value)}
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                        >
                                            <option value="">-- Choose Target Stream --</option>
                                            {targetAvailableStreams.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                )}
                                {isGraduating && (
                                    <div className="h-[62px] flex items-center px-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm border border-indigo-100 dark:border-indigo-800/50">
                                        <GraduationCap className="w-5 h-5 mr-2" />
                                        Students will be marked as graduated
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Students List */}
                    <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col overflow-hidden bg-white dark:bg-gray-800 relative">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold leading-none shrink-0" style={{ transform: 'translateY(-1px)' }}>3</span>
                                <input
                                    type="checkbox"
                                    checked={sourceStudents.length > 0 && selectedStudentIds.size === sourceStudents.length}
                                    onChange={toggleSelectAll}
                                    disabled={!sourceStream}
                                    className="rounded border-gray-300 text-purple-600"
                                    id="selectAll"
                                />
                                <label htmlFor="selectAll" className="font-bold text-gray-700 dark:text-gray-200 cursor-pointer text-sm">
                                    Select Students ({selectedStudentIds.size}/{sourceStudents.length})
                                </label>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {!sourceStream ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Complete Step 1 to load students</div>
                            ) : sourceStudents.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm">No students found</div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {sourceStudents.map(student => (
                                        <label key={student.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedStudentIds.has(student.id!) ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800 hover:shadow-sm'}`}>
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.has(student.id!)}
                                                onChange={() => toggleSelection(student.id!)}
                                                className="rounded border-gray-300 text-purple-600"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{student.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{student.indexNumber || student.gender}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePromote}
                        disabled={!canSubmit || isProcessing}
                        className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg flex items-center gap-2 transition-all shadow-sm
                            ${canSubmit && !isProcessing
                                ? isGraduating ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-purple-600 hover:bg-purple-700'
                                : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'}`}
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : isGraduating ? <GraduationCap className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                        {isProcessing ? 'Processing...' : isGraduating ? `Graduate ${selectedStudentIds.size} Students` : `Promote ${selectedStudentIds.size} Students`}
                    </button>
                </div>

            </div>
        </div>
    );
}
