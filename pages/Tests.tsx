import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { dbService } from '../services/api';
import { Student, ClassLevel, SchoolSettings, SUBJECTS_LOWER, SUBJECTS_UPPER } from '../types';
import { calculateGrade, calculateAggregate, calculateDivision } from '../services/grading';

declare const jspdf: any;

interface TestSession {
  id?: number;
  schoolId?: number;
  name: string;
  testType: string;
  classLevel: string;
  stream?: string;
  term: number;
  year: number;
  testDate?: string;
  maxMarks: {
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
    literacy1?: number;
    literacy2?: number;
  };
  isActive?: boolean;
  createdAt?: string;
}

interface TestScore {
  id?: number;
  schoolId?: number;
  testSessionId: number;
  studentId: number;
  rawMarks: {
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
    literacy1?: number;
    literacy2?: number;
  };
  convertedMarks: {
    english?: number;
    maths?: number;
    science?: number;
    sst?: number;
    literacy1?: number;
    literacy2?: number;
  };
  aggregate?: number;
  division?: string;
}

const TEST_TYPES = [
  'Weekly Test',
  'Homework',
  'Topical Test',
  'Mixed Work',
  'Quiz',
  'Class Exercise',
  'Monthly Test',
  'Other'
];

const Icons = {
  Plus: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
  ),
  Edit: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
  ),
  Trash: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
  ),
  Check: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5" /></svg>
  ),
  X: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
  ),
  Save: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
  ),
  ClipboardList: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
  ),
  BarChart: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3v18h18" /><rect width="4" height="7" x="7" y="10" rx="1" /><rect width="4" height="12" x="15" y="5" rx="1" /></svg>
  ),
  FileText: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6" /></svg>
  )
};

type ViewMode = 'sessions' | 'entry' | 'results';

