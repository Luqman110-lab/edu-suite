import React, { useState } from 'react';
import { SchoolSettings } from '../../../../types';
import { Button } from '../../../../components/Button';
import { useClassNames } from '../../../../hooks/use-class-names';
import { useTheme } from '../../../../contexts/ThemeContext';

interface PromotionSummary {
    [key: string]: { count: number; targetClass: string };
}

interface PromoteStudentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPromote: (targetStream: string) => Promise<void>;
    promotionSummary: PromotionSummary;
    selectedCount: number;
    settings: SchoolSettings | null;
    isPromoting: boolean;
}

export const PromoteStudentsModal: React.FC<PromoteStudentsModalProps> = ({
    isOpen,
    onClose,
    onPromote,
    promotionSummary,
    selectedCount,
    settings,
    isPromoting
}) => {
    const { isDark } = useTheme();
    const { getDisplayName } = useClassNames();
    const [targetStream, setTargetStream] = useState<string>('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className={`rounded-lg shadow-xl max-w-lg w-full p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Batch Promotion</h2>

                <div className={`mb-4 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Promotion Summary</h3>
                    <div className="space-y-2">
                        {Object.entries(promotionSummary).map(([fromClass, info]) => (
                            <div key={fromClass} className={`flex items-center justify-between p-2 rounded ${isDark ? 'bg-gray-600' : 'bg-white'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                                        {getDisplayName(fromClass)}
                                    </span>
                                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>→</span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${info.targetClass === 'Graduated' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'}`}>
                                        {info.targetClass === 'Graduated' ? 'Graduated' : getDisplayName(info.targetClass)}
                                    </span>
                                </div>
                                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    {info.count} student{info.count > 1 ? 's' : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Assign Stream (Optional)
                    </label>
                    <select
                        value={targetStream}
                        onChange={(e) => setTargetStream(e.target.value)}
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                        <option value="">Keep existing stream</option>
                        {settings?.streams && Object.entries(settings.streams).map(([cls, streams]) => (
                            <optgroup key={cls} label={cls}>
                                {(streams as string[]).map((stream: string) => (
                                    <option key={`${cls}-${stream}`} value={stream}>{stream}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        If selected, all promoted students will be assigned to this stream
                    </p>
                </div>

                <div className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-yellow-900/30 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
                        <strong>Note:</strong> P7 students will be marked as "Graduated" and will no longer appear in regular class lists.
                        Their academic history will be preserved.
                    </p>
                </div>

                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setTargetStream('');
                            onClose();
                        }}
                        disabled={isPromoting}
                    >
                        Cancel
                    </Button>
                    <Button onClick={() => onPromote(targetStream)} disabled={isPromoting}>
                        {isPromoting ? 'Promoting...' : `Promote ${selectedCount} Student${selectedCount > 1 ? 's' : ''}`}
                    </Button>
                </div>
            </div>
        </div>
    );
};
