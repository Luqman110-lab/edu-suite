import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, BarChart3, PieChart } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { useAuth } from '../../hooks/use-auth';

type ReportType = 'income-statement' | 'balance-sheet' | 'cash-flow';

export default function FinancialStatements() {
    const { activeSchool } = useAuth();
    const [reportType, setReportType] = useState<ReportType>('income-statement');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // We would typically have separate endpoints for each report type, but for now we'll simulate fetching report data
    const { data: reportData, isLoading } = useQuery({
        queryKey: ['financial-report', reportType, startDate, endDate, activeSchool?.id],
        queryFn: async () => {
            // In a real implementation, this would call specific endpoints like /accounting/income-statement?start=...&end=...
            const res = await apiRequest<any>('GET', `/accounting/reports/${reportType}?startDate=${startDate}&endDate=${endDate}`);
            return res;
        },
        enabled: !!activeSchool?.id,
    });

    if (isLoading) {
        return <div className="p-8 flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
    }

    // Placeholder render for the income statement structure
    const renderIncomeStatement = () => (
        <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-bold text-gray-900">Revenue</h3>
                <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Tuition Fees</span>
                    <span className="font-medium">UGX 150,000,000</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Other Income</span>
                    <span className="font-medium">UGX 5,000,000</span>
                </div>
                <div className="flex justify-between py-3 font-bold text-green-700">
                    <span>Total Revenue</span>
                    <span>UGX 155,000,000</span>
                </div>
            </div>
            <div className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-bold text-gray-900">Expenses</h3>
                <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Salaries & Wages</span>
                    <span className="font-medium">UGX 80,000,000</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Administrative</span>
                    <span className="font-medium">UGX 15,000,000</span>
                </div>
                <div className="flex justify-between py-3 font-bold text-red-700">
                    <span>Total Expenses</span>
                    <span>UGX 95,000,000</span>
                </div>
            </div>
            <div className="flex justify-between py-4 text-xl font-black text-gray-900 bg-gray-50 px-4 rounded-lg">
                <span>Net Income</span>
                <span className="text-primary-600">UGX 60,000,000</span>
            </div>
        </div>
    );

    return (
        <div className="p-8 space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 border-b border-gray-200 pb-2">Financial Statements</h1>
                    <p className="text-gray-500 mt-2">Generate core accounting reports for your institution.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow transition">
                    <Download className="w-4 h-4" /> Export PDF
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Controls Sidemenu */}
                <div className="w-full md:w-64 space-y-6">
                    <div className="bg-white border text-card-foreground shadow-sm rounded-xl">
                        <div className="flex flex-col space-y-1.5 p-6 bg-gray-50/50 rounded-t-xl border-b border-gray-100 pb-4">
                            <h3 className="font-semibold leading-none tracking-wider text-sm text-gray-600 uppercase">Report Type</h3>
                        </div>
                        <div className="p-2 space-y-1">
                            <button
                                onClick={() => setReportType('income-statement')}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${reportType === 'income-statement' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <BarChart3 className="w-4 h-4" /> Income Statement
                            </button>
                            <button
                                onClick={() => setReportType('balance-sheet')}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${reportType === 'balance-sheet' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <PieChart className="w-4 h-4" /> Balance Sheet
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border text-card-foreground shadow-sm rounded-xl">
                        <div className="flex flex-col space-y-1.5 p-6 bg-gray-50/50 rounded-t-xl border-b border-gray-100 pb-4">
                            <h3 className="font-semibold leading-none tracking-wider text-sm text-gray-600 uppercase">Date Range</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                            <button className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition">
                                Run Report
                            </button>
                        </div>
                    </div>
                </div>

                {/* Report Viewer */}
                <div className="flex-1 bg-white border text-card-foreground shadow-md rounded-xl border-t-4 border-t-primary-600">
                    <div className="flex flex-col space-y-1.5 p-6 text-center pb-8 border-b border-gray-100">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
                            {reportType === 'income-statement' ? 'Statement of Comprehensive Income' : 'Statement of Financial Position'}
                        </h2>
                        <p className="text-gray-500 mt-1">For the period {startDate} to {endDate}</p>
                    </div>
                    <div className="p-8">
                        {reportType === 'income-statement' ? renderIncomeStatement() : (
                            <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                                <FileText className="w-12 h-12 mb-3 text-gray-300" />
                                <p>Balance sheet rendering goes here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
