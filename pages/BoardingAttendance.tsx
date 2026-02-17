import React, { useEffect, useState } from 'react';
import { useAcademicYear } from '../contexts/AcademicYearContext';

interface Student {
  id: number;
  name: string;
  indexNumber?: string;
  classLevel: string;
  gender: string;
  boardingStatus: string;
}

interface RollCall {
  id: number;
  studentId: number;
  session: string;
  status: string;
  sessionTime: string;
}

interface Dormitory {
  id: number;
  name: string;
  gender: string;
}

export const BoardingAttendance: React.FC = () => {
  const { isArchiveMode } = useAcademicYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [rollCalls, setRollCalls] = useState<RollCall[]>([]);
  const [dormitories, setDormitories] = useState<Dormitory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [session, setSession] = useState<'morning' | 'evening'>('morning');
  const [selectedDorm, setSelectedDorm] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendance, setAttendance] = useState<{ [key: number]: string }>({});
  const [date] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [session]);

  const loadData = async () => {
    try {
      const [studentsRes, rollCallsRes, dormsRes] = await Promise.all([
        fetch('/api/students', { credentials: 'include' }),
        fetch(`/api/boarding-roll-calls?date=${date}&session=${session}`, { credentials: 'include' }),
        fetch('/api/dormitories', { credentials: 'include' }),
      ]);
      
      if (studentsRes.ok) {
        const allStudents = await studentsRes.json();
        setStudents(allStudents.filter((s: Student) => s.boardingStatus === 'boarding'));
      }
      if (rollCallsRes.ok) {
        const calls = await rollCallsRes.json();
        setRollCalls(calls);
        const att: { [key: number]: string } = {};
        calls.forEach((c: RollCall) => { att[c.studentId] = c.status; });
        setAttendance(att);
      }
      if (dormsRes.ok) setDormitories(await dormsRes.json());
    } catch (err) {
      console.error('Failed to load data:', err);
    }
    setLoading(false);
  };

  const markAttendance = (studentId: number, status: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAllPresent = () => {
    const newAtt: { [key: number]: string } = {};
    filteredStudents.forEach(s => { newAtt[s.id] = 'present'; });
    setAttendance(prev => ({ ...prev, ...newAtt }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([studentId, status]) => ({
        studentId: parseInt(studentId),
        status,
        dormitoryId: selectedDorm,
      }));
      
      await fetch('/api/boarding-roll-calls/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ records, session }),
      });
      
      loadData();
    } catch (err) {
      console.error('Failed to save attendance:', err);
    }
    setSaving(false);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400';
      case 'absent': return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400';
      case 'sick_bay': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400';
      case 'on_leave': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400';
      case 'late': return 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300';
    }
  };

  const stats = {
    total: filteredStudents.length,
    present: Object.values(attendance).filter(s => s === 'present').length,
    absent: Object.values(attendance).filter(s => s === 'absent').length,
    sickBay: Object.values(attendance).filter(s => s === 'sick_bay').length,
    onLeave: Object.values(attendance).filter(s => s === 'on_leave').length,
    notMarked: filteredStudents.length - Object.keys(attendance).length,
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Boarding Attendance</h1>
          <p className="text-gray-500 dark:text-gray-400">{session === 'morning' ? 'Morning' : 'Evening'} Roll Call - {new Date(date).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllPresent}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Mark All Present
          </button>
          <button
            onClick={saveAttendance}
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
            Save Attendance
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setSession('morning')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${session === 'morning' ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow' : 'text-gray-600 dark:text-gray-400'}`}
          >
            Morning (6:30 AM)
          </button>
          <button
            onClick={() => setSession('evening')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${session === 'evening' ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow' : 'text-gray-600 dark:text-gray-400'}`}
          >
            Evening (8:00 PM)
          </button>
        </div>
        
        <input
          type="text"
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 flex-1 min-w-[200px]"
        />
        
        <select
          value={selectedDorm || ''}
          onChange={(e) => setSelectedDorm(e.target.value ? parseInt(e.target.value) : null)}
          className="px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="">All Dormitories</option>
          {dormitories.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 border border-green-100 dark:border-green-500/20">
          <p className="text-sm text-green-600 dark:text-green-400">Present</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.present}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-500/10 rounded-lg p-4 border border-red-100 dark:border-red-500/20">
          <p className="text-sm text-red-600 dark:text-red-400">Absent</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-4 border border-amber-100 dark:border-amber-500/20">
          <p className="text-sm text-amber-600 dark:text-amber-400">Sick Bay</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.sickBay}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-4 border border-blue-100 dark:border-blue-500/20">
          <p className="text-sm text-blue-600 dark:text-blue-400">On Leave</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.onLeave}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400">Not Marked</p>
          <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">{stats.notMarked}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quick Mark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredStudents.map(student => {
                const status = attendance[student.id];
                return (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                        {student.indexNumber && <p className="text-sm text-gray-500 dark:text-gray-400">{student.indexNumber}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{student.classLevel}</td>
                    <td className="px-4 py-3 text-center">
                      {status ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {status.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Not marked</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => markAttendance(student.id, 'present')}
                          className={`p-2 rounded-lg transition-colors ${status === 'present' ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-500/20'}`}
                          title="Present"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                        <button
                          onClick={() => markAttendance(student.id, 'absent')}
                          className={`p-2 rounded-lg transition-colors ${status === 'absent' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-500/20'}`}
                          title="Absent"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <button
                          onClick={() => markAttendance(student.id, 'sick_bay')}
                          className={`p-2 rounded-lg transition-colors ${status === 'sick_bay' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-500/20'}`}
                          title="Sick Bay"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </button>
                        <button
                          onClick={() => markAttendance(student.id, 'on_leave')}
                          className={`p-2 rounded-lg transition-colors ${status === 'on_leave' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-500/20'}`}
                          title="On Leave"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredStudents.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No boarding students found
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardingAttendance;
