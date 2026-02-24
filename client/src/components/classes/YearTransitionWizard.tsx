import React, { useState, useMemo } from 'react';
import { useStudents } from '../../hooks/useStudents';
import { useSettings } from '../../hooks/useSettings';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../../services/api';
import { X, CalendarPlus, Loader2, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { useToast } from '../../../../hooks/use-toast';

interface YearTransitionWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

export function YearTransitionWizard({ isOpen, onClose }: YearTransitionWizardProps) {
    const { students, promoteStudents, graduateStudents } = useStudents();
    const { settings, updateSettings } = useSettings();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [currentStep, setCurrentStep] = useState<number>(0);
    const [isExecuting, setIsExecuting] = useState(false);
    const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false]);

    // Status text for the progress UI
    const [executionLogs, setExecutionLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setExecutionLogs(prev => [...prev, msg]);

    const activeYear = settings?.currentYear || new Date().getFullYear();
    const nextYear = activeYear + 1;

    // Derived statistics for the warning screen
    const p7Students = useMemo(() => students?.filter(s => s.classLevel === 'P7' && s.isActive) || [], [students]);
    const otherActiveStudents = useMemo(() => students?.filter(s => s.classLevel !== 'P7' && s.classLevel !== 'Alumni' && s.isActive) || [], [students]);

    // Create Snapshot Mutation
    const createSnapshot = useMutation({
        mutationFn: async (year: number) => {
            return apiRequest<{ message: string, count: number }>('POST', '/archive/create-snapshot', { year });
        }
    });

    const executeTransition = async () => {
        setIsExecuting(true);
        setExecutionLogs([]);
        setCompletedSteps([false, false, false, false]);

        try {
            // STEP 1: Snapshot
            setCurrentStep(1);
            addLog(`Creating historical snapshot for $^{activeYear} academic year...`);
            await createSnapshot.mutateAsync(activeYear);
            setCompletedSteps(prev => { const n = [...prev]; n[0] = true; return n; });
            addLog(`✓ Snapshot created successfully`);

            // STEP 2: Graduate P7
            setCurrentStep(2);
            if (p7Students.length > 0) {
                addLog(`Graduating ${p7Students.length} Primary 7 students...`);
                await graduateStudents.mutateAsync(p7Students.map(s => s.id!));
                addLog(`✓ P7 students marked as Alumni`);
            } else {
                addLog(`No active P7 students found to graduate. Skipping.`);
            }
            setCompletedSteps(prev => { const n = [...prev]; n[1] = true; return n; });

            // STEP 3: Auto Promote Others
            setCurrentStep(3);
            if (otherActiveStudents.length > 0) {
                addLog(`Auto-promoting ${otherActiveStudents.length} students to their next respective classes...`);
                // Passing null targets triggers auto-map promotion in StudentService
                await promoteStudents.mutateAsync({
                    studentIds: otherActiveStudents.map(s => s.id!),
                    targetClassLevel: null,
                    targetStream: null
                });
                addLog(`✓ Mass promotion completed`);
            } else {
                addLog(`No active students found to promote. Skipping.`);
            }
            setCompletedSteps(prev => { const n = [...prev]; n[2] = true; return n; });

            // STEP 4: Advance Year Settings
            setCurrentStep(4);
            addLog(`Advancing system settings to ${nextYear}, Term 1...`);
            if (settings) {
                await updateSettings.mutateAsync({
                    ...settings,
                    currentYear: nextYear,
                    currentTerm: 1
                });
            }
            setCompletedSteps(prev => { const n = [...prev]; n[3] = true; return n; });
            addLog(`✓ System year advanced. Transition Complete!`);

            // Invalidate EVERYTHING to force a clean slate reload
            queryClient.invalidateQueries();

            toast({ title: 'Success', description: `Successfully transitioned to ${nextYear} Academic Year.` });

        } catch (error: any) {
            addLog(`❌ ERROR: ${error.message}`);
            toast({ title: 'Transition Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsExecuting(false);
        }
    };

    if (!isOpen) return null;

    const steps = [
        { id: 1, title: 'Archive Current Year', desc: 'Saves a historical snapshot of all student classes and streams for reporting.' },
        { id: 2, title: 'Graduate P7 Students', desc: 'Automatically marks all active Primary 7 students as Alumni.' },
        { id: 3, title: 'Mass Promote', desc: 'Moves all remaining students to the next class level (e.g., P5 to P6).' },
        { id: 4, title: 'Update Settings', desc: `Advances the global academic year to ${nextYear} and resets the term to 1.` }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={!isExecuting ? onClose : undefined}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-amber-50/50 dark:bg-amber-900/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                                <CalendarPlus className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Academic Year Transition</h2>
                                <p className="text-sm text-gray-500 font-medium">
                                    Safely transition from <span className="font-bold text-amber-600 dark:text-amber-400">{activeYear}</span> to <span className="font-bold text-amber-600 dark:text-amber-400">{nextYear}</span>
                                </p>
                            </div>
                        </div>
                        {!isExecuting && (
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-500 rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    {currentStep === 0 ? (
                        <div className="space-y-6">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800 dark:text-amber-300">
                                    <p className="font-bold mb-1">Warning: Irreversible Action</p>
                                    <p>This wizard will automatically promote all students and advance the global school year to {nextYear}. Please ensure all final report cards and grading for {activeYear} have been completed and printed before proceeding.</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">The following actions will be performed automatically:</h3>
                                <div className="space-y-4">
                                    {steps.map((step, idx) => (
                                        <div key={step.id} className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center justify-center text-sm font-bold shrink-0">
                                                {step.id}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{step.title}</h4>
                                                <p className="text-sm text-gray-500">{step.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                    <div className="text-2xl font-black text-indigo-600">{p7Students.length}</div>
                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">P7 Graduates</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                    <div className="text-2xl font-black text-purple-600">{otherActiveStudents.length}</div>
                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Students to Promote</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Execution Progress */}
                            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[1.1rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-700 before:to-transparent">
                                {steps.map((step, idx) => {
                                    const isPast = completedSteps[idx];
                                    const isCurrent = currentStep === step.id && isExecuting;

                                    return (
                                        <div key={step.id} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all ${isPast ? 'opacity-100' : isCurrent ? 'opacity-100 scale-105 origin-left md:origin-center' : 'opacity-40'}`}>
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
                                                {isPast ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : isCurrent ? <Loader2 className="w-4 h-4 text-amber-500 animate-spin" /> : <div className="w-2 h-2 rounded-full bg-gray-400" />}
                                            </div>

                                            <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                                <h4 className={`text-sm font-bold ${isPast ? 'text-green-600' : isCurrent ? 'text-amber-600' : 'text-gray-500'}`}>{step.title}</h4>
                                                <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Terminal Logs */}
                            <div className="bg-gray-900 rounded-xl p-4 min-h-[120px] max-h-[160px] overflow-y-auto font-mono text-xs">
                                {executionLogs.map((log, i) => (
                                    <div key={i} className={`flex gap-2 ${log.includes('ERROR') ? 'text-red-400 font-bold' : log.startsWith('✓') ? 'text-green-400' : 'text-gray-300'}`}>
                                        <span className="text-gray-600 select-none">&gt;</span>
                                        <span>{log}</span>
                                    </div>
                                ))}
                                {isExecuting && (
                                    <div className="flex gap-2 text-gray-500 animate-pulse mt-1">
                                        <span className="select-none">&gt;</span> <span className="w-2 h-3 bg-gray-500 inline-block" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-3">
                    {currentStep === 0 ? (
                        <>
                            <button
                                onClick={onClose}
                                className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeTransition}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-2 transition-all shadow-sm"
                            >
                                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                                Begin Transition
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            disabled={isExecuting}
                            className={`px-6 py-2.5 text-sm font-bold text-white rounded-lg flex items-center gap-2 transition-all shadow-sm ${!isExecuting ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                            {isExecuting ? 'Processing...' : 'Close Wizard'}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
