import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalOutstanding: number;
  totalDue: number;
  netIncome: number;
  collectionRate: number;
  paymentCount: number;
  expenseCount: number;
}

interface FeePayment {
  id: number;
  feeType: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  term: number;
  year: number;
  status: string;
}

interface Expense {
  id: number;
  amount: number;
  description: string;
  categoryId: number;
  expenseDate: string;
}

interface ExpenseCategory {
  id: number;
  name: string;
  color: string;
}

const COLORS = ['#0052CC', '#00875A', '#FF5630', '#6554C0', '#FF991F', '#36B37E', '#00B8D9'];

export default function Finance() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, paymentsRes, expensesRes, categoriesRes] = await Promise.all([
        fetch('/api/financial-summary', { credentials: 'include' }),
        fetch('/api/fee-payments', { credentials: 'include' }),
        fetch('/api/expenses', { credentials: 'include' }),
        fetch('/api/expense-categories', { credentials: 'include' })
      ]);
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
    } catch (err) {
      console.error('Failed to fetch financial data', err);
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);
  };

  const revenueByFeeType = payments.reduce((acc, p) => {
    const existing = acc.find(x => x.name === p.feeType);
    if (existing) {
      existing.value += p.amountPaid || 0;
    } else {
      acc.push({ name: p.feeType, value: p.amountPaid || 0 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const expensesByCategory = expenses.reduce((acc, e) => {
    const cat = categories.find(c => c.id === e.categoryId);
    const name = cat?.name || 'Uncategorized';
    const existing = acc.find(x => x.name === name);
    if (existing) {
      existing.value += e.amount || 0;
    } else {
      acc.push({ name, value: e.amount || 0, color: cat?.color || '#6B7280' });
    }
    return acc;
  }, [] as { name: string; value: number; color: string }[]);

  const monthlyData = () => {
    const months: { [key: string]: { revenue: number; expenses: number } } = {};
    payments.forEach(p => {
      const key = `${p.year}-${String(p.term).padStart(2, '0')}`;
      if (!months[key]) months[key] = { revenue: 0, expenses: 0 };
      months[key].revenue += p.amountPaid || 0;
    });
    expenses.forEach(e => {
      const date = new Date(e.expenseDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = { revenue: 0, expenses: 0 };
      months[key].expenses += e.amount || 0;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, data]) => ({ name: key, ...data }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Financial Dashboard</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Overview of school finances</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => navigate('/app/finance/record-payment')}>Record Payment</Button>
          <Button variant="outline" onClick={() => navigate('/app/finance/student-fees')}>Individual Fees</Button>
          <Button variant="outline" onClick={() => navigate('/app/fee-structures')}>Fee Structures</Button>
          <Button variant="outline" onClick={() => navigate('/app/expenses')}>Expenses</Button>
          <Button variant="outline" onClick={() => navigate('/app/scholarships')}>Scholarships</Button>
          <Button onClick={() => navigate('/app/financial-reports')}>Reports</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Revenue</p>
              <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(summary?.totalRevenue || 0)}</p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Expenses</p>
              <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(summary?.totalExpenses || 0)}</p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Outstanding</p>
              <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(summary?.totalOutstanding || 0)}</p>
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Collection Rate</p>
              <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{summary?.collectionRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Revenue by Fee Type</h3>
          {revenueByFeeType.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={revenueByFeeType} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {revenueByFeeType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No payment data yet</div>
          )}
        </div>

        <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Expenses by Category</h3>
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={expensesByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                <XAxis dataKey="name" tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }} />
                <YAxis tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#0052CC" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No expense data yet</div>
          )}
        </div>
      </div>

      <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Revenue vs Expenses Trend</h3>
        {monthlyData().length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData()}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
              <XAxis dataKey="name" tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }} />
              <YAxis tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Line type="monotone" dataKey="revenue" stroke="#00875A" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="expenses" stroke="#FF5630" strokeWidth={2} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No trend data yet</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Payments</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/students')}>View All</Button>
          </div>
          <div className="space-y-3">
            {payments.slice(0, 5).map(p => (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.feeType}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Term {p.term}, {p.year}</p>
                </div>
                <div className="text-right">
                  <p className={`font-medium text-green-600`}>{formatCurrency(p.amountPaid)}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'paid' ? 'bg-green-100 text-green-700' :
                      p.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                    }`}>{p.status}</span>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <p className={`text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No payments recorded</p>
            )}
          </div>
        </div>

        <div className={`p-6 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Expenses</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/expenses')}>View All</Button>
          </div>
          <div className="space-y-3">
            {expenses.slice(0, 5).map(e => {
              const cat = categories.find(c => c.id === e.categoryId);
              return (
                <div key={e.id} className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{e.description}</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{cat?.name || 'Uncategorized'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium text-red-600`}>{formatCurrency(e.amount)}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{e.expenseDate}</p>
                  </div>
                </div>
              );
            })}
            {expenses.length === 0 && (
              <p className={`text-center py-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No expenses recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
