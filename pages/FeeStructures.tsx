import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/Button';
import { useToast } from '@/hooks/use-toast';

interface FeeStructure {
  id: number;
  classLevel: string;
  feeType: string;
  amount: number;
  term: number | null;
  year: number;
  boardingStatus: string | null;
  description: string | null;
  isActive: boolean;
}

const FEE_TYPES = ['Tuition', 'Boarding', 'Transport', 'Uniform', 'Books', 'Exam', 'Development', 'Other'];
const CLASSES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];

export default function FeeStructures() {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterClass, setFilterClass] = useState('');
  const [generating, setGenerating] = useState(false);
  const [processingGen, setProcessingGen] = useState(false);
  const [genTerm, setGenTerm] = useState(1);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [genDueDate, setGenDueDate] = useState('');

  const handleGenerateInvoices = () => {
    setGenerating(true);
  };

  const confirmGenerate = async () => {
    setProcessingGen(true);
    try {
      const res = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          term: genTerm,
          year: genYear,
          dueDate: genDueDate || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Success', description: data.message });
        setGenerating(false);
      } else {
        toast({ title: 'Failed', description: data.message, variant: 'destructive' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Network Error', description: 'Could not connect to server.', variant: 'destructive' });
    }
    setProcessingGen(false);
  };

  const [form, setForm] = useState({
    classLevel: 'P1',
    feeType: 'Tuition',
    amount: 0,
    term: '',
    year: new Date().getFullYear(),
    boardingStatus: '',
    description: ''
  });

  useEffect(() => {
    fetchStructures();
  }, []);

  const fetchStructures = async () => {
    try {
      const res = await fetch('/api/fee-structures', { credentials: 'include' });
      if (res.ok) setStructures(await res.json());
    } catch (err) {
      console.error('Failed to fetch fee structures', err);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.classLevel || !form.feeType || !form.amount || !form.year) {
      setError('Class, fee type, amount and year are required');
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/fee-structures/${editingId}` : '/api/fee-structures';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          term: form.term ? parseInt(form.term) : null,
          boardingStatus: form.boardingStatus || null
        })
      });
      if (res.ok) {
        await fetchStructures();
        closeModal();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to save');
      }
    } catch (err) {
      setError('Network error');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this fee structure?')) return;
    try {
      await fetch(`/api/fee-structures/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchStructures();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const openEdit = (s: FeeStructure) => {
    setEditingId(s.id);
    setForm({
      classLevel: s.classLevel,
      feeType: s.feeType,
      amount: s.amount,
      term: s.term?.toString() || '',
      year: s.year,
      boardingStatus: s.boardingStatus || '',
      description: s.description || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setError(null);
    setForm({ classLevel: 'P1', feeType: 'Tuition', amount: 0, term: '', year: new Date().getFullYear(), boardingStatus: '', description: '' });
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);

  const filtered = structures.filter(s => {
    if (filterYear && s.year !== filterYear) return false;
    if (filterClass && s.classLevel !== filterClass) return false;
    return true;
  });

  const groupedByClass = CLASSES.reduce((acc, cls) => {
    acc[cls] = filtered.filter(s => s.classLevel === cls);
    return acc;
  }, {} as Record<string, FeeStructure[]>);

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
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fee Structures</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Define fees per class, term, and year</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerateInvoices} disabled={generating}>
            {generating ? 'Processing...' : 'Generate Invoices'}
          </Button>
          <Button onClick={() => setShowModal(true)}>Add Fee Structure</Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Year</label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
          >
            <option value="">All Classes</option>
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {CLASSES.map(cls => {
          const classStructures = groupedByClass[cls];
          if (filterClass && filterClass !== cls) return null;
          const total = classStructures.reduce((sum, s) => sum + s.amount, 0);

          return (
            <div key={cls} className={`rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{cls}</h3>
                  <span className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    Total: {formatCurrency(total)}
                  </span>
                </div>
              </div>
              {classStructures.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className={isDark ? 'bg-gray-700/30' : 'bg-gray-50'}>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Fee Type</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Amount</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Term</th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Boarding</th>
                      <th className={`px-6 py-3 text-right text-xs font-medium uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {classStructures.map(s => (
                      <tr key={s.id}>
                        <td className={`px-6 py-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{s.feeType}</td>
                        <td className={`px-6 py-4 font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>{formatCurrency(s.amount)}</td>
                        <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{s.term ? `Term ${s.term}` : 'All Terms'}</td>
                        <td className={`px-6 py-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{s.boardingStatus || 'All'}</td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(s.id)}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No fee structures defined for {cls}</p>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-xl w-full max-w-md mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingId ? 'Edit Fee Structure' : 'Add Fee Structure'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Class</label>
                  <select
                    value={form.classLevel}
                    onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Fee Type</label>
                  <select
                    value={form.feeType}
                    onChange={(e) => setForm({ ...form, feeType: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    {FEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Amount (UGX)</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Year</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) || new Date().getFullYear() })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Term (optional)</label>
                  <select
                    value={form.term}
                    onChange={(e) => setForm({ ...form, term: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">All Terms</option>
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Boarding Status</label>
                  <select
                    value={form.boardingStatus}
                    onChange={(e) => setForm({ ...form, boardingStatus: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">All Students</option>
                    <option value="boarding">Boarding Only</option>
                    <option value="day">Day Only</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
            </div>
            {error && (
              <div className="px-6 pb-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}
      {/* Add Generate Modal */}
      {generating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-xl w-full max-w-sm mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Generate Invoices
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                This will create invoices for all active students based on the fee structures defined for the selected Term/Year.
              </p>
              <div>
                <label className="block text-sm font-medium mb-1">Term</label>
                <select
                  className="w-full p-2 rounded border bg-background"
                  value={genTerm}
                  onChange={e => setGenTerm(parseInt(e.target.value))}
                >
                  <option value={1}>Term 1</option>
                  <option value={2}>Term 2</option>
                  <option value={3}>Term 3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <input
                  type="number"
                  className="w-full p-2 rounded border bg-background"
                  value={genYear}
                  onChange={e => setGenYear(parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  className="w-full p-2 rounded border bg-background"
                  value={genDueDate}
                  onChange={e => setGenDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <Button variant="outline" onClick={() => setGenerating(false)}>Cancel</Button>
              <Button onClick={confirmGenerate} disabled={processingGen}>
                {processingGen ? 'Generating...' : 'Confirm Generation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
