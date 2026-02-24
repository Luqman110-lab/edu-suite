import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';


import { Student, ClassLevel, Gender } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useClassNames } from '../hooks/use-class-names';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { useStudents } from '../client/src/hooks/useStudents';
import { useSettings } from '../client/src/hooks/useSettings';
import { useStreams } from '../client/src/hooks/useClassAssignments';
import { Button } from '../components/Button';
import { Toast } from '../client/src/components/Toast';
import { StudentIDCard } from '../components/StudentIDCard';
import { BulkIDCardPrint } from '../components/StudentIDCard';
import FaceEnrollment from '../client/src/components/FaceEnrollment';

// Imported Components
import { StudentStats } from '../client/src/components/students/StudentStats';
import { StudentFilters } from '../client/src/components/students/StudentFilters';
import { StudentList } from '../client/src/components/students/StudentList';
import { StudentModal } from '../client/src/components/students/StudentModal';
import { StudentProfile } from '../client/src/components/students/StudentProfile';
import { PromoteStudentsModal } from '../client/src/components/students/PromoteStudentsModal';

const ITEMS_PER_PAGE = 20;

export const Students: React.FC = () => {
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const { getDisplayName, getAllClasses } = useClassNames();
  const { selectedYear, isArchiveMode } = useAcademicYear();

  // View State
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'profile'>('list');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [idCardStudent, setIdCardStudent] = useState<Student | null>(null);
  const [showBulkIdCards, setShowBulkIdCards] = useState(false);
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false);
  const [faceEnrollStudent, setFaceEnrollStudent] = useState<Student | null>(null);
  const [enrolledFaceIds, setEnrolledFaceIds] = useState<Set<number>>(new Set());

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('All');
  const [filterStream, setFilterStream] = useState<string>('All');
  const [filterGender, setFilterGender] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All'); // 'medical', 'absent', 'active'
  const [sortOption, setSortOption] = useState<'name' | 'class'>('class');

  // Selection & Pagination State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Operation State
  const [importing, setImporting] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionSummary, setPromotionSummary] = useState<{ [key: string]: { count: number; targetClass: string } }>({});

  // Inline Edit State
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Toast State
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'warning') => setLocalToast({ message, type });

  // Hooks
  const { students, isLoading: studentsLoading, addStudent, updateStudent, deleteStudent, deleteStudents, importStudents, refetch: refetchStudents } = useStudents(isArchiveMode && selectedYear ? selectedYear.toString() : undefined);
  const { settings, isLoading: settingsLoading, updateSettings, refetch: refetchSettings } = useSettings();
  const { streams } = useStreams();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Data State
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    classLevel: ClassLevel.P1,
    stream: '',
    gender: Gender.Male,
    paycode: '',
    parentName: '',
    parentContact: '',
    specialCases: { absenteeism: false, sickness: false, fees: false }
  });

  // Derived State
  const availableStreams = useMemo(() => {
    if (filterClass === 'All') {
      const allStreams = new Set<string>();
      streams?.forEach(s => s.streamName && allStreams.add(s.streamName));
      return Array.from(allStreams).sort();
    }
    return streams?.filter(s => s.classLevel === filterClass).map(s => s.streamName).sort() || [];
  }, [filterClass, streams]);

  const filteredStudents = useMemo(() => {
    let filtered = students.filter(s =>
    ((s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.paycode && s.paycode.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    if (filterClass !== 'All') {
      filtered = filtered.filter(s => s.classLevel === filterClass);
    }

    if (filterStream !== 'All') {
      filtered = filtered.filter(s => s.stream === filterStream);
    }

    if (filterGender !== 'All') {
      filtered = filtered.filter(s => s.gender === filterGender);
    }

    if (filterStatus !== 'All') {
      filtered = filtered.filter(s => {
        if (filterStatus === 'medical') return s.specialCases?.sickness;
        if (filterStatus === 'absent') return s.specialCases?.absenteeism;
        if (filterStatus === 'active') return !s.specialCases?.fees && !s.specialCases?.sickness && !s.specialCases?.absenteeism;
        return true;
      });
    }

    filtered.sort((a, b) => {
      if (sortOption === 'name') return a.name.localeCompare(b.name);
      if (sortOption === 'class') {
        const classCompare = a.classLevel.localeCompare(b.classLevel);
        if (classCompare !== 0) return classCompare;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return filtered;
  }, [students, searchQuery, filterClass, filterStream, filterGender, filterStatus, sortOption]);

  const paginatedStudents = useMemo(() => {
    const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
    return filteredStudents.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);

  // Effects
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterClass, filterStream, filterGender, filterStatus]);

  // Handlers
  const handleViewProfile = (student: Student) => {
    setSelectedStudent(student);
    setViewMode('profile');
  };

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({ ...student });
    setIsModalOpen(true);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedStudent(null);
  };

  const handleDelete = async (id: number | undefined) => {
    if (id === undefined || id === null) {
      showToast("Cannot delete: Student ID is missing", 'error');
      return;
    }
    if (window.confirm('Are you sure you want to delete this student? This will permanently remove the student profile AND all associated marks.')) {
      try {
        await deleteStudent.mutateAsync(id);
        showToast('Student deleted successfully', 'success');

        if (viewMode === 'profile') {
          handleBackToList();
        }
      } catch (error: any) {
        showToast(`Failed to delete student: ${error.message}`, 'error');
      }
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} students? This will permanently remove them and their marks.`)) {
      try {
        await deleteStudents.mutateAsync(Array.from(selectedIds));
        setSelectedIds(new Set());
        showToast(`${selectedIds.size} students deleted successfully`, 'success');
      } catch (error: any) {
        showToast(`Failed to delete: ${error.message}`, 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      const cls = formData.classLevel as string;
      const str = formData.stream || '';

      if (str && settings) {
        // Streams are now managed in the DB, so we don't strictly need to back-update settings.streams
        // But keeping this logic in case it's used elsewhere as a fallback
        const classStreams = settings.streams[cls] || [];
        if (!classStreams.includes(str)) {
          const newStreams = { ...settings.streams, [cls]: [...classStreams, str] };
          await updateSettings.mutateAsync({ ...settings, streams: newStreams });
        }
      }

      const studentToSave = {
        ...formData,
        name: formData.name.toUpperCase()
      } as Student;

      try {
        let savedStudentId = formData.id;
        if (studentToSave.id) {
          await updateStudent.mutateAsync(studentToSave);
          if (selectedStudent && selectedStudent.id === studentToSave.id) {
            setSelectedStudent(studentToSave);
          }
        } else {
          const addedStudent = await addStudent.mutateAsync(studentToSave);
          savedStudentId = addedStudent.id;
        }

        // Handle Dormitory Assignment
        if (savedStudentId) {
          try {
            if ((formData as any).unassignBedId) {
              await fetch(`/api/beds/${(formData as any).unassignBedId}/unassign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
              });
            }
            if ((formData as any).assignedBedId) {
              await fetch(`/api/beds/${(formData as any).assignedBedId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ studentId: savedStudentId }),
              });
            }
          } catch (bedError: any) {
            console.error('Failed to update bed assignment:', bedError);
            showToast(`Student saved, but bed assignment failed: ${bedError.message}`, 'warning');
          }
        }

        showToast(studentToSave.id ? 'Student updated successfully' : 'Student added successfully', 'success');
        setIsModalOpen(false);
        // Reset form
        setFormData({
          name: '', classLevel: ClassLevel.P1, stream: '', gender: Gender.Male, paycode: '', parentName: '', parentContact: '',
          specialCases: { absenteeism: false, sickness: false, fees: false }
        });
      } catch (error: any) {
        showToast(`Failed to save: ${error.message}`, 'error');
      }
    }
  };

  // Quick Edit
  const handleQuickEdit = async (studentId: number, field: string, value: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    let updatedStudent = { ...student };

    switch (field) {
      case 'name':
        updatedStudent.name = value.toUpperCase();
        break;
      case 'stream':
        updatedStudent.stream = value;
        break;
      case 'paycode':
        updatedStudent.paycode = value;
        break;
    }

    try {
      await updateStudent.mutateAsync(updatedStudent);
      showToast('Updated successfully', 'success');
    } catch (error: any) {
      showToast(`Update failed: ${error.message}`, 'error');
    }

    setEditingRowId(null);
    setEditingField(null);
  };

  // Selection Handlers
  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAllFiltered = () => {
    const filteredIds = filteredStudents.map(s => s.id!);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));

    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIds));
    }
  };

  const toggleSelectAllPage = () => {
    const pageIds = paginatedStudents.map(s => s.id!);
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));

    if (allPageSelected) {
      const newSet = new Set(selectedIds);
      pageIds.forEach(id => newSet.delete(id));
      setSelectedIds(newSet);
    } else {
      const newSet = new Set(selectedIds);
      pageIds.forEach(id => newSet.add(id));
      setSelectedIds(newSet);
    }
  };

  const pageIds = paginatedStudents.map(s => s.id!);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const somePageSelected = pageIds.some(id => selectedIds.has(id));
  const indeterminate = somePageSelected && !allPageSelected;
  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s.id!));

  // Promotion Logic
  const preparePromotionSummary = () => {
    const promotionMapping: { [key: string]: string } = {
      "N1": "N2", "N2": "N3", "N3": "P1", "P1": "P2", "P2": "P3", "P3": "P4", "P4": "P5", "P5": "P6", "P6": "P7", "P7": "Graduated"
    };

    const summary: { [key: string]: { count: number; targetClass: string } } = {};

    for (const id of selectedIds) {
      const student = students.find(s => s.id === id);
      if (!student) continue;

      const targetClass = promotionMapping[student.classLevel];
      if (targetClass) {
        if (!summary[student.classLevel]) {
          summary[student.classLevel] = { count: 0, targetClass };
        }
        summary[student.classLevel].count++;
      }
    }

    setPromotionSummary(summary);
    setShowPromoteModal(true);
  };

  const handlePromoteStudents = async (targetStream: string) => {
    if (selectedIds.size === 0) return;
    setIsPromoting(true);
    try {
      const response = await fetch('/api/students/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentIds: Array.from(selectedIds),
          targetStream: targetStream || undefined,
          academicYear: settings?.currentYear || new Date().getFullYear(),
          term: settings?.currentTerm || 3
        })
      });

      const result = await response.json();

      if (response.ok) {
        await refetchStudents();
        setSelectedIds(new Set());
        setShowPromoteModal(false);
        setPromotionSummary({});

        let message = `Successfully promoted ${result.promotedCount} student(s)!`;
        if (result.graduatedCount > 0) message += ` (${result.graduatedCount} graduated)`;
        if (result.skippedCount > 0) message += ` ${result.skippedCount} skipped.`;

        showToast(message, result.promotedCount > 0 ? 'success' : 'warning');
      } else {
        showToast(`Promotion failed: ${result.message}`, 'error');
      }
    } catch (error: any) {
      showToast(`Promotion failed: ${error.message}`, 'error');
    } finally {
      setIsPromoting(false);
    }
  };

  // CSV Logic
  const normalizeClassInput = (rawClass: string): ClassLevel => {
    const cleaned = rawClass.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanedOriginal = rawClass.trim().toUpperCase();

    // 1. Direct enum match (e.g. N1, P3, etc.)
    if (Object.values(ClassLevel).includes(cleaned as ClassLevel)) return cleaned as ClassLevel;

    // 2. Reverse-lookup school classAliases (e.g. school named N1 → "Baby")
    //    classAliases = { N1: 'Baby', N2: 'Middle', N3: 'Top' }
    if (settings?.classAliases) {
      for (const [level, alias] of Object.entries(settings.classAliases)) {
        if (alias && alias.toUpperCase() === cleanedOriginal) {
          if (Object.values(ClassLevel).includes(level as ClassLevel)) return level as ClassLevel;
        }
      }
    }

    // 3. Common nursery name patterns (case-insensitive)
    if (/^BABY$/.test(cleanedOriginal)) return ClassLevel.N1;
    if (/^NURSERY\s*1$|^N\s*1$/.test(cleanedOriginal)) return ClassLevel.N1;
    if (/^MIDDLE$/.test(cleanedOriginal)) return ClassLevel.N2;
    if (/^NURSERY\s*2$|^N\s*2$/.test(cleanedOriginal)) return ClassLevel.N2;
    if (/^TOP$/.test(cleanedOriginal)) return ClassLevel.N3;
    if (/^NURSERY\s*3$|^N\s*3$/.test(cleanedOriginal)) return ClassLevel.N3;
    if (/^NURSERY$/.test(cleanedOriginal)) return ClassLevel.N1;
    if (/^RECEPTION$/.test(cleanedOriginal)) return ClassLevel.N1;

    // 4. "Primary X" or bare digit
    if (cleaned.startsWith('PRIMARY')) {
      const num = cleaned.replace('PRIMARY', '');
      if (Object.values(ClassLevel).includes(('P' + num) as ClassLevel)) return ('P' + num) as ClassLevel;
    }
    if (/^\d$/.test(cleaned) && Object.values(ClassLevel).includes(('P' + cleaned) as ClassLevel)) {
      return ('P' + cleaned) as ClassLevel;
    }

    return ClassLevel.P1;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    Papa.parse(file, {
      header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase().replace(/[\s_-]/g, ''),
      complete: async (results) => {
        try {
          const newStudents: Student[] = [];
          const rows = results.data as any[];
          let duplicates = 0;
          const detectedStreams: { [key: string]: Set<string> } = {};

          for (const row of rows) {
            const name = row.name || row.fullname || `${row.firstname || ''} ${row.lastname || ''}`.trim();
            if (!name) continue;

            const classRaw = row.class || row.classlevel || row.grade || '';
            const classLevel = normalizeClassInput(classRaw);
            const nameUpper = name.toUpperCase();

            if (students.some(s => s.name.toUpperCase() === nameUpper && s.classLevel === classLevel) ||
              newStudents.some(s => s.name.toUpperCase() === nameUpper && s.classLevel === classLevel)) {
              duplicates++;
              continue;
            }

            let gender = Gender.Male;
            if ((row.gender?.toUpperCase() || '') === 'F' || (row.gender?.toUpperCase() || '') === 'FEMALE') gender = Gender.Female;

            const stream = (row.stream || row.section || '').toUpperCase().trim() || 'Blue';
            if (classLevel && stream) {
              if (!detectedStreams[classLevel]) detectedStreams[classLevel] = new Set();
              detectedStreams[classLevel].add(stream);
            }

            newStudents.push({
              name: nameUpper, gender, classLevel, stream,
              paycode: row.paycode || '', parentName: row.parentname || '', parentContact: row.parentcontact || '',
              specialCases: { absenteeism: false, sickness: false, fees: false }
            });
          }

          if (newStudents.length > 0) {
            if (settings) {
              const updatedStreams = { ...settings.streams };
              for (const [classLevel, streamSet] of Object.entries(detectedStreams)) {
                const existing = updatedStreams[classLevel] || [];
                updatedStreams[classLevel] = [...new Set([...existing, ...Array.from(streamSet)])];
              }
              await updateSettings.mutateAsync({ ...settings, streams: updatedStreams });
            }
            const inserted = await importStudents.mutateAsync(newStudents);
            showToast(`Imported ${inserted ? inserted.length : 0} students. ${duplicates} skipped.`, 'success');
          } else {
            showToast(`No new students found. ${duplicates} duplicates skipped.`, 'warning');
          }
        } catch (e: any) {
          showToast(`Error: ${e.message}`, 'error');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (e) => {
        setImporting(false);
        showToast(`CSV Error: ${e.message}`, 'error');
      }
    });
  };

  const exportStudentsCSV = () => {
    const headers = ['Name', 'Gender', 'Class', 'Stream', 'Pay Code', 'Parent Name', 'Parent Contact'];
    const rows = filteredStudents.map(s => [
      `"${s.name}"`, s.gender, s.classLevel, `"${s.stream}"`, `"${s.paycode || ''}"`, `"${s.parentName || ''}"`, `"${s.parentContact || ''}"`
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Students_${new Date().toLocaleDateString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filteredStudents.length} students`, 'success');
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Gender', 'Class', 'Stream', 'Pay Code', 'Parent Name', 'Parent Contact'];
    const sample = [`"SAMPLE NAME",M,P4,"Red","12345","Parent","0700000000"`];
    const csv = [headers.join(','), ...sample].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Students_Import_Template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (viewMode === 'profile' && selectedStudent) {
    return (
      <>
        <StudentProfile
          student={selectedStudent}
          onBack={handleBackToList}
          onEdit={() => handleEdit(selectedStudent)}
          onPrintID={() => { setIdCardStudent(selectedStudent); setShowIdCard(true); }}
          onEnrollFace={() => { setFaceEnrollStudent(selectedStudent); setShowFaceEnrollment(true); }}
          hasFaceEnrolled={enrolledFaceIds.has(selectedStudent.id!)}
          onDelete={handleDelete}
        />

        {showIdCard && idCardStudent && (
          <StudentIDCard student={idCardStudent} settings={settings} onClose={() => { setShowIdCard(false); setIdCardStudent(null); }} />
        )}

        {showFaceEnrollment && faceEnrollStudent && (
          <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-spin w-8 h-8 border-4 border-[#800020] border-t-transparent rounded-full"></div></div>}>
            <FaceEnrollment
              personId={faceEnrollStudent.id!}
              personType="student"
              personName={faceEnrollStudent.name}
              onSuccess={() => { setShowFaceEnrollment(false); setFaceEnrollStudent(null); setEnrolledFaceIds(prev => new Set([...prev, faceEnrollStudent!.id!])); showToast('Face enrolled!', 'success'); }}
              onCancel={() => { setShowFaceEnrollment(false); setFaceEnrollStudent(null); }}
            />
          </React.Suspense>
        )}

        {isModalOpen && (
          <StudentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            formData={formData}
            setFormData={setFormData}
            isEdit={!!selectedStudent}
            settings={settings}
            isDark={isDark}
            studentId={selectedStudent?.id}
          />
        )}

        {localToast && <Toast message={localToast.message} type={localToast.type} onClose={() => setLocalToast(null)} />}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Students Directory</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage learner profiles, enrollments, and details.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {selectedIds.size > 0 && (
            <>
              <Button variant="outline" onClick={() => setShowBulkIdCards(true)}>Print ID Cards ({selectedIds.size})</Button>
              <Button variant="secondary" onClick={preparePromotionSummary}>Promote ({selectedIds.size})</Button>
              <Button variant="danger" onClick={handleBatchDelete}>Delete ({selectedIds.size})</Button>
            </>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
          <Button variant="secondary" onClick={downloadTemplate} size="sm">Template</Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing || isArchiveMode}>
            {importing ? 'Importing...' : 'Import CSV'}
          </Button>
          <Button variant="outline" onClick={exportStudentsCSV}>Export CSV</Button>
          <Button disabled={isArchiveMode} onClick={() => {
            const defaultClass = ClassLevel.P1;
            const defaultStream = availableStreams[0] || '';
            setFormData({
              name: '', classLevel: defaultClass, stream: defaultStream, gender: Gender.Male, paycode: '', parentName: '', parentContact: '',
              specialCases: { absenteeism: false, sickness: false, fees: false }
            });
            setSelectedStudent(null);
            setIsModalOpen(true);
          }}>Add Student</Button>
        </div>
      </div>

      {/* Stats */}
      <StudentStats students={students} filteredStudents={filteredStudents} isDark={isDark} />

      {/* Toolbar/Filters */}
      <StudentFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterClass={filterClass}
        setFilterClass={setFilterClass}
        filterStream={filterStream}
        setFilterStream={setFilterStream}
        viewMode={viewMode === 'profile' ? 'list' : viewMode} // If profile, default back to list in toolbar state? No, viewMode is controlled by Students component
        setViewMode={setViewMode}
        availableStreams={availableStreams}
        isDark={isDark}
      />

      {/* List/Grid View */}
      <StudentList
        paginatedStudents={paginatedStudents}
        allStudentsCount={filteredStudents.length}
        viewMode={viewMode === 'list' || viewMode === 'grid' ? viewMode : 'list'}
        selectedIds={selectedIds}
        toggleSelection={toggleSelection}
        toggleSelectAll={toggleSelectAllPage}
        allPageSelected={allPageSelected}
        indeterminate={indeterminate}
        isDark={isDark}
        onViewProfile={handleViewProfile}
        onEdit={handleEdit}
        onDelete={handleDelete}
        editingRowId={editingRowId}
        editingField={editingField}
        editValue={editValue}
        setEditingRowId={setEditingRowId}
        setEditingField={setEditingField}
        setEditValue={setEditValue}
        handleQuickEdit={handleQuickEdit}
        searchQuery={searchQuery}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        toggleSelectAllFiltered={toggleSelectAllFiltered}
        allFilteredSelected={allFilteredSelected}
      />

      {/* Modals */}
      {isModalOpen && (
        <StudentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          isEdit={!!selectedStudent}
          settings={settings}
          isDark={isDark}
          studentId={selectedStudent?.id}
        />
      )}

      {showPromoteModal && (
        <PromoteStudentsModal
          isOpen={showPromoteModal}
          onClose={() => setShowPromoteModal(false)}
          onPromote={handlePromoteStudents}
          promotionSummary={promotionSummary}
          selectedCount={selectedIds.size}
          settings={settings}
          isPromoting={isPromoting}
        />
      )}

      {showBulkIdCards && (
        <BulkIDCardPrint
          students={students.filter(s => s.id && selectedIds.has(s.id))}
          settings={settings}
          onClose={() => setShowBulkIdCards(false)}
        />
      )}

      {localToast && <Toast message={localToast.message} type={localToast.type} onClose={() => setLocalToast(null)} />}
    </div>
  );
};
