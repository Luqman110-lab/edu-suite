import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { SchoolSettings } from '../../types';
import { Trash2, Plus } from 'lucide-react';

interface GradingSettingsProps {
    settings: SchoolSettings;
    onUpdate: (updates: Partial<SchoolSettings>) => void;
}

export const GradingSettings: React.FC<GradingSettingsProps> = ({ settings, onUpdate }) => {
    const { isDark } = useTheme();

    const handleUpdate = (updates: Partial<SchoolSettings>) => {
        onUpdate(updates);
    };

    const defaultGradingConfig = {
        grades: [
            { grade: "D1", minScore: 90, maxScore: 100, points: 1 },
            { grade: "D2", minScore: 80, maxScore: 89, points: 2 },
            { grade: "C3", minScore: 70, maxScore: 79, points: 3 },
            { grade: "C4", minScore: 60, maxScore: 69, points: 4 },
            { grade: "C5", minScore: 55, maxScore: 59, points: 5 },
            { grade: "C6", minScore: 50, maxScore: 54, points: 6 },
            { grade: "P7", minScore: 45, maxScore: 49, points: 7 },
            { grade: "P8", minScore: 40, maxScore: 44, points: 8 },
            { grade: "F9", minScore: 0, maxScore: 39, points: 9 },
        ],
        divisions: [
            { division: "I", minAggregate: 4, maxAggregate: 12 },
            { division: "II", minAggregate: 13, maxAggregate: 24 },
            { division: "III", minAggregate: 25, maxAggregate: 28 },
            { division: "IV", minAggregate: 29, maxAggregate: 32 },
            { division: "U", minAggregate: 33, maxAggregate: 36 },
        ],
        passingMark: 40,
    };

    const currentConfig = settings.gradingConfig || defaultGradingConfig;

    return (
        <div className="space-y-6">
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Grading Scale Presets</h3>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Choose a preset or customize below.
                </p>

                <div className="flex flex-wrap gap-3 mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            handleUpdate({
                                gradingConfig: {
                                    ...currentConfig,
                                    grades: [
                                        { grade: "D1", minScore: 90, maxScore: 100, points: 1 },
                                        { grade: "D2", minScore: 80, maxScore: 89, points: 2 },
                                        { grade: "C3", minScore: 70, maxScore: 79, points: 3 },
                                        { grade: "C4", minScore: 60, maxScore: 69, points: 4 },
                                        { grade: "C5", minScore: 55, maxScore: 59, points: 5 },
                                        { grade: "C6", minScore: 50, maxScore: 54, points: 6 },
                                        { grade: "P7", minScore: 45, maxScore: 49, points: 7 },
                                        { grade: "P8", minScore: 40, maxScore: 44, points: 8 },
                                        { grade: "F9", minScore: 0, maxScore: 39, points: 9 },
                                    ],
                                    divisions: [
                                        { division: "I", minAggregate: 4, maxAggregate: 12 },
                                        { division: "II", minAggregate: 13, maxAggregate: 24 },
                                        { division: "III", minAggregate: 25, maxAggregate: 28 },
                                        { division: "IV", minAggregate: 29, maxAggregate: 32 },
                                        { division: "U", minAggregate: 33, maxAggregate: 36 },
                                    ],
                                    passingMark: 40,
                                }
                            });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                            }`}
                    >
                        UNEB Standard (D1-F9)
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            handleUpdate({
                                gradingConfig: {
                                    ...currentConfig,
                                    grades: [
                                        { grade: "A", minScore: 80, maxScore: 100, points: 1 },
                                        { grade: "B", minScore: 65, maxScore: 79, points: 2 },
                                        { grade: "C", minScore: 50, maxScore: 64, points: 3 },
                                        { grade: "D", minScore: 40, maxScore: 49, points: 4 },
                                        { grade: "F", minScore: 0, maxScore: 39, points: 5 },
                                    ],
                                    divisions: [
                                        { division: "I", minAggregate: 4, maxAggregate: 8 },
                                        { division: "II", minAggregate: 9, maxAggregate: 12 },
                                        { division: "III", minAggregate: 13, maxAggregate: 16 },
                                        { division: "IV", minAggregate: 17, maxAggregate: 20 },
                                        { division: "U", minAggregate: 21, maxAggregate: 25 },
                                    ],
                                    passingMark: 40,
                                }
                            });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                            }`}
                    >
                        Letter Grades (A-F)
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            handleUpdate({
                                gradingConfig: {
                                    ...currentConfig,
                                    grades: [
                                        { grade: "A+", minScore: 90, maxScore: 100, points: 1 },
                                        { grade: "A", minScore: 80, maxScore: 89, points: 2 },
                                        { grade: "B+", minScore: 70, maxScore: 79, points: 3 },
                                        { grade: "B", minScore: 60, maxScore: 69, points: 4 },
                                        { grade: "C+", minScore: 55, maxScore: 59, points: 5 },
                                        { grade: "C", minScore: 50, maxScore: 54, points: 6 },
                                        { grade: "D", minScore: 40, maxScore: 49, points: 7 },
                                        { grade: "F", minScore: 0, maxScore: 39, points: 8 },
                                    ],
                                    divisions: [
                                        { division: "I", minAggregate: 4, maxAggregate: 12 },
                                        { division: "II", minAggregate: 13, maxAggregate: 20 },
                                        { division: "III", minAggregate: 21, maxAggregate: 28 },
                                        { division: "IV", minAggregate: 29, maxAggregate: 32 },
                                        { division: "U", minAggregate: 33, maxAggregate: 40 },
                                    ],
                                    passingMark: 40,
                                }
                            });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                            }`}
                    >
                        Extended Letter (A+ - F)
                    </button>
                </div>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Grade Boundaries</h3>
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
                                <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Grade</th>
                                <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Min %</th>
                                <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Max %</th>
                                <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Points</th>
                                <th className={`px-4 py-2 text-center font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(currentConfig.grades || []).map((grade, idx) => (
                                <tr key={idx} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            className={`w-20 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                            value={grade.grade}
                                            onChange={e => {
                                                const newGrades = [...(currentConfig.grades || [])];
                                                newGrades[idx] = { ...newGrades[idx], grade: e.target.value };
                                                handleUpdate({ gradingConfig: { ...currentConfig, grades: newGrades } });
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            className={`w-20 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                            value={grade.minScore}
                                            onChange={e => {
                                                const newGrades = [...(currentConfig.grades || [])];
                                                newGrades[idx] = { ...newGrades[idx], minScore: Number(e.target.value) };
                                                handleUpdate({ gradingConfig: { ...currentConfig, grades: newGrades } });
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            className={`w-20 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                            value={grade.maxScore}
                                            onChange={e => {
                                                const newGrades = [...(currentConfig.grades || [])];
                                                newGrades[idx] = { ...newGrades[idx], maxScore: Number(e.target.value) };
                                                handleUpdate({ gradingConfig: { ...currentConfig, grades: newGrades } });
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            min="1"
                                            className={`w-20 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                            value={grade.points}
                                            onChange={e => {
                                                const newGrades = [...(currentConfig.grades || [])];
                                                newGrades[idx] = { ...newGrades[idx], points: Number(e.target.value) };
                                                handleUpdate({ gradingConfig: { ...currentConfig, grades: newGrades } });
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newGrades = currentConfig.grades.filter((_, i) => i !== idx) || [];
                                                handleUpdate({ gradingConfig: { ...currentConfig, grades: newGrades } });
                                            }}
                                            className={`p-1.5 rounded hover:bg-red-100 ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600'}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        const newGrades = [...(currentConfig.grades || []), { grade: "NEW", minScore: 0, maxScore: 0, points: 1 }];
                        handleUpdate({ gradingConfig: { ...currentConfig, grades: newGrades } });
                    }}
                    className={`mt-4 px-4 py-2 text-sm font-medium rounded-lg border flex items-center gap-2 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                    <Plus className="w-4 h-4" />
                    Add Grade
                </button>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Division Configuration</h3>
                <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
                                <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Division</th>
                                <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Min Aggregate</th>
                                <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Max Aggregate</th>
                                <th className={`px-4 py-2 text-center font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(currentConfig.divisions || []).map((div, idx) => (
                                <tr key={idx} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            className={`w-20 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                            value={div.division}
                                            onChange={e => {
                                                const newDivisions = [...(currentConfig.divisions || [])];
                                                newDivisions[idx] = { ...newDivisions[idx], division: e.target.value };
                                                handleUpdate({ gradingConfig: { ...currentConfig, divisions: newDivisions } });
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            className={`w-20 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                            value={div.minAggregate}
                                            onChange={e => {
                                                const newDivisions = [...(currentConfig.divisions || [])];
                                                newDivisions[idx] = { ...newDivisions[idx], minAggregate: Number(e.target.value) };
                                                handleUpdate({ gradingConfig: { ...currentConfig, divisions: newDivisions } });
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            className={`w-20 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                            value={div.maxAggregate}
                                            onChange={e => {
                                                const newDivisions = [...(currentConfig.divisions || [])];
                                                newDivisions[idx] = { ...newDivisions[idx], maxAggregate: Number(e.target.value) };
                                                handleUpdate({ gradingConfig: { ...currentConfig, divisions: newDivisions } });
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newDivisions = currentConfig.divisions.filter((_, i) => i !== idx) || [];
                                                handleUpdate({ gradingConfig: { ...currentConfig, divisions: newDivisions } });
                                            }}
                                            className={`p-1.5 rounded hover:bg-red-100 ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600'}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        const newDivisions = [...(currentConfig.divisions || []), { division: "NEW", minAggregate: 0, maxAggregate: 0 }];
                        handleUpdate({ gradingConfig: { ...currentConfig, divisions: newDivisions } });
                    }}
                    className={`mt-4 px-4 py-2 text-sm font-medium rounded-lg border flex items-center gap-2 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                    <Plus className="w-4 h-4" />
                    Add Division
                </button>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Requirements</h3>
                <div className="mt-4 flex items-center gap-4">
                    <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Passing Mark:</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        className={`w-24 px-3 py-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                        value={currentConfig.passingMark || 40}
                        onChange={e => handleUpdate({ gradingConfig: { ...currentConfig, passingMark: Number(e.target.value) } })}
                    />
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>%</span>
                </div>
            </div>
        </div>
    );
};
