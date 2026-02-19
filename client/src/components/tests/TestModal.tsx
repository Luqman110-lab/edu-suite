import React, { useEffect, useState } from 'react';
import { TestSession, ClassLevel, SUBJECTS_LOWER, SUBJECTS_UPPER } from '../../../../types';
import { Check, X } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

interface TestModalProps {
    isOpen: boolean;
    isEditing: boolean;
    session: TestSession;
    setSession: (session: TestSession) => void;
    onClose: () => void;
    onSave: () => void;
    streams: { [key: string]: string[] } | undefined;
}

const TEST_TYPES = [
    'Weekly Test',
    'Homework',
    'Topical Test',
    'Mixed Work',
    'Quiz',
    'Class Exercise',
    'Monthly Test',
    'Other'
];

export const TestModal: React.FC<TestModalProps> = ({
    isOpen,
    isEditing,
    session,
    setSession,
    onClose,
    onSave,
    streams
}) => {
    const { isDark } = useTheme();
    const [sessionSubjects, setSessionSubjects] = useState<string[]>([]);

    useEffect(() => {
        setSessionSubjects(['P1', 'P2', 'P3'].includes(session.classLevel) ? SUBJECTS_LOWER : SUBJECTS_UPPER);
    }, [session.classLevel]);

    if (!isOpen) return null;

    const getSubjectLabel = (sub: string) => {
        const labels: { [key: string]: string } = {
            english: 'ENG',
            maths: 'MTC',
            science: 'SCI',
            sst: 'SST',
            literacy1: 'LIT1',
            literacy2: 'LIT2'
        };
        return labels[sub] || sub.toUpperCase();
    };

    const getStreamsForClass = (classLevel: string) => {
        if (!streams) return [];
        return streams[classLevel] || [];
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {isEditing ? 'Edit Test Session' : 'Create New Test Session'}
                    </h2>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Test Name *</label>
                            <input
                                type="text"
                                value={session.name}
                                onChange={e => setSession({ ...session, name: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                placeholder="e.g., Week 3 Math Test"
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Test Type</label>
                            <select
                                value={session.testType}
                                onChange={e => setSession({ ...session, testType: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                                {TEST_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
                            <select
                                value={session.classLevel}
                                onChange={e => setSession({ ...session, classLevel: e.target.value, stream: '' })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                                {Object.values(ClassLevel).map(cls => (
                                    <option key={cls} value={cls}>{cls}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Stream (Optional)</label>
                            <select
                                value={session.stream || ''}
                                onChange={e => setSession({ ...session, stream: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                                <option value="">All Streams</option>
                                {getStreamsForClass(session.classLevel).map(stream => (
                                    <option key={stream} value={stream}>{stream}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Test Date</label>
                            <input
                                type="date"
                                value={session.testDate || ''}
                                onChange={e => setSession({ ...session, testDate: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Term</label>
                            <select
                                value={session.term}
                                onChange={e => setSession({ ...session, term: parseInt(e.target.value) })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            >
                                <option value={1}>Term 1</option>
                                <option value={2}>Term 2</option>
                                <option value={3}>Term 3</option>
                            </select>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Year</label>
                            <input
                                type="number"
                                value={session.year}
                                onChange={e => setSession({ ...session, year: parseInt(e.target.value) })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Maximum Marks per Subject</h3>
                        <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Enter the maximum marks for each subject in this test (e.g., 10, 20, 50, etc.)</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {sessionSubjects.map(sub => (
                                <div key={sub} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                                    <label className={`block text-xs font-medium mb-1 uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{getSubjectLabel(sub)}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={(session.maxMarks as any)[sub] || 10}
                                        onChange={e => setSession({
                                            ...session,
                                            maxMarks: { ...session.maxMarks, [sub]: parseInt(e.target.value) || 10 }
                                        })}
                                        className={`w-full px-2 py-1.5 border rounded text-center font-medium ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={`p-6 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        {isEditing ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
};
