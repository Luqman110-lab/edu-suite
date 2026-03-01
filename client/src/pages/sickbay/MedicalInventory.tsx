import React, { useState } from 'react';
import { useSickbayInventory, useAddInventoryItem } from '../../hooks/useSickbay';
import { useAuth } from '../../../../hooks/use-auth';
import { useTheme } from '../../../../contexts/ThemeContext';

export const MedicalInventory = () => {
    const { isDark } = useTheme();
    const { activeSchool } = useAuth();
    const { data: inventory = [], isLoading } = useSickbayInventory();

    const [searchTerm, setSearchTerm] = useState('');

    const filteredInventory = inventory.filter(item =>
        item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <div className="p-6">Loading inventory...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Medical Inventory</h2>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage drugs, supplies, and equipment</p>
                </div>
                <div className="flex gap-3">
                    <button className={`px-4 py-2 font-medium rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                        Log Transaction
                    </button>
                    <button className="px-4 py-2 bg-gradient-to-r from-[#7B1113] to-[#1E3A5F] text-white rounded-lg font-medium shadow-md hover:opacity-90">
                        + Add Item
                    </button>
                </div>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <input
                        type="search"
                        placeholder="Search items..."
                        className={`flex-1 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'} px-4 py-2 focus:ring-2 focus:ring-[#7B1113]/30 focus:border-[#7B1113] outline-none`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select className={`rounded-lg border ${isDark ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-900'} px-4 py-2 outline-none`}>
                        <option value="">All Categories</option>
                        <option value="drug">Drugs/Medication</option>
                        <option value="supply">Consumable Supplies</option>
                        <option value="equipment">Equipment</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredInventory.length === 0 ? (
                        <div className={`col-span-full p-8 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            No inventory items found. Add your first item.
                        </div>
                    ) : (
                        filteredInventory.map((item) => {
                            const isLow = item.quantityInStock <= (item.lowStockThreshold || 10);
                            return (
                                <div key={item.id} className={`p-5 rounded-xl border flex flex-col justify-between ${isLow
                                    ? (isDark ? 'bg-red-900/10 border-red-900/50' : 'bg-red-50 border-red-100')
                                    : (isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300')
                                    } transition-colors shadow-sm`}>
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.itemName}</h3>
                                            <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                                {item.category}
                                            </span>
                                        </div>
                                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-4 flex items-center gap-1`}>
                                            Exp: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between mt-auto">
                                        <div>
                                            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'} mb-0.5`}>In Stock</div>
                                            <div className={`text-3xl font-bold ${isLow ? 'text-red-500' : isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                {item.quantityInStock}
                                                <span className={`text-sm font-normal ml-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{item.unitOfMeasure}</span>
                                            </div>
                                        </div>
                                        <button className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} transition-colors`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                        </button>
                                    </div>
                                    {isLow && (
                                        <div className="mt-3 text-xs font-medium text-red-500 bg-red-500/10 px-2 py-1.5 rounded text-center">
                                            Low Stock Alert (Threshold: {item.lowStockThreshold})
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
