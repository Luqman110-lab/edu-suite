import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TestSession, TestScore, Student, ClassLevel } from '../types';
import { calculateAggregate, calculateDivision } from '../services/grading';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { useStudents } from '../client/src/hooks/useStudents';
import { useSettings } from '../client/src/hooks/useSettings';
import { Toast } from '../client/src/components/Toast';
import { TestList } from '../client/src/components/tests/TestList';
import { TestModal } from '../client/src/components/tests/TestModal';
import { TestScoresEntry } from '../client/src/components/tests/TestScoresEntry';
import { TestAnalytics } from '../client/src/components/tests/TestAnalytics';
import { generateTestAssessmentSheet, generateStudentTermReport } from '../client/src/services/testsReportService';

type ViewMode = 'sessions' | 'entry' | 'results';

export const Tests: React.FC = () => {
  const { isArchiveMode, selectedYear } = useAcademicYear();

  const { settings, isLoading: settingsLoading } = useSettings();
  const { students: allStudents, isLoading: studentsLoading } = useStudents(isArchiveMode ? String(selectedYear) : undefined);

  const [viewMode, setViewMode] = useState<ViewMode>('sessions');
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<TestSession | null>(null);

  const students = useMemo(() => {
    if (!selectedSession || !allStudents) return [];
    let classStudents = allStudents.filter(s => s.classLevel === selectedSession.classLevel);
    if (selectedSession.stream) {
      classStudents = classStudents.filter(s => s.stream === selectedSession.stream);
    }
    return classStudents.sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedSession, allStudents]);

  const [testScores, setTestScores] = useState<{ [studentId: number]: TestScore }>({});

  const [apiLoading, setApiLoading] = useState(false);
  // const loading = studentsLoading || settingsLoading || apiLoading; // Not using simplified var to avoid unused warnings effectively
  const loading = studentsLoading || settingsLoading || apiLoading;

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
    term: settings?.currentTerm || 1,
    year: settings?.currentYear || new Date().getFullYear(),
    testDate: new Date().toISOString().split('T')[0],
    maxMarks: { english: 10, maths: 10, science: 10, sst: 10, literacy1: 10, literacy2: 10 }
  });

  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterTerm, setFilterTerm] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const showMessageFn = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  }, []);

  // Sync settings
  useEffect(() => {
    if (settings?.currentTerm) {
      if (filterTerm === 0) setFilterTerm(settings.currentTerm);
    }
  }, [settings]);

  useEffect(() => {
    loadTestSessions();
  }, []);

  const loadTestSessions = async () => {
    setApiLoading(true);
    try {
      const response = await fetch('/api/test-sessions', { credentials: 'include' });
      if (response.ok) {
        const sessions = await response.json();
        setTestSessions(sessions);
      }
    } catch (err) {
      console.error('Failed to load test sessions:', err);
    } finally {
      setApiLoading(false);
    }
  };

  const loadTestScores = async (session: TestSession) => {
    if (!session.id) return;
    setApiLoading(true);
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
    setApiLoading(false);
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
      showMessageFn(`Mark must be between 0 and ${maxMark}`, 'error');
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
        showMessageFn('No scores to save', 'info');
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
        showMessageFn(`Saved scores for ${scoresToSave.length} students`, 'success');
        setHasUnsavedChanges(false);
      } else {
        showMessageFn('Failed to save scores', 'error');
      }
    } catch (err) {
      showMessageFn('Error saving scores', 'error');
    }
    setIsSaving(false);
  };

  const handleCreateSession = async () => {
    if (!newSession.name.trim()) {
      showMessageFn('Please enter a test name', 'error');
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
        showMessageFn('Test session created successfully', 'success');
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
        showMessageFn('Failed to create test session', 'error');
      }
    } catch (err) {
      showMessageFn('Error creating test session', 'error');
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
        showMessageFn('Test session updated successfully', 'success');
        setEditingSession(null);
        setShowSessionModal(false); // Close modal on update
        loadTestSessions();
      } else {
        showMessageFn('Failed to update test session', 'error');
      }
    } catch (err) {
      showMessageFn('Error updating test session', 'error');
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
        showMessageFn('Test session deleted', 'success');
        loadTestSessions();
      } else {
        showMessageFn('Failed to delete test session', 'error');
      }
    } catch (err) {
      showMessageFn('Error deleting test session', 'error');
    }
  };

  const filteredSessions = useMemo(() => {
    return testSessions.filter(session => {
      if (filterClass !== 'All' && session.classLevel !== filterClass) return false;
      if (filterTerm > 0 && session.term !== filterTerm) return false;
      if (searchQuery && !session.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [testSessions, filterClass, filterTerm, searchQuery]);

  const handleGenerateAssessmentSheet = (session: TestSession) => {
    if (!selectedSession && session) {
      // If called from list view without opening, fetch scores first?
      // Actually the list view call passes the session, we need scores.
      // For now, let's just use the service but we need scores.
      // Simplest way: load scores then generate.
      loadTestScores(session).then(() => {
        // However, state update is async.
        // Better approach: fetch directly inside service or pass callback?
        // The extract service takes 'scores' as argument.
        // We'll fetch them freshly here.
        fetch(`/api/test-scores/${session.id}`).then(res => res.json()).then(scores => {
          const scoresMap: { [studentId: number]: TestScore } = {};
          scores.forEach((s: TestScore) => scoresMap[s.studentId] = s);

          // Filter students for this session
          let classStudents = allStudents?.filter(s => s.classLevel === session.classLevel) || [];
          if (session.stream) {
            classStudents = classStudents.filter(s => s.stream === session.stream);
          }

          generateTestAssessmentSheet(session, classStudents, scoresMap, settings!, showMessageFn);
        });
      });
    } else if (selectedSession?.id === session.id) {
      generateTestAssessmentSheet(session, students, testScores, settings!, showMessageFn);
    } else {
      // Fallback same as first case
      loadTestScores(session).then(() => {
        fetch(`/api/test-scores/${session.id}`).then(res => res.json()).then(scores => {
          const scoresMap: { [studentId: number]: TestScore } = {};
          scores.forEach((s: TestScore) => scoresMap[s.studentId] = s);
          let classStudents = allStudents?.filter(s => s.classLevel === session.classLevel) || [];
          if (session.stream) {
            classStudents = classStudents.filter(s => s.stream === session.stream);
          }
          generateTestAssessmentSheet(session, classStudents, scoresMap, settings!, showMessageFn);
        });
      });
    }
  };


  return (
    <div className="animate-in fade-in duration-500">
      {message && <Toast message={message} type={messageType} onClose={() => setMessage('')} />}

      {viewMode === 'sessions' && (
        <TestList
          sessions={filteredSessions}
          loading={loading}
          filterClass={filterClass}
          setFilterClass={setFilterClass}
          filterTerm={filterTerm}
          setFilterTerm={setFilterTerm}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onAddSession={() => {
            setEditingSession(null);
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
            setShowSessionModal(true);
          }}
          onEditSession={(session) => {
            setEditingSession(session);
            setShowSessionModal(true);
          }}
          onDeleteSession={handleDeleteSession}
          onEnterScores={(session) => {
            setSelectedSession(session);
            loadTestScores(session);
            setViewMode('entry');
          }}
          onViewResults={(session) => {
            setSelectedSession(session);
            loadTestScores(session);
            setViewMode('results');
          }}
          onDownloadSheet={handleGenerateAssessmentSheet}
        />
      )}

      {viewMode === 'entry' && selectedSession && (
        <TestScoresEntry
          session={selectedSession}
          students={students}
          testScores={testScores}
          loading={loading}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          handleRawMarkChange={handleRawMarkChange}
          saveAllScores={saveAllScores}
          onBack={() => {
            setViewMode('sessions');
            setSelectedSession(null);
            setSearchQuery('');
            setTestScores({});
            setHasUnsavedChanges(false);
          }}
          settings={settings || null}
        />
      )}

      {viewMode === 'results' && selectedSession && (
        <TestAnalytics
          session={selectedSession}
          students={students}
          testScores={testScores}
          onBack={() => {
            setViewMode('sessions');
            setSelectedSession(null);
            setSearchQuery('');
            setTestScores({});
          }}
          onGenerateReport={(student) => generateStudentTermReport(student, selectedSession, settings!, showMessageFn)}
          settings={settings || null}
        />
      )}

      <TestModal
        isOpen={showSessionModal}
        isEditing={!!editingSession}
        session={editingSession || newSession}
        setSession={editingSession ? setEditingSession as any : setNewSession}
        onClose={() => {
          setShowSessionModal(false);
          setEditingSession(null);
        }}
        onSave={editingSession ? handleUpdateSession : handleCreateSession}
        streams={settings?.streams}
      />
    </div>
  );
};
