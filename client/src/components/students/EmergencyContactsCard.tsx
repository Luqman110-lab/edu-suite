import React from 'react';
import { Student } from '../../../../types';
import { useTheme } from '../../../../contexts/ThemeContext';

interface EmergencyContactsCardProps {
    student: Student;
}

export const EmergencyContactsCard: React.FC<EmergencyContactsCardProps> = ({ student }) => {
    const { isDark } = useTheme();

    return (
        <div className={`rounded-lg shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`px-6 py-4 border-b flex items-center gap-2 ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-amber-50 border-amber-100'}`}>
                <span className="text-lg">🚨</span>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-amber-800'}`}>Emergency Contacts</h3>
            </div>
            <div className="p-6">
                {student.emergencyContacts && student.emergencyContacts.length > 0 ? (
                    <div className="space-y-4">
                        {student.emergencyContacts.map((contact, idx) => (
                            <div key={idx} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{contact.name}</p>
                                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{contact.relationship}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded ${idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'}`}>
                                        {idx === 0 ? 'Primary' : `#${idx + 1}`}
                                    </span>
                                </div>
                                <div className={`mt-2 flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <span>📞</span>
                                    <span className="font-mono">{contact.phone}</span>
                                </div>
                                {contact.address && (
                                    <div className={`mt-1 flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        <span>📍</span>
                                        <span>{contact.address}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className={`text-sm italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No emergency contacts on file</p>
                )}
            </div>
        </div>
    );
};
