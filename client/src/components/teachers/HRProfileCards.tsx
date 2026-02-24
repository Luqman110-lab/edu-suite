import React, { useState } from 'react';
import { useStaffLeave, useDutyRoster, useTeacherContracts, useTeacherDocuments } from '../../hooks/useHR';
import { Icons } from '../../lib/icons';
import { Button } from '../../../../components/Button';
import { format } from 'date-fns';
import { StaffLeave, DutyRoster } from '../../../../types';

interface HRCardProps {
    teacherId: number;
    isDark: boolean;
}

export const TeacherLeaveCard: React.FC<HRCardProps> = ({ teacherId, isDark }) => {
    const { leaves, isLoading } = useStaffLeave(teacherId);

    if (isLoading) {
        return <div className={`animate-pulse h-32 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />;
    }

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <Icons.Calendar className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Leave History</h3>
                </div>
                <Button variant="outline" size="sm">Request Leave</Button>
            </div>
            <div className="p-4">
                {leaves.length === 0 ? (
                    <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No leave requests found.</p>
                ) : (
                    <div className="space-y-3">
                        {leaves.slice(0, 5).map(leave => (
                            <div key={leave.id} className={`p-3 rounded-lg border ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'} flex justify-between items-center`}>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">{leave.leaveType} Leave</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${leave.status === 'Approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            leave.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}>
                                            {leave.status}
                                        </span>
                                    </div>
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {format(new Date(leave.startDate), 'MMM d, yyyy')} - {format(new Date(leave.endDate), 'MMM d, yyyy')}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export const TeacherDutyCard: React.FC<HRCardProps> = ({ teacherId, isDark }) => {
    const { duties, isLoading } = useDutyRoster(teacherId);

    if (isLoading) {
        return <div className={`animate-pulse h-32 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />;
    }

    // Find active or upcoming duties
    const now = new Date();
    const activeDuties = duties.filter(d => new Date(d.endDate) >= now);
    const pastDuties = duties.filter(d => new Date(d.endDate) < now).slice(0, 3);

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <Icons.Shield className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                    <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Duty Roster</h3>
                </div>
            </div>
            <div className="p-4">
                {activeDuties.length > 0 && (
                    <div className="mb-4">
                        <h4 className={`text-xs font-semibold uppercase mb-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Current / Upcoming</h4>
                        <div className="space-y-2">
                            {activeDuties.map(duty => (
                                <div key={duty.id} className={`p-3 rounded-lg border-l-4 ${isDark ? 'bg-gray-750 border-gray-700 border-l-indigo-500' : 'bg-gray-50 border-gray-200 border-l-indigo-500'}`}>
                                    <p className="font-medium text-sm">{duty.dutyType}</p>
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                                        {format(new Date(duty.startDate), 'MMM d, h:mm a')} - {format(new Date(duty.endDate), 'MMM d, h:mm a')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {pastDuties.length > 0 && (
                    <div>
                        <h4 className={`text-xs font-semibold uppercase mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Recent Past Duties</h4>
                        <div className="space-y-2 opacity-70">
                            {pastDuties.map(duty => (
                                <div key={duty.id} className={`p-2 rounded border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium">{duty.dutyType}</span>
                                        <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{format(new Date(duty.startDate), 'MMM d')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {duties.length === 0 && (
                    <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No assigned duties.</p>
                )}
            </div>
        </div>
    );
};

export const TeacherContractCard: React.FC<HRCardProps> = ({ teacherId, isDark }) => {
    const { contracts, isLoading } = useTeacherContracts(teacherId);

    if (isLoading) {
        return <div className={`animate-pulse h-32 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />;
    }

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <Icons.Briefcase className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Contracts & Employment</h3>
                </div>
                <Button variant="outline" size="sm">Add Contract</Button>
            </div>
            <div className="p-4">
                {contracts.length === 0 ? (
                    <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No contracts on record.</p>
                ) : (
                    <div className="space-y-3">
                        {contracts.map(contract => (
                            <div key={contract.id} className={`p-3 rounded-lg border ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'} flex flex-col gap-2`}>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-sm">{contract.contractType}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${contract.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            contract.status === 'Terminated' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                        {contract.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Start Date:</span>
                                        <span className={`ml-1 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{format(new Date(contract.startDate), 'MMM d, yyyy')}</span>
                                    </div>
                                    <div>
                                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>End Date:</span>
                                        <span className={`ml-1 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{contract.endDate ? format(new Date(contract.endDate), 'MMM d, yyyy') : 'Indefinite'}</span>
                                    </div>
                                    {contract.baseSalary && (
                                        <div className="col-span-2 mt-1">
                                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Base Salary:</span>
                                            <span className={`ml-1 font-mono font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{contract.baseSalary.toLocaleString()} UGX</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export const TeacherDocumentCard: React.FC<HRCardProps> = ({ teacherId, isDark }) => {
    const { documents, isLoading } = useTeacherDocuments(teacherId);

    if (isLoading) {
        return <div className={`animate-pulse h-32 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />;
    }

    return (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <Icons.FileCheck className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
                    <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Compliance Documents</h3>
                </div>
                <Button variant="outline" size="sm">Upload Document</Button>
            </div>
            <div className="p-4">
                {documents.length === 0 ? (
                    <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No documents uploaded.</p>
                ) : (
                    <div className="space-y-2">
                        {documents.map(doc => (
                            <div key={doc.id} className={`p-2.5 rounded border flex justify-between items-center ${isDark ? 'bg-gray-750 border-gray-700 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'} transition-colors cursor-pointer`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-full ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                                        <Icons.FileText className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium leading-tight">{doc.title}</p>
                                        <p className={`text-[10px] uppercase font-semibold mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{doc.documentType}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); window.open(doc.fileUrl, '_blank'); }}>
                                    <Icons.ExternalLink className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
