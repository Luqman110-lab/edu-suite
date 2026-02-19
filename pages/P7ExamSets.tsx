import React, { useState, useEffect, useMemo } from 'react';
import { P7ExamSet, P7Score, SubjectMarks, SUBJECTS_UPPER, ClassLevel } from '../types';
import { calculateAggregate, calculateDivision } from '../services/grading';
import { useTheme } from '../contexts/ThemeContext';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { Button } from '../components/Button';
import { useStudents } from '../client/src/hooks/useStudents';
import { useSettings } from '../client/src/hooks/useSettings';
import { FileText, Edit, BarChart, Download } from 'lucide-react';
import { Toast } from '../client/src/components/Toast';

// Components
import { P7ExamSetList } from '../client/src/components/p7/P7ExamSetList';
import { P7ExamSetModal } from '../client/src/components/p7/P7ExamSetModal';
import { P7ScoresEntry } from '../client/src/components/p7/P7ScoresEntry';
import { P7Analysis } from '../client/src/components/p7/P7Analysis';
import { P7Reports } from '../client/src/components/p7/P7Reports';

// Services
import { generateP7ReportCard, generateAssessmentSheet as generateAssessmentSheetService } from '../client/src/services/p7ReportsService';

export const P7ExamSets: React.FC = () => {
  const { isDark } = useTheme();
  const { isArchiveMode, selectedYear: archiveYear } = useAcademicYear();

  const { settings, isLoading: settingsLoading } = useSettings();
  const { students: allStudents, isLoading: studentsLoading } = useStudents(isArchiveMode ? String(archiveYear) : undefined);

  const [examSets, setExamSets] = useState<P7ExamSet[]>([]);
  const [scores, setScores] = useState<P7Score[]>([]);

  const students = useMemo(() => {
    return (allStudents || []).filter(s => s.classLevel === 'P7');
  }, [allStudents]);

  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSet, setSelectedSet] = useState<P7ExamSet | null>(null);

  const [apiLoading, setApiLoading] = useState(false);
  // const loading = studentsLoading || settingsLoading || apiLoading; // Not utilizing 'loading' directly in UI as of now
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('success');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDate, setNewSetDate] = useState('');

  const [marksData, setMarksData] = useState<{ [studentId: number]: SubjectMarks }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [activeTab, setActiveTab] = useState<'sets' | 'marks' | 'analysis' | 'reports'>('sets');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const availableStreams = settings?.streams?.['P7'] || [];

  const showMessageFn = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  // Sync settings
  useEffect(() => {
    if (settings) {
      if (selectedTerm === 1 && selectedYear === new Date().getFullYear()) {
        setSelectedTerm(settings.currentTerm);
        setSelectedYear(settings.currentYear || new Date().getFullYear());
      }
    }
  }, [settings]);

  useEffect(() => {
    loadExamSets();
  }, []);

  const loadExamSets = async () => {
    setApiLoading(true);
    try {
      const response = await fetch('/api/p7-exam-sets');
      if (response.ok) {
        const sets = await response.json();
        setExamSets(sets);
      }
    } catch (err) {
      console.error('Error loading exam sets:', err);
    } finally {
      setApiLoading(false);
    }
  };

  const loadScoresForSet = async (setId: number) => {
    try {
      const response = await fetch(`/api/p7-scores?examSetId=${setId}`);
      if (response.ok) {
        const scoresData = await response.json();
        setScores(scoresData);

        const marksMap: { [studentId: number]: SubjectMarks } = {};
        scoresData.forEach((score: P7Score) => {
          marksMap[score.studentId] = score.marks as SubjectMarks;
        });
        setMarksData(marksMap);
      }
    } catch (err) {
      console.error('Error loading scores:', err);
    }
  };

  useEffect(() => {
    if (selectedSet) {
      loadScoresForSet(selectedSet.id!);
    }
  }, [selectedSet]);

  const filteredSets = useMemo(() => {
    return examSets.filter(set => {
      const matchesTerm = set.term === selectedTerm;
      const matchesYear = set.year === selectedYear;
      const matchesStream = selectedStream === 'All' || !set.stream || set.stream === selectedStream;
      return matchesTerm && matchesYear && matchesStream;
    });
  }, [examSets, selectedTerm, selectedYear, selectedStream]);

  const filteredStudents = useMemo(() => {
    if (selectedStream === 'All') return students;
    return students.filter(s => s.stream === selectedStream);
  }, [students, selectedStream]);

  const getNextSetNumber = () => {
    const existingSets = filteredSets.map(s => s.setNumber);
    for (let i = 1; i <= 10; i++) {
      if (!existingSets.includes(i)) return i;
    }
    return filteredSets.length + 1;
  };

  const createExamSet = async () => {
    const setNumber = getNextSetNumber();
    try {
      const response = await fetch('/api/p7-exam-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setNumber,
          name: newSetName,
          stream: selectedStream === 'All' ? null : selectedStream,
          term: selectedTerm,
          year: selectedYear,
          examDate: newSetDate || null,
          maxMarks: { english: 100, maths: 100, science: 100, sst: 100 },
          isActive: true
        })
      });

      if (response.ok) {
        showMessageFn('Exam set created successfully', 'success');
        setNewSetName('');
        setNewSetDate('');
        setShowCreateModal(false);
        await loadExamSets();
      } else {
        showMessageFn('Failed to create exam set', 'error');
      }
    } catch (err) {
      console.error('Error creating set:', err);
      showMessageFn('Failed to create exam set', 'error');
    }
  };

  const deleteExamSet = async (setId: number) => {
    if (!confirm('Delete this exam set and all its scores?')) return;
    try {
      const response = await fetch(`/api/p7-exam-sets/${setId}`, { method: 'DELETE' });
      if (response.ok) {
        showMessageFn('Exam set deleted', 'success');
        if (selectedSet?.id === setId) {
          setSelectedSet(null);
          setScores([]);
          setMarksData({});
        }
        await loadExamSets();
      }
    } catch (err) {
      console.error('Error deleting set:', err);
      showMessageFn('Failed to delete exam set', 'error');
    }
  };

  const handleMarkChange = (studentId: number, subject: string, value: string) => {
    const numValue = value === '' ? undefined : Math.min(100, Math.max(0, parseInt(value) || 0));
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subject]: numValue
      }
    }));
    setHasUnsavedChanges(true);
  };

  const saveMarks = async () => {
    if (!selectedSet) return;
    setSaving(true);
    try {
      const scoresToSave = filteredStudents.map(student => {
        const marks: SubjectMarks = marksData[student.id!] || {};
        const aggregate = calculateAggregate(marks as any, ClassLevel.P7, settings?.gradingConfig);
        const division = calculateDivision(aggregate, ClassLevel.P7, settings?.gradingConfig);
        const total = (marks.english || 0) + (marks.maths || 0) + (marks.science || 0) + (marks.sst || 0);

        return {
          examSetId: selectedSet.id,
          studentId: student.id,
          marks,
          total,
          aggregate,
          division,
          status: 'present',
          comment: ''
        };
      });

      const response = await fetch('/api/p7-scores/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: scoresToSave })
      });

      if (response.ok) {
        showMessageFn('Marks saved successfully', 'success');
        setHasUnsavedChanges(false);
        await loadScoresForSet(selectedSet.id!);
      } else {
        showMessageFn('Failed to save marks', 'error');
      }
    } catch (err) {
      console.error('Error saving marks:', err);
      showMessageFn('Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getStudentResults = (studentId: number) => {
    const marks: SubjectMarks = marksData[studentId] || {};
    const aggregate = calculateAggregate(marks as any, ClassLevel.P7, settings?.gradingConfig);
    const division = calculateDivision(aggregate, ClassLevel.P7, settings?.gradingConfig);
    const total = (marks.english || 0) + (marks.maths || 0) + (marks.science || 0) + (marks.sst || 0);
    return { marks, aggregate, division, total };
  };

  const calculatePositions = () => {
    const results = filteredStudents.map(s => {
      const { total, aggregate } = getStudentResults(s.id!);
      return { studentId: s.id!, total, aggregate };
    }).filter(r => r.total > 0);

    results.sort((a, b) => b.total - a.total);

    const positions: { [id: number]: number } = {};
    let currentPos = 1;
    results.forEach((r, i) => {
      if (i > 0 && results[i - 1].total === r.total) {
        positions[r.studentId] = positions[results[i - 1].studentId];
      } else {
        positions[r.studentId] = currentPos;
      }
      currentPos++;
    });
    return positions;
  };

  const positions = useMemo(() => calculatePositions(), [filteredStudents, marksData]);

  const analysisStats = useMemo(() => {
    if (!selectedSet || filteredStudents.length === 0) return null;

    const results = filteredStudents.map(s => getStudentResults(s.id!));
    const withMarks = results.filter(r => r.total > 0);

    if (withMarks.length === 0) return null;

    const divCounts = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
    withMarks.forEach(r => {
      if (r.division in divCounts) divCounts[r.division as keyof typeof divCounts]++;
    });

    const avgAggregate = (withMarks.reduce((sum, r) => sum + r.aggregate, 0) / withMarks.length).toFixed(1);
    const avgTotal = (withMarks.reduce((sum, r) => sum + r.total, 0) / withMarks.length).toFixed(1);
    const passCount = divCounts.I + divCounts.II + divCounts.III + divCounts.IV;
    const passRate = ((passCount / withMarks.length) * 100).toFixed(1);

    const subjectAvgs: { [key: string]: number } = {};
    SUBJECTS_UPPER.forEach(sub => {
      const marks = withMarks.map(r => (r.marks as any)[sub]).filter((m): m is number => m !== undefined);
      if (marks.length > 0) {
        subjectAvgs[sub] = marks.reduce((a, b) => a + b, 0) / marks.length;
      }
    });

    const studentResults = filteredStudents.map(s => {
      const result = getStudentResults(s.id!);
      return { student: s, ...result };
    }).filter(r => r.total > 0);

    studentResults.sort((a, b) => b.total - a.total);
    const topPerformers = studentResults.slice(0, 5);

    return {
      totalStudents: filteredStudents.length,
      withMarks: withMarks.length,
      divCounts,
      avgAggregate,
      avgTotal,
      passRate,
      subjectAvgs,
      topPerformers
    };
  }, [selectedSet, filteredStudents, marksData]);

  const handleGenerateAssessmentSheet = () => {
    if (!selectedSet || !settings) return;
    generateAssessmentSheetService(
      selectedSet, settings, filteredStudents, positions, marksData,
      selectedTerm, selectedYear, selectedStream, showMessageFn
    );
  };

  const handleGenerateBulkReports = async () => {
    if (selectedStudentIds.size === 0 || !settings) {
      showMessageFn('Please select students first', 'error');
      return;
    }

    setGeneratingPDF(true);
    showMessageFn(`Generating ${selectedStudentIds.size} report(s)...`, 'info');

    for (const studentId of selectedStudentIds) {
      const student = filteredStudents.find(s => s.id === studentId);
      if (student) {
        await generateP7ReportCard(student, examSets, selectedTerm, selectedYear, settings, showMessageFn);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    setGeneratingPDF(false);
    showMessageFn('Reports generated successfully!', 'success');
  };

  const inputClasses = `block w-full rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} px-3 py-2 shadow-sm focus:border-[#7B1113] focus:ring-2 focus:ring-[#7B1113]/30 focus:outline-none text-sm`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>P7 Exam Sets</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Manage multiple exam sets for P7 class (up to 10 sets)</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setActiveTab('sets')}
            variant={activeTab === 'sets' ? 'primary' : 'outline'}
            size="sm"
          >
            <FileText className="w-4 h-4 mr-1" />
            Sets
          </Button>
          <Button
            onClick={() => setActiveTab('marks')}
            variant={activeTab === 'marks' ? 'primary' : 'outline'}
            size="sm"
            disabled={!selectedSet}
          >
            <Edit className="w-4 h-4 mr-1" />
            Marks
          </Button>
          <Button
            onClick={() => setActiveTab('analysis')}
            variant={activeTab === 'analysis' ? 'primary' : 'outline'}
            size="sm"
            disabled={!selectedSet}
          >
            <BarChart className="w-4 h-4 mr-1" />
            Analysis
          </Button>
          <Button
            onClick={() => setActiveTab('reports')}
            variant={activeTab === 'reports' ? 'primary' : 'outline'}
            size="sm"
          >
            <Download className="w-4 h-4 mr-1" />
            Reports
          </Button>
        </div>
      </div>

      {message && (
        <Toast message={message} type={messageType} onClose={() => setMessage('')} />
      )}

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-4 rounded-xl shadow-lg border`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Stream</label>
            <select className={inputClasses} value={selectedStream} onChange={e => setSelectedStream(e.target.value)}>
              <option value="All">All Streams</option>
              {availableStreams.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Term</label>
            <select className={inputClasses} value={selectedTerm} onChange={e => setSelectedTerm(Number(e.target.value))}>
              <option value={1}>Term 1</option>
              <option value={2}>Term 2</option>
              <option value={3}>Term 3</option>
            </select>
          </div>
          <div>
            <label className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Year</label>
            <select className={inputClasses} value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Students</label>
            <div className={`px-3 py-2 rounded-lg ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-50 text-gray-900'} font-semibold`}>
              {filteredStudents.length} P7 Students
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'sets' && (
        <P7ExamSetList
          sets={filteredSets}
          selectedSet={selectedSet}
          onSelectSet={(set) => { setSelectedSet(set); setActiveTab('marks'); }}
          onDeleteSet={deleteExamSet}
          onAddSet={() => setShowCreateModal(true)}
        />
      )}

      {activeTab === 'marks' && selectedSet && (
        <P7ScoresEntry
          selectedSet={selectedSet}
          students={filteredStudents}
          marksData={marksData}
          handleMarkChange={handleMarkChange}
          saveMarks={saveMarks}
          generateAssessmentSheet={handleGenerateAssessmentSheet}
          saving={saving}
          hasUnsavedChanges={hasUnsavedChanges}
          getStudentResults={getStudentResults}
          positions={positions}
          settings={settings || null}
        />
      )}

      {activeTab === 'analysis' && selectedSet && (
        <P7Analysis
          selectedSet={selectedSet}
          analysisStats={analysisStats}
          generateAssessmentSheet={handleGenerateAssessmentSheet}
        />
      )}

      {activeTab === 'reports' && (
        <P7Reports
          students={filteredStudents}
          selectedStudentIds={selectedStudentIds}
          setSelectedStudentIds={setSelectedStudentIds}
          generateBulkP7Reports={handleGenerateBulkReports}
          generatingPDF={generatingPDF}
        />
      )}

      <P7ExamSetModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={createExamSet}
        setName={newSetName}
        setSetName={setNewSetName}
        setDate={newSetDate}
        setSetDate={setNewSetDate}
        setNumber={getNextSetNumber()}
      />
    </div>
  );
};
