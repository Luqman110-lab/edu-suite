import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/Button';
import { GateStudent, GateRecord, GateSettings } from '../client/src/types/gate';
import { FaceEmbedding } from '../client/src/types/attendance';
import * as gateService from '../client/src/services/gateService';
import { ClassSummary } from '../client/src/services/gateService';
import { GateStats } from '../client/src/components/gate/GateStats';
import { GateScanner } from '../client/src/components/gate/GateScanner';
import { StudentList } from '../client/src/components/gate/StudentList';
import { ScannerType } from '../client/src/hooks/useScanner';

export const GateAttendance: React.FC = () => {
  const { isDark } = useTheme();

  // Data State
  const [students, setStudents] = useState<GateStudent[]>([]);
  const [records, setRecords] = useState<GateRecord[]>([]);
  const [settings, setSettings] = useState<GateSettings | null>(null);
  const [faceEmbeddings, setFaceEmbeddings] = useState<FaceEmbedding[]>([]);
  const [classSummary, setClassSummary] = useState<ClassSummary[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [scanMode, setScanMode] = useState<'check-in' | 'check-out'>('check-in');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [showClassSummary, setShowClassSummary] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsRes, recordsRes, settingsRes, embeddingsRes, summaryRes] = await Promise.all([
        gateService.fetchGateStudents(),
        gateService.fetchGateRecords(selectedDate),
        gateService.fetchGateSettings(),
        gateService.fetchStudentFaceEmbeddings(),
        gateService.fetchClassSummary(selectedDate),
      ]);

      setStudents(studentsRes);
      setRecords(recordsRes);
      setSettings(settingsRes);
      setFaceEmbeddings(embeddingsRes);
      setClassSummary(summaryRes);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
    setLoading(false);
  };

  const handleScanSuccess = async (student: GateStudent, method: ScannerType) => {
    try {
      const result = await gateService.scanGate(student.id, method, scanMode);
      if (result) {
        await fetchData();
      }
    } catch (err: any) {
      console.error('Gate action failed', err);
    }
  };

  const handleManualCheckIn = async (studentId: number) => {
    try {
      await gateService.scanGate(studentId, 'manual', 'check-in');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Check-in failed');
    }
  };

  const handleManualCheckOut = async (studentId: number) => {
    try {
      await gateService.scanGate(studentId, 'manual', 'check-out');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Check-out failed');
    }
  };

  const markAllAbsent = async () => {
    if (!confirm('Auto mark all remaining students as absent for today?')) return;
    try {
      const result = await gateService.triggerAutoAbsent();
      alert(`Marked ${result.markedAbsent} students as absent (${result.date})`);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to mark absent:', err);
      alert('Failed to mark absent');
    }
  };

  // G5: Filter students by class
  const filteredStudents = useMemo(() => {
    if (classFilter === 'all') return students;
    return students.filter(s => s.classLevel === classFilter);
  }, [students, classFilter]);

  const filteredRecords = useMemo(() => {
    if (classFilter === 'all') return records;
    const studentIds = new Set(filteredStudents.map(s => s.id));
    return records.filter(r => studentIds.has(r.studentId));
  }, [records, filteredStudents, classFilter]);

  // Unique class levels for the filter dropdown
  const classLevels = useMemo(() => {
    const levels = [...new Set(students.map(s => s.classLevel).filter(Boolean))].sort();
    return levels;
  }, [students]);

  const stats = {
    total: filteredStudents.length,
    present: filteredRecords.filter(r => r.status === 'present').length,
    late: filteredRecords.filter(r => r.status === 'late').length,
    absent: filteredStudents.length - filteredRecords.length,
    leftEarly: filteredRecords.filter(r => r.status === 'left_early').length,
  };

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
            Gate Attendance
          </h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Day scholars check-in/check-out tracking
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`px-3 py-2 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
          />
          {/* G5: Class filter dropdown */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
          >
            <option value="all">All Classes</option>
            {classLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={() => setShowClassSummary(!showClassSummary)}>
            {showClassSummary ? 'Hide Summary' : 'Class Summary'}
          </Button>
          <Button variant="danger" size="sm" onClick={markAllAbsent}>
            Auto Absent
          </Button>
        </div>
      </div>

      <GateStats stats={stats} />

      {/* G5: Class Summary Table */}
      {showClassSummary && classSummary.length > 0 && (
        <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-4 py-3 border-b font-semibold text-sm ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
            📊 Attendance by Class
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  <th className="text-left px-4 py-2 font-medium">Class</th>
                  <th className="text-center px-3 py-2 font-medium">Total</th>
                  <th className="text-center px-3 py-2 font-medium">Present</th>
                  <th className="text-center px-3 py-2 font-medium">Late</th>
                  <th className="text-center px-3 py-2 font-medium">Absent</th>
                  <th className="text-center px-3 py-2 font-medium">Left Early</th>
                  <th className="text-center px-3 py-2 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {classSummary.map(cls => {
                  const rate = cls.total > 0 ? Math.round(((cls.present + cls.late) / cls.total) * 100) : 0;
                  return (
                    <tr key={cls.classLevel} className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                      <td className={`px-4 py-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{cls.classLevel}</td>
                      <td className="text-center px-3 py-2">{cls.total}</td>
                      <td className="text-center px-3 py-2 text-green-600 font-medium">{cls.present}</td>
                      <td className="text-center px-3 py-2 text-amber-600 font-medium">{cls.late}</td>
                      <td className="text-center px-3 py-2 text-red-600 font-medium">{cls.absent}</td>
                      <td className="text-center px-3 py-2 text-orange-500 font-medium">{cls.leftEarly}</td>
                      <td className="text-center px-3 py-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${rate >= 80 ? 'bg-green-100 text-green-700' : rate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GateScanner
          students={filteredStudents}
          settings={settings}
          faceEmbeddings={faceEmbeddings}
          scanMode={scanMode}
          setScanMode={setScanMode}
          onScanSuccess={handleScanSuccess}
        />

        <StudentList
          students={filteredStudents}
          records={filteredRecords}
          onManualCheckIn={handleManualCheckIn}
          onManualCheckOut={handleManualCheckOut}
          setScanMode={setScanMode}
        />
      </div>
    </div>
  );
};

