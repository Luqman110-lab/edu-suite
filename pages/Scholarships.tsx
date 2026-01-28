import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/Button';

interface Scholarship {
  id: number;
  name: string;
  discountType: string;
  discountValue: number;
  feeTypes: string[];
  description: string | null;
  eligibilityCriteria: string | null;
  maxBeneficiaries: number | null;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
}

interface StudentScholarship {
  id: number;
  studentId: number;
  scholarshipId: number;
  term: number | null;
  year: number;
  status: string;
}

interface Student {
  id: number;
  name: string;
  classLevel: string;
  stream: string;
}

const FEE_TYPES = ['Tuition', 'Boarding', 'Transport', 'Uniform', 'Books', 'Exam', 'Development', 'Other'];

export default function Scholarships() {
  const { isDark } = useTheme();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [studentScholarships, setStudentScholarships] = useState<StudentScholarship[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    discountType: 'percentage',
    discountValue: 0,
    feeTypes: [] as string[],
    description: '',
    eligibilityCriteria: '',
    maxBeneficiaries: '',
    validFrom: '',
    validTo: ''
  });

  const [assignForm, setAssignForm] = useState({
    studentId: '',
    year: new Date().getFullYear(),
    term: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [schRes, ssRes, stRes] = await Promise.all([
        fetch('/api/scholarships', { credentials: 'include' }),
        fetch('/api/student-scholarships', { credentials: 'include' }),
        fetch('/api/students', { credentials: 'include' })
      ]);
      if (schRes.ok) setScholarships(await schRes.json());
      if (ssRes.ok) setStudentScholarships(await ssRes.json());
      if (stRes.ok) setStudents(await stRes.json());
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.name || !form.discountType || form.discountValue === 0) {
      setError('Name, discount type and value are required');
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/scholarships/${editingId}` : '/api/scholarships';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      if (res.ok) {
        await fetchData();
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

  const handleAssign = async () => {
    if (!assignForm.studentId || !selectedScholarship) return;
    setSaving(true);
    try {
      const res = await fetch('/api/student-scholarships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentId: parseInt(assignForm.studentId),
          scholarshipId: selectedScholarship.id,
          year: assignForm.year,
          term: assignForm.term ? parseInt(assignForm.term) : null,
          notes: assignForm.notes || null
        })
      });
      if (res.ok) {
        await fetchData();
        setShowAssignModal(false);
        setAssignForm({ studentId: '', year: new Date().getFullYear(), term: '', notes: '' });
      }
    } catch (err) {
      console.error('Failed to assign', err);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this scholarship?')) return;
    try {
      await fetch(`/api/scholarships/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const handleRemoveAssignment = async (id: number) => {
    if (!confirm('Remove this student from scholarship?')) return;
    try {
      await fetch(`/api/student-scholarships/${id}`, { method: 'DELETE', credentials: 'include' });
      await fetchData();
    } catch (err) {
      console.error('Failed to remove', err);
    }
  };

  const openEdit = (s: Scholarship) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      discountType: s.discountType,
      discountValue: s.discountValue,
      feeTypes: s.feeTypes || [],
      description: s.description || '',
      eligibilityCriteria: s.eligibilityCriteria || '',
      maxBeneficiaries: s.maxBeneficiaries?.toString() || '',
      validFrom: s.validFrom || '',
      validTo: s.validTo || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setError(null);
    setForm({ name: '', discountType: 'percentage', discountValue: 0, feeTypes: [], description: '', eligibilityCriteria: '', maxBeneficiaries: '', validFrom: '', validTo: '' });
  };

  const openAssign = (s: Scholarship) => {
    setSelectedScholarship(s);
    setShowAssignModal(true);
  };

  const toggleFeeType = (type: string) => {
    if (form.feeTypes.includes(type)) {
      setForm({ ...form, feeTypes: form.feeTypes.filter(t => t !== type) });
    } else {
      setForm({ ...form, feeTypes: [...form.feeTypes, type] });
    }
  };

  const formatDiscount = (s: Scholarship) => {
    return s.discountType === 'percentage' ? `${s.discountValue}%` : `UGX ${s.discountValue.toLocaleString()}`;
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
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Scholarships & Discounts</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage fee discounts and assign to students</p>
        </div>
        <Button onClick={() => setShowModal(true)}>Add Scholarship</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {scholarships.map(s => {
          const beneficiaries = studentScholarships.filter(ss => ss.scholarshipId === s.id);
          return (
            <div key={s.id} className={`rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{s.name}</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{s.description || 'No description'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    s.discountType === 'percentage' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {formatDiscount(s)}
                  </span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(s.feeTypes || []).map(t => (
                    <span key={t} className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                      {t}
                    </span>
                  ))}
                  {(!s.feeTypes || s.feeTypes.length === 0) && (
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>All fee types</span>
                  )}
                </div>
                <div className={`flex items-center justify-between text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span>Beneficiaries: {beneficiaries.length}{s.maxBeneficiaries ? ` / ${s.maxBeneficiaries}` : ''}</span>
                  {s.eligibilityCriteria && <span>Criteria: {s.eligibilityCriteria}</span>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openAssign(s)}>Assign Student</Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(s.id)}>Delete</Button>
                </div>
                {beneficiaries.length > 0 && (
                  <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Assigned Students:</p>
                    <div className="space-y-2">
                      {beneficiaries.map(b => {
                        const student = students.find(st => st.id === b.studentId);
                        return (
                          <div key={b.id} className={`flex items-center justify-between p-2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                            <div>
                              <span className={isDark ? 'text-white' : 'text-gray-900'}>{student?.name || 'Unknown'}</span>
                              <span className={`ml-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {student?.classLevel} - {b.year}{b.term ? `, Term ${b.term}` : ''}
                              </span>
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleRemoveAssignment(b.id)}>Remove</Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {scholarships.length === 0 && (
        <div className={`p-12 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm text-center`}>
          <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No scholarships created yet</p>
          <Button className="mt-4" onClick={() => setShowModal(true)}>Create Your First Scholarship</Button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-xl w-full max-w-lg mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingId ? 'Edit Scholarship' : 'Add Scholarship'}
              </h3>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Merit Scholarship"
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Discount Type *</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (UGX)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Applies to Fee Types</label>
                <div className="flex flex-wrap gap-2">
                  {FEE_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleFeeType(type)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        form.feeTypes.includes(type)
                          ? 'bg-blue-600 text-white'
                          : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Leave empty to apply to all fees</p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Eligibility Criteria</label>
                  <input
                    type="text"
                    value={form.eligibilityCriteria}
                    onChange={(e) => setForm({ ...form, eligibilityCriteria: e.target.value })}
                    placeholder="e.g., Top 10 students"
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Max Beneficiaries</label>
                  <input
                    type="number"
                    value={form.maxBeneficiaries}
                    onChange={(e) => setForm({ ...form, maxBeneficiaries: e.target.value })}
                    placeholder="Unlimited"
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
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

      {showAssignModal && selectedScholarship && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`rounded-lg shadow-xl w-full max-w-md mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Assign Student to {selectedScholarship.name}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Student *</label>
                <select
                  value={assignForm.studentId}
                  onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value="">Select Student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.classLevel})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Year *</label>
                  <input
                    type="number"
                    value={assignForm.year}
                    onChange={(e) => setAssignForm({ ...assignForm, year: parseInt(e.target.value) })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Term</label>
                  <select
                    value={assignForm.term}
                    onChange={(e) => setAssignForm({ ...assignForm, term: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">All Terms</option>
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                </div>
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={saving}>{saving ? 'Assigning...' : 'Assign'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
