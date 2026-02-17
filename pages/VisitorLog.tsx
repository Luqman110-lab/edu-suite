import React, { useEffect, useState } from 'react';
import { useAcademicYear } from '../contexts/AcademicYearContext';

interface Student {
  id: number;
  name: string;
  indexNumber?: string;
  classLevel: string;
}

interface VisitorLogEntry {
  id: number;
  studentId: number;
  visitorName: string;
  visitorPhone: string;
  visitorRelationship: string;
  visitorNationalId: string;
  visitDate: string;
  checkInTime: string;
  checkOutTime: string;
  purpose: string;
  itemsBrought: string;
  notes: string;
}

export const VisitorLog: React.FC = () => {
  const { isArchiveMode } = useAcademicYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [visitors, setVisitors] = useState<VisitorLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    studentId: 0,
    visitorName: '',
    visitorPhone: '',
    visitorRelationship: 'parent',
    visitorNationalId: '',
    visitDate: new Date().toISOString().split('T')[0],
    purpose: 'visiting',
    itemsBrought: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    try {
      const [studentsRes, visitorsRes] = await Promise.all([
        fetch('/api/students', { credentials: 'include' }),
        fetch(`/api/visitor-logs?date=${date}`, { credentials: 'include' }),
      ]);
      if (studentsRes.ok) {
        const all = await studentsRes.json();
        setStudents(all.filter((s: Student & { boardingStatus: string }) => s.boardingStatus === 'boarding'));
      }
      if (visitorsRes.ok) setVisitors(await visitorsRes.json());
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  const registerVisitor = async () => {
    try {
      const res = await fetch('/api/visitor-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        loadData();
        setShowModal(false);
        setForm({
          studentId: 0,
          visitorName: '',
          visitorPhone: '',
          visitorRelationship: 'parent',
          visitorNationalId: '',
          visitDate: new Date().toISOString().split('T')[0],
          purpose: 'visiting',
          itemsBrought: '',
          notes: '',
        });
      }
    } catch (err) {
      console.error('Failed to register visitor:', err);
    }
  };

  const checkoutVisitor = async (id: number) => {
    try {
      await fetch(`/api/visitor-logs/${id}/checkout`, {
        method: 'PUT',
        credentials: 'include',
      });
      loadData();
    } catch (err) {
      console.error('Failed to checkout visitor:', err);
    }
  };

  const filteredVisitors = visitors.filter(v => {
    const student = students.find(s => s.id === v.studentId);
    const searchLower = searchTerm.toLowerCase();
    return (
      v.visitorName.toLowerCase().includes(searchLower) ||
      student?.name.toLowerCase().includes(searchLower) ||
      v.visitorPhone.includes(searchTerm)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Visitor Log</h1>
          <p className="text-gray-500 dark:text-gray-400">Register and track visitors to boarding students</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          Register Visitor
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
        />
        <input
          type="text"
          placeholder="Search visitors or students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 flex-1 min-w-[200px]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Visitors Today</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{visitors.length}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 border border-green-100 dark:border-green-500/20">
          <p className="text-sm text-green-600 dark:text-green-400">Currently Inside</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{visitors.filter(v => !v.checkOutTime).length}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400">Checked Out</p>
          <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">{visitors.filter(v => v.checkOutTime).length}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Visitor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Check In</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Check Out</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Purpose</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredVisitors.map(visitor => {
                const student = students.find(s => s.id === visitor.studentId);
                return (
                  <tr key={visitor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{visitor.visitorName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{visitor.visitorPhone}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{visitor.visitorRelationship}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{student?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{student?.classLevel}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{visitor.checkInTime || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{visitor.checkOutTime || '-'}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-600 dark:text-gray-300 capitalize">{visitor.purpose}</p>
                      {visitor.itemsBrought && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Items: {visitor.itemsBrought}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${visitor.checkOutTime ? 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300' : 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'}`}>
                        {visitor.checkOutTime ? 'Checked Out' : 'Inside'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!visitor.checkOutTime && (
                        <button
                          onClick={() => checkoutVisitor(visitor.id)}
                          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredVisitors.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No visitors registered for this date
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Register Visitor</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student Being Visited</label>
                <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
                  <option value={0}>Select a student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.classLevel})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visitor Name</label>
                <input type="text" value={form.visitorName} onChange={(e) => setForm({ ...form, visitorName: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visitor Phone</label>
                <input type="tel" value={form.visitorPhone} onChange={(e) => setForm({ ...form, visitorPhone: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relationship</label>
                <select value={form.visitorRelationship} onChange={(e) => setForm({ ...form, visitorRelationship: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
                  <option value="parent">Parent</option>
                  <option value="guardian">Guardian</option>
                  <option value="sibling">Sibling</option>
                  <option value="relative">Relative</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">National ID (Optional)</label>
                <input type="text" value={form.visitorNationalId} onChange={(e) => setForm({ ...form, visitorNationalId: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose</label>
                <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
                  <option value="visiting">General Visit</option>
                  <option value="dropping_items">Dropping Items</option>
                  <option value="medical">Medical Visit</option>
                  <option value="meeting">Meeting with Staff</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Items Brought (Optional)</label>
                <input type="text" value={form.itemsBrought} onChange={(e) => setForm({ ...form, itemsBrought: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" placeholder="e.g., Food, clothes, books" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" rows={2} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={registerVisitor} disabled={!form.studentId || !form.visitorName || !form.visitorPhone} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">Register</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorLog;
