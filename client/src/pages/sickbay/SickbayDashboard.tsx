import React, { useState } from 'react';
import { useSickbayVisits, useSickbayInventory } from '../../hooks/useSickbay';
import { useAuth } from '../../../../hooks/use-auth';
import { useTheme } from '../../../../contexts/ThemeContext';

// ============ ICONS ============
const Icons = {
    Activity: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
    ),
    AlertTriangle: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
    ),
    Users: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
    Box: ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
    )
};

export const SickbayDashboard = () => {
    const { isDark } = useTheme();
    const { activeSchool } = useAuth();
    const { data: visits = [], isLoading: loadingVisits } = useSickbayVisits(100);
    const { data: inventory = [], isLoading: loadingInventory } = useSickbayInventory();

    const activeAdmissions = visits.filter(v => v.visit.status === 'Admitted');
    const recentDischarges = visits.filter(v => v.visit.status !== 'Admitted').slice(0, 5);
    const lowStockItems = inventory.filter(item => item.quantityInStock <= (item.lowStockThreshold || 10));

    if (loadingVisits || loadingInventory) {
        return (
            <div className={`p-6 flex justify-center items-center h-64 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <Icons.Activity className="w-8 h-8 animate-pulse text-[#7B1113] mr-3" />
                <span>Loading sickbay data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Sickbay Overview</h2>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Monitor active admissions and health center status</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Currently Admitted</h3>
                        <div className="p-2 border border-blue-500/20 bg-blue-500/10 text-blue-500 rounded-lg">
                            <Icons.Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-500">{activeAdmissions.length}</div>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Patients requiring attention</p>
                </div>

                <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Total Visits Today</h3>
                        <div className="p-2 border border-green-500/20 bg-green-500/10 text-green-500 rounded-lg">
                            <Icons.Activity className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-green-500">
                        {visits.filter(v => new Date(v.visit.visitDate).toDateString() === new Date().toDateString()).length}
                    </div>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>New cases recorded today</p>
                </div>

                <div className={`p-6 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Low Stock Alerts</h3>
                        <div className="p-2 border border-red-500/20 bg-red-500/10 text-red-500 rounded-lg">
                            <Icons.AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-red-500">{lowStockItems.length}</div>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Items below threshold</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Admissions */}
                <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden shadow-sm`}>
                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} bg-gradient-to-r from-blue-500/10 to-transparent flex justify-between items-center`}>
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                            <Icons.Activity className="w-5 h-5 text-blue-500" />
                            Active Admissions
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {activeAdmissions.length === 0 ? (
                            <div className={`p-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                No patients currently admitted.
                            </div>
                        ) : (
                            activeAdmissions.map((record) => (
                                <div key={record.visit.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                    <div>
                                        <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>{record.studentName || 'Staff Member'}</div>
                                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
                                            {record.studentAdmissionNumber ? `ID: ${record.studentAdmissionNumber}` : 'Staff'} • Admitted: {new Date(record.visit.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-sm mt-1 text-red-500/90 font-medium">
                                            Symptoms: {record.visit.symptoms}
                                        </div>
                                    </div>
                                    <button className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                        Update / Discharge
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Left Column Stack */}
                <div className="space-y-6">
                    {/* Low Stock Alerts */}
                    <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden shadow-sm`}>
                        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} bg-gradient-to-r from-red-500/10 to-transparent flex justify-between items-center`}>
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                                <Icons.Box className="w-5 h-5 text-red-500" />
                                Inventory Alerts
                            </h3>
                            <span className="text-xs font-medium text-red-500 bg-red-500/10 px-2 py-1 rounded-full">{lowStockItems.length} Items</span>
                        </div>
                        <div className="p-4">
                            {lowStockItems.length === 0 ? (
                                <p className={`text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Inventory levels are stable.</p>
                            ) : (
                                <div className="space-y-3">
                                    {lowStockItems.slice(0, 4).map(item => (
                                        <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${isDark ? 'border-red-900/50 bg-red-900/10' : 'border-red-100 bg-red-50'}`}>
                                            <div>
                                                <div className={`font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>{item.itemName}</div>
                                                <div className={`text-xs ${isDark ? 'text-red-500/70' : 'text-red-600/70'}`}>Threshold: {item.lowStockThreshold}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-red-500">{item.quantityInStock}</div>
                                                <div className={`text-xs ${isDark ? 'text-red-500/70' : 'text-red-600/70'}`}>{item.unitOfMeasure}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {lowStockItems.length > 4 && (
                                        <button className={`w-full py-2 text-sm font-medium ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                                            View All Alerts ({lowStockItems.length})
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Activities/Discharges */}
                    <div className={`rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden shadow-sm`}>
                        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} bg-gradient-to-r from-gray-500/10 to-transparent flex justify-between items-center`}>
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                                <Icons.Activity className="w-5 h-5 text-gray-500" />
                                Recent Discharges
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {recentDischarges.length === 0 ? (
                                <div className={`p-6 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    No recent discharges.
                                </div>
                            ) : (
                                recentDischarges.map(record => (
                                    <div key={record.visit.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <div className={`font-medium text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{record.studentName || 'Staff Member'}</div>
                                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                {record.visit.diagnosis || record.visit.symptoms}
                                            </div>
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded-md font-medium ${record.visit.status === 'Referred to Hospital' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                            record.visit.status === 'Sent Home' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                            }`}>
                                            {record.visit.status}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
