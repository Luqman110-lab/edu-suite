import React from 'react';
import { useMedicalRecords, usePatientVisits } from '../../hooks/useSickbay';
import { useTheme } from '../../../../contexts/ThemeContext';

export const MedicalHistoryCard = ({ patientId, type }: { patientId: number, type: 'student' | 'staff' }) => {
    const { isDark } = useTheme();
    const { data: record, isLoading: loadingRecord } = useMedicalRecords(patientId, type);
    const { data: visits = [], isLoading: loadingVisits } = usePatientVisits(patientId, type);

    if (loadingRecord || loadingVisits) {
        return (
            <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm animate-pulse`}>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
        );
    }

    return (
        <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden shadow-sm`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} bg-gradient-to-r from-[#7B1113]/10 to-transparent flex justify-between items-center`}>
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#7B1113]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                    Medical History Overview
                </h3>
            </div>

            <div className="p-6">
                {/* Core Medical Info */}
                {record ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className={`p-3 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Blood Group</div>
                            <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{record.bloodGroup || 'Not Specified'}</div>
                        </div>
                        <div className={`p-3 rounded-lg border flex flex-col justify-center ${isDark ? 'border-red-900/30 bg-red-900/10' : 'border-red-100 bg-red-50'}`}>
                            <div className={`text-xs ${isDark ? 'text-red-400' : 'text-red-500'} mb-1`}>Allergies</div>
                            <div className={`font-medium text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>{record.allergies || 'None Known'}</div>
                        </div>
                        <div className={`col-span-2 p-3 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Conditions / Notes</div>
                            <div className={`font-medium text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{record.preExistingConditions || record.notes || 'N/A'}</div>
                        </div>
                    </div>
                ) : (
                    <div className={`p-4 mb-6 text-sm rounded-lg text-center ${isDark ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                        No primary medical record created.
                    </div>
                )}

                {/* Recent Visits */}
                <div>
                    <h4 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Recent Visits ({visits.length})</h4>
                    <div className="space-y-3">
                        {visits.length === 0 ? (
                            <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No sickbay visits recorded.</div>
                        ) : (
                            visits.slice(0, 3).map((v) => (
                                <div key={v.visit.id} className={`flex items-start justify-between p-3 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'}`}>
                                    <div>
                                        <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{v.visit.diagnosis || v.visit.symptoms}</div>
                                        <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {new Date(v.visit.visitDate).toLocaleDateString()} • {v.visit.treatmentGiven || 'Consultation only'}
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wide rounded ${v.visit.status === 'Admitted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                        v.visit.status === 'Referred to Hospital' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        }`}>
                                        {v.visit.status}
                                    </span>
                                </div>
                            ))
                        )}
                        {visits.length > 3 && (
                            <div className="text-center mt-2">
                                <button className={`text-xs font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'} hover:underline`}>
                                    View full history
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
