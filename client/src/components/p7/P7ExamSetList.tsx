import React from 'react';
import { P7ExamSet } from '../../../../types';
import { Button } from '../../../../components/Button';
import { Trash, Plus, FileText } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

interface P7ExamSetListProps {
    sets: P7ExamSet[];
    selectedSet: P7ExamSet | null;
    onSelectSet: (set: P7ExamSet) => void;
    onDeleteSet: (id: number) => void;
    onAddSet: () => void;
}

export const P7ExamSetList: React.FC<P7ExamSetListProps> = ({
    sets,
    selectedSet,
    onSelectSet,
    onDeleteSet,
    onAddSet
}) => {
    const { isDark } = useTheme();

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-lg border`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Exam Sets ({sets.length}/10)
                </h2>
                <Button onClick={onAddSet} disabled={sets.length >= 10}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Set
                </Button>
            </div>

            {sets.length === 0 ? (
                <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No exam sets created yet</p>
                    <p className="text-sm mt-1">Click "Add Set" to create your first P7 exam set</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sets.map(set => (
                        <div
                            key={set.id}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedSet?.id === set.id
                                ? 'border-[#7B1113] bg-[#7B1113]/5'
                                : isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            onClick={() => onSelectSet(set)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                                        Set {set.setNumber}
                                    </span>
                                    {set.stream && (
                                        <span className={`ml-2 inline-block px-2 py-1 text-xs rounded ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                                            {set.stream}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteSet(set.id!); }}
                                    className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                >
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{set.name}</h3>
                            {set.examDate && (
                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Date: {new Date(set.examDate).toLocaleDateString()}
                                </p>
                            )}
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Term {set.term}, {set.year}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
