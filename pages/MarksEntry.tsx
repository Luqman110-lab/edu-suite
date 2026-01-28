import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { dbService } from '../services/api';
import { Student, ClassLevel, SubjectMarks, AssessmentType, MarkRecord, SUBJECTS_LOWER, SUBJECTS_UPPER, SchoolSettings } from '../types';
import { calculateGrade, calculateAggregate, calculateDivision } from '../services/grading';
import { Button } from '../components/Button';
import * as XLSX from 'xlsx';

interface HistoryState {
  marksData: { [studentId: number]: SubjectMarks };
  comments: { [studentId: number]: string };
  lockedRows: Set<number>;
  absentStudents: Set<number>;
  sickStudents: Set<number>;
}

export const MarksEntry: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<ClassLevel>(ClassLevel.P7);
  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedType, setSelectedType] = useState<AssessmentType>(AssessmentType.EOT);
  const [students, setStudents] = useState<Student[]>([]);
  const [marksData, setMarksData] = useState<{ [studentId: number]: SubjectMarks }>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('success');
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showStats, setShowStats] = useState(true);

  const [comments, setComments] = useState<{ [studentId: number]: string }>({});
  const [lockedRows, setLockedRows] = useState<Set<number>>(new Set());
  const [showQuickFill, setShowQuickFill] = useState(false);
  const [quickFillSubject, setQuickFillSubject] = useState<string>('');
  const [quickFillValue, setQuickFillValue] = useState<string>('');
  const [absentStudents, setAbsentStudents] = useState<Set<number>>(new Set());
  const [sickStudents, setSickStudents] = useState<Set<number>>(new Set());

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);

  const [pendingNewStudents, setPendingNewStudents] = useState<{ name: string; marks: SubjectMarks }[]>([]);
  const [showNewStudentsModal, setShowNewStudentsModal] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mobileViewIndex, setMobileViewIndex] = useState(0);
  const [showMobileStudentPicker, setShowMobileStudentPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const subjects = ['P1', 'P2', 'P3'].includes(selectedClass) ? SUBJECTS_LOWER : SUBJECTS_UPPER;
  const availableStreams = settings?.streams[selectedClass] || [];

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.indexNumber?.toLowerCase().includes(query) ||
      s.stream?.toLowerCase().includes(query)
    );
  }, [students, searchQuery]);

  useEffect(() => {
    if (filteredStudents.length === 0) {
      setMobileViewIndex(0);
    } else if (mobileViewIndex >= filteredStudents.length) {
      setMobileViewIndex(Math.max(0, filteredStudents.length - 1));
    }
  }, [filteredStudents.length, mobileViewIndex]);

  const progressStats = useMemo(() => {
    const total = students.length;
    const withMarks = students.filter(s => {
      const marks = marksData[s.id!];
      return marks && Object.values(marks).some(v => v !== undefined);
    }).length;
    const complete = students.filter(s => {
      const marks = marksData[s.id!];
      if (!marks) return false;
      return subjects.every(sub => (marks as any)[sub] !== undefined);
    }).length;
    const absent = absentStudents.size;
    const sick = sickStudents.size;

    return { total, withMarks, complete, absent, sick, percentage: total > 0 ? Math.round((complete / total) * 100) : 0 };
  }, [students, marksData, subjects, absentStudents, sickStudents]);

  const classStats = useMemo(() => {
    if (students.length === 0) return null;

    const studentsWithMarks = students.filter(s => {
      const marks = marksData[s.id!];
      return marks && Object.values(marks).some(v => v !== undefined);
    });

    if (studentsWithMarks.length === 0) return null;

    const aggregates = studentsWithMarks.map(s => {
      const marks = marksData[s.id!] || {};
      return calculateAggregate(marks as any, selectedClass, settings?.gradingConfig);
    }).filter(a => a > 0);

    const divisions = studentsWithMarks.map(s => {
      const marks = marksData[s.id!] || {};
      const agg = calculateAggregate(marks as any, selectedClass, settings?.gradingConfig);
      return calculateDivision(agg, selectedClass, settings?.gradingConfig);
    });

    const divCounts = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
    divisions.forEach(d => {
      if (d in divCounts) divCounts[d as keyof typeof divCounts]++;
    });

    const avgAggregate = aggregates.length > 0
      ? (aggregates.reduce((a, b) => a + b, 0) / aggregates.length).toFixed(1)
      : '-';

    const passRate = studentsWithMarks.length > 0
      ? ((divCounts.I + divCounts.II + divCounts.III + divCounts.IV) / studentsWithMarks.length * 100).toFixed(0)
      : '0';

    let bestStudent = null;
    let bestAggregate = 999;
    studentsWithMarks.forEach(s => {
      const marks = marksData[s.id!] || {};
      const agg = calculateAggregate(marks as any, selectedClass, settings?.gradingConfig);
      if (agg > 0 && agg < bestAggregate) {
        bestAggregate = agg;
        bestStudent = s;
      }
    });

    return {
      totalStudents: students.length,
      studentsWithMarks: studentsWithMarks.length,
      avgAggregate,
      passRate,
      divCounts,
      bestStudent,
      bestAggregate: bestAggregate < 999 ? bestAggregate : null
    };
  }, [students, marksData, selectedClass, settings]);

  const saveToHistory = useCallback(() => {
    if (isUndoRedo) return;

    const newState: HistoryState = {
      marksData: JSON.parse(JSON.stringify(marksData)),
      comments: { ...comments },
      lockedRows: new Set(lockedRows),
      absentStudents: new Set(absentStudents),
      sickStudents: new Set(sickStudents)
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);

    if (newHistory.length > 50) newHistory.shift();

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [marksData, comments, lockedRows, absentStudents, sickStudents, history, historyIndex, isUndoRedo]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;

    setIsUndoRedo(true);
    const prevState = history[historyIndex - 1];
    setMarksData(JSON.parse(JSON.stringify(prevState.marksData)));
    setComments({ ...prevState.comments });
    setLockedRows(new Set(prevState.lockedRows));
    setAbsentStudents(new Set(prevState.absentStudents));
    setSickStudents(new Set(prevState.sickStudents));
    setHistoryIndex(historyIndex - 1);
    setHasUnsavedChanges(true);
    setTimeout(() => setIsUndoRedo(false), 100);
    showMessage('Undo successful', 'info');
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    setIsUndoRedo(true);
    const nextState = history[historyIndex + 1];
    setMarksData(JSON.parse(JSON.stringify(nextState.marksData)));
    setComments({ ...nextState.comments });
    setLockedRows(new Set(nextState.lockedRows));
    setAbsentStudents(new Set(nextState.absentStudents));
    setSickStudents(new Set(nextState.sickStudents));
    setHistoryIndex(historyIndex + 1);
    setHasUnsavedChanges(true);
    setTimeout(() => setIsUndoRedo(false), 100);
    showMessage('Redo successful', 'info');
  }, [history, historyIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedTerm, selectedType, selectedStream]);

  useEffect(() => {
    if (settings && selectedStream !== 'All') {
      const streamsForClass = settings.streams[selectedClass] || [];
      if (!streamsForClass.includes(selectedStream)) {
        setSelectedStream('All');
      }
    }
  }, [selectedClass]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    };
  }, [autoSaveTimer]);

  const loadData = async () => {
    setLoading(true);
    setSearchQuery('');
    setHistory([]);
    setHistoryIndex(-1);
    setSelectedForDelete(new Set());

    let currentSettings = settings;
    if (!currentSettings) {
      currentSettings = await dbService.getSettings();
      setSettings(currentSettings);
    }

    const allStudents = await dbService.getStudents();
    let classStudents = allStudents.filter(s => s.classLevel === selectedClass);

    if (selectedStream !== 'All') {
      classStudents = classStudents.filter(s => s.stream === selectedStream);
    }

    classStudents.sort((a, b) => a.name.localeCompare(b.name));

    const allMarks = await dbService.getMarks();
    const currentMarks: { [id: number]: SubjectMarks } = {};
    const currentComments: { [id: number]: string } = {};
    const loadedAbsent = new Set<number>();
    const loadedSick = new Set<number>();

    classStudents.forEach(student => {
      const record = allMarks.find(m =>
        m.studentId === student.id &&
        m.term === selectedTerm &&
        m.year === (currentSettings?.currentYear || new Date().getFullYear()) &&
        m.type === selectedType
      );
      if (record) {
        currentMarks[student.id!] = record.marks;
        if ((record as any).comment) {
          currentComments[student.id!] = (record as any).comment;
        }
        const status = (record as any).status;
        if (status === 'absent') {
          loadedAbsent.add(student.id!);
        } else if (status === 'sick') {
          loadedSick.add(student.id!);
        }
      } else {
        currentMarks[student.id!] = {};
      }
    });

    setStudents(classStudents);
    setMarksData(currentMarks);
    setComments(currentComments);
    setLockedRows(new Set());
    setAbsentStudents(loadedAbsent);
    setSickStudents(loadedSick);
    setHasUnsavedChanges(false);
    setLoading(false);

    const initialState: HistoryState = {
      marksData: JSON.parse(JSON.stringify(currentMarks)),
      comments: { ...currentComments },
      lockedRows: new Set(),
      absentStudents: new Set(loadedAbsent),
      sickStudents: new Set(loadedSick)
    };
    setHistory([initialState]);
    setHistoryIndex(0);
  };

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleAutoSave = async () => {
    if (!hasUnsavedChanges) return;
    setIsSaving(true);
    await performSave();
    setIsSaving(false);
  };

  const triggerAutoSave = () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 3000);
    setAutoSaveTimer(timer);
  };

  const handleMarkChange = (studentId: number, subject: string, val: string) => {
    if (lockedRows.has(studentId)) {
      showMessage('This row is locked. Unlock to edit.', 'info');
      return;
    }

    const numVal = val === '' ? undefined : parseInt(val, 10);

    if (numVal !== undefined && (numVal < 0 || numVal > 100)) return;

    saveToHistory();

    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subject]: numVal
      }
    }));

    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  const handleCommentChange = (studentId: number, comment: string) => {
    if (lockedRows.has(studentId)) return;

    saveToHistory();
    setComments(prev => ({
      ...prev,
      [studentId]: comment
    }));
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  const toggleLockRow = (studentId: number) => {
    saveToHistory();
    setLockedRows(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
        showMessage('Row unlocked', 'info');
      } else {
        next.add(studentId);
        showMessage('Row locked', 'info');
      }
      return next;
    });
  };

  const toggleAbsent = (studentId: number) => {
    if (lockedRows.has(studentId)) return;

    saveToHistory();
    setAbsentStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
        setSickStudents(s => {
          const ns = new Set(s);
          ns.delete(studentId);
          return ns;
        });
        setMarksData(prevMarks => ({
          ...prevMarks,
          [studentId]: {}
        }));
      }
      return next;
    });
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  const toggleSick = (studentId: number) => {
    if (lockedRows.has(studentId)) return;

    saveToHistory();
    setSickStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
        setAbsentStudents(a => {
          const na = new Set(a);
          na.delete(studentId);
          return na;
        });
        setMarksData(prevMarks => ({
          ...prevMarks,
          [studentId]: {}
        }));
      }
      return next;
    });
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  const applyQuickFill = () => {
    if (!quickFillSubject || quickFillValue === '') return;

    const numVal = parseInt(quickFillValue, 10);
    if (isNaN(numVal) || numVal < 0 || numVal > 100) {
      showMessage('Invalid mark value', 'error');
      return;
    }

    saveToHistory();

    setMarksData(prev => {
      const updated = { ...prev };
      students.forEach(student => {
        if (!lockedRows.has(student.id!) && !absentStudents.has(student.id!) && !sickStudents.has(student.id!)) {
          updated[student.id!] = {
            ...updated[student.id!],
            [quickFillSubject]: numVal
          };
        }
      });
      return updated;
    });

    setHasUnsavedChanges(true);
    setShowQuickFill(false);
    setQuickFillSubject('');
    setQuickFillValue('');
    showMessage(`Applied ${numVal} to all students for ${quickFillSubject.toUpperCase()}`, 'success');
    triggerAutoSave();
  };

  const performSave = async () => {
    const year = settings?.currentYear || new Date().getFullYear();
    try {
      const promises = students.map(student => {
        const studentMarks = marksData[student.id!] || {};

        const aggregate = calculateAggregate(studentMarks as any, selectedClass, settings?.gradingConfig);
        const division = calculateDivision(aggregate, selectedClass, settings?.gradingConfig);

        const record: MarkRecord = {
          studentId: student.id!,
          term: selectedTerm,
          year,
          type: selectedType,
          marks: studentMarks,
          aggregate,
          division,
          comment: comments[student.id!] || '',
          status: absentStudents.has(student.id!) ? 'absent' : sickStudents.has(student.id!) ? 'sick' : 'present'
        };
        return dbService.saveMark(record);
      });

      await Promise.all(promises);
      setHasUnsavedChanges(false);
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleSave = async () => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    setLoading(true);
    const success = await performSave();
    if (success) {
      showMessage('All marks saved successfully!', 'success');
    } else {
      showMessage('Error saving marks. Please try again.', 'error');
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, studentId: number, subject: string) => {
    const studentIdx = filteredStudents.findIndex(s => s.id === studentId);
    const subjectIdx = subjects.indexOf(subject);

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      let nextStudentIdx = studentIdx;
      let nextSubjectIdx = subjectIdx + 1;

      if (nextSubjectIdx >= subjects.length) {
        nextSubjectIdx = 0;
        nextStudentIdx = studentIdx + 1;
      }

      if (nextStudentIdx < filteredStudents.length) {
        const nextKey = `${filteredStudents[nextStudentIdx].id}-${subjects[nextSubjectIdx]}`;
        inputRefs.current[nextKey]?.focus();
        inputRefs.current[nextKey]?.select();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (studentIdx < filteredStudents.length - 1) {
        const nextKey = `${filteredStudents[studentIdx + 1].id}-${subject}`;
        inputRefs.current[nextKey]?.focus();
        inputRefs.current[nextKey]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (studentIdx > 0) {
        const prevKey = `${filteredStudents[studentIdx - 1].id}-${subject}`;
        inputRefs.current[prevKey]?.focus();
        inputRefs.current[prevKey]?.select();
      }
    } else if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionStart === (e.target as HTMLInputElement).value.length) {
      e.preventDefault();
      if (subjectIdx < subjects.length - 1) {
        const nextKey = `${studentId}-${subjects[subjectIdx + 1]}`;
        inputRefs.current[nextKey]?.focus();
        inputRefs.current[nextKey]?.select();
      }
    } else if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0) {
      e.preventDefault();
      if (subjectIdx > 0) {
        const prevKey = `${studentId}-${subjects[subjectIdx - 1]}`;
        inputRefs.current[prevKey]?.focus();
        inputRefs.current[prevKey]?.select();
      }
    }
  };

  const clearStudentMarks = (studentId: number) => {
    if (lockedRows.has(studentId)) {
      showMessage('Row is locked', 'info');
      return;
    }
    saveToHistory();
    setMarksData(prev => ({
      ...prev,
      [studentId]: {}
    }));
    setHasUnsavedChanges(true);
    showMessage('Marks cleared for student', 'info');
    triggerAutoSave();
  };

  const copyFromOtherAssessment = async () => {
    const sourceType = selectedType === AssessmentType.BOT ? AssessmentType.EOT : AssessmentType.BOT;
    const sourceLabel = sourceType === AssessmentType.BOT ? 'BOT' : 'EOT';

    if (!confirm(`Copy marks from ${sourceLabel} assessment to current view? This will overwrite any existing marks.`)) {
      return;
    }

    saveToHistory();
    setLoading(true);
    saveToHistory();
    setLoading(true);
    const allMarks = await dbService.getMarks();
    const year = settings?.currentYear || new Date().getFullYear();

    const newMarksData = { ...marksData };
    let copiedCount = 0;

    students.forEach(student => {
      if (lockedRows.has(student.id!) || absentStudents.has(student.id!) || sickStudents.has(student.id!)) return;

      const sourceRecord = allMarks.find(m =>
        m.studentId === student.id &&
        m.term === selectedTerm &&
        m.year === year &&
        m.type === sourceType
      );

      if (sourceRecord && sourceRecord.marks) {
        newMarksData[student.id!] = { ...sourceRecord.marks };
        copiedCount++;
      }
    });

    setMarksData(newMarksData);
    setHasUnsavedChanges(true);
    setLoading(false);
    showMessage(`Copied marks from ${sourceLabel} for ${copiedCount} students`, 'info');
    triggerAutoSave();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const addNewStudentsWithMarks = async () => {
    if (pendingNewStudents.length === 0) return;

    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const stream = selectedStream === 'All' ? (availableStreams[0] || '') : selectedStream;

      const newStudents: Omit<Student, 'id'>[] = pendingNewStudents.map((s, idx) => ({
        indexNumber: `NEW-${Date.now()}-${idx}`,
        name: s.name,
        gender: 'M' as const,
        classLevel: selectedClass,
        stream: stream,
        paycode: '',
        parentName: '',
        parentContact: '',
        status: 'active' as const,
      }));

      const addedStudents = await dbService.addStudents(newStudents);

      const newMarks: MarkRecord[] = [];
      addedStudents.forEach((student, idx) => {
        const marks = pendingNewStudents[idx].marks;
        const agg = calculateAggregate(marks as any, selectedClass, settings?.gradingConfig);
        const div = calculateDivision(agg, selectedClass, settings?.gradingConfig);

        newMarks.push({
          studentId: student.id!,
          term: selectedTerm,
          year,
          type: selectedType,
          marks,
          aggregate: agg,
          division: div
        });
      });

      if (newMarks.length > 0) {
        await dbService.saveMarks(newMarks);
      }

      showMessage(`Added ${addedStudents.length} new students with their marks. Please update their index numbers and details in the Students page.`, 'success');
      setPendingNewStudents([]);
      setShowNewStudentsModal(false);
      loadData();
    } catch (e) {
      console.error('Error adding new students:', e);
      showMessage('Error adding new students. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectForDelete = (studentId: number) => {
    setSelectedForDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const selectAllForDelete = () => {
    const studentsWithMarks = students.filter(s => {
      const marks = marksData[s.id!];
      return marks && Object.values(marks).some(v => v !== undefined);
    });
    setSelectedForDelete(new Set(studentsWithMarks.map(s => s.id!)));
  };

  const clearDeleteSelection = () => {
    setSelectedForDelete(new Set());
  };

  const handleBulkDeleteMarks = async () => {
    if (selectedForDelete.size === 0) return;

    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const idsToDelete = Array.from(selectedForDelete) as number[];

      const result = await dbService.deleteMarks(idsToDelete, selectedTerm, year, selectedType);

      if (!result || typeof result.deleted !== 'number') {
        showMessage('Unexpected response from server. Please try again.', 'error');
        return;
      }

      if (result.deleted === 0) {
        showMessage('No marks found for selected students.', 'error');
      } else if (result.deleted < result.requested) {
        showMessage(`Deleted marks for ${result.deleted} of ${result.requested} students. Some students may not have had marks.`, 'info');
        setSelectedForDelete(new Set());
        setShowDeleteConfirm(false);
        loadData();
      } else {
        showMessage(`Deleted marks for ${result.deleted} students.`, 'success');
        setSelectedForDelete(new Set());
        setShowDeleteConfirm(false);
        loadData();
      }
    } catch (e) {
      console.error('Error deleting marks:', e);
      showMessage('Error deleting marks. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    const allStudents = await dbService.getStudents();

    let classStudents = allStudents.filter(s => s.classLevel === selectedClass);

    if (selectedStream !== 'All') {
      classStudents = classStudents.filter(s => s.stream === selectedStream);
    }

    if (classStudents.length === 0) {
      alert("No students found for this selection to generate a template.");
      return;
    }

    const isLower = ['P1', 'P2', 'P3'].includes(selectedClass);

    let headers = ['Index Number', 'Name', 'Stream', 'English', 'Maths'];
    if (isLower) {
      headers.push('Literacy 1', 'Literacy 2');
    } else {
      headers.push('Science', 'SST');
    }

    classStudents.sort((a, b) => a.name.localeCompare(b.name));

    const csvRows = [headers.join(',')];

    classStudents.forEach(student => {
      const name = `"${student.name}"`;
      const stream = student.stream || '';
      const emptyMarks = isLower ? ',,,,' : ',,,,';
      csvRows.push(`${student.indexNumber},${name},${stream}${emptyMarks}`);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedClass}_${selectedStream}_${selectedType}_Template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const normalizeStudentName = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/[^A-Z\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(' ');
  };

  const findStudentByName = (name: string, allStudents: Student[]): Student | undefined => {
    const normalizedInput = normalizeStudentName(name);
    if (!normalizedInput) return undefined;

    const inputWords = normalizedInput.split(' ');

    let bestMatch: Student | undefined;
    let bestScore = 0;

    for (const student of allStudents) {
      const normalizedStudent = normalizeStudentName(student.name);
      const studentWords = normalizedStudent.split(' ');

      if (normalizedInput === normalizedStudent) {
        return student;
      }

      const matchingWords = inputWords.filter(w => studentWords.includes(w));
      const score = matchingWords.length / Math.max(inputWords.length, studentWords.length);

      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestMatch = student;
      }
    }

    return bestMatch;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    saveToHistory();
    setLoading(true);

    try {
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      let rows: any[][] = [];

      if (isExcel) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      } else {
        const text = await file.text();
        const lines = text.split(/\r\n|\n/).filter(l => l.trim());
        rows = lines.map(line => {
          const cols: string[] = [];
          let inQuote = false;
          let current = '';
          for (const char of line) {
            if (char === '"') {
              inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
              cols.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          cols.push(current.trim());
          return cols;
        });
      }

      if (rows.length < 2) {
        showMessage('File is empty or has no data rows', 'error');
        setLoading(false);
        return;
      }

      let headerRowIndex = -1;
      let nameColIndex = -1;
      let engColIndex = -1;
      let mtcColIndex = -1;
      let sciColIndex = -1;
      let sstColIndex = -1;
      let lit1ColIndex = -1;
      let lit2ColIndex = -1;
      let indexColIndex = -1;

      const findColumnIndex = (row: any[], patterns: string[]): number => {
        for (let i = 0; i < row.length; i++) {
          const cell = String(row[i] || '').toLowerCase().trim();
          if (patterns.some(p => cell === p || cell.includes(p))) {
            return i;
          }
        }
        return -1;
      };

      const isValidDataRow = (row: any[], nameCol: number, engCol: number): boolean => {
        const name = String(row[nameCol] || '').trim();
        const eng = row[engCol];

        if (!name || name.length < 3) return false;

        const nameLower = name.toLowerCase();
        const skipWords = ['name', 'names', 'student', 'total', 'average', 'eng', 'english', 'scores', 'result', 'div', 'agg', 'grade', 'class', 'position'];
        if (skipWords.some(w => nameLower === w || nameLower.includes('grading') || nameLower.includes('summary') || nameLower.includes('performer'))) return false;

        const hasMultipleWords = name.split(/\s+/).length >= 2;
        if (!hasMultipleWords) return false;

        const engVal = typeof eng === 'number' ? eng : parseInt(String(eng || '').replace(/[^0-9]/g, ''));
        return !isNaN(engVal) && engVal >= 0 && engVal <= 100;
      };

      const isSummaryBlock = (rowIndex: number): boolean => {
        for (let k = Math.max(0, rowIndex - 3); k <= rowIndex; k++) {
          const checkRow = rows[k];
          if (!checkRow) continue;
          const rowText = checkRow.map((c: any) => String(c || '').toLowerCase()).join(' ');
          if (rowText.includes('top') || rowText.includes('performer') || rowText.includes('summary') ||
            rowText.includes('best') || rowText.includes('ranking') || rowText.includes('position')) {
            return true;
          }
        }
        return false;
      };

      const scoreHeaderCandidate = (headerIdx: number, nameCol: number, engCol: number): number => {
        let consecutiveValid = 0;
        for (let j = headerIdx + 1; j < rows.length; j++) {
          if (isValidDataRow(rows[j], nameCol, engCol)) {
            consecutiveValid++;
          } else {
            const rowContent = String(rows[j]?.[nameCol] || '').trim();
            if (rowContent.length > 2) {
              break;
            }
          }
        }
        return consecutiveValid;
      };

      let bestScore = 0;
      let bestCandidate: { idx: number; nameCol: number; engCol: number; mtcCol: number; sciCol: number; sstCol: number; lit1Col: number; lit2Col: number; indexCol: number } | null = null;

      for (let i = 0; i < Math.min(rows.length, 20); i++) {
        const row = rows[i];
        const possibleNameCol = findColumnIndex(row, ['name', 'names', 'student name', 'pupil']);
        const possibleEngCol = findColumnIndex(row, ['eng', 'english']);

        if (possibleNameCol !== -1 && possibleEngCol !== -1) {
          if (isSummaryBlock(i)) continue;

          const score = scoreHeaderCandidate(i, possibleNameCol, possibleEngCol);

          if (score > bestScore && score >= 1) {
            bestScore = score;
            bestCandidate = {
              idx: i,
              nameCol: possibleNameCol,
              engCol: possibleEngCol,
              mtcCol: findColumnIndex(row, ['mtc', 'math', 'maths', 'mathematics']),
              sciCol: findColumnIndex(row, ['sci', 'science']),
              sstCol: findColumnIndex(row, ['sst', 'social']),
              lit1Col: findColumnIndex(row, ['lit1', 'literacy 1', 'literacy i', 'literacy1']),
              lit2Col: findColumnIndex(row, ['lit2', 'literacy 2', 'literacy ii', 'literacy2']),
              indexCol: findColumnIndex(row, ['index', 'number', 'no', 'idx'])
            };
          }
        }
      }

      if (bestCandidate) {
        headerRowIndex = bestCandidate.idx;
        nameColIndex = bestCandidate.nameCol;
        engColIndex = bestCandidate.engCol;
        mtcColIndex = bestCandidate.mtcCol;
        sciColIndex = bestCandidate.sciCol;
        sstColIndex = bestCandidate.sstCol;
        lit1ColIndex = bestCandidate.lit1Col;
        lit2ColIndex = bestCandidate.lit2Col;
        indexColIndex = bestCandidate.indexCol;
      }

      if (headerRowIndex === -1 || nameColIndex === -1) {
        showMessage('Could not find NAME column in file. Make sure your file has a column header with "Name" or "Names".', 'error');
        setLoading(false);
        return;
      }

      if (engColIndex === -1 && mtcColIndex === -1) {
        showMessage('Could not find subject columns (ENG, MTC, SCI, SST). Check your column headers.', 'error');
        setLoading(false);
        return;
      }

      const allStudents = await dbService.getStudents();
      const classStudents = allStudents.filter(s =>
        s.classLevel === selectedClass &&
        (selectedStream === 'All' || s.stream === selectedStream)
      ) as Student[];

      const year = new Date().getFullYear();
      const newMarks: MarkRecord[] = [];
      let importedCount = 0;
      let skippedCount = 0;
      const detectedNewStudents: { name: string; marks: SubjectMarks }[] = [];

      const parseMark = (value: any): number | undefined => {
        if (value === null || value === undefined || value === '') return undefined;
        const num = typeof value === 'number' ? value : parseInt(String(value).replace(/[^0-9]/g, ''));
        if (isNaN(num) || num < 0 || num > 100) return undefined;
        return num;
      };

      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const nameValue = String(row[nameColIndex] || '').trim();
        if (!nameValue || nameValue.length < 2) continue;

        const nameLower = nameValue.toLowerCase();
        const skipWords = ['name', 'names', 'student', 'total', 'average', 'eng', 'english', 'scores', 'result', 'div', 'agg', 'grade', 'class', 'position', 'top', 'performer', 'best'];
        if (skipWords.some(w => nameLower === w || nameLower.includes('grading') || nameLower.includes('summary'))) continue;

        const hasMultipleWords = nameValue.split(/\s+/).length >= 2;
        if (!hasMultipleWords) continue;

        let student: Student | undefined;

        if (indexColIndex !== -1) {
          const indexValue = String(row[indexColIndex] || '').trim();
          if (indexValue) {
            student = classStudents.find(s => s.indexNumber === indexValue);
          }
        }

        if (!student) {
          student = findStudentByName(nameValue, classStudents);
        }

        const marks: SubjectMarks = {};
        if (engColIndex !== -1) marks.english = parseMark(row[engColIndex]);
        if (mtcColIndex !== -1) marks.maths = parseMark(row[mtcColIndex]);
        if (sciColIndex !== -1) marks.science = parseMark(row[sciColIndex]);
        if (sstColIndex !== -1) marks.sst = parseMark(row[sstColIndex]);
        if (lit1ColIndex !== -1) marks.literacy1 = parseMark(row[lit1ColIndex]);
        if (lit2ColIndex !== -1) marks.literacy2 = parseMark(row[lit2ColIndex]);

        const hasMarks = Object.values(marks).some(v => v !== undefined);

        if (!student) {
          if (hasMarks) {
            detectedNewStudents.push({ name: nameValue.toUpperCase(), marks });
          }
          skippedCount++;
          continue;
        }

        if (lockedRows.has(student.id!)) {
          skippedCount++;
          continue;
        }

        if (hasMarks) {
          const agg = calculateAggregate(marks as any, student.classLevel as ClassLevel, settings?.gradingConfig);
          const div = calculateDivision(agg, student.classLevel as ClassLevel, settings?.gradingConfig);

          newMarks.push({
            studentId: student.id!,
            term: selectedTerm,
            year,
            type: selectedType,
            marks,
            aggregate: agg,
            division: div
          });
          importedCount++;
        }
      }

      if (newMarks.length > 0) {
        await dbService.saveMarks(newMarks);
        let msg = `Successfully imported marks for ${importedCount} students.`;
        if (skippedCount > 0) {
          msg += ` ${skippedCount} rows skipped.`;
        }
        showMessage(msg, 'success');
        loadData();
      } else if (detectedNewStudents.length === 0) {
        showMessage('No marks were imported. Make sure student names in your file match the names in the system.', 'error');
      }

      if (detectedNewStudents.length > 0) {
        setPendingNewStudents(detectedNewStudents);
        setShowNewStudentsModal(true);
      }

    } catch (e) {
      console.error('Import error:', e);
      showMessage('Error processing file. Please check the format and try again.', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getGradeColor = (mark: number | undefined) => {
    if (mark === undefined) return 'text-gray-400 dark:text-gray-500';
    if (!settings?.gradingConfig) {
      if (mark >= 80) return 'text-green-600 dark:text-green-400 font-bold';
      if (mark >= 50) return 'text-amber-600 dark:text-amber-400';
      return 'text-red-600 dark:text-red-400';
    }

    const passingMark = settings.gradingConfig.passingMark;
    // Assume Distinction (points 1-2) is Good, Credit (3-6) is Average/Pass, Pass (7-8) is Warning, Fail (9) is Bad
    const { points } = calculateGrade(mark, settings.gradingConfig);

    if (points <= 2) return 'text-green-600 dark:text-green-400 font-bold';
    if (points <= 6) return 'text-green-600 dark:text-green-400';
    if (mark >= passingMark) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRowStatus = (studentId: number) => {
    if (absentStudents.has(studentId)) return 'absent';
    if (sickStudents.has(studentId)) return 'sick';

    const marks = marksData[studentId];
    if (!marks || !Object.values(marks).some(v => v !== undefined)) return 'empty';

    const isComplete = subjects.every(sub => (marks as any)[sub] !== undefined);
    return isComplete ? 'complete' : 'partial';
  };

  const getRowBgColor = (studentId: number) => {
    const status = getRowStatus(studentId);
    const isLocked = lockedRows.has(studentId);

    if (status === 'absent') return 'bg-gray-100 dark:bg-gray-700/50';
    if (status === 'sick') return 'bg-orange-50 dark:bg-orange-500/10';
    if (isLocked) return 'bg-blue-50/50 dark:bg-blue-500/10';

    const marks = marksData[studentId];
    if (!marks || !Object.values(marks).some(v => v !== undefined)) {
      return 'bg-white dark:bg-gray-800';
    }

    const agg = calculateAggregate(marks as any, selectedClass, settings?.gradingConfig);
    const div = calculateDivision(agg, selectedClass, settings?.gradingConfig);
    if (div === 'I') return 'bg-green-50/50 dark:bg-green-500/10';
    if (div === 'II') return 'bg-blue-50/50 dark:bg-blue-500/10';
    if (div === 'III') return 'bg-amber-50/50 dark:bg-amber-500/10';
    if (div === 'U') return 'bg-red-50/30 dark:bg-red-500/10';
    return 'bg-white dark:bg-gray-800';
  };

  const inputClasses = "mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 focus:outline-none sm:text-sm transition-all duration-200";

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marks Entry</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tab/Enter: next cell | Arrow keys: navigate | Ctrl+Z: undo | Ctrl+Y: redo
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {message && (
            <span className={`font-medium px-3 py-1.5 rounded-lg text-sm ${messageType === 'success' ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30' :
              messageType === 'error' ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30' :
                'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30'
              }`}>
              {message}
            </span>
          )}

          {hasUnsavedChanges && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-sm bg-amber-50 dark:bg-amber-500/20 px-2 py-1 rounded-lg">
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  Unsaved
                </>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 mx-1"></div>
            <button
              onClick={() => setShowQuickFill(!showQuickFill)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showQuickFill ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              Quick Fill
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.xlsx,.xls"
              className="hidden"
            />
            <Button variant="secondary" size="sm" onClick={downloadTemplate}>
              Template
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportClick} disabled={loading}>
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={copyFromOtherAssessment} disabled={loading}>
              Copy {selectedType === AssessmentType.BOT ? 'EOT' : 'BOT'}
            </Button>
            <Button onClick={handleSave} disabled={loading || !hasUnsavedChanges}>
              {loading ? 'Saving...' : 'Save All'}
            </Button>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-600 mx-1"></div>
            {selectedForDelete.size > 0 ? (
              <>
                <span className="text-sm text-gray-500 dark:text-gray-400">{selectedForDelete.size} selected</span>
                <Button variant="outline" size="sm" onClick={clearDeleteSelection}>
                  Clear
                </Button>
                <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                  Delete Marks
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={selectAllForDelete} disabled={students.length === 0}>
                Select All for Delete
              </Button>
            )}
          </div>
        </div>

        {showQuickFill && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fill all students:</span>
            <select
              value={quickFillSubject}
              onChange={(e) => setQuickFillSubject(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Select subject</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s === 'literacy1' ? 'Literacy 1' : s === 'literacy2' ? 'Literacy 2' : s.toUpperCase()}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Mark (0-100)"
              value={quickFillValue}
              onChange={(e) => setQuickFillValue(e.target.value)}
              className="w-28 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <Button size="sm" onClick={applyQuickFill} disabled={!quickFillSubject || quickFillValue === ''}>
              Apply
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Class</label>
            <select
              className={inputClasses}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as ClassLevel)}
            >
              {Object.values(ClassLevel).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Stream</label>
            <select
              className={inputClasses}
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
            >
              <option value="All">All Streams</option>
              {availableStreams.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Term</label>
            <select
              className={inputClasses}
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(Number(e.target.value))}
            >
              <option value={1}>Term 1</option>
              <option value={2}>Term 2</option>
              <option value={3}>Term 3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Assessment</label>
            <select
              className={inputClasses}
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as AssessmentType)}
            >
              <option value={AssessmentType.BOT}>BOT</option>
              <option value={AssessmentType.EOT}>EOT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
            <input
              type="text"
              className={inputClasses}
              placeholder="Name or index..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{progressStats.complete}/{progressStats.total}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Complete</div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Progress</span>
                <span>{progressStats.percentage}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressStats.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Complete: {progressStats.complete}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Partial: {progressStats.withMarks - progressStats.complete}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-gray-400"></span>
              <span className="text-gray-600 dark:text-gray-400">Empty: {progressStats.total - progressStats.withMarks - progressStats.absent - progressStats.sick}</span>
            </div>
            {progressStats.absent > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-gray-600"></span>
                <span className="text-gray-600 dark:text-gray-400">Absent: {progressStats.absent}</span>
              </div>
            )}
            {progressStats.sick > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                <span className="text-gray-600 dark:text-gray-400">Sick: {progressStats.sick}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowStats(!showStats)}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </button>
        </div>

        {showStats && classStats && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xl font-bold text-primary-600 dark:text-primary-400">{classStats.avgAggregate}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Avg Aggregate</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">{classStats.passRate}%</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Pass Rate</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="flex gap-2 text-sm font-bold">
                <span className="text-green-600 dark:text-green-400">I:{classStats.divCounts.I}</span>
                <span className="text-blue-600 dark:text-blue-400">II:{classStats.divCounts.II}</span>
                <span className="text-amber-600 dark:text-amber-400">III:{classStats.divCounts.III}</span>
                <span className="text-red-600 dark:text-red-400">U:{classStats.divCounts.U}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Divisions</div>
            </div>
            {classStats.bestStudent && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 col-span-2">
                <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{classStats.bestStudent.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Best: Aggregate {classStats.bestAggregate}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Card View - Only visible on small screens */}
      <div className="lg:hidden">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
            <svg className="animate-spin h-8 w-8 mx-auto text-primary-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Loading students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No students match your search.' : 'No students found for this selection.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Navigation Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setMobileViewIndex(Math.max(0, mobileViewIndex - 1))}
                    disabled={mobileViewIndex === 0}
                    className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation active:scale-95 transition-transform"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setShowMobileStudentPicker(true)}
                    className="flex-1 mx-4 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl touch-manipulation"
                  >
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Student {mobileViewIndex + 1} of {filteredStudents.length}
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white truncate">
                      {filteredStudents[mobileViewIndex]?.name}
                    </div>
                  </button>

                  <button
                    onClick={() => setMobileViewIndex(Math.min(filteredStudents.length - 1, mobileViewIndex + 1))}
                    disabled={mobileViewIndex >= filteredStudents.length - 1}
                    className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation active:scale-95 transition-transform"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Current Student Card */}
              {filteredStudents.length > 0 && filteredStudents[mobileViewIndex] && (() => {
                const student = filteredStudents[mobileViewIndex];
                const sMarks = marksData[student.id!] || {};
                const agg = calculateAggregate(sMarks as any, selectedClass);
                const div = calculateDivision(agg, selectedClass);
                const isLocked = lockedRows.has(student.id!);
                const isAbsent = absentStudents.has(student.id!);
                const isSick = sickStudents.has(student.id!);
                const status = getRowStatus(student.id!);

                return (
                  <div className="p-4">
                    {/* Student Info */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${status === 'complete' ? 'bg-green-500' :
                          status === 'partial' ? 'bg-amber-500' :
                            status === 'absent' ? 'bg-gray-600' :
                              status === 'sick' ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}></div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{student.indexNumber}</div>
                          {student.stream && (
                            <div className="text-xs text-primary-600 dark:text-primary-400">{student.stream}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAbsent(student.id!)}
                          disabled={isLocked}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation ${isAbsent ? 'bg-gray-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            } ${isLocked ? 'opacity-50' : ''}`}
                        >
                          ABS
                        </button>
                        <button
                          onClick={() => toggleSick(student.id!)}
                          disabled={isLocked}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation ${isSick ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            } ${isLocked ? 'opacity-50' : ''}`}
                        >
                          SICK
                        </button>
                        <button
                          onClick={() => toggleLockRow(student.id!)}
                          className={`p-2 rounded-lg transition-colors touch-manipulation ${isLocked ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                            }`}
                        >
                          {isLocked ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Aggregate and Division Display */}
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1 bg-primary-50 dark:bg-primary-500/10 rounded-xl p-3 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Aggregate</div>
                        <div className="text-2xl font-bold text-primary-700 dark:text-primary-400">
                          {agg > 0 ? agg : '-'}
                        </div>
                      </div>
                      <div className="flex-1 bg-primary-50 dark:bg-primary-500/10 rounded-xl p-3 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Division</div>
                        <div className={`text-2xl font-bold ${div === 'I' ? 'text-green-600 dark:text-green-400' :
                          div === 'II' ? 'text-blue-600 dark:text-blue-400' :
                            div === 'III' ? 'text-amber-600 dark:text-amber-400' :
                              div === 'U' ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
                          }`}>
                          {div || '-'}
                        </div>
                      </div>
                    </div>

                    {/* Subject Marks Input Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {subjects.map(sub => {
                        const val = (sMarks as any)[sub];
                        const { grade } = calculateGrade(val, settings?.gradingConfig);
                        const isInvalid = val !== undefined && (val < 0 || val > 100);
                        const subjectName = sub === 'literacy1' ? 'Literacy 1' :
                          sub === 'literacy2' ? 'Literacy 2' :
                            sub === 'english' ? 'English' :
                              sub === 'maths' ? 'Mathematics' :
                                sub === 'science' ? 'Science' :
                                  sub === 'sst' ? 'SST' : sub.toUpperCase();

                        return (
                          <div key={sub} className={`bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 ${isAbsent || isSick || isLocked ? 'opacity-50' : ''
                            }`}>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                              {subjectName}
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min="0"
                                max="100"
                                disabled={isLocked || isAbsent || isSick}
                                className={`flex-1 px-3 py-3 text-lg font-medium text-center rounded-xl border-2 transition-all touch-manipulation
                                  ${isLocked || isAbsent || isSick
                                    ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 cursor-not-allowed'
                                    : isInvalid
                                      ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600'
                                      : val !== undefined
                                        ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-500/10 text-gray-900 dark:text-white'
                                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30'
                                  }`}
                                value={val !== undefined ? val : ''}
                                onChange={(e) => handleMarkChange(student.id!, sub, e.target.value)}
                                placeholder="-"
                              />
                              <div className={`w-10 text-center font-bold text-sm ${getGradeColor(val)}`}>
                                {grade}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Clear Marks Button */}
                    <button
                      onClick={() => clearStudentMarks(student.id!)}
                      disabled={isLocked}
                      className="mt-4 w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-medium hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors touch-manipulation disabled:opacity-50"
                    >
                      Clear All Marks
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Mobile Student Picker Modal */}
            {showMobileStudentPicker && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4" onClick={() => setShowMobileStudentPicker(false)}>
                <div className="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-lg max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 dark:text-white">Select Student</h3>
                    <button
                      onClick={() => setShowMobileStudentPicker(false)}
                      className="p-2 text-gray-500 dark:text-gray-400 touch-manipulation"
                    >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="overflow-y-auto max-h-[60vh]">
                    {filteredStudents.map((student, idx) => {
                      const status = getRowStatus(student.id!);
                      return (
                        <button
                          key={student.id}
                          onClick={() => {
                            setMobileViewIndex(idx);
                            setShowMobileStudentPicker(false);
                          }}
                          className={`w-full p-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 text-left touch-manipulation active:bg-gray-50 dark:active:bg-gray-700 ${idx === mobileViewIndex ? 'bg-primary-50 dark:bg-primary-500/10' : ''
                            }`}
                        >
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${status === 'complete' ? 'bg-green-500' :
                            status === 'partial' ? 'bg-amber-500' :
                              status === 'absent' ? 'bg-gray-600' :
                                status === 'sick' ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">{student.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{student.indexNumber} {student.stream && `| ${student.stream}`}</div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">#{idx + 1}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden lg:block bg-white dark:bg-gray-800 shadow-sm rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-52 sticky left-0 bg-gray-50 dark:bg-gray-700 z-10">
                  Student ({filteredStudents.length})
                </th>
                {subjects.map(sub => (
                  <th key={sub} className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-20">
                    {sub === 'literacy1' ? 'LIT1' : sub === 'literacy2' ? 'LIT2' : sub === 'english' ? 'ENG' : sub === 'maths' ? 'MTH' : sub === 'science' ? 'SCI' : sub.toUpperCase()}
                  </th>
                ))}
                <th className="px-2 py-3 text-center text-xs font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wider bg-primary-50 dark:bg-primary-500/10 w-14">Agg</th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wider bg-primary-50 dark:bg-primary-500/10 w-14">Div</th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-24">Status</th>
                <th className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={subjects.length + 5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <svg className="animate-spin h-6 w-6 mx-auto text-primary-600" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="mt-2">Loading students...</p>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={subjects.length + 5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No students match your search.' : 'No students found for this selection.'}
                  </td>
                </tr>
              ) : filteredStudents.map((student) => {
                const sMarks = marksData[student.id!] || {};
                const agg = calculateAggregate(sMarks as any, selectedClass, settings?.gradingConfig);
                const div = calculateDivision(agg, selectedClass, settings?.gradingConfig);
                const rowBg = getRowBgColor(student.id!);
                const status = getRowStatus(student.id!);
                const isLocked = lockedRows.has(student.id!);
                const isAbsent = absentStudents.has(student.id!);
                const isSick = sickStudents.has(student.id!);

                return (
                  <tr key={student.id} className={`${rowBg} hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors ${isLocked ? 'opacity-75' : ''}`}>
                    <td className={`px-3 py-2 whitespace-nowrap sticky left-0 ${rowBg} z-10 border-r border-gray-100 dark:border-gray-700`}>
                      <div className="flex items-center gap-2">
                        {status === 'complete' && (
                          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                        )}
                        {status === 'partial' && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                        )}
                        {status === 'empty' && (
                          <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0"></span>
                        )}
                        {status === 'absent' && (
                          <span className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0"></span>
                        )}
                        {status === 'sick' && (
                          <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"></span>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{student.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-1.5">
                            <span>{student.indexNumber}</span>
                            {student.stream && (
                              <>
                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                <span className="text-primary-600 dark:text-primary-400">{student.stream}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {subjects.map(sub => {
                      const val = (sMarks as any)[sub];
                      const { grade } = calculateGrade(val, settings?.gradingConfig);
                      const inputKey = `${student.id}-${sub}`;
                      const isInvalid = val !== undefined && (val < 0 || val > 100);

                      return (
                        <td key={sub} className="px-1 py-1 text-center">
                          <div className="flex flex-col items-center">
                            <input
                              ref={el => inputRefs.current[inputKey] = el}
                              type="number"
                              min="0"
                              max="100"
                              disabled={isLocked || isAbsent || isSick}
                              className={`w-14 px-1 py-2 border rounded-lg text-center text-sm transition-all
                                                  ${isLocked || isAbsent || isSick
                                  ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                  : isInvalid
                                    ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 focus:ring-red-500'
                                    : val !== undefined
                                      ? 'border-green-300 dark:border-green-600 bg-green-50/50 dark:bg-green-500/10 text-gray-900 dark:text-white focus:ring-green-500 focus:border-green-500'
                                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500'
                                } focus:ring-2 focus:outline-none`}
                              value={val !== undefined ? val : ''}
                              onChange={(e) => handleMarkChange(student.id!, sub, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, student.id!, sub)}
                              onFocus={(e) => e.target.select()}
                              placeholder="-"
                            />
                            <span className={`text-xs mt-0.5 ${getGradeColor(val)}`}>{grade}</span>
                          </div>
                        </td>
                      );
                    })}
                    <td className={`px-2 py-2 text-center font-bold ${agg > 0 ? 'text-primary-700 dark:text-primary-400' : 'text-gray-400'} bg-primary-50/50 dark:bg-primary-500/5`}>
                      {agg > 0 ? agg : '-'}
                    </td>
                    <td className={`px-2 py-2 text-center font-bold bg-primary-50/50 dark:bg-primary-500/5 ${div === 'I' ? 'text-green-600 dark:text-green-400' :
                      div === 'II' ? 'text-blue-600 dark:text-blue-400' :
                        div === 'III' ? 'text-amber-600 dark:text-amber-400' :
                          div === 'U' ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
                      }`}>
                      {div || '-'}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toggleAbsent(student.id!)}
                          disabled={isLocked}
                          className={`text-xs px-2 py-1 rounded transition-colors ${isAbsent
                            ? 'bg-gray-600 text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Mark as Absent"
                        >
                          ABS
                        </button>
                        <button
                          onClick={() => toggleSick(student.id!)}
                          disabled={isLocked}
                          className={`text-xs px-2 py-1 rounded transition-colors ${isSick
                            ? 'bg-orange-500 text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Mark as Sick"
                        >
                          SICK
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toggleLockRow(student.id!)}
                          className={`p-1.5 rounded transition-colors ${isLocked
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/20'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          title={isLocked ? 'Unlock row' : 'Lock row'}
                        >
                          {isLocked ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => clearStudentMarks(student.id!)}
                          disabled={isLocked}
                          className={`p-1.5 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Clear marks"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showNewStudentsModal && pendingNewStudents.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">New Students Detected</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {pendingNewStudents.length} student(s) from your file are not in the system. Would you like to add them?
              </p>
            </div>
            <div className="p-6 max-h-[40vh] overflow-y-auto">
              <ul className="space-y-2">
                {pendingNewStudents.map((s, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {Object.entries(s.marks).filter(([_, v]) => v !== undefined).map(([k, v]) => `${k.toUpperCase().slice(0, 3)}: ${v}`).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setPendingNewStudents([]);
                  setShowNewStudentsModal(false);
                }}
              >
                Skip
              </Button>
              <Button onClick={addNewStudentsWithMarks} disabled={loading}>
                {loading ? 'Adding...' : `Add ${pendingNewStudents.length} Students`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirm Delete Marks</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Are you sure you want to delete marks for {selectedForDelete.size} selected student(s)?
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                This will delete marks for {selectedClass} {selectedStream !== 'All' ? selectedStream : ''} - Term {selectedTerm} {selectedType}
              </p>
            </div>
            <div className="p-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleBulkDeleteMarks} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete Marks'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
