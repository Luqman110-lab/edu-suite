import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ApiMarkRecord, ClassLevel, AssessmentType, SUBJECTS_UPPER, SUBJECTS_LOWER } from '../types';
import { useStudents } from '../client/src/hooks/useStudents';
import { useMarks } from '../client/src/hooks/useMarks';
import { useSettings } from '../client/src/hooks/useSettings';
import { useTeachers } from '../client/src/hooks/useTeachers';
import { useTheme } from '../contexts/ThemeContext';
import { useStreams } from '../client/src/hooks/useClassAssignments';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { Toast } from '../client/src/components/Toast';

import { ReportFilters } from '../client/src/components/reports/ReportFilters';
import { ReportStats } from '../client/src/components/reports/ReportStats';
import { ReportGenerator } from '../client/src/components/reports/ReportGenerator';
import { StudentReportList } from '../client/src/components/reports/StudentReportList';

import { calculatePositionFromMarks, generateReportsPDF, exportReportsToExcel, exportReportsToCSV } from '../client/src/services/reportsService';

export const Reports: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedYear, isArchiveMode } = useAcademicYear();

  // State
  const [selectedClass, setSelectedClass] = useState<ClassLevel>(ClassLevel.P7);
  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [reportType, setReportType] = useState<AssessmentType>(AssessmentType.EOT);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());

  // Hooks
  const { students: allStudents, isLoading: studentsLoading } = useStudents(isArchiveMode ? String(selectedYear) : undefined);
  const { marks: allMarks, isLoading: marksLoading } = useMarks(isArchiveMode ? selectedYear : undefined);
  const { teachers: allTeachers, isLoading: teachersLoading } = useTeachers();
  const { settings, isLoading: settingsLoading } = useSettings();
  const { streams } = useStreams();

  const loading = studentsLoading || marksLoading || teachersLoading || settingsLoading;
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('success');
  const [generating, setGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0 });

  const showMessageFn = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  }, []);

  // Effects
  useEffect(() => {
    if (settings) {
      setSelectedTerm(settings.currentTerm);
    }
  }, [settings]);

  useEffect(() => {
    if (streams && selectedStream !== 'All') {
      const classStreams = streams.filter(s => s.classLevel === selectedClass).map(s => s.streamName);
      if (!classStreams.includes(selectedStream)) {
        setSelectedStream('All');
      }
    }
  }, [selectedClass, streams]);

  // Data Processing
  const studentPreviews = useMemo(() => {
    if (!allStudents || !allMarks || !settings) return [];

    let classStudents = allStudents.filter(s => s.classLevel === selectedClass);
    if (selectedStream !== 'All') {
      classStudents = classStudents.filter(s => s.stream === selectedStream);
    }

    const year = settings.currentYear || new Date().getFullYear();
    const subjects = ['P1', 'P2', 'P3'].includes(selectedClass) ? SUBJECTS_LOWER : SUBJECTS_UPPER;

    const wholeClassStudents = allStudents.filter(s => s.classLevel === selectedClass);

    const classBotMarks = allMarks.filter(m =>
      m.term === selectedTerm &&
      m.year === year &&
      m.type === AssessmentType.BOT &&
      wholeClassStudents.some(s => s.id === m.studentId)
    );

    const classEotMarks = allMarks.filter(m =>
      m.term === selectedTerm &&
      m.year === year &&
      m.type === AssessmentType.EOT &&
      wholeClassStudents.some(s => s.id === m.studentId)
    );

    return classStudents.map(student => {
      const botRecord = classBotMarks.find(m => m.studentId === student.id) || null;
      const eotRecord = classEotMarks.find(m => m.studentId === student.id) || null;

      const currentRecord = reportType === AssessmentType.BOT ? botRecord : eotRecord;
      const hasMissingMarks = !currentRecord || !currentRecord.marks ||
        subjects.some(subj => {
          const key = subj.toLowerCase().replace(' ', '') as any;
          return (currentRecord.marks as any)[key] === undefined || (currentRecord.marks as any)[key] === null;
        });

      return {
        student,
        botMarks: botRecord,
        eotMarks: eotRecord,
        botPosition: calculatePositionFromMarks(student.id!, classBotMarks, selectedClass),
        eotPosition: calculatePositionFromMarks(student.id!, classEotMarks, selectedClass),
        hasMissingMarks
      };
    });
  }, [allStudents, allMarks, settings, selectedClass, selectedStream, selectedTerm, reportType]);

  // Update selection when list changes
  useEffect(() => {
    if (studentPreviews.length > 0) {
      setSelectedStudentIds(new Set(studentPreviews.map(p => p.student.id!)));
    } else {
      setSelectedStudentIds(new Set());
    }
  }, [studentPreviews.length, selectedClass, selectedStream]); // Reset when basic filters change

  const stats = useMemo(() => {
    const withMarks = studentPreviews.filter(p => !p.hasMissingMarks);
    const currentMarks = reportType === AssessmentType.BOT
      ? studentPreviews.map(p => p.botMarks).filter(Boolean) as ApiMarkRecord[]
      : studentPreviews.map(p => p.eotMarks).filter(Boolean) as ApiMarkRecord[];

    const aggregates = currentMarks.filter(m => m.aggregate).map(m => m.aggregate!);
    const avgAggregate = aggregates.length > 0
      ? (aggregates.reduce((a, b) => a + b, 0) / aggregates.length).toFixed(1)
      : '-';

    const divisions = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
    currentMarks.forEach(m => {
      if (m.division && divisions.hasOwnProperty(m.division)) {
        divisions[m.division as keyof typeof divisions]++;
      }
    });

    return {
      total: studentPreviews.length,
      withMarks: withMarks.length,
      missingMarks: studentPreviews.length - withMarks.length,
      avgAggregate,
      divisions
    };
  }, [studentPreviews, reportType]);

  // Handlers
  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedStudentIds.size === studentPreviews.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(studentPreviews.map(p => p.student.id!)));
    }
  };

  const selectOnlyWithMarks = () => {
    const ids = studentPreviews
      .filter(p => !p.hasMissingMarks)
      .map(p => p.student.id!);
    setSelectedStudentIds(new Set(ids));
  };

  const handleGeneratePDF = async (singleId?: number) => {
    if (!settings || !allMarks || !allTeachers) {
      showMessageFn("Data not fully loaded", 'error');
      return;
    }

    const idsToProcess = singleId ? [singleId] : Array.from(selectedStudentIds);
    const studentsToProcess = studentPreviews
      .filter(p => idsToProcess.includes(p.student.id!))
      .map(p => p.student);

    if (studentsToProcess.length === 0) {
      showMessageFn("No students selected", 'error');
      return;
    }

    const year = settings.currentYear || new Date().getFullYear();
    const wholeClassStudents = allStudents?.filter(s => s.classLevel === selectedClass) || [];

    // Re-filter marks for context (position calculation)
    const classBotMarks = allMarks.filter(m =>
      m.term === selectedTerm &&
      m.year === year &&
      m.type === AssessmentType.BOT &&
      wholeClassStudents.some(s => s.id === m.studentId)
    );

    const classEotMarks = allMarks.filter(m =>
      m.term === selectedTerm &&
      m.year === year &&
      m.type === AssessmentType.EOT &&
      wholeClassStudents.some(s => s.id === m.studentId)
    );

    setGenerating(true);
    setGeneratingProgress({ current: 0, total: studentsToProcess.length });
    try {
      await generateReportsPDF({
        selectedStudents: studentsToProcess,
        classBotMarks,
        classEotMarks,
        allTeachers,
        settings,
        selectedClass,
        selectedTerm,
        reportType,
        selectedStream,
        showMessage: showMessageFn,
        onProgress: (current, total) => setGeneratingProgress({ current, total })
      });
    } catch (err: any) {
      showMessageFn(`Failed to generate PDF: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setGenerating(false);
      setGeneratingProgress({ current: 0, total: 0 });
    }
  };

  const handleExportExcel = () => {
    const previewsToExport = studentPreviews.filter(p => selectedStudentIds.has(p.student.id!));
    exportReportsToExcel(
      previewsToExport,
      selectedClass,
      selectedTerm,
      selectedStream,
      reportType,
      settings!,
      showMessageFn
    );
  };

  const handleExportCSV = () => {
    const previewsToExport = studentPreviews.filter(p => selectedStudentIds.has(p.student.id!));
    exportReportsToCSV(
      previewsToExport,
      selectedClass,
      selectedTerm,
      selectedStream,
      reportType,
      allMarks!,
      settings!,
      showMessageFn
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {message && <Toast message={message} type={messageType} onClose={() => setMessage('')} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Report Cards</h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Generate and print student report cards</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <ReportFilters
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            selectedStream={selectedStream}
            setSelectedStream={setSelectedStream}
            selectedTerm={selectedTerm}
            setSelectedTerm={setSelectedTerm}
            reportType={reportType}
            setReportType={setReportType}
            settings={settings || null}
          />

          <ReportStats stats={stats} />

          <ReportGenerator
            onGeneratePDF={() => handleGeneratePDF()}
            onExportExcel={handleExportExcel}
            onExportCSV={handleExportCSV}
            loading={loading || generating}
            settingsLoaded={!!settings}
            selectedCount={selectedStudentIds.size}
            totalCount={studentPreviews.length}
            hasStudents={studentPreviews.length > 0}
            generatingProgress={generating ? generatingProgress : undefined}
          />
        </div>

        <div className="lg:col-span-3">
          <StudentReportList
            previews={studentPreviews}
            reportType={reportType}
            selectedStudentIds={selectedStudentIds}
            toggleStudentSelection={toggleStudentSelection}
            toggleAllSelection={toggleAllSelection}
            selectOnlyWithMarks={selectOnlyWithMarks}
            onGenerateSinglePDF={(id) => handleGeneratePDF(id)}
            loading={loading}
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  );
};
