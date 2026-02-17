import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAcademicYear } from '../contexts/AcademicYearContext';

interface Student {
  id: number;
  name: string;
  classLevel: string;
  stream?: string;
  indexNumber?: string;
  photoUrl?: string;
}

interface ClassRecord {
  id: number;
  studentId: number;
  classLevel: string;
  stream?: string;
  date: string;
  period: number;
  subject?: string;
  status: string;
  method?: string;
}

interface AttendanceSettings {
  periodsPerDay: number;
  periodDurationMinutes: number;
}

const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '' }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}) => {
  const baseClasses = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    outline: 'border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export const ClassAttendance: React.FC = () => {
  const { isDark } = useTheme();
  const { isArchiveMode } = useAcademicYear();
  const [students, setStudents] = useState<Student[]>([]);
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('P1');
  const [selectedStream, setSelectedStream] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attendanceState, setAttendanceState] = useState<{ [studentId: number]: string }>({});
  const [hasChanges, setHasChanges] = useState(false);

  const classLevels = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
  const subjects = ['English', 'Mathematics', 'Science', 'Social Studies', 'Literacy', 'Numeracy', 'P.E.', 'Music', 'Art'];
  const statusOptions = ['present', 'absent', 'late', 'excused'];

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedClass, selectedPeriod]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, recordsRes, settingsRes] = await Promise.all([
        fetch('/api/students', { credentials: 'include' }),
        fetch(`/api/class-attendance?date=${selectedDate}&classLevel=${selectedClass}&period=${selectedPeriod}`, { credentials: 'include' }),
        fetch('/api/attendance-settings', { credentials: 'include' }),
      ]);
      
      if (studentsRes.ok) {
        const allStudents = await studentsRes.json();
        const filtered = allStudents.filter((s: Student) => 
          s.classLevel === selectedClass && 
          (!selectedStream || s.stream === selectedStream)
        );
        setStudents(filtered);
      }
      if (recordsRes.ok) {
        const records = await recordsRes.json();
        setClassRecords(records);
        const stateMap: { [studentId: number]: string } = {};
        records.forEach((r: ClassRecord) => {
          stateMap[r.studentId] = r.status;
        });
        setAttendanceState(stateMap);
      }
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
    setLoading(false);
    setHasChanges(false);
  };

  const handleStatusChange = (studentId: number, status: string) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: status
    }));
    setHasChanges(true);
  };

  const markAllPresent = () => {
    const newState: { [studentId: number]: string } = {};
    students.forEach(s => { newState[s.id] = 'present'; });
    setAttendanceState(newState);
    setHasChanges(true);
  };

  const markAllAbsent = () => {
    const newState: { [studentId: number]: string } = {};
    students.forEach(s => { newState[s.id] = 'absent'; });
    setAttendanceState(newState);
    setHasChanges(true);
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendanceState).map(([studentId, status]) => ({
        studentId: parseInt(studentId),
        status
      }));
      
      const response = await fetch('/api/class-attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          records,
          classLevel: selectedClass,
          stream: selectedStream,
          date: selectedDate,
          period: selectedPeriod,
          subject: selectedSubject,
        }),
      });
      
      if (response.ok) {
        setHasChanges(false);
        await fetchData();
      } else {
        alert('Failed to save attendance');
      }
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Network error while saving');
    }
    setSaving(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'late': return 'bg-yellow-500';
      case 'excused': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const stats = {
    total: students.length,
    present: Object.values(attendanceState).filter(s => s === 'present').length,
    absent: Object.values(attendanceState).filter(s => s === 'absent').length,
    late: Object.values(attendanceState).filter(s => s === 'late').length,
    excused: Object.values(attendanceState).filter(s => s === 'excused').length,
    unmarked: students.length - Object.keys(attendanceState).length,
  };

  const periodsCount = settings?.periodsPerDay || 8;

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Class Attendance
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Mark attendance for each class period
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="success" onClick={saveAttendance} disabled={saving}>
              {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
          )}
        </div>
      </div>

      <div className={`rounded-lg border p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              {classLevels.map(cl => (
                <option key={cl} value={cl}>{cl}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              {Array.from({ length: periodsCount }, (_, i) => (
                <option key={i + 1} value={i + 1}>Period {i + 1}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="">-- Select Subject --</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 md:col-span-1 flex items-end gap-2">
            <Button size="sm" variant="success" onClick={markAllPresent} className="flex-1 md:flex-none">All Present</Button>
            <Button size="sm" variant="danger" onClick={markAllAbsent} className="flex-1 md:flex-none">All Absent</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total</p>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
        </div>
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Present</p>
          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
        </div>
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Absent</p>
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
        </div>
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Late</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
        </div>
        <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <p className={`text-xs uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Unmarked</p>
          <p className="text-2xl font-bold text-gray-500">{stats.unmarked}</p>
        </div>
      </div>

      <div className={`rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {selectedClass} - Period {selectedPeriod} {selectedSubject && `(${selectedSubject})`}
          </h2>
        </div>
        
        {students.length === 0 ? (
          <div className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            No students found for {selectedClass}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {students.map(student => {
              const status = attendanceState[student.id] || '';
              return (
                <div 
                  key={student.id}
                  className={`p-4 rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} ${
                    status ? 'border-l-4' : ''
                  }`}
                  style={{ borderLeftColor: status ? getStatusColor(status).replace('bg-', '').replace('-500', '') : undefined }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                          {student.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {`#${student.id}`}
                        </p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${status ? getStatusColor(status) : 'bg-gray-300'}`}></div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {statusOptions.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleStatusChange(student.id, opt)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                          status === opt
                            ? opt === 'present' ? 'bg-green-600 text-white' :
                              opt === 'absent' ? 'bg-red-600 text-white' :
                              opt === 'late' ? 'bg-yellow-600 text-white' :
                              'bg-blue-600 text-white'
                            : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