export const Tests: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('sessions');
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<TestSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [testScores, setTestScores] = useState<{ [studentId: number]: TestScore }>({});
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('success');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<TestSession | null>(null);
  const [newSession, setNewSession] = useState<TestSession>({
    name: '',
    testType: 'Weekly Test',
    classLevel: 'P7',
    stream: '',
    term: 1,
    year: new Date().getFullYear(),
    testDate: new Date().toISOString().split('T')[0],
    maxMarks: { english: 10, maths: 10, science: 10, sst: 10, literacy1: 10, literacy2: 10 }
  });

  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterTerm, setFilterTerm] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const subjects = useMemo(() => {
    if (!selectedSession) return SUBJECTS_UPPER;
    return ['P1', 'P2', 'P3'].includes(selectedSession.classLevel) ? SUBJECTS_LOWER : SUBJECTS_UPPER;
  }, [selectedSession]);

  const showMessage = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  }, []);

  useEffect(() => {
    loadSettings();
    loadTestSessions();
  }, []);

  const loadSettings = async () => {
    const s = await dbService.getSettings();
    setSettings(s);
    if (s?.currentTerm) {
      setFilterTerm(s.currentTerm);
      setNewSession(prev => ({ ...prev, term: s.currentTerm, year: s.currentYear || new Date().getFullYear() }));
    }
  };

  const loadTestSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-sessions', { credentials: 'include' });
      if (response.ok) {
        const sessions = await response.json();
        setTestSessions(sessions);
      }
    } catch (err) {
      console.error('Failed to load test sessions:', err);
    }
    setLoading(false);
  };

  const loadStudentsAndScores = async (session: TestSession) => {
    if (!session.id) return;
    setLoading(true);

    const allStudents = await dbService.getStudents();
    let classStudents = allStudents.filter(s => s.classLevel === session.classLevel);
    if (session.stream) {
      classStudents = classStudents.filter(s => s.stream === session.stream);
    }
    classStudents.sort((a, b) => a.name.localeCompare(b.name));
    setStudents(classStudents);

    try {
      const response = await fetch(`/api/test-scores/${session.id}`, { credentials: 'include' });
      if (response.ok) {
        const scores: TestScore[] = await response.json();
        const scoresMap: { [studentId: number]: TestScore } = {};
        scores.forEach(score => {
          scoresMap[score.studentId] = score;
        });
        setTestScores(scoresMap);
      }
    } catch (err) {
      console.error('Failed to load test scores:', err);
    }

    setLoading(false);
  };

  const convertToPercentage = (rawMark: number | undefined, maxMark: number | undefined): number | undefined => {
    if (rawMark === undefined || maxMark === undefined || maxMark === 0) return undefined;
    return Math.round((rawMark / maxMark) * 100);
  };

  const handleRawMarkChange = (studentId: number, subject: string, value: string) => {
    if (!selectedSession) return;

    const numVal = value === '' ? undefined : parseFloat(value);
    const maxMark = (selectedSession.maxMarks as any)[subject] || 10;

    if (numVal !== undefined && (numVal < 0 || numVal > maxMark)) {
      showMessage(`Mark must be between 0 and ${maxMark}`, 'error');
      return;
    }

    const convertedMark = convertToPercentage(numVal, maxMark);

    setTestScores(prev => {
      const existing = prev[studentId] || {
        testSessionId: selectedSession.id!,
        studentId,
        rawMarks: {},
        convertedMarks: {}
      };

      const newRawMarks = { ...existing.rawMarks, [subject]: numVal };
      const newConvertedMarks = { ...existing.convertedMarks, [subject]: convertedMark };

      const classLevel = selectedSession.classLevel as ClassLevel;
      const aggregate = calculateAggregate(newConvertedMarks as any, classLevel, settings?.gradingConfig);
      const division = calculateDivision(aggregate, classLevel, settings?.gradingConfig);

      return {
        ...prev,
        [studentId]: {
          ...existing,
          rawMarks: newRawMarks,
          convertedMarks: newConvertedMarks,
          aggregate,
          division
        }
      };
    });

    setHasUnsavedChanges(true);
  };

  const saveAllScores = async () => {
    if (!selectedSession?.id) return;

    setIsSaving(true);
    try {
      const scoresToSave = Object.values(testScores).filter((score: TestScore) =>
        Object.values(score.rawMarks).some(v => v !== undefined)
      );

      if (scoresToSave.length === 0) {
        showMessage('No scores to save', 'info');
        setIsSaving(false);
        return;
      }

      const response = await fetch('/api/test-scores/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scores: scoresToSave })
      });

      if (response.ok) {
        showMessage(`Saved scores for ${scoresToSave.length} students`, 'success');
        setHasUnsavedChanges(false);
      } else {
        showMessage('Failed to save scores', 'error');
      }
    } catch (err) {
      showMessage('Error saving scores', 'error');
    }
    setIsSaving(false);
  };

  const handleCreateSession = async () => {
    if (!newSession.name.trim()) {
      showMessage('Please enter a test name', 'error');
      return;
    }

    try {
      const response = await fetch('/api/test-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newSession)
      });

      if (response.ok) {
        showMessage('Test session created successfully', 'success');
        setShowSessionModal(false);
        setFilterTerm(newSession.term);
        setFilterClass(newSession.classLevel);
        setNewSession({
          name: '',
          testType: 'Weekly Test',
          classLevel: 'P7',
          stream: '',
          term: settings?.currentTerm || 1,
          year: settings?.currentYear || new Date().getFullYear(),
          testDate: new Date().toISOString().split('T')[0],
          maxMarks: { english: 10, maths: 10, science: 10, sst: 10, literacy1: 10, literacy2: 10 }
        });
        loadTestSessions();
      } else {
        showMessage('Failed to create test session', 'error');
      }
    } catch (err) {
      showMessage('Error creating test session', 'error');
    }
  };

  const handleUpdateSession = async () => {
    if (!editingSession?.id) return;

    try {
      const response = await fetch(`/api/test-sessions/${editingSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingSession)
      });

      if (response.ok) {
        showMessage('Test session updated successfully', 'success');
        setEditingSession(null);
        loadTestSessions();
      } else {
        showMessage('Failed to update test session', 'error');
      }
    } catch (err) {
      showMessage('Error updating test session', 'error');
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to delete this test session? All scores will be deleted.')) return;

    try {
      const response = await fetch(`/api/test-sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        showMessage('Test session deleted', 'success');
        loadTestSessions();
      } else {
        showMessage('Failed to delete test session', 'error');
      }
    } catch (err) {
      showMessage('Error deleting test session', 'error');
    }
  };

  const openScoreEntry = (session: TestSession) => {
    setSelectedSession(session);
    loadStudentsAndScores(session);
    setViewMode('entry');
  };

  const openResults = (session: TestSession) => {
    setSelectedSession(session);
    loadStudentsAndScores(session);
    setViewMode('results');
  };

  const filteredSessions = useMemo(() => {
    return testSessions.filter(session => {
      if (filterClass !== 'All' && session.classLevel !== filterClass) return false;
      if (filterTerm > 0 && session.term !== filterTerm) return false;
      if (searchQuery && !session.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [testSessions, filterClass, filterTerm, searchQuery]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.indexNumber?.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  const getSubjectLabel = (sub: string) => {
    const labels: { [key: string]: string } = {
      english: 'ENG',
      maths: 'MTC',
      science: 'SCI',
      sst: 'SST',
      literacy1: 'LIT1',
      literacy2: 'LIT2'
    };
    return labels[sub] || sub.toUpperCase();
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'D1' || grade === 'D2') return 'text-green-600 dark:text-green-400';
    if (['C3', 'C4', 'C5', 'C6'].includes(grade)) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getDivisionColor = (div: string) => {
    if (div === 'I') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (div === 'II') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    if (div === 'III') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (div === 'IV') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  const generateTestAssessmentSheet = async (session: TestSession) => {
    if (!settings) {
      showMessage('Settings not loaded. Please refresh the page.', 'error');
      return;
    }
    if (!session?.id) {
      showMessage('Invalid test session', 'error');
      return;
    }

    setLoading(true);
    showMessage('Generating PDF...', 'info');

    try {
      const allStudents = await dbService.getStudents();
      let classStudents = allStudents.filter(s => s.classLevel === session.classLevel);
      if (session.stream) {
        classStudents = classStudents.filter(s => s.stream === session.stream);
      }

      const scoresResponse = await fetch(`/api/test-scores/${session.id}`, { credentials: 'include' });
      const scores: TestScore[] = scoresResponse.ok ? await scoresResponse.json() : [];

      const scoresMap: { [studentId: number]: TestScore } = {};
      scores.forEach(score => {
        scoresMap[score.studentId] = score;
      });

      const sessionSubjects = ['P1', 'P2', 'P3'].includes(session.classLevel) ? SUBJECTS_LOWER : SUBJECTS_UPPER;

      const studentRows = classStudents.map(student => {
        const score = scoresMap[student.id!];
        const convertedMarks = score?.convertedMarks || {};
        let totalMarks = 0;
        sessionSubjects.forEach(sub => {
          const mark = (convertedMarks as any)[sub];
          if (mark !== undefined && mark !== null) {
            totalMarks += mark;
          }
        });
        return {
          student,
          score,
          convertedMarks,
          totalMarks,
          aggregate: score?.aggregate || 0,
          division: score?.division || ''
        };
      }).sort((a, b) => b.totalMarks - a.totalMarks);

      const studentsWithResults = studentRows.filter(r => r.totalMarks > 0);

      if (studentsWithResults.length === 0) {
        showMessage('No students have scores for this test', 'error');
        setLoading(false);
        return;
      }

      const doc = new jspdf.jsPDF('l', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;

      const colors = {
        primary: [123, 17, 19],
        darkBlue: [30, 58, 95],
        white: [255, 255, 255],
        cream: [253, 245, 230],
        text: [51, 51, 51],
        muted: [128, 128, 128],
        border: [200, 200, 200],
        lightGray: [248, 249, 250],
        green: [34, 197, 94],
        blue: [59, 130, 246],
        red: [239, 68, 68],
        purple: [139, 92, 246]
      };

      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, pageWidth, 3, 'F');

      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.3);
      doc.rect(margin - 2, 6, pageWidth - (margin * 2) + 4, pageHeight - 12, 'S');

      let headerY = 10;
      const logoSize = 16;

      if (settings.logoBase64) {
        try {
          let format = 'PNG';
          if (settings.logoBase64.startsWith('data:image/jpeg')) format = 'JPEG';
          doc.addImage(settings.logoBase64, format, pageWidth / 2 - logoSize / 2, headerY, logoSize, logoSize);
          headerY += logoSize + 2;
        } catch (e) { headerY += 2; }
      }

      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, headerY, { align: 'center' });
      headerY += 4;

      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(settings.addressBox || '', pageWidth / 2, headerY, { align: 'center' });
      headerY += 3;

      doc.setFontSize(7);
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      doc.text(`Tel: ${settings.contactPhones || 'N/A'}`, pageWidth / 2, headerY, { align: 'center' });
      headerY += 3;

      if (settings.motto) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.text(`"${settings.motto}"`, pageWidth / 2, headerY, { align: 'center' });
        headerY += 2;
      }

      doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setLineWidth(0.6);
      doc.line(margin + 40, headerY, pageWidth - margin - 40, headerY);
      headerY += 4;

      doc.setFillColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
      doc.rect(margin, headerY, pageWidth - (margin * 2), 7, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("TEST ASSESSMENT SHEET", pageWidth / 2, headerY + 5, { align: 'center' });
      headerY += 10;

      doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.2);
      doc.rect(margin, headerY, pageWidth - (margin * 2), 14, 'FD');

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

      const col1X = margin + 5;
      const col2X = margin + 80;
      const col3X = margin + 160;
      const infoY1 = headerY + 5;
      const infoY2 = headerY + 11;

      doc.setFont("helvetica", "bold");
      doc.text("Test:", col1X, infoY1);
      doc.setFont("helvetica", "normal");
      doc.text(session.name, col1X + 12, infoY1);

      doc.setFont("helvetica", "bold");
      doc.text("Class:", col2X, infoY1);
      doc.setFont("helvetica", "normal");
      doc.text(`${session.classLevel}${session.stream ? ' - ' + session.stream : ''}`, col2X + 15, infoY1);

      doc.setFont("helvetica", "bold");
      doc.text("Term:", col3X, infoY1);
      doc.setFont("helvetica", "normal");
      doc.text(`Term ${session.term}, ${session.year}`, col3X + 15, infoY1);

      doc.setFont("helvetica", "bold");
      doc.text("Type:", col1X, infoY2);
      doc.setFont("helvetica", "normal");
      doc.text(session.testType, col1X + 12, infoY2);

      doc.setFont("helvetica", "bold");
      doc.text("Date:", col2X, infoY2);
      doc.setFont("helvetica", "normal");
      doc.text(session.testDate ? new Date(session.testDate).toLocaleDateString() : '-', col2X + 15, infoY2);

      doc.setFont("helvetica", "bold");
      doc.text("Students:", col3X, infoY2);
      doc.setFont("helvetica", "normal");
      doc.text(`${studentsWithResults.length} with results`, col3X + 22, infoY2);

      headerY += 18;

      const subjectLabels: { [key: string]: string } = {
        english: 'ENG', maths: 'MTC', science: 'SCI', sst: 'SST', literacy1: 'LIT1', literacy2: 'LIT2'
      };

      const head = [[
        { content: 'POS', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
        { content: 'INDEX', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
        { content: 'STUDENT NAME', styles: { halign: 'left', fillColor: colors.primary, textColor: colors.white } },
        { content: 'SEX', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
        ...sessionSubjects.flatMap(sub => [
          { content: subjectLabels[sub] || sub.toUpperCase(), styles: { halign: 'center', fillColor: colors.darkBlue, textColor: colors.white } },
          { content: 'GR', styles: { halign: 'center', fillColor: colors.darkBlue, textColor: [200, 200, 200], fontSize: 6 } }
        ]),
        { content: 'TOT', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' } },
        { content: 'AGG', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' } },
        { content: 'DIV', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' } }
      ]];

      let currentRank = 0;
      let prevTotal = -1;

      const body = studentRows.map((row, index) => {
        if (row.totalMarks !== prevTotal && row.totalMarks > 0) {
          currentRank = index + 1;
        }
        prevTotal = row.totalMarks;

        const rowData: any[] = [
          row.totalMarks > 0 ? currentRank.toString() : '-',
          row.student.indexNumber || '-',
          row.student.name.toUpperCase(),
          row.student.gender === 'Male' ? 'M' : row.student.gender === 'Female' ? 'F' : '-'
        ];

        sessionSubjects.forEach(sub => {
          const mark = (row.convertedMarks as any)[sub];
          const { grade } = calculateGrade(mark, settings?.gradingConfig);
          rowData.push(mark !== undefined && mark !== null ? Math.round(mark) : '-');
          rowData.push(mark !== undefined && mark !== null ? grade : '-');
        });

        rowData.push(row.totalMarks > 0 ? Math.round(row.totalMarks) : '-');
        rowData.push(row.aggregate > 0 ? row.aggregate : '-');
        rowData.push(row.aggregate > 0 ? row.division : '-');

        return rowData;
      });

      const baseColIdx = 4 + (sessionSubjects.length * 2);
      const columnStyles: any = {
        0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 18, halign: 'center', fontSize: 7 },
        2: { cellWidth: 50, halign: 'left', fontStyle: 'bold' },
        3: { cellWidth: 10, halign: 'center' },
      };

      sessionSubjects.forEach((_, i) => {
        columnStyles[4 + (i * 2)] = { cellWidth: 18, halign: 'center' };
        columnStyles[4 + (i * 2) + 1] = { cellWidth: 8, halign: 'center', fontSize: 7, textColor: colors.muted };
      });

      columnStyles[baseColIdx] = { cellWidth: 14, halign: 'center', fontStyle: 'bold' };
      columnStyles[baseColIdx + 1] = { cellWidth: 12, halign: 'center', fontStyle: 'bold' };
      columnStyles[baseColIdx + 2] = { cellWidth: 12, halign: 'center', fontStyle: 'bold' };

      (doc as any).autoTable({
        startY: headerY,
        head: head,
        body: body,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.5,
          textColor: colors.text,
          lineColor: colors.border,
          lineWidth: 0.1,
          cellPadding: 1.2,
          valign: 'middle'
        },
        headStyles: { fontStyle: 'bold', halign: 'center', lineWidth: 0.1, lineColor: colors.white, minCellHeight: 7 },
        bodyStyles: { minCellHeight: 6 },
        alternateRowStyles: { fillColor: colors.lightGray },
        columnStyles: columnStyles,
        margin: { left: margin, right: margin },
        didParseCell: function (data: any) {
          if (data.section === 'body') {
            const colIdx = data.column.index;
            const divColIdx = baseColIdx + 2;

            if (colIdx === 0 && data.cell.raw !== '-') {
              const rank = parseInt(data.cell.raw);
              if (rank === 1) { data.cell.styles.textColor = [212, 175, 55]; data.cell.styles.fontStyle = 'bold'; }
              else if (rank === 2) { data.cell.styles.textColor = [156, 163, 175]; data.cell.styles.fontStyle = 'bold'; }
              else if (rank === 3) { data.cell.styles.textColor = [180, 83, 9]; data.cell.styles.fontStyle = 'bold'; }
            }

            if (colIdx === divColIdx) {
              const div = data.cell.raw;
              if (div === 'I') data.cell.styles.textColor = colors.green;
              else if (div === 'II') data.cell.styles.textColor = colors.blue;
              else if (div === 'III') data.cell.styles.textColor = [180, 140, 20];
              else if (div === 'IV') data.cell.styles.textColor = colors.purple;
              else if (div === 'U') data.cell.styles.textColor = colors.red;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      const tableEndY = (doc as any).lastAutoTable.finalY;
      let footerY = tableEndY + 6;

      if (footerY < pageHeight - 30) {
        const divCounts = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
        studentRows.forEach(r => {
          if (r.division && r.division in divCounts) {
            divCounts[r.division as keyof typeof divCounts]++;
          }
        });

        doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
        doc.rect(margin, footerY, pageWidth - (margin * 2), 10, 'F');

        doc.setFontSize(8);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        let divX = margin + 5;
        ['I', 'II', 'III', 'IV', 'U'].forEach((div, idx) => {
          const divColors = [colors.green, colors.blue, [180, 140, 20], colors.purple, colors.red];
          doc.setTextColor(divColors[idx][0], divColors[idx][1], divColors[idx][2]);
          doc.text(`DIV ${div}: ${divCounts[div as keyof typeof divCounts]}`, divX, footerY + 6);
          divX += 35;
        });

        const passCount = divCounts.I + divCounts.II + divCounts.III + divCounts.IV;
        const passRate = studentsWithResults.length > 0 ? Math.round((passCount / studentsWithResults.length) * 100) : 0;
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text(`Pass Rate: ${passRate}%`, pageWidth - margin - 40, footerY + 6);

        footerY += 14;
      }

      doc.setFontSize(7);
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      const gradingKey = settings?.gradingConfig?.grades
        .map(g => `${g.grade} (${g.minScore}-${g.maxScore})`)
        .join(', ') || "D1 (90-100), D2 (80-89), C3 (70-79), C4 (60-69), C5 (55-59), C6 (50-54), P7 (45-49), P8 (40-44), F9 (0-39)";
      doc.text(`Grading: ${gradingKey}`, pageWidth / 2, footerY, { align: 'center' });

      doc.setFontSize(6);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, pageHeight - 4);
      doc.text(settings.schoolName, pageWidth / 2, pageHeight - 4, { align: 'center' });

      const fileName = `${settings.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${session.name.replace(/[^a-zA-Z0-9]/g, '_')}_Assessment.pdf`;
      doc.save(fileName);
      showMessage('Assessment sheet generated successfully', 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      showMessage('Failed to generate PDF', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateStudentTermReport = async (student: Student) => {
    if (!settings) {
      showMessage('Settings not loaded. Please refresh the page.', 'error');
      return;
    }
    if (!selectedSession) {
      showMessage('Please select a test first', 'error');
      return;
    }
    if (!student?.id) {
      showMessage('Invalid student', 'error');
      return;
    }

    setLoading(true);
    showMessage('Generating student report...', 'info');

    try {
      const termTestsResponse = await fetch('/api/test-sessions', { credentials: 'include' });
      const allSessions: TestSession[] = termTestsResponse.ok ? await termTestsResponse.json() : [];

      const termSessions = allSessions.filter(s =>
        s.classLevel === student.classLevel &&
        s.term === selectedSession.term &&
        s.year === selectedSession.year &&
        (!s.stream || s.stream === student.stream)
      );

      if (termSessions.length === 0) {
        showMessage('No tests found for this student in this term', 'error');
        setLoading(false);
        return;
      }

      const studentScores: { session: TestSession; score: TestScore | null }[] = [];
      for (const session of termSessions) {
        const scoresResponse = await fetch(`/api/test-scores/${session.id}`, { credentials: 'include' });
        const scores: TestScore[] = scoresResponse.ok ? await scoresResponse.json() : [];
        const studentScore = scores.find(s => s.studentId === student.id) || null;
        studentScores.push({ session, score: studentScore });
      }

      const doc = new jspdf.jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      const colors = {
        primary: [123, 17, 19],
        darkBlue: [30, 58, 95],
        white: [255, 255, 255],
        cream: [253, 245, 230],
        text: [51, 51, 51],
        muted: [128, 128, 128],
        border: [200, 200, 200],
        lightGray: [248, 249, 250],
        green: [34, 197, 94],
        blue: [59, 130, 246],
        red: [239, 68, 68]
      };

      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, pageWidth, 3, 'F');

      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.3);
      doc.rect(margin - 2, 6, pageWidth - (margin * 2) + 4, pageHeight - 12, 'S');

      let headerY = 12;
      const logoSize = 18;

      if (settings.logoBase64) {
        try {
          let format = 'PNG';
          if (settings.logoBase64.startsWith('data:image/jpeg')) format = 'JPEG';
          doc.addImage(settings.logoBase64, format, pageWidth / 2 - logoSize / 2, headerY, logoSize, logoSize);
          headerY += logoSize + 3;
        } catch (e) { headerY += 2; }
      }

      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, headerY, { align: 'center' });
      headerY += 5;

      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(settings.addressBox || '', pageWidth / 2, headerY, { align: 'center' });
      headerY += 4;

      doc.setFontSize(8);
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      doc.text(`Tel: ${settings.contactPhones || 'N/A'}`, pageWidth / 2, headerY, { align: 'center' });
      headerY += 4;

      if (settings.motto) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
        doc.text(`"${settings.motto}"`, pageWidth / 2, headerY, { align: 'center' });
        headerY += 3;
      }

      doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setLineWidth(0.8);
      doc.line(margin + 20, headerY, pageWidth - margin - 20, headerY);
      headerY += 6;

      doc.setFillColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
      doc.rect(margin, headerY, pageWidth - (margin * 2), 8, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("STUDENT TERM PROGRESS REPORT", pageWidth / 2, headerY + 5.5, { align: 'center' });
      headerY += 12;

      const infoBoxY = headerY;
      const infoBoxHeight = 18;
      doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.2);
      doc.rect(margin, infoBoxY, pageWidth - (margin * 2), infoBoxHeight, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

      const contentWidth = pageWidth - (margin * 2);
      const col1X = margin + 5;
      const col2X = margin + contentWidth * 0.4;
      const col3X = margin + contentWidth * 0.72;
      const infoY1 = infoBoxY + 6;
      const infoY2 = infoBoxY + 13;

      const testsWithScores = studentScores.filter(s => s.score && Object.values(s.score.convertedMarks).some(v => v !== undefined)).length;

      doc.setFont("helvetica", "bold");
      doc.text("Student: ", col1X, infoY1);
      doc.setFont("helvetica", "normal");
      doc.text(student.name.toUpperCase(), col1X + doc.getTextWidth("Student: "), infoY1);

      doc.setFont("helvetica", "bold");
      doc.text("Index: ", col2X, infoY1);
      doc.setFont("helvetica", "normal");
      doc.text(student.indexNumber || '-', col2X + doc.getTextWidth("Index: "), infoY1);

      doc.setFont("helvetica", "bold");
      doc.text("Term: ", col3X, infoY1);
      doc.setFont("helvetica", "normal");
      doc.text(`Term ${selectedSession.term}, ${selectedSession.year}`, col3X + doc.getTextWidth("Term: "), infoY1);

      doc.setFont("helvetica", "bold");
      doc.text("Class: ", col1X, infoY2);
      doc.setFont("helvetica", "normal");
      doc.text(`${student.classLevel}${student.stream ? ' - ' + student.stream : ''}`, col1X + doc.getTextWidth("Class: "), infoY2);

      doc.setFont("helvetica", "bold");
      doc.text("Gender: ", col2X, infoY2);
      doc.setFont("helvetica", "normal");
      const g = String(student.gender || '').toLowerCase();
      const genderDisplay = g.startsWith('m') ? 'M' : g.startsWith('f') ? 'F' : (student.gender || '-');
      doc.text(genderDisplay, col2X + doc.getTextWidth("Gender: "), infoY2);

      doc.setFont("helvetica", "bold");
      doc.text("Tests Taken: ", col3X, infoY2);
      doc.setFont("helvetica", "normal");
      doc.text(`${testsWithScores} of ${termSessions.length}`, col3X + doc.getTextWidth("Tests Taken: "), infoY2);

      let y = infoBoxY + infoBoxHeight + 4;

      const sessionSubjects = ['P1', 'P2', 'P3'].includes(student.classLevel) ? SUBJECTS_LOWER : SUBJECTS_UPPER;
      const subjectLabels: { [key: string]: string } = {
        english: 'ENG', maths: 'MTC', science: 'SCI', sst: 'SST', literacy1: 'LIT1', literacy2: 'LIT2'
      };

      const head = [[
        { content: 'TEST NAME', styles: { halign: 'left', fillColor: colors.primary, textColor: colors.white } },
        { content: 'DATE', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
        ...sessionSubjects.map(sub => ({
          content: subjectLabels[sub] || sub.toUpperCase(),
          styles: { halign: 'center', fillColor: colors.darkBlue, textColor: colors.white }
        })),
        { content: 'TOT', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
        { content: 'AGG', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
        { content: 'DIV', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } }
      ]];

      const body = studentScores.map(({ session, score }) => {
        const rowData: any[] = [
          session.name,
          session.testDate ? new Date(session.testDate).toLocaleDateString() : '-'
        ];

        let total = 0;
        sessionSubjects.forEach(sub => {
          const mark = score ? (score.convertedMarks as any)[sub] : undefined;
          if (mark !== undefined && mark !== null) {
            total += mark;
            const { grade } = calculateGrade(mark, settings?.gradingConfig);
            rowData.push(`${Math.round(mark)} (${grade})`);
          } else {
            rowData.push('-');
          }
        });

        rowData.push(total > 0 ? Math.round(total) : '-');
        rowData.push(score?.aggregate || '-');
        rowData.push(score?.division || '-');

        return rowData;
      });

      const availableWidth = pageWidth - (margin * 2);
      const numSubjects = sessionSubjects.length;
      const fixedColsWidth = 32 + 18 + 14 + 12 + 12;
      const subjectColWidth = Math.floor((availableWidth - fixedColsWidth) / numSubjects);

      const columnStyles: any = {
        0: { cellWidth: 32, halign: 'left', fontSize: 8 },
        1: { cellWidth: 18, halign: 'center', fontSize: 7 }
      };
      sessionSubjects.forEach((_, i) => {
        columnStyles[2 + i] = { cellWidth: subjectColWidth, halign: 'center', fontSize: 7 };
      });
      const totIdx = 2 + sessionSubjects.length;
      columnStyles[totIdx] = { cellWidth: 14, halign: 'center', fontStyle: 'bold', fontSize: 8 };
      columnStyles[totIdx + 1] = { cellWidth: 12, halign: 'center', fontStyle: 'bold', fontSize: 8 };
      columnStyles[totIdx + 2] = { cellWidth: 12, halign: 'center', fontStyle: 'bold', fontSize: 8 };

      (doc as any).autoTable({
        startY: y,
        head: head,
        body: body,
        theme: 'grid',
        tableWidth: 'auto',
        styles: {
          font: 'helvetica',
          fontSize: 7,
          textColor: colors.text,
          lineColor: colors.border,
          lineWidth: 0.1,
          cellPadding: 1.5,
          valign: 'middle',
          overflow: 'ellipsize'
        },
        headStyles: { fontStyle: 'bold', halign: 'center', minCellHeight: 7, fontSize: 7 },
        bodyStyles: { minCellHeight: 6 },
        alternateRowStyles: { fillColor: colors.lightGray },
        columnStyles: columnStyles,
        margin: { left: margin, right: margin },
        didParseCell: function (data: any) {
          if (data.section === 'body') {
            const divColIdx = totIdx + 2;
            if (data.column.index === divColIdx) {
              const div = data.cell.raw;
              if (div === 'I') data.cell.styles.textColor = colors.green;
              else if (div === 'II') data.cell.styles.textColor = colors.blue;
              else if (div === 'III') data.cell.styles.textColor = [180, 140, 20];
              else if (div === 'IV') data.cell.styles.textColor = [139, 92, 246];
              else if (div === 'U') data.cell.styles.textColor = colors.red;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      const tableEndY = (doc as any).lastAutoTable.finalY;
      let summaryY = tableEndY + 10;

      const validScores = studentScores.filter(s => s.score && s.score.aggregate && s.score.aggregate > 0);
      if (validScores.length > 0) {
        const avgAggregate = validScores.reduce((sum, s) => sum + (s.score?.aggregate || 0), 0) / validScores.length;
        const bestTest = validScores.reduce((best, current) =>
          (current.score?.aggregate || 99) < (best.score?.aggregate || 99) ? current : best
        );

        const subjectAverages: { [key: string]: number } = {};
        sessionSubjects.forEach(sub => {
          const marks = validScores.map(s => (s.score?.convertedMarks as any)?.[sub]).filter(m => m !== undefined);
          if (marks.length > 0) {
            subjectAverages[sub] = marks.reduce((a, b) => a + b, 0) / marks.length;
          }
        });

        doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
        doc.rect(margin, summaryY, pageWidth - (margin * 2), 38, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
        doc.text("TERM SUMMARY", margin + 5, summaryY + 8);

        doc.setDrawColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
        doc.setLineWidth(0.3);
        doc.line(margin + 5, summaryY + 10, margin + 50, summaryY + 10);

        doc.setFontSize(9);
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

        const labelX = margin + 8;
        const valueX = margin + 50;

        doc.setFont("helvetica", "bold");
        doc.text("Average Aggregate:", labelX, summaryY + 18);
        doc.setFont("helvetica", "normal");
        doc.text(avgAggregate.toFixed(1), valueX, summaryY + 18);

        doc.setFont("helvetica", "bold");
        doc.text("Best Performance:", labelX, summaryY + 25);
        doc.setFont("helvetica", "normal");
        doc.text(`${bestTest.session.name} (Agg: ${bestTest.score?.aggregate}, Div: ${bestTest.score?.division})`, valueX, summaryY + 25);

        doc.setFont("helvetica", "bold");
        doc.text("Subject Averages:", labelX, summaryY + 32);
        doc.setFont("helvetica", "normal");

        const subjectTexts: string[] = [];
        sessionSubjects.forEach(sub => {
          const avg = subjectAverages[sub];
          if (avg !== undefined) {
            const { grade } = calculateGrade(avg, settings?.gradingConfig);
            subjectTexts.push(`${subjectLabels[sub]}: ${Math.round(avg)}% (${grade})`);
          }
        });
        doc.text(subjectTexts.join('   |   '), valueX, summaryY + 32);

        summaryY += 43;
      }

      doc.setFontSize(7);
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      const gradingKey = settings?.gradingConfig?.grades
        .map(g => `${g.grade} (${g.minScore}-${g.maxScore})`)
        .join(', ') || "D1 (90-100), D2 (80-89), C3 (70-79), C4 (60-69), C5 (55-59), C6 (50-54), P7 (45-49), P8 (40-44), F9 (0-39)";
      doc.text(`Grading Scale: ${gradingKey}`, pageWidth / 2, summaryY + 5, { align: 'center' });

      doc.setFontSize(6);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, pageHeight - 6);
      doc.text(settings.schoolName, pageWidth / 2, pageHeight - 6, { align: 'center' });

      const fileName = `${student.name.replace(/[^a-zA-Z0-9]/g, '_')}_Term${selectedSession.term}_Progress_Report.pdf`;
      doc.save(fileName);
      showMessage('Student report generated successfully', 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      showMessage('Failed to generate student report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const classStats = useMemo(() => {
    if (students.length === 0 || Object.keys(testScores).length === 0) return null;

    const studentsWithScores = students.filter(s => {
      const score = testScores[s.id!];
      return score && Object.values(score.convertedMarks).some(v => v !== undefined);
    });

    if (studentsWithScores.length === 0) return null;

    const divCounts = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
    let totalAggregate = 0;
    let validAggregates = 0;

    studentsWithScores.forEach(s => {
      const score = testScores[s.id!];
      if (score?.division && score.division in divCounts) {
        divCounts[score.division as keyof typeof divCounts]++;
      }
      if (score?.aggregate && score.aggregate > 0) {
        totalAggregate += score.aggregate;
        validAggregates++;
      }
    });

    const passCount = divCounts.I + divCounts.II + divCounts.III + divCounts.IV;
    const passRate = studentsWithScores.length > 0 ? Math.round((passCount / studentsWithScores.length) * 100) : 0;
    const avgAggregate = validAggregates > 0 ? (totalAggregate / validAggregates).toFixed(1) : '-';

    return {
      total: students.length,
      withScores: studentsWithScores.length,
      divCounts,
      passRate,
      avgAggregate
    };
  }, [students, testScores]);

  const getStreamsForClass = (classLevel: string) => {
    if (!settings?.streams) return [];
    return settings.streams[classLevel] || [];
  };

  const renderSessionModal = () => {
    const session = editingSession || newSession;
    const setSession = editingSession ? setEditingSession : setNewSession;
    const isEditing = !!editingSession;
    const sessionSubjects = ['P1', 'P2', 'P3'].includes(session.classLevel) ? SUBJECTS_LOWER : SUBJECTS_UPPER;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Test Session' : 'Create New Test Session'}
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Name *</label>
                <input
                  type="text"
                  value={session.name}
                  onChange={e => setSession({ ...session, name: e.target.value } as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Week 3 Math Test"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Type</label>
                <select
                  value={session.testType}
                  onChange={e => setSession({ ...session, testType: e.target.value } as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  {TEST_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
                <select
                  value={session.classLevel}
                  onChange={e => setSession({ ...session, classLevel: e.target.value, stream: '' } as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  {Object.values(ClassLevel).map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stream (Optional)</label>
                <select
                  value={session.stream || ''}
                  onChange={e => setSession({ ...session, stream: e.target.value } as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Streams</option>
                  {getStreamsForClass(session.classLevel).map(stream => (
                    <option key={stream} value={stream}>{stream}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Date</label>
                <input
                  type="date"
                  value={session.testDate || ''}
                  onChange={e => setSession({ ...session, testDate: e.target.value } as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Term</label>
                <select
                  value={session.term}
                  onChange={e => setSession({ ...session, term: parseInt(e.target.value) } as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value={1}>Term 1</option>
                  <option value={2}>Term 2</option>
                  <option value={3}>Term 3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                <input
                  type="number"
                  value={session.year}
                  onChange={e => setSession({ ...session, year: parseInt(e.target.value) } as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Maximum Marks per Subject</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Enter the maximum marks for each subject in this test (e.g., 10, 20, 50, etc.)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sessionSubjects.map(sub => (
                  <div key={sub} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 uppercase">{getSubjectLabel(sub)}</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={(session.maxMarks as any)[sub] || 10}
                      onChange={e => setSession({
                        ...session,
                        maxMarks: { ...session.maxMarks, [sub]: parseInt(e.target.value) || 10 }
                      } as any)}
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center font-medium"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={() => { setShowSessionModal(false); setEditingSession(null); }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={isEditing ? handleUpdateSession : handleCreateSession}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Icons.Check className="w-4 h-4" />
              {isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSessionsList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weekly Tests</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage homework, quizzes, and weekly assessments</p>
        </div>
        <button
          onClick={() => setShowSessionModal(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2 self-start"
        >
          <Icons.Plus className="w-4 h-4" />
          New Test
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search tests..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="All">All Classes</option>
            {Object.values(ClassLevel).map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          <select
            value={filterTerm}
            onChange={e => setFilterTerm(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={0}>All Terms</option>
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-12">
          <Icons.ClipboardList className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No test sessions found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Create a new test to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map(session => (
            <div key={session.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{session.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{session.testType}</p>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded">
                  {session.classLevel}{session.stream ? ` - ${session.stream}` : ''}
                </span>
              </div>

              <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
                <span>Term {session.term}</span>
                <span>•</span>
                <span>{session.year}</span>
                {session.testDate && (
                  <>
                    <span>•</span>
                    <span>{new Date(session.testDate).toLocaleDateString()}</span>
                  </>
                )}
              </div>

              <div className="flex gap-2 text-xs mb-4">
                {(['P1', 'P2', 'P3'].includes(session.classLevel) ? SUBJECTS_LOWER : SUBJECTS_UPPER).map(sub => (
                  <span key={sub} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    {getSubjectLabel(sub)}: {(session.maxMarks as any)[sub] || 10}
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => openScoreEntry(session)}
                  className="flex-1 px-3 py-2 text-sm bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors flex items-center justify-center gap-1"
                >
                  <Icons.Edit className="w-4 h-4" />
                  Enter Scores
                </button>
                <button
                  onClick={() => openResults(session)}
                  className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="View Results"
                >
                  <Icons.BarChart className="w-4 h-4" />
                </button>
                <button
                  onClick={() => generateTestAssessmentSheet(session)}
                  disabled={loading}
                  className="px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  title="Download Assessment Sheet"
                >
                  <Icons.FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingSession(session)}
                  className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  title="Edit"
                >
                  <Icons.Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteSession(session.id!)}
                  className="px-3 py-2 text-sm bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                  title="Delete"
                >
                  <Icons.Trash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderScoreEntry = () => {
    if (!selectedSession) return null;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <button
              onClick={() => { setViewMode('sessions'); setSelectedSession(null); setSearchQuery(''); }}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline mb-2"
            >
              ← Back to Tests
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedSession.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {selectedSession.classLevel}{selectedSession.stream ? ` - ${selectedSession.stream}` : ''} • {selectedSession.testType} • Term {selectedSession.term}, {selectedSession.year}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveAllScores}
              disabled={isSaving || !hasUnsavedChanges}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${hasUnsavedChanges
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
            >
              <Icons.Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {students.length} students • {Object.values(testScores).filter((s: TestScore) => Object.values(s.rawMarks).some(v => v !== undefined)).length} with scores
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-16">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Student</th>
                    {subjects.map(sub => (
                      <th key={sub} className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider" style={{ minWidth: '100px' }}>
                        <div>{getSubjectLabel(sub)}</div>
                        <div className="text-gray-400 font-normal">/{(selectedSession.maxMarks as any)[sub] || 10}</div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">AGG</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">DIV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredStudents.map((student, idx) => {
                    const score = testScores[student.id!] || { rawMarks: {}, convertedMarks: {}, aggregate: 0, division: '' };
                    return (
                      <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white text-sm">{student.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{student.indexNumber}</div>
                        </td>
                        {subjects.map(sub => {
                          const rawMark = (score.rawMarks as any)?.[sub];
                          const convertedMark = (score.convertedMarks as any)?.[sub];
                          const grade = convertedMark !== undefined ? calculateGrade(convertedMark, settings?.gradingConfig).grade : '-';
                          return (
                            <td key={sub} className="px-2 py-2">
                              <div className="flex flex-col items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max={(selectedSession.maxMarks as any)[sub] || 10}
                                  value={rawMark ?? ''}
                                  onChange={e => handleRawMarkChange(student.id!, sub, e.target.value)}
                                  className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                                  placeholder="0"
                                />
                                {convertedMark !== undefined && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">{convertedMark}%</span>
                                    <span className={`font-medium ${getGradeColor(grade)}`}>{grade}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">
                          {score.aggregate && score.aggregate > 0 ? score.aggregate : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {score.division ? (
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getDivisionColor(score.division)}`}>
                              {score.division}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => {
    if (!selectedSession) return null;

    const sortedStudents = [...students].sort((a, b) => {
      const scoreA = testScores[a.id!];
      const scoreB = testScores[b.id!];
      const aggA = scoreA?.aggregate || 999;
      const aggB = scoreB?.aggregate || 999;
      return aggA - aggB;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <button
              onClick={() => { setViewMode('sessions'); setSelectedSession(null); setSearchQuery(''); }}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline mb-2"
            >
              ← Back to Tests
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedSession.name} - Results</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {selectedSession.classLevel}{selectedSession.stream ? ` - ${selectedSession.stream}` : ''} • Term {selectedSession.term}, {selectedSession.year}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              💡 Click on a student's name to generate their term progress report
            </p>
          </div>
          <button
            onClick={() => generateTestAssessmentSheet(selectedSession)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 self-start"
          >
            <Icons.FileText className="w-4 h-4" />
            {loading ? 'Generating...' : 'Download Assessment Sheet'}
          </button>
        </div>

        {classStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Students</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{classStats.withScores}/{classStats.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pass Rate</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{classStats.passRate}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Aggregate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{classStats.avgAggregate}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Division I</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{classStats.divCounts.I}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Division U</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{classStats.divCounts.U}</p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Pos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Student</th>
                  {subjects.map(sub => (
                    <th key={sub} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                      {getSubjectLabel(sub)}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Agg</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Div</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sortedStudents.map((student, idx) => {
                  const score = testScores[student.id!];
                  if (!score || !Object.values(score.convertedMarks).some(v => v !== undefined)) return null;

                  return (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <span className={`w-7 h-7 inline-flex items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                            idx === 1 ? 'bg-gray-100 text-gray-700' :
                              idx === 2 ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => generateStudentTermReport(student)}
                          disabled={loading}
                          className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 hover:underline text-left"
                          title="Click to generate term progress report"
                        >
                          {student.name}
                        </button>
                      </td>
                      {subjects.map(sub => {
                        const raw = (score.rawMarks as any)?.[sub];
                        const converted = (score.convertedMarks as any)?.[sub];
                        const maxMark = (selectedSession.maxMarks as any)[sub] || 10;
                        const grade = converted !== undefined ? calculateGrade(converted).grade : '-';
                        return (
                          <td key={sub} className="px-3 py-3 text-center">
                            {raw !== undefined ? (
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{raw}/{maxMark}</div>
                                <div className="text-xs">
                                  <span className="text-gray-500">{converted}%</span>
                                  <span className={`ml-1 font-medium ${getGradeColor(grade)}`}>{grade}</span>
                                </div>
                              </div>
                            ) : '-'}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">
                        {score.aggregate || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {score.division ? (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getDivisionColor(score.division)}`}>
                            {score.division}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${messageType === 'success' ? 'bg-green-500 text-white' :
            messageType === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
          }`}>
          {messageType === 'success' && <Icons.Check className="w-5 h-5" />}
          {messageType === 'error' && <Icons.X className="w-5 h-5" />}
          <span>{message}</span>
        </div>
      )}

      {(showSessionModal || editingSession) && renderSessionModal()}

      {viewMode === 'sessions' && renderSessionsList()}
      {viewMode === 'entry' && renderScoreEntry()}
      {viewMode === 'results' && renderResults()}
    </div>
  );
};
