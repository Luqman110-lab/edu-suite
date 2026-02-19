import React from 'react';
import { Teacher } from '../../../../types';
import { useTheme } from '../../../../contexts/ThemeContext';
// import { Button } from '../../../../components/Button'; // Assuming usage inside TeacherFormWizard or here?
import { TeacherFormWizard } from '../../../../components/TeacherFormWizard';
import { Icons } from '../../lib/icons';

interface TeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    // The TeacherFormWizard expects setFormData to be Dispatch<SetStateAction<Partial<Teacher>>>
    // We need to type it correctly here.
    formData: Partial<Teacher>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Teacher>>>;
    isEdit: boolean;
    isDark: boolean;
}

export const TeacherModal: React.FC<TeacherModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    formData,
    setFormData,
    isEdit,
    isDark
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
            <div className={`rounded-xl shadow-xl w-full max-w-4xl ${isDark ? 'bg-gray-800' : 'bg-white'} my-8 flex flex-col max-h-[90vh]`}>
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {isEdit ? 'Edit Teacher' : 'Add New Teacher'}
                    </h2>
                    <button onClick={onClose} className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Icons.X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-0 overflow-y-auto flex-1">
                    <TeacherFormWizard
                        formData={formData}
                        setFormData={setFormData}
                        onSubmit={onSubmit}
                        onCancel={onClose}
                        isDark={isDark}
                    />
                </div>
            </div>
        </div>
    );
};
