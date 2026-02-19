import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/Button';
import { SchoolSettings, Student, FeeStructure, FeePayment } from '../types';
import {
  Expense,
  ExpenseCategory,
  ReportType,
  FinancialReportFilters,
  ReportConfig
} from '../client/src/types/finance';
import { ReportSelector } from '../client/src/components/finance/ReportSelector';
import { ReportFilters } from '../client/src/components/finance/ReportFilters';
import * as financialService from '../client/src/services/financialReportsService';

export default function FinancialReports() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Data State
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Filter State
  const [selectedReport, setSelectedReport] = useState<ReportType>('fee-collection');
  const [filters, setFilters] = useState<FinancialReportFilters>({
    term: 1,
    year: new Date().getFullYear(),
    classLevel: 'All',
    dateFrom: '',
    dateTo: '',
    paymentId: null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, studentsRes, paymentsRes, expensesRes, categoriesRes, structuresRes] = await Promise.all([
        fetch('/api/settings', { credentials: 'include' }),
        fetch('/api/students', { credentials: 'include' }),
        fetch('/api/fee-payments?limit=200', { credentials: 'include' }),
        fetch('/api/expenses?limit=200', { credentials: 'include' }),
        fetch('/api/expense-categories', { credentials: 'include' }),
        fetch('/api/fee-structures', { credentials: 'include' })
      ]);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettings(s);
        setFilters(prev => ({
          ...prev,
          term: s.currentTerm || 1,
          year: s.currentYear || new Date().getFullYear()
        }));
      }
      if (studentsRes.ok) setStudents(await studentsRes.json());
      if (paymentsRes.ok) {
        const result = await paymentsRes.json();
        setPayments(result.data || []);
      }
      if (expensesRes.ok) {
        const result = await expensesRes.json();
        setExpenses(result.data || []);
      }
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (structuresRes.ok) setFeeStructures(await structuresRes.json());
    } catch (err) {
      console.error('Failed to fetch data', err);
      setFetchError('Failed to load report data. Please try again.');
    }
    setLoading(false);
  };

  const getReportConfig = (): ReportConfig => ({
    schoolName: settings?.schoolName || 'School Name',
    addressBox: settings?.addressBox,
    contactPhones: settings?.contactPhones
  });

  const handleGenerateReport = () => {
    setGenerating(true);
    const config = getReportConfig();

    try {
      switch (selectedReport) {
        case 'fee-collection':
          financialService.generateFeeCollectionReport(
            payments, students, config, filters.term, filters.year, filters.classLevel
          );
          break;
        case 'expense':
          financialService.generateExpenseReport(
            expenses, categories, config, filters.dateFrom, filters.dateTo
          );
          break;
        case 'income-statement':
          financialService.generateIncomeStatement(
            payments, expenses, categories, config, filters.term, filters.year
          );
          break;
        case 'outstanding':
          financialService.generateOutstandingFeesReport(
            payments, students, config, filters.term, filters.year, filters.classLevel
          );
          break;
        case 'student-balances':
          financialService.generateStudentBalancesReport(
            payments, students, config, filters.term, filters.year, filters.classLevel
          );
          break;
        case 'receipt':
          if (filters.paymentId) {
            const payment = payments.find(p => p.id === filters.paymentId);
            if (payment) {
              financialService.generatePaymentReceipt(payment, students, config);
            }
          }
          break;
      }
    } catch (err) {
      console.error('Failed to generate report', err);
      alert('Failed to generate report');
    }
    setGenerating(false);
  };

  const handleExportExcel = () => {
    try {
      switch (selectedReport) {
        case 'fee-collection':
          financialService.exportFeeCollectionExcel(
            payments, students, filters.term, filters.year, filters.classLevel
          );
          break;
        case 'expense':
          financialService.exportExpenseExcel(
            expenses, categories, filters.dateFrom, filters.dateTo
          );
          break;
        case 'income-statement':
          financialService.exportIncomeStatementExcel(
            payments, expenses, categories, filters.term, filters.year
          );
          break;
        case 'outstanding':
          financialService.exportOutstandingFeesExcel(
            payments, students, filters.term, filters.year, filters.classLevel
          );
          break;
        case 'student-balances':
          financialService.exportStudentBalancesExcel(
            payments, students, filters.term, filters.year, filters.classLevel
          );
          break;
        default:
          alert('Excel export not available for this report type');
      }
    } catch (err) {
      console.error('Failed to export to Excel', err);
      alert('Failed to export to Excel');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isDark ? 'text-white' : ''}`}>
      {fetchError && (
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {fetchError}
          <button onClick={() => { setFetchError(null); setLoading(true); fetchData(); }} className="ml-3 underline text-sm">Retry</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Financial Reports</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Generate and download financial reports</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/app/finance')}>
          Back to Finance
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ReportSelector
          selectedReport={selectedReport}
          onSelect={setSelectedReport}
        />

        <ReportFilters
          selectedReport={selectedReport}
          filters={filters}
          onFilterChange={setFilters}
          payments={payments}
          students={students}
          generating={generating}
          onGenerate={handleGenerateReport}
          onExportExcel={handleExportExcel}
        />
      </div>
    </div>
  );
}
