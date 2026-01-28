import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { dbService } from '../services/api';
import { Student, ClassLevel, SubjectMarks, SchoolSettings, Teacher, SUBJECTS_UPPER } from '../types';
import { calculateGrade, calculateAggregate, calculateDivision } from '../services/grading';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/Button';

declare const jspdf: any;

interface P7ExamSet {
  id?: number;
  setNumber: number;
  name: string;
  stream?: string;
  term: number;
  year: number;
  examDate?: string;
  maxMarks: { english?: number; maths?: number; science?: number; sst?: number };
  isActive: boolean;
}

interface P7Score {
  id?: number;
  examSetId: number;
  studentId: number;
  marks: { english?: number; maths?: number; science?: number; sst?: number };
  total: number;
  aggregate: number;
  division: string;
  position?: number;
  comment: string;
  status: string;
}

const Icons = {
  Plus: (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Trash: (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Edit: (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Save: (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  FileText: (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  ChevronDown: (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
  BarChart: (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  X: (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Check: (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Download: (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  ChevronLeft: (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  ChevronRight: (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
};

export const P7ExamSets: React.FC = () => {
  const { isDark } = useTheme();

  const [examSets, setExamSets] = useState<P7ExamSet[]>([]);
  const [scores, setScores] = useState<P7Score[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSet, setSelectedSet] = useState<P7ExamSet | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('success');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSet, setEditingSet] = useState<P7ExamSet | null>(null);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDate, setNewSetDate] = useState('');

  const [marksData, setMarksData] = useState<{ [studentId: number]: SubjectMarks }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [activeTab, setActiveTab] = useState<'sets' | 'marks' | 'analysis' | 'reports'>('sets');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [mobileViewIndex, setMobileViewIndex] = useState(0);

  const subjects = SUBJECTS_UPPER;
  const subjectNames: { [key: string]: string } = {
    english: 'English',
    maths: 'Mathematics',
    science: 'Science',
    sst: 'Social Studies'
  };

  const availableStreams = settings?.streams?.['P7'] || [];

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, studentsData, teachersData] = await Promise.all([
        dbService.getSettings(),
        dbService.getStudents(),
        dbService.getTeachers()
      ]);

      setSettings(settingsData);
      setTeachers(teachersData);

      if (settingsData) {
        setSelectedTerm(settingsData.currentTerm);
        setSelectedYear(settingsData.currentYear);
      }

      const p7Students = studentsData.filter(s => s.classLevel === 'P7');
      setStudents(p7Students);

      await loadExamSets();
    } catch (err) {
      console.error('Error loading data:', err);
      showMessage('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExamSets = async () => {
    try {
      const response = await fetch('/api/p7-exam-sets');
      if (response.ok) {
        const sets = await response.json();
        setExamSets(sets);
      }
    } catch (err) {
      console.error('Error loading exam sets:', err);
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
    loadData();
  }, [loadData]);

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
    if (!newSetName.trim()) {
      showMessage('Please enter a set name', 'error');
      return;
    }

    if (filteredSets.length >= 10) {
      showMessage('Maximum 10 sets allowed per term', 'error');
      return;
    }

    try {
      const setNumber = getNextSetNumber();
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
        showMessage('Exam set created successfully', 'success');
        setNewSetName('');
        setNewSetDate('');
        setShowCreateModal(false);
        await loadExamSets();
      } else {
        showMessage('Failed to create exam set', 'error');
      }
    } catch (err) {
      console.error('Error creating set:', err);
      showMessage('Failed to create exam set', 'error');
    }
  };

  const deleteExamSet = async (setId: number) => {
    if (!confirm('Delete this exam set and all its scores?')) return;

    try {
      const response = await fetch(`/api/p7-exam-sets/${setId}`, { method: 'DELETE' });
      if (response.ok) {
        showMessage('Exam set deleted', 'success');
        if (selectedSet?.id === setId) {
          setSelectedSet(null);
          setScores([]);
          setMarksData({});
        }
        await loadExamSets();
      }
    } catch (err) {
      console.error('Error deleting set:', err);
      showMessage('Failed to delete exam set', 'error');
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
        const aggregate = calculateAggregate(marks as { [key: string]: number | undefined }, ClassLevel.P7, settings?.gradingConfig);
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
        showMessage('Marks saved successfully', 'success');
        setHasUnsavedChanges(false);
        await loadScoresForSet(selectedSet.id!);
      } else {
        showMessage('Failed to save marks', 'error');
      }
    } catch (err) {
      console.error('Error saving marks:', err);
      showMessage('Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getStudentResults = (studentId: number): { marks: SubjectMarks; aggregate: number; division: string; total: number } => {
    const marks: SubjectMarks = marksData[studentId] || {};
    const aggregate = calculateAggregate(marks as { [key: string]: number | undefined }, ClassLevel.P7, settings?.gradingConfig);
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
    subjects.forEach(sub => {
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
  }, [selectedSet, filteredStudents, marksData, subjects]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const inputClasses = `block w-full rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} px-3 py-2 shadow-sm focus:border-[#7B1113] focus:ring-2 focus:ring-[#7B1113]/30 focus:outline-none text-sm`;

  const getAllSetScoresForStudent = async (studentId: number, termSets: P7ExamSet[]) => {
    const results: { setName: string; marks: SubjectMarks; total: number; aggregate: number; division: string; position?: number }[] = [];

    for (const set of termSets) {
      try {
        const response = await fetch(`/api/p7-scores?examSetId=${set.id}`);
        if (response.ok) {
          const allScores = await response.json();
          const score = allScores.find((s: P7Score) => s.studentId === studentId);
          if (score) {
            results.push({
              setName: set.name,
              marks: score.marks,
              total: score.total,
              aggregate: score.aggregate,
              division: score.division,
              position: score.position
            });
          }
        }
      } catch (err) {
        console.error(`Error fetching scores for set ${set.id}:`, err);
      }
    }
    return results;
  };

  const generateP7ReportCard = async (student: Student) => {
    if (!settings) return;

    const termSets = examSets.filter(s => s.term === selectedTerm && s.year === selectedYear);
    if (termSets.length === 0) {
      showMessage('No exam sets found for this term', 'error');
      return;
    }

    const studentResults = await getAllSetScoresForStudent(student.id!, termSets);
    if (studentResults.length === 0) {
      showMessage(`No scores found for ${student.name}`, 'error');
      return;
    }

    const colors = {
      primary: [123, 17, 19],
      darkBlue: [30, 58, 95],
      gold: [212, 175, 55],
      cream: [252, 250, 245],
      lightGray: [248, 250, 252],
      text: [30, 41, 59],
      muted: [100, 116, 139],
      border: [203, 213, 225],
      white: [255, 255, 255],
      black: [0, 0, 0],
      green: [34, 197, 94],
      blue: [59, 130, 246],
      yellow: [234, 179, 8],
      purple: [139, 92, 246],
      red: [239, 68, 68]
    };

    const doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 12;
    const termText = selectedTerm === 1 ? "ONE" : selectedTerm === 2 ? "TWO" : "THREE";

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.3);
    doc.rect(margin - 2, 6, pageWidth - (margin * 2) + 4, pageHeight - 12, 'S');

    let currentY = 12;
    const logoSize = 16;

    if (settings.logoBase64) {
      try {
        let format = 'PNG';
        if (settings.logoBase64.startsWith('data:image/jpeg')) format = 'JPEG';
        doc.addImage(settings.logoBase64, format, pageWidth / 2 - logoSize / 2, currentY, logoSize, logoSize);
        currentY += logoSize + 2;
      } catch (e) { currentY += 2; }
    }

    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, currentY, { align: "center" });
    currentY += 5;

    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (settings.address) {
      doc.text(settings.address, pageWidth / 2, currentY, { align: "center" });
      currentY += 3;
    }

    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    currentY += 4;
    doc.text(`P7 COMBINED EXAM REPORT - TERM ${termText} ${selectedYear}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 8;

    doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 20, 2, 2, 'F');

    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const labelX1 = margin + 4;
    const labelX2 = pageWidth / 2 + 4;

    doc.text("Student Name:", labelX1, currentY + 6);
    doc.text("Index Number:", labelX2, currentY + 6);
    doc.text("Stream:", labelX1, currentY + 14);
    doc.text("Gender:", labelX2, currentY + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(student.name, labelX1 + 28, currentY + 6);
    doc.text(student.indexNumber || '-', labelX2 + 28, currentY + 6);
    doc.text(student.stream || '-', labelX1 + 16, currentY + 14);
    doc.text(student.gender === 'M' ? 'Male' : 'Female', labelX2 + 16, currentY + 14);

    currentY += 26;

    const tableHeaders = ['Exam Set', 'ENG', 'MTC', 'SCI', 'SST', 'Total', 'Agg', 'Div'];
    const colWidths = [40, 18, 18, 18, 18, 20, 16, 16];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const tableX = (pageWidth - tableWidth) / 2;

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.roundedRect(tableX, currentY, tableWidth, 8, 1, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    let headerX = tableX;
    tableHeaders.forEach((header, i) => {
      doc.text(header, headerX + colWidths[i] / 2, currentY + 5.5, { align: 'center' });
      headerX += colWidths[i];
    });
    currentY += 8;

    let totalAgg = 0;
    let totalMarks = 0;
    let totalSets = 0;

    studentResults.forEach((result, idx) => {
      const isEven = idx % 2 === 0;
      if (!isEven) {
        doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
        doc.rect(tableX, currentY, tableWidth, 8, 'F');
      }

      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      let cellX = tableX;
      const rowData = [
        result.setName.substring(0, 15),
        result.marks.english?.toString() || '-',
        result.marks.maths?.toString() || '-',
        result.marks.science?.toString() || '-',
        result.marks.sst?.toString() || '-',
        result.total.toString(),
        result.aggregate.toString(),
        result.division
      ];

      rowData.forEach((cell, i) => {
        if (i === 7) {
          const divColor = result.division === 'I' ? colors.green : result.division === 'II' ? colors.blue : result.division === 'III' ? colors.yellow : result.division === 'IV' ? colors.purple : colors.red;
          doc.setTextColor(divColor[0], divColor[1], divColor[2]);
          doc.setFont("helvetica", "bold");
        }
        doc.text(cell, cellX + colWidths[i] / 2, currentY + 5.5, { align: 'center' });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        cellX += colWidths[i];
      });

      totalAgg += result.aggregate;
      totalMarks += result.total;
      totalSets++;
      currentY += 8;
    });

    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.2);
    doc.line(tableX, currentY, tableX + tableWidth, currentY);
    currentY += 8;

    const avgAgg = (totalAgg / totalSets).toFixed(1);
    const avgTotal = (totalMarks / totalSets).toFixed(0);
    const overallDiv = calculateDivision(Number(avgAgg), ClassLevel.P7, settings?.gradingConfig);

    doc.setFillColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 18, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("OVERALL PERFORMANCE SUMMARY", pageWidth / 2, currentY + 6, { align: "center" });

    doc.setFontSize(9);
    doc.text(`Average Aggregate: ${avgAgg}   |   Average Total: ${avgTotal}   |   Overall Division: ${overallDiv}`, pageWidth / 2, currentY + 13, { align: "center" });
    currentY += 24;

    const subjectPerformance: { [key: string]: number[] } = { english: [], maths: [], science: [], sst: [] };
    studentResults.forEach(r => {
      if (r.marks.english !== undefined) subjectPerformance.english.push(r.marks.english);
      if (r.marks.maths !== undefined) subjectPerformance.maths.push(r.marks.maths);
      if (r.marks.science !== undefined) subjectPerformance.science.push(r.marks.science);
      if (r.marks.sst !== undefined) subjectPerformance.sst.push(r.marks.sst);
    });

    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Subject Performance Trend", margin, currentY);
    currentY += 5;

    const barWidth = (pageWidth - margin * 2 - 40) / 4;
    const barMaxHeight = 20;

    subjects.forEach((sub, i) => {
      const scores = subjectPerformance[sub] || [];
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const barHeight = (avg / 100) * barMaxHeight;
      const barX = margin + 20 + i * (barWidth + 8);

      doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
      doc.rect(barX, currentY + (barMaxHeight - barHeight), barWidth, barHeight, 'F');

      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(barX, currentY + (barMaxHeight - barHeight), barWidth, barHeight, 'F');

      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(subjectNames[sub].substring(0, 4), barX + barWidth / 2, currentY + barMaxHeight + 4, { align: 'center' });
      doc.text(`${avg.toFixed(0)}%`, barX + barWidth / 2, currentY + barMaxHeight + 8, { align: 'center' });
    });
    currentY += barMaxHeight + 16;

    doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 25, 2, 2, 'F');

    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Class Teacher's Comment:", margin + 4, currentY + 6);
    doc.text("Head Teacher's Signature:", margin + 4, currentY + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const comment = overallDiv === 'I' ? 'Excellent performance! Keep up the outstanding work.' :
      overallDiv === 'II' ? 'Very good performance. Continue striving for excellence.' :
        overallDiv === 'III' ? 'Good effort. More dedication will improve your results.' :
          overallDiv === 'IV' ? 'Fair performance. Needs significant improvement.' :
            'Poor performance. Requires extra support and hard work.';
    doc.text(comment, margin + 50, currentY + 6);

    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.line(margin + 55, currentY + 20, margin + 90, currentY + 20);
    currentY += 30;

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text(settings.motto || "Excellence in Education", pageWidth / 2, pageHeight - 3, { align: "center" });

    doc.save(`P7_Report_${student.name.replace(/\s+/g, '_')}_Term${selectedTerm}_${selectedYear}.pdf`);
  };

  const generateBulkP7Reports = async () => {
    if (selectedStudentIds.size === 0) {
      showMessage('Please select students first', 'error');
      return;
    }

    setGeneratingPDF(true);
    showMessage(`Generating ${selectedStudentIds.size} report(s)...`, 'info');

    for (const studentId of selectedStudentIds) {
      const student = filteredStudents.find(s => s.id === studentId);
      if (student) {
        await generateP7ReportCard(student);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setGeneratingPDF(false);
    showMessage('Reports generated successfully!', 'success');
  };

  const generateAssessmentSheet = () => {
    if (!selectedSet || !settings) {
      showMessage('Please select an exam set first', 'error');
      return;
    }

    const studentsWithMarks = filteredStudents.map(student => {
      const { marks, aggregate, division, total } = getStudentResults(student.id!);
      const pos = positions[student.id!];
      return { student, marks, aggregate, division, total, position: pos };
    }).filter(s => s.total > 0).sort((a, b) => (a.position || 999) - (b.position || 999));

    if (studentsWithMarks.length === 0) {
      showMessage('No marks entered yet. Please enter marks first.', 'error');
      return;
    }

    const colors = {
      primary: [123, 17, 19],
      darkBlue: [30, 58, 95],
      headerBg: [248, 250, 252],
      text: [30, 41, 59],
      muted: [100, 116, 139],
      border: [203, 213, 225],
      white: [255, 255, 255],
      divI: [34, 197, 94],
      divII: [59, 130, 246],
      divIII: [234, 179, 8],
      divIV: [139, 92, 246],
      divU: [239, 68, 68]
    };

    const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const termText = selectedTerm === 1 ? "ONE" : selectedTerm === 2 ? "TWO" : "THREE";

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');

    let currentY = 8;
    const logoSize = 12;

    if (settings.logoBase64) {
      try {
        let format = 'PNG';
        if (settings.logoBase64.startsWith('data:image/jpeg')) format = 'JPEG';
        doc.addImage(settings.logoBase64, format, margin, currentY, logoSize, logoSize);
      } catch (e) { }
    }

    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, currentY + 4, { align: "center" });

    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (settings.address) {
      doc.text(settings.address, pageWidth / 2, currentY + 9, { align: "center" });
    }

    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`P7 ASSESSMENT SHEET - ${selectedSet.name.toUpperCase()}`, pageWidth / 2, currentY + 16, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(`Term ${termText} ${selectedYear}  |  Stream: ${selectedStream === 'All' ? 'All Streams' : selectedStream}  |  Total Students: ${studentsWithMarks.length}`, pageWidth / 2, currentY + 22, { align: "center" });

    currentY += 28;

    const colWidths = { pos: 10, name: 50, index: 25, eng: 18, math: 18, sci: 18, sst: 18, total: 16, agg: 14, div: 14 };
    const tableWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);
    const startX = (pageWidth - tableWidth) / 2;

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(startX, currentY, tableWidth, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);

    let colX = startX;
    doc.text("POS", colX + colWidths.pos / 2, currentY + 5.5, { align: "center" });
    colX += colWidths.pos;
    doc.text("STUDENT NAME", colX + 2, currentY + 5.5);
    colX += colWidths.name;
    doc.text("INDEX NO.", colX + colWidths.index / 2, currentY + 5.5, { align: "center" });
    colX += colWidths.index;
    doc.text("ENG", colX + colWidths.eng / 2, currentY + 5.5, { align: "center" });
    colX += colWidths.eng;
    doc.text("MATH", colX + colWidths.math / 2, currentY + 5.5, { align: "center" });
    colX += colWidths.math;
    doc.text("SCI", colX + colWidths.sci / 2, currentY + 5.5, { align: "center" });
    colX += colWidths.sci;
    doc.text("SST", colX + colWidths.sst / 2, currentY + 5.5, { align: "center" });
    colX += colWidths.sst;
    doc.text("TOTAL", colX + colWidths.total / 2, currentY + 5.5, { align: "center" });
    colX += colWidths.total;
    doc.text("AGG", colX + colWidths.agg / 2, currentY + 5.5, { align: "center" });
    colX += colWidths.agg;
    doc.text("DIV", colX + colWidths.div / 2, currentY + 5.5, { align: "center" });

    currentY += 8;
    const rowHeight = 6;
    let pageNum = 1;

    studentsWithMarks.forEach((item, idx) => {
      if (currentY + rowHeight > pageHeight - 20) {
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 3, { align: "right" });

        doc.addPage();
        pageNum++;
        currentY = 15;

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(startX, currentY, tableWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);

        let hColX = startX;
        doc.text("POS", hColX + colWidths.pos / 2, currentY + 5.5, { align: "center" });
        hColX += colWidths.pos;
        doc.text("STUDENT NAME", hColX + 2, currentY + 5.5);
        hColX += colWidths.name;
        doc.text("INDEX NO.", hColX + colWidths.index / 2, currentY + 5.5, { align: "center" });
        hColX += colWidths.index;
        doc.text("ENG", hColX + colWidths.eng / 2, currentY + 5.5, { align: "center" });
        hColX += colWidths.eng;
        doc.text("MATH", hColX + colWidths.math / 2, currentY + 5.5, { align: "center" });
        hColX += colWidths.math;
        doc.text("SCI", hColX + colWidths.sci / 2, currentY + 5.5, { align: "center" });
        hColX += colWidths.sci;
        doc.text("SST", hColX + colWidths.sst / 2, currentY + 5.5, { align: "center" });
        hColX += colWidths.sst;
        doc.text("TOTAL", hColX + colWidths.total / 2, currentY + 5.5, { align: "center" });
        hColX += colWidths.total;
        doc.text("AGG", hColX + colWidths.agg / 2, currentY + 5.5, { align: "center" });
        hColX += colWidths.agg;
        doc.text("DIV", hColX + colWidths.div / 2, currentY + 5.5, { align: "center" });
        currentY += 8;
      }

      if (idx % 2 === 0) {
        doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
        doc.rect(startX, currentY, tableWidth, rowHeight, 'F');
      }

      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.1);
      doc.line(startX, currentY + rowHeight, startX + tableWidth, currentY + rowHeight);

      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      const { student, marks, aggregate, division, total, position } = item;
      const engGrade = calculateGrade((marks as any).english, settings?.gradingConfig);
      const mathGrade = calculateGrade((marks as any).maths, settings?.gradingConfig);
      const sciGrade = calculateGrade((marks as any).science, settings?.gradingConfig);
      const sstGrade = calculateGrade((marks as any).sst, settings?.gradingConfig);

      let rColX = startX;

      doc.setFont("helvetica", "bold");
      doc.text(String(position || '-'), rColX + colWidths.pos / 2, currentY + 4, { align: "center" });
      rColX += colWidths.pos;

      doc.setFont("helvetica", "normal");
      doc.text(student.name.substring(0, 28), rColX + 2, currentY + 4);
      rColX += colWidths.name;

      doc.text(student.indexNumber || '-', rColX + colWidths.index / 2, currentY + 4, { align: "center" });
      rColX += colWidths.index;

      doc.text(`${(marks as any).english || '-'} (${engGrade.grade})`, rColX + colWidths.eng / 2, currentY + 4, { align: "center" });
      rColX += colWidths.eng;

      doc.text(`${(marks as any).maths || '-'} (${mathGrade.grade})`, rColX + colWidths.math / 2, currentY + 4, { align: "center" });
      rColX += colWidths.math;

      doc.text(`${(marks as any).science || '-'} (${sciGrade.grade})`, rColX + colWidths.sci / 2, currentY + 4, { align: "center" });
      rColX += colWidths.sci;

      doc.text(`${(marks as any).sst || '-'} (${sstGrade.grade})`, rColX + colWidths.sst / 2, currentY + 4, { align: "center" });
      rColX += colWidths.sst;

      doc.setFont("helvetica", "bold");
      doc.text(String(total), rColX + colWidths.total / 2, currentY + 4, { align: "center" });
      rColX += colWidths.total;

      doc.text(String(aggregate), rColX + colWidths.agg / 2, currentY + 4, { align: "center" });
      rColX += colWidths.agg;

      const divColor = division === 'I' ? colors.divI : division === 'II' ? colors.divII :
        division === 'III' ? colors.divIII : division === 'IV' ? colors.divIV : colors.divU;
      doc.setTextColor(divColor[0], divColor[1], divColor[2]);
      doc.text(division, rColX + colWidths.div / 2, currentY + 4, { align: "center" });

      currentY += rowHeight;
    });

    currentY += 5;
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("DIVISION SUMMARY:", startX, currentY);

    const divCounts = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
    studentsWithMarks.forEach(s => {
      if (s.division in divCounts) divCounts[s.division as keyof typeof divCounts]++;
    });

    doc.setFont("helvetica", "normal");
    const summaryText = `Div I: ${divCounts.I}  |  Div II: ${divCounts.II}  |  Div III: ${divCounts.III}  |  Div IV: ${divCounts.IV}  |  U: ${divCounts.U}  |  Pass Rate: ${(((divCounts.I + divCounts.II + divCounts.III + divCounts.IV) / studentsWithMarks.length) * 100).toFixed(1)}%`;
    doc.text(summaryText, startX + 35, currentY);

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text(settings.motto || "Excellence in Education", pageWidth / 2, pageHeight - 3, { align: "center" });
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 3, { align: "right" });

    doc.addPage();
    pageNum++;

    let analysisY = 12;

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("PERFORMANCE ANALYSIS REPORT", pageWidth / 2, analysisY, { align: 'center' });
    analysisY += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(`${selectedSet.name} | P7 ${selectedStream === 'All' ? 'All Streams' : selectedStream} | Term ${termText} ${selectedYear}`, pageWidth / 2, analysisY, { align: 'center' });
    analysisY += 4;

    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(margin + 60, analysisY, pageWidth - margin - 60, analysisY);
    analysisY += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("1. DIVISION ANALYSIS", margin + 2, analysisY);
    analysisY += 8;

    const divTotal = Object.values(divCounts).reduce((a, b) => a + b, 0);
    const passCount = divCounts.I + divCounts.II + divCounts.III + divCounts.IV;
    const passRate = divTotal > 0 ? ((passCount / divTotal) * 100).toFixed(1) : '0';

    const divTableStartX = margin;
    const divColWidths = [35, 25, 30, 40];
    const divTableWidth = divColWidths.reduce((a, b) => a + b, 0);

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(divTableStartX, analysisY, divTableWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    let dx = divTableStartX;
    doc.text("DIVISION", dx + 2, analysisY + 5);
    dx += divColWidths[0];
    doc.text("COUNT", dx + divColWidths[1] / 2, analysisY + 5, { align: "center" });
    dx += divColWidths[1];
    doc.text("PERCENTAGE", dx + divColWidths[2] / 2, analysisY + 5, { align: "center" });
    dx += divColWidths[2];
    doc.text("STATUS", dx + 2, analysisY + 5);
    analysisY += 7;

    const divRows = [
      { div: 'Division I', count: divCounts.I, color: colors.divI, status: 'Excellent' },
      { div: 'Division II', count: divCounts.II, color: colors.divII, status: 'Very Good' },
      { div: 'Division III', count: divCounts.III, color: colors.divIII, status: 'Good' },
      { div: 'Division IV', count: divCounts.IV, color: colors.divIV, status: 'Pass' },
      { div: 'Ungraded (U)', count: divCounts.U, color: colors.divU, status: 'Fail' }
    ];

    divRows.forEach((row, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
        doc.rect(divTableStartX, analysisY, divTableWidth, 6, 'F');
      }
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.line(divTableStartX, analysisY + 6, divTableStartX + divTableWidth, analysisY + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(row.color[0], row.color[1], row.color[2]);
      let rx = divTableStartX;
      doc.text(row.div, rx + 2, analysisY + 4);
      rx += divColWidths[0];
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont("helvetica", "normal");
      doc.text(String(row.count), rx + divColWidths[1] / 2, analysisY + 4, { align: "center" });
      rx += divColWidths[1];
      doc.text(divTotal > 0 ? ((row.count / divTotal) * 100).toFixed(1) + '%' : '0%', rx + divColWidths[2] / 2, analysisY + 4, { align: "center" });
      rx += divColWidths[2];
      doc.text(row.status, rx + 2, analysisY + 4);
      analysisY += 6;
    });

    doc.setFillColor(252, 250, 245);
    doc.rect(divTableStartX, analysisY, divTableWidth, 6, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    let rx = divTableStartX;
    doc.text("TOTAL", rx + 2, analysisY + 4);
    rx += divColWidths[0];
    doc.text(String(divTotal), rx + divColWidths[1] / 2, analysisY + 4, { align: "center" });
    rx += divColWidths[1];
    doc.text("100%", rx + divColWidths[2] / 2, analysisY + 4, { align: "center" });
    rx += divColWidths[2];
    doc.text(`Pass Rate: ${passRate}%`, rx + 2, analysisY + 4);
    analysisY += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("2. SUBJECT PERFORMANCE STATISTICS", margin + 2, analysisY);
    analysisY += 8;

    const subjectStats = subjects.map(sub => {
      const marks = studentsWithMarks.map(s => (s.marks as any)[sub]).filter((m): m is number => m !== undefined);
      const max = marks.length ? Math.max(...marks) : 0;
      const min = marks.length ? Math.min(...marks) : 0;
      const sum = marks.reduce((a, b) => a + b, 0);
      const avg = marks.length ? Math.round(sum / marks.length) : 0;
      const grade = calculateGrade(avg, settings?.gradingConfig);
      const passCountSub = marks.filter(m => m >= 40).length;
      const passPercent = marks.length ? ((passCountSub / marks.length) * 100).toFixed(0) + '%' : '0%';
      return { subject: subjectNames[sub], entries: marks.length, avg, grade: grade.grade, max, min, passPercent };
    });

    const statsColWidths = [30, 20, 20, 18, 20, 20, 20];
    const statsTableWidth = statsColWidths.reduce((a, b) => a + b, 0);

    doc.setFillColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.rect(margin, analysisY, statsTableWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    let sx = margin;
    ['SUBJECT', 'ENTRIES', 'AVERAGE', 'GRADE', 'HIGHEST', 'LOWEST', 'PASS %'].forEach((h, i) => {
      doc.text(h, sx + (i === 0 ? 2 : statsColWidths[i] / 2), analysisY + 5, i === 0 ? undefined : { align: "center" });
      sx += statsColWidths[i];
    });
    analysisY += 7;

    subjectStats.forEach((stat, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
        doc.rect(margin, analysisY, statsTableWidth, 6, 'F');
      }
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.line(margin, analysisY + 6, margin + statsTableWidth, analysisY + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      let stx = margin;
      doc.text(stat.subject, stx + 2, analysisY + 4);
      stx += statsColWidths[0];
      doc.setFont("helvetica", "normal");
      doc.text(String(stat.entries), stx + statsColWidths[1] / 2, analysisY + 4, { align: "center" });
      stx += statsColWidths[1];
      doc.text(String(stat.avg), stx + statsColWidths[2] / 2, analysisY + 4, { align: "center" });
      stx += statsColWidths[2];
      const gradeColor = ['D1', 'D2'].includes(stat.grade) ? colors.divI : ['C3', 'C4', 'C5', 'C6'].includes(stat.grade) ? colors.divII : ['P7', 'P8'].includes(stat.grade) ? colors.divIII : colors.divU;
      doc.setTextColor(gradeColor[0], gradeColor[1], gradeColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text(stat.grade, stx + statsColWidths[3] / 2, analysisY + 4, { align: "center" });
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.setFont("helvetica", "normal");
      stx += statsColWidths[3];
      doc.text(String(stat.max), stx + statsColWidths[4] / 2, analysisY + 4, { align: "center" });
      stx += statsColWidths[4];
      doc.text(String(stat.min), stx + statsColWidths[5] / 2, analysisY + 4, { align: "center" });
      stx += statsColWidths[5];
      doc.text(stat.passPercent, stx + statsColWidths[6] / 2, analysisY + 4, { align: "center" });
      analysisY += 6;
    });
    analysisY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("3. TOP 5 PERFORMERS", margin + 2, analysisY);
    analysisY += 8;

    const top5 = studentsWithMarks.slice(0, 5);
    const topColWidths = [15, 60, 30, 25, 20, 25];
    const topTableWidth = topColWidths.reduce((a, b) => a + b, 0);

    doc.setFillColor(212, 175, 55);
    doc.rect(margin, analysisY, topTableWidth, 7, 'F');
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    let tx = margin;
    ['POS', 'STUDENT NAME', 'STREAM', 'TOTAL', 'AGG', 'DIVISION'].forEach((h, i) => {
      doc.text(h, tx + (i === 1 ? 2 : topColWidths[i] / 2), analysisY + 5, i === 1 ? undefined : { align: "center" });
      tx += topColWidths[i];
    });
    analysisY += 7;

    top5.forEach((item, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
        doc.rect(margin, analysisY, topTableWidth, 6, 'F');
      }
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.line(margin, analysisY + 6, margin + topTableWidth, analysisY + 6);

      const posColor = idx === 0 ? [212, 175, 55] : idx === 1 ? [156, 163, 175] : idx === 2 ? [180, 83, 9] : colors.text;
      doc.setTextColor(posColor[0], posColor[1], posColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      let ttx = margin;
      doc.text(String(item.position || idx + 1), ttx + topColWidths[0] / 2, analysisY + 4, { align: "center" });
      ttx += topColWidths[0];
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      doc.text(item.student.name.substring(0, 32), ttx + 2, analysisY + 4);
      ttx += topColWidths[1];
      doc.setFont("helvetica", "normal");
      doc.text(item.student.stream || '-', ttx + topColWidths[2] / 2, analysisY + 4, { align: "center" });
      ttx += topColWidths[2];
      doc.setFont("helvetica", "bold");
      doc.text(String(item.total), ttx + topColWidths[3] / 2, analysisY + 4, { align: "center" });
      ttx += topColWidths[3];
      doc.text(String(item.aggregate), ttx + topColWidths[4] / 2, analysisY + 4, { align: "center" });
      ttx += topColWidths[4];
      const topDivColor = item.division === 'I' ? colors.divI : item.division === 'II' ? colors.divII : item.division === 'III' ? colors.divIII : item.division === 'IV' ? colors.divIV : colors.divU;
      doc.setTextColor(topDivColor[0], topDivColor[1], topDivColor[2]);
      doc.text(item.division, ttx + topColWidths[5] / 2, analysisY + 4, { align: "center" });
      analysisY += 6;
    });
    analysisY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("4. GENDER COMPARISON", margin + 2, analysisY);
    analysisY += 8;

    const genderStats = { M: { count: 0, aggSum: 0 }, F: { count: 0, aggSum: 0 } };
    studentsWithMarks.forEach(s => {
      const g = s.student.gender as 'M' | 'F';
      genderStats[g].count++;
      genderStats[g].aggSum += s.aggregate;
    });
    const maleAvg = genderStats.M.count > 0 ? (genderStats.M.aggSum / genderStats.M.count).toFixed(1) : '-';
    const femaleAvg = genderStats.F.count > 0 ? (genderStats.F.aggSum / genderStats.F.count).toFixed(1) : '-';

    doc.setFillColor(59, 130, 246);
    doc.roundedRect(margin, analysisY, 60, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(String(maleAvg), margin + 30, analysisY + 12, { align: "center" });
    doc.setFontSize(8);
    doc.text(`BOYS (${genderStats.M.count})`, margin + 30, analysisY + 20, { align: "center" });

    doc.setFillColor(236, 72, 153);
    doc.roundedRect(margin + 70, analysisY, 60, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(String(femaleAvg), margin + 100, analysisY + 12, { align: "center" });
    doc.setFontSize(8);
    doc.text(`GIRLS (${genderStats.F.count})`, margin + 100, analysisY + 20, { align: "center" });

    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text("* Lower aggregate is better (4 = Division I)", margin + 140, analysisY + 12);

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text(settings.motto || "Excellence in Education", pageWidth / 2, pageHeight - 3, { align: "center" });
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 3, { align: "right" });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, pageHeight - 3);

    doc.save(`P7_Assessment_${selectedSet.name.replace(/\s+/g, '_')}_Term${selectedTerm}_${selectedYear}.pdf`);
    showMessage('Assessment sheet downloaded!', 'success');
  };

  const divisionColors: { [key: string]: string } = {
    'I': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'II': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'III': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'IV': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    'U': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    '-': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
  };

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
            <Icons.FileText className="w-4 h-4 mr-1" />
            Sets
          </Button>
          <Button
            onClick={() => setActiveTab('marks')}
            variant={activeTab === 'marks' ? 'primary' : 'outline'}
            size="sm"
            disabled={!selectedSet}
          >
            <Icons.Edit className="w-4 h-4 mr-1" />
            Marks
          </Button>
          <Button
            onClick={() => setActiveTab('analysis')}
            variant={activeTab === 'analysis' ? 'primary' : 'outline'}
            size="sm"
            disabled={!selectedSet}
          >
            <Icons.BarChart className="w-4 h-4 mr-1" />
            Analysis
          </Button>
          <Button
            onClick={() => setActiveTab('reports')}
            variant={activeTab === 'reports' ? 'primary' : 'outline'}
            size="sm"
          >
            <Icons.Download className="w-4 h-4 mr-1" />
            Reports
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${messageType === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
          messageType === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
          }`}>
          {message}
        </div>
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
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
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
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-lg border`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Exam Sets ({filteredSets.length}/10)
            </h2>
            <Button onClick={() => setShowCreateModal(true)} disabled={filteredSets.length >= 10}>
              <Icons.Plus className="w-4 h-4 mr-1" />
              Add Set
            </Button>
          </div>

          {filteredSets.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <Icons.FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No exam sets created yet</p>
              <p className="text-sm mt-1">Click "Add Set" to create your first P7 exam set</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSets.map(set => (
                <div
                  key={set.id}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedSet?.id === set.id
                    ? 'border-[#7B1113] bg-[#7B1113]/5'
                    : isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => {
                    setSelectedSet(set);
                    setActiveTab('marks');
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        Set {set.setNumber}
                      </span>
                      {set.stream && (
                        <span className={`ml-2 inline-block px-2 py-1 text-xs rounded ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                          {set.stream}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteExamSet(set.id!); }}
                      className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <Icons.Trash className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{set.name}</h3>
                  {set.examDate && (
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Date: {new Date(set.examDate).toLocaleDateString()}
                    </p>
                  )}
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Term {set.term}, {set.year}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'marks' && selectedSet && (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-lg border`}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedSet.name} - Marks Entry
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Set {selectedSet.setNumber} | Term {selectedSet.term}, {selectedSet.year}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveMarks} disabled={saving || !hasUnsavedChanges}>
                <Icons.Save className="w-4 h-4 mr-1" />
                {saving ? 'Saving...' : 'Save Marks'}
              </Button>
              <Button variant="outline" onClick={generateAssessmentSheet}>
                <Icons.Download className="w-4 h-4 mr-1" />
                Assessment Sheet
              </Button>
            </div>
          </div>

          {hasUnsavedChanges && (
            <div className="mb-4 p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-lg text-sm">
              You have unsaved changes
            </div>
          )}

          {filteredStudents.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="font-medium">No P7 students found</p>
              <p className="text-sm mt-1">Add students to P7 class first</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Name</th>
                      {subjects.map(sub => (
                        <th key={sub} className="px-3 py-2 text-center text-xs font-semibold uppercase w-20">
                          {subjectNames[sub]}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center text-xs font-semibold uppercase w-16">Total</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold uppercase w-16">Agg</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold uppercase w-16">Div</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold uppercase w-16">Pos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, idx) => {
                      const { marks, aggregate, division, total } = getStudentResults(student.id!);
                      const pos = positions[student.id!];

                      return (
                        <tr key={student.id} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} ${idx % 2 === 0 ? '' : isDark ? 'bg-gray-750' : 'bg-gray-50/50'}`}>
                          <td className="px-3 py-2 text-sm">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{student.stream}</div>
                          </td>
                          {subjects.map(sub => {
                            const mark = (marks as any)[sub];
                            const grade = calculateGrade(mark, settings?.gradingConfig);
                            return (
                              <td key={sub} className="px-1 py-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={mark ?? ''}
                                  onChange={(e) => handleMarkChange(student.id!, sub, e.target.value)}
                                  className={`w-16 px-2 py-1 text-center text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-2 focus:ring-[#7B1113]/30 focus:border-[#7B1113]`}
                                />
                                {mark !== undefined && (
                                  <div className={`text-xs mt-0.5 ${grade.grade.startsWith('D') || grade.grade.startsWith('C') ? 'text-green-600' : grade.grade.startsWith('P') ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {grade.grade}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center font-semibold text-sm">{total > 0 ? total : '-'}</td>
                          <td className="px-3 py-2 text-center font-semibold text-sm">{aggregate > 0 ? aggregate : '-'}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${divisionColors[division] || divisionColors['-']}`}>
                              {division || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-sm">{pos || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden">
                {filteredStudents.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setMobileViewIndex(Math.max(0, mobileViewIndex - 1))}
                        disabled={mobileViewIndex === 0}
                        className={`p-2 rounded-lg ${mobileViewIndex === 0 ? 'opacity-30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        <Icons.ChevronLeft className="w-6 h-6" />
                      </button>
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {mobileViewIndex + 1} of {filteredStudents.length}
                      </span>
                      <button
                        onClick={() => setMobileViewIndex(Math.min(filteredStudents.length - 1, mobileViewIndex + 1))}
                        disabled={mobileViewIndex >= filteredStudents.length - 1}
                        className={`p-2 rounded-lg ${mobileViewIndex >= filteredStudents.length - 1 ? 'opacity-30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        <Icons.ChevronRight className="w-6 h-6" />
                      </button>
                    </div>

                    {(() => {
                      const student = filteredStudents[mobileViewIndex];
                      if (!student) return null;
                      const { marks, aggregate, division, total } = getStudentResults(student.id!);
                      const pos = positions[student.id!];

                      return (
                        <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</h3>
                              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{student.stream}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${divisionColors[division] || divisionColors['-']}`}>
                              Div {division || '-'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4">
                            {subjects.map(sub => {
                              const mark = (marks as any)[sub];
                              const grade = calculateGrade(mark, settings?.gradingConfig);
                              return (
                                <div key={sub}>
                                  <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {subjectNames[sub]}
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={mark ?? ''}
                                    onChange={(e) => handleMarkChange(student.id!, sub, e.target.value)}
                                    className={`w-full px-3 py-2 text-center rounded-lg border ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'}`}
                                  />
                                  {mark !== undefined && (
                                    <div className={`text-xs text-center mt-1 font-medium ${grade.grade.startsWith('D') || grade.grade.startsWith('C') ? 'text-green-600' : grade.grade.startsWith('P') ? 'text-yellow-600' : 'text-red-600'}`}>
                                      {grade.grade}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-3 border-t dark:border-gray-600">
                            <div className="text-center">
                              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total</div>
                              <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{total > 0 ? total : '-'}</div>
                            </div>
                            <div className="text-center">
                              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Aggregate</div>
                              <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{aggregate > 0 ? aggregate : '-'}</div>
                            </div>
                            <div className="text-center">
                              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Position</div>
                              <div className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{pos || '-'}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'analysis' && selectedSet && analysisStats && (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-lg border`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {selectedSet.name} - Performance Analysis
            </h2>
            <Button variant="outline" onClick={generateAssessmentSheet}>
              <Icons.Download className="w-4 h-4 mr-1" />
              Assessment Sheet
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{analysisStats.withMarks}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Students with Marks</div>
            </div>
            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{analysisStats.avgAggregate}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Average Aggregate</div>
            </div>
            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{analysisStats.avgTotal}</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Average Total</div>
            </div>
            <div className={`p-4 rounded-xl ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
              <div className={`text-2xl font-bold text-green-600`}>{analysisStats.passRate}%</div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pass Rate</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Division Distribution</h3>
              <div className="space-y-2">
                {(['I', 'II', 'III', 'IV', 'U'] as const).map(div => (
                  <div key={div} className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold w-8 text-center ${divisionColors[div]}`}>{div}</span>
                    <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${div === 'I' ? 'bg-green-500' : div === 'II' ? 'bg-blue-500' : div === 'III' ? 'bg-yellow-500' : div === 'IV' ? 'bg-purple-500' : 'bg-red-500'}`}
                        style={{ width: `${analysisStats.withMarks > 0 ? (analysisStats.divCounts[div] / analysisStats.withMarks * 100) : 0}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium w-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{analysisStats.divCounts[div]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Subject Averages</h3>
              <div className="space-y-2">
                {subjects.map(sub => (
                  <div key={sub} className="flex items-center gap-3">
                    <span className={`text-sm w-24 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{subjectNames[sub]}</span>
                    <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#7B1113]"
                        style={{ width: `${analysisStats.subjectAvgs[sub] || 0}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium w-12 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {analysisStats.subjectAvgs[sub]?.toFixed(1) || '-'}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {analysisStats.topPerformers && analysisStats.topPerformers.length > 0 && (
            <div className="mt-6">
              <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Top 5 Performers</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Rank</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Stream</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold uppercase">Total</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold uppercase">Agg</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold uppercase">Division</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisStats.topPerformers.map((performer: any, idx: number) => (
                      <tr key={performer.student.id} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <td className="px-3 py-2 text-sm">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                            idx === 1 ? 'bg-gray-100 text-gray-800' :
                              idx === 2 ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-50 text-gray-600'
                            }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{performer.student.name}</td>
                        <td className={`px-3 py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{performer.student.stream || '-'}</td>
                        <td className="px-3 py-2 text-center text-sm font-bold">{performer.total}</td>
                        <td className="px-3 py-2 text-center text-sm font-bold">{performer.aggregate}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${divisionColors[performer.division]}`}>
                            {performer.division}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-lg border`}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                P7 Combined Report Cards
              </h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                Generate PDF reports showing all exam sets for Term {selectedTerm}, {selectedYear}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedStudentIds.size === filteredStudents.length) {
                    setSelectedStudentIds(new Set());
                  } else {
                    setSelectedStudentIds(new Set(filteredStudents.map(s => s.id!)));
                  }
                }}
              >
                {selectedStudentIds.size === filteredStudents.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Button
                onClick={generateBulkP7Reports}
                disabled={generatingPDF || selectedStudentIds.size === 0}
              >
                <Icons.Download className="w-4 h-4 mr-1" />
                {generatingPDF ? 'Generating...' : `Generate ${selectedStudentIds.size} Report(s)`}
              </Button>
            </div>
          </div>

          <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-blue-800'}`}>
              <strong>Term {selectedTerm} Exam Sets:</strong> {examSets.filter(s => s.term === selectedTerm && s.year === selectedYear).map(s => s.name).join(', ') || 'None created yet'}
            </p>
          </div>

          {filteredStudents.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <p className="font-medium">No P7 students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={isDark ? 'bg-gray-700' : 'bg-gray-50'}>
                    <th className="px-3 py-2 text-center w-10">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0}
                        onChange={() => {
                          if (selectedStudentIds.size === filteredStudents.length) {
                            setSelectedStudentIds(new Set());
                          } else {
                            setSelectedStudentIds(new Set(filteredStudents.map(s => s.id!)));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-[#7B1113] focus:ring-[#7B1113]"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Index</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Stream</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase">Gender</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, idx) => (
                    <tr
                      key={student.id}
                      className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} ${idx % 2 === 0 ? '' : isDark ? 'bg-gray-750' : 'bg-gray-50/50'}`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(student.id!)}
                          onChange={() => {
                            const newSet = new Set(selectedStudentIds);
                            if (newSet.has(student.id!)) {
                              newSet.delete(student.id!);
                            } else {
                              newSet.add(student.id!);
                            }
                            setSelectedStudentIds(newSet);
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-[#7B1113] focus:ring-[#7B1113]"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{student.name}</div>
                      </td>
                      <td className={`px-3 py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{student.indexNumber || '-'}</td>
                      <td className={`px-3 py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{student.stream || '-'}</td>
                      <td className={`px-3 py-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{student.gender === 'M' ? 'Male' : 'Female'}</td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateP7ReportCard(student)}
                          disabled={generatingPDF}
                        >
                          <Icons.Download className="w-3 h-3 mr-1" />
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-full max-w-md`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Exam Set</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Set Name *</label>
                <input
                  type="text"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder="e.g., Mock Exam 1, PLE Trial 1"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Exam Date (Optional)</label>
                <input
                  type="date"
                  value={newSetDate}
                  onChange={(e) => setNewSetDate(e.target.value)}
                  className={inputClasses}
                />
              </div>
              <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  This will create Set {getNextSetNumber()} for Term {selectedTerm}, {selectedYear}
                  {selectedStream !== 'All' && ` (${selectedStream})`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={createExamSet}>Create Set</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
