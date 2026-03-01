import React, { useState } from 'react';
import { useSickbayVisits, useRecordVisit, useUpdateVisitStatus } from '../../hooks/useSickbay';
import { useAuth } from '../../../../hooks/use-auth';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useStudents } from '../../hooks/useStudents';

export const PatientRecords = () => {
    const { isDark } = useTheme();
    const { activeSchool } = useAuth();
    const { data: visits = [], isLoading: loadingVisits } = useSickbayVisits(100);
    const { students = [] } = useStudents(activeSchool?.id?.toString());

    // In a real implementation this would fetch all medical records, but for a 
    // concise demonstration we'll just show the visit history list.
    const [searchTerm, setSearchTerm] = useState('');

    const filteredVisits = visits.filter(v =>
        (v.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
        (v.visit.symptoms.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loadingVisits) {
        return <div className="p-6">Loading records...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Patient Records</h2>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>View and manage visit history</p>
                </div>
                <button className="px-4 py-2 bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white rounded-lg font-medium shadow-md hover:opacity-90">
                    + New Admission
                </button>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                <div className="mb-4">
                    <input
                        type="search"
                        placeholder="Search by patient name or symptom..."
                        className={`w-full md:w-96 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'} px-4 py-2 focus:ring-2 focus:ring-[#7B1113]/30 focus:border-[#7B1113] outline-none`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className={`text-xs uppercase bg-gray-50/50 dark:bg-gray-800/50 ${isDark ? 'text-gray-400' : 'text-gray-500'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            <tr>
                                <th className="px-6 py-3 font-medium">Date</th>
                                <th className="px-6 py-3 font-medium">Patient</th>
                                <th className="px-6 py-3 font-medium">Symptoms</th>
                                <th className="px-6 py-3 font-medium">Diagnosis & Treatment</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredVisits.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No visit records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredVisits.map((record) => (
                                    <tr key={record.visit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                                            {new Date(record.visit.visitDate).toLocaleDateString()}
                                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {new Date(record.visit.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{record.studentName || 'Staff Member'}</div>
                                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>ID: {record.studentAdmissionNumber || 'N/A'}</div>
                                        </td>
                                        <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {record.visit.symptoms}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{record.visit.diagnosis || '-'}</div>
                                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mt-1`}>{record.visit.treatmentGiven || record.visit.medicationPrescribed || 'No treatment recorded'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${record.visit.status === 'Admitted' ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' :
                                                record.visit.status === 'Referred to Hospital' ? 'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20' :
                                                    'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                                }`}>
                                                {record.visit.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button className={`text-sm font-medium ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-[#7B1113] hover:text-[#1E3A5F]'}`}>
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
