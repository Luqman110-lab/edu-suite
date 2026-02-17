import React, { useEffect, useState } from 'react';
import { useAcademicYear } from '../contexts/AcademicYearContext';

interface Student {
  id: number;
  name: string;
  indexNumber?: string;
  classLevel: string;
}

interface LeaveRequest {
  id: number;
  studentId: number;
  leaveType: string;
  reason: string;
  startDate: string;
  endDate: string;
  expectedReturnTime: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelationship: string;
  transportMode: string;
  destination: string;
  status: string;
  approverNotes: string;
  checkOutTime: string;
  checkInTime: string;
  createdAt: string;
}

export const LeaveManagement: React.FC = () => {
  const { isArchiveMode } = useAcademicYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [form, setForm] = useState({
    studentId: 0,
    leaveType: 'weekend',
    reason: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    expectedReturnTime: '18:00',
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: 'parent',
    transportMode: 'picked_up',
    destination: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [studentsRes, leavesRes] = await Promise.all([
        fetch('/api/students', { credentials: 'include' }),
        fetch('/api/leave-requests', { credentials: 'include' }),
      ]);
      if (studentsRes.ok) {
        const all = await studentsRes.json();
        setStudents(all.filter((s: Student & { boardingStatus: string }) => s.boardingStatus === 'boarding'));
      }
      if (leavesRes.ok) setLeaveRequests(await leavesRes.json());
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  const submitRequest = async () => {
    try {
      const res = await fetch('/api/leave-requests', {
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
          leaveType: 'weekend',
          reason: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          expectedReturnTime: '18:00',
          guardianName: '',
          guardianPhone: '',
          guardianRelationship: 'parent',
          transportMode: 'picked_up',
          destination: '',
        });
      }
    } catch (err) {
      console.error('Failed to submit request:', err);
    }
  };

  const handleAction = async (id: number, action: 'approve' | 'reject' | 'checkout' | 'checkin', notes?: string) => {
    try {
      await fetch(`/api/leave-requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approverNotes: notes, returnNotes: notes }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to perform action:', err);
    }
  };

  const generateExeatLetter = (request: LeaveRequest) => {
    const student = students.find(s => s.id === request.studentId);
    if (!student) return;

    const jspdfModule = (window as any).jspdf;
    if (!jspdfModule || !jspdfModule.jsPDF) {
      alert('PDF library not loaded. Please refresh the page and try again.');
      return;
    }
    const { jsPDF } = jspdfModule;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('EXEAT LETTER', 105, 30, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
    doc.text(`Leave Reference: EX-${request.id.toString().padStart(5, '0')}`, 20, 60);
    
    doc.setFontSize(14);
    doc.text('Student Information', 20, 80);
    doc.setFontSize(12);
    doc.text(`Name: ${student.name}`, 25, 90);
    doc.text(`Class: ${student.classLevel}`, 25, 98);
    
    doc.setFontSize(14);
    doc.text('Leave Details', 20, 118);
    doc.setFontSize(12);
    doc.text(`Type: ${request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}`, 25, 128);
    doc.text(`From: ${new Date(request.startDate).toLocaleDateString()}`, 25, 136);
    doc.text(`To: ${new Date(request.endDate).toLocaleDateString()}`, 25, 144);
    doc.text(`Expected Return: ${request.expectedReturnTime}`, 25, 152);
    doc.text(`Reason: ${request.reason}`, 25, 160);
    doc.text(`Destination: ${request.destination || 'Not specified'}`, 25, 168);

    doc.setFontSize(14);
    doc.text('Guardian Information', 20, 188);
    doc.setFontSize(12);
    doc.text(`Name: ${request.guardianName}`, 25, 198);
    doc.text(`Phone: ${request.guardianPhone}`, 25, 206);
    doc.text(`Relationship: ${request.guardianRelationship || 'Parent/Guardian'}`, 25, 214);
    doc.text(`Transport: ${request.transportMode || 'To be picked up'}`, 25, 222);

    doc.line(20, 252, 80, 252);
    doc.text('Authorized Signature', 20, 260);

    doc.line(120, 252, 180, 252);
    doc.text('Date', 120, 260);
    
    doc.save(`exeat_${student.name.replace(/\s+/g, '_')}_${request.id}.pdf`);
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: string } = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
      approved: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400',
      checked_out: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400',
      returned: 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300',
      overdue: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400',
    };
    return styles[status] || styles.pending;
  };

  const filteredRequests = leaveRequests.filter(r => filter === 'all' || r.status === filter);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage exeat requests and permissions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Leave Request
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'approved', 'checked_out', 'returned', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
            {status !== 'all' && ` (${leaveRequests.filter(r => r.status === status).length})`}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Guardian</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredRequests.map(request => {
                const student = students.find(s => s.id === request.studentId);
                return (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{student?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{student?.classLevel}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white capitalize">{request.leaveType}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{request.reason}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{new Date(request.startDate).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">to {new Date(request.endDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{request.guardianName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{request.guardianPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        {request.status === 'pending' && (
                          <>
                            <button onClick={() => handleAction(request.id, 'approve')} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg" title="Approve">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button onClick={() => handleAction(request.id, 'reject')} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg" title="Reject">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <>
                            <button onClick={() => handleAction(request.id, 'checkout')} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg" title="Check Out">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                            </button>
                            <button onClick={() => generateExeatLetter(request)} className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg" title="Print Exeat">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>
                            </button>
                          </>
                        )}
                        {request.status === 'checked_out' && (
                          <button onClick={() => handleAction(request.id, 'checkin')} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg" title="Check In">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredRequests.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No leave requests found
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Leave Request</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student</label>
                <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: parseInt(e.target.value) })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
                  <option value={0}>Select a student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.classLevel})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
                <select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
                  <option value="weekend">Weekend</option>
                  <option value="holiday">Holiday</option>
                  <option value="emergency">Emergency</option>
                  <option value="medical">Medical</option>
                  <option value="family_event">Family Event</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Return Time</label>
                <input type="time" value={form.expectedReturnTime} onChange={(e) => setForm({ ...form, expectedReturnTime: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Name</label>
                <input type="text" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guardian Phone</label>
                <input type="tel" value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transport Mode</label>
                <select value={form.transportMode} onChange={(e) => setForm({ ...form, transportMode: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600">
                  <option value="picked_up">To be picked up</option>
                  <option value="school_bus">School Bus</option>
                  <option value="public_transport">Public Transport</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination</label>
                <input type="text" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600" placeholder="Home address or location" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={submitRequest} disabled={!form.studentId || !form.reason || !form.guardianName || !form.guardianPhone} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
