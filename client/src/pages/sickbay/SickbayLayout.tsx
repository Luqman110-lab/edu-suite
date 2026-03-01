import React, { useState } from 'react';
import { SickbayDashboard } from './SickbayDashboard';
import { PatientRecords } from './PatientRecords';
import { MedicalInventory } from './MedicalInventory';
import { useTheme } from '../../../../contexts/ThemeContext';

export const SickbayLayout = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'inventory'>('dashboard');
    const { isDark } = useTheme();

    return (
        <div className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50">
            <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">

                {/* Header & Navigation */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Sickbay & Health</h1>
                        <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage student health records and medical supplies.</p>
                    </div>

                    <div className={`inline-flex rounded-xl p-1 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard'
                                ? 'bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white shadow-sm'
                                : isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-600 hover:bg-white hover:text-gray-900'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('patients')}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'patients'
                                ? 'bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white shadow-sm'
                                : isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-600 hover:bg-white hover:text-gray-900'
                                }`}
                        >
                            Patient Records
                        </button>
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'inventory'
                                ? 'bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white shadow-sm'
                                : isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-600 hover:bg-white hover:text-gray-900'
                                }`}
                        >
                            Inventory
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="mt-6">
                    {activeTab === 'dashboard' && <SickbayDashboard />}
                    {activeTab === 'patients' && <PatientRecords />}
                    {activeTab === 'inventory' && <MedicalInventory />}
                </div>

            </div>
        </div>
    );
};
