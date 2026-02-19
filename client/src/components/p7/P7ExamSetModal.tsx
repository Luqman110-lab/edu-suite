import React from 'react';
import { Button } from '../../../../components/Button';
import { X, Check } from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';

interface P7ExamSetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    setName: string;
    setSetName: (val: string) => void;
    setDate: string;
    setSetDate: (val: string) => void;
    setNumber: number;
}

export const P7ExamSetModal: React.FC<P7ExamSetModalProps> = ({
    isOpen,
    onClose,
    onSave,
    setName,
    setSetName,
    setDate,
    setSetDate,
    setNumber
}) => {
    const { isDark } = useTheme();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200`}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Create Exam Set {setNumber}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                            Set Name
                        </label>
                        <input
                            type="text"
                            value={setName}
                            onChange={(e) => setSetName(e.target.value)}
                            placeholder="e.g. Mock Set 1, BOT Exams"
                            className={`block w-full rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2 focus:ring-2 focus:ring-[#7B1113]/30 focus:border-[#7B1113] focus:outline-none`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                            Exam Date (Optional)
                        </label>
                        <input
                            type="date"
                            value={setDate}
                            onChange={(e) => setSetDate(e.target.value)}
                            className={`block w-full rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} px-3 py-2 focus:ring-2 focus:ring-[#7B1113]/30 focus:border-[#7B1113] focus:outline-none`}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={onSave} disabled={!setName.trim()}>
                        <Check className="w-4 h-4 mr-1" />
                        Create Set
                    </Button>
                </div>
            </div>
        </div>
    );
};
