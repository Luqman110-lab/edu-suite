import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { SchoolSettings } from '../../types';

interface ReportsSettingsProps {
    settings: SchoolSettings;
    onUpdate: (updates: Partial<SchoolSettings>) => void;
}

export const ReportsSettings: React.FC<ReportsSettingsProps> = ({ settings, onUpdate }) => {
    const { isDark } = useTheme();

    const inputClasses = `mt-1 block w-full rounded-xl border px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none sm:text-sm transition-all duration-200 ${isDark
            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600'
            : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white'
        }`;

    const labelClasses = `block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

    const reportConfig = settings.reportConfig || {
        headteacherName: '',
        headteacherTitle: 'Headteacher',
        showClassTeacherSignature: true,
        showHeadteacherSignature: true,
        showParentSignature: true,
        commentTemplates: []
    };

    return (
        <div className="space-y-6">
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Report Card Configuration</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Configure appearance and signatures.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClasses}>Headteacher Name</label>
                        <input
                            type="text"
                            className={inputClasses}
                            value={reportConfig.headteacherName || ''}
                            onChange={e => onUpdate({
                                reportConfig: { ...reportConfig, headteacherName: e.target.value }
                            })}
                        />
                    </div>
                    <div>
                        <label className={labelClasses}>Headteacher Title</label>
                        <input
                            type="text"
                            className={inputClasses}
                            value={reportConfig.headteacherTitle || 'Headteacher'}
                            onChange={e => onUpdate({
                                reportConfig: { ...reportConfig, headteacherTitle: e.target.value }
                            })}
                        />
                    </div>
                </div>

                <div className="mt-6 space-y-3">
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600 w-5 h-5 focus:ring-primary-500"
                            checked={reportConfig.showClassTeacherSignature ?? true}
                            onChange={e => onUpdate({
                                reportConfig: { ...reportConfig, showClassTeacherSignature: e.target.checked }
                            })}
                        />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Show Class Teacher Signature Line</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600 w-5 h-5 focus:ring-primary-500"
                            checked={reportConfig.showHeadteacherSignature ?? true}
                            onChange={e => onUpdate({
                                reportConfig: { ...reportConfig, showHeadteacherSignature: e.target.checked }
                            })}
                        />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Show Headteacher Signature Line</span>
                    </label>
                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600 w-5 h-5 focus:ring-primary-500"
                            checked={reportConfig.showParentSignature ?? true}
                            onChange={e => onUpdate({
                                reportConfig: { ...reportConfig, showParentSignature: e.target.checked }
                            })}
                        />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Show Parent Signature Line</span>
                    </label>
                </div>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Comment Templates</h3>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Pre-defined comments available for teachers.
                </p>
                <div className="space-y-2">
                    {(reportConfig.commentTemplates || []).length === 0 && (
                        <div className={`text-sm italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No templates configured.</div>
                    )}
                    {(reportConfig.commentTemplates || []).map((comment, idx) => (
                        <div key={idx} className={`flex items-center gap-2 p-3 rounded-lg ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                            <span className={`flex-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{comment}</span>
                        </div>
                    ))}
                    {/* Note: Original code didn't seem to have UI to ADD templates, only VIEW them. Keeping as is unless requested to add capability. */}
                </div>
            </div>
        </div>
    );
};
