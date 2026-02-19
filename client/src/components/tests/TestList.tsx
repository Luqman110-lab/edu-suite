import React from 'react';
import { TestSession, ClassLevel, SUBJECTS_LOWER, SUBJECTS_UPPER } from '../../../../types';
import { Plus, ClipboardList, Edit, BarChart, FileText, Trash } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

interface TestListProps {
    sessions: TestSession[];
    loading: boolean;
    filterClass: string;
    setFilterClass: (val: string) => void;
    filterTerm: number;
    setFilterTerm: (val: number) => void;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    onAddSession: () => void;
    onEditSession: (session: TestSession) => void;
    onDeleteSession: (id: number) => void;
    onEnterScores: (session: TestSession) => void;
    onViewResults: (session: TestSession) => void;
    onDownloadSheet: (session: TestSession) => void;
}

export const TestList: React.FC<TestListProps> = ({
    sessions,
    loading,
    filterClass,
    setFilterClass,
    filterTerm,
    setFilterTerm,
    searchQuery,
    setSearchQuery,
    onAddSession,
    onEditSession,
    onDeleteSession,
    onEnterScores,
    onViewResults,
    onDownloadSheet
}) => {
    const { isDark } = useTheme();

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Weekly Tests</h1>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage homework, quizzes, and weekly assessments</p>
                </div>
                <button
                    onClick={onAddSession}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2 self-start"
                >
                    <Plus className="w-4 h-4" />
                    New Test
                </button>
            </div>

            <div className={`rounded-xl shadow-sm border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Search tests..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className={`flex-1 min-w-[200px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <select
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                        className={`px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                        <option value="All">All Classes</option>
                        {Object.values(ClassLevel).map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                    <select
                        value={filterTerm}
                        onChange={e => setFilterTerm(parseInt(e.target.value))}
                        className={`px-3 py-2 border rounded-lg ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                        <option value={0}>All Terms</option>
                        <option value={1}>Term 1</option>
                        <option value={2}>Term 2</option>
                        <option value={3}>Term 3</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</div>
            ) : sessions.length === 0 ? (
                <div className="text-center py-12">
                    <ClipboardList className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No test sessions found</p>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Create a new test to get started</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sessions.map(session => (
                        <div key={session.id} className={`rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{session.name}</h3>
                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{session.testType}</p>
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded ${isDark ? 'bg-primary-900/30 text-primary-400' : 'bg-primary-50 text-primary-700'}`}>
                                    {session.classLevel}{session.stream ? ` - ${session.stream}` : ''}
                                </span>
                            </div>

                            <div className={`flex gap-2 text-xs mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                <span>Term {session.term}</span>
                                <span>•</span>
                                <span>{session.year}</span>
                                {session.testDate && (
                                    <>
                                        <span>•</span>
                                        <span>{new Date(session.testDate).toLocaleDateString()}</span>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-2 text-xs mb-4 flex-wrap">
                                {(['P1', 'P2', 'P3'].includes(session.classLevel) ? SUBJECTS_LOWER : SUBJECTS_UPPER).map(sub => (
                                    <span key={sub} className={`px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                        {getSubjectLabel(sub)}: {(session.maxMarks as any)[sub] || 10}
                                    </span>
                                ))}
                            </div>

                            <div className={`flex gap-2 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <button
                                    onClick={() => onEnterScores(session)}
                                    className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-1 ${isDark ? 'bg-primary-900/30 text-primary-400 hover:bg-primary-900/50' : 'bg-primary-50 text-primary-700 hover:bg-primary-100'}`}
                                >
                                    <Edit className="w-4 h-4" />
                                    Enter Scores
                                </button>
                                <button
                                    onClick={() => onViewResults(session)}
                                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                                    title="View Results"
                                >
                                    <BarChart className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onDownloadSheet(session)}
                                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                                    title="Download Assessment Sheet"
                                >
                                    <FileText className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onEditSession(session)}
                                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                                    title="Edit"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onDeleteSession(session.id!)}
                                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                    title="Delete"
                                >
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
