import React, { useState, useMemo, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';
import { Teacher, ClassLevel, Gender, ALL_SUBJECTS, SchoolSettings, Student } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { Toast } from '../client/src/components/Toast';
import { useTeachers } from '../client/src/hooks/useTeachers';
import { useStudents } from '../client/src/hooks/useStudents';
import { useSettings } from '../client/src/hooks/useSettings';
import FaceEnrollment from '../client/src/components/FaceEnrollment';

// Extracted Components
import { TeacherStats } from '../client/src/components/teachers/TeacherStats';
import { TeacherFilters } from '../client/src/components/teachers/TeacherFilters';
import { TeacherList } from '../client/src/components/teachers/TeacherList';
import { TeacherProfile } from '../client/src/components/teachers/TeacherProfile';
import TeacherFormWizard from '../components/TeacherFormWizard';
import { StaffRollCallModal } from '../client/src/components/teachers/StaffRollCallModal';

const ROLES = ['Class Teacher', 'Subject Teacher', 'Headteacher', 'DOS'];
const ITEMS_PER_PAGE = 20;

export const Teachers: React.FC = () => {
  const queryClient = useQueryClient();
  const { isDark } = useTheme();

  // State
  const [viewMode, setViewMode] = useState<'list' | 'profile'>('list');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRollCallOpen, setIsRollCallOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Face Enrollment
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false);
  const [faceEnrollTeacher, setFaceEnrollTeacher] = useState<Teacher | null>(null);
  const [enrolledFaceIds, setEnrolledFaceIds] = useState<Set<number>>(new Set());

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { teachers, isLoading: teachersLoading, addTeacher, updateTeacher, deleteTeacher, deleteTeachers, importTeachers } = useTeachers();
  const { students } = useStudents();
  const { settings } = useSettings();

  const initialFormState: Partial<Teacher> = {
    employeeId: '',
    name: '',
    gender: Gender.Male,
    phone: '',
    email: '',
    roles: [],
    assignedClass: undefined,
    assignedStream: undefined,
    subjects: [],
    teachingClasses: [],
    qualifications: '',
    dateJoined: '',
    initials: '',
    isActive: true,
  };

  const [formData, setFormData] = useState<Partial<Teacher>>(initialFormState);

  const showToastMsg = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToast({ message, type });
  };

  // Filter Logic
  const filteredTeachers = useMemo(() => {
    let filtered = teachers.filter(t => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        (t.name || '').toLowerCase().includes(searchLower) ||
        (t.email || '').toLowerCase().includes(searchLower) ||
        (t.phone || '').includes(searchQuery) ||
        (t.employeeId || '').toLowerCase().includes(searchLower);
      const matchesRole = !selectedRole || (t.roles || []).includes(selectedRole);
      const matchesGender = !selectedGender || t.gender === selectedGender;
      const matchesClass = !selectedClass ||
        t.assignedClass === selectedClass ||
        (t.teachingClasses || []).some(tc => {
          if (tc.includes('-')) {
            return tc.startsWith(selectedClass + '-') || tc.split('-')[0] === selectedClass;
          }
          return tc === selectedClass;
        });
      return matchesSearch && matchesRole && matchesGender && matchesClass;
    });
    return filtered;
  }, [teachers, searchQuery, selectedRole, selectedGender, selectedClass]);

  // Derived State
  const totalPages = Math.ceil(filteredTeachers.length / ITEMS_PER_PAGE);

  const stats = useMemo(() => {
    const total = teachers.length;
    const active = teachers.filter(t => t.isActive !== false).length;
    const male = teachers.filter(t => t.gender === 'M').length;
    const female = teachers.filter(t => t.gender === 'F').length;
    const classTeachers = teachers.filter(t => (t.roles || []).includes('Class Teacher')).length;
    const subjectTeachers = teachers.filter(t => (t.roles || []).includes('Subject Teacher')).length;
    const headteachers = teachers.filter(t => (t.roles || []).includes('Headteacher')).length;
    return { total, active, male, female, classTeachers, subjectTeachers, headteachers };
  }, [teachers]);

  // Effects
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRole, selectedGender, selectedClass]);

  // Handlers
  const handleOpenModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingId(teacher.id!);
      setFormData({ ...teacher });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleViewProfile = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setViewMode('profile');
  };

  const handleBackToList = () => {
    setSelectedTeacher(null);
    setViewMode('list');
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this teacher? This cannot be undone.')) {
      try {
        await deleteTeacher.mutateAsync(id);
        showToastMsg('Teacher deleted successfully', 'success');
        if (viewMode === 'profile') handleBackToList();
      } catch (error: any) {
        console.error('Error deleting teacher:', error);
        showToastMsg(`Failed to delete teacher: ${error.message}`, 'error');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Delete ${selectedIds.size} selected teacher(s)? This cannot be undone.`)) {
      try {
        await deleteTeachers.mutateAsync(Array.from(selectedIds));
        showToastMsg(`${selectedIds.size} teachers deleted`, 'success');
        setSelectedIds(new Set());
      } catch (error: any) {
        console.error('Error deleting teachers:', error);
        showToastMsg(`Failed to delete teachers: ${error.message}`, 'error');
      }
    }
  };

  const handleSubmit = async (teacherData: Teacher) => {
    if (!teacherData.name || (teacherData.roles || []).length === 0) {
      showToastMsg('Name and at least one role are required.', 'error');
      return;
    }

    try {
      if (editingId) {
        const updated = await updateTeacher.mutateAsync(teacherData);
        showToastMsg('Teacher updated successfully', 'success');
        if (selectedTeacher && selectedTeacher.id === editingId) {
          setSelectedTeacher(updated);
        }
      } else {
        await addTeacher.mutateAsync(teacherData);
        showToastMsg('Teacher added successfully', 'success');
      }

      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving teacher:', error);
      showToastMsg(`Failed to save teacher: ${error.message}`, 'error');
    }
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    // Current page or filtered items? Typically current visible items or all filtered items.
    // Let's implement toggle all filtered logic for consistency with new StudentList which I made.
    // If all filtered selected, clear. Else select all filtered.
    const allFilteredIds = filteredTeachers.map(t => t.id!);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  };

  // CSV Operations
  const handleExportCSV = () => {
    const headers = ['Employee ID', 'Name', 'Gender', 'Phone', 'Email', 'Roles', 'Assigned Class', 'Assigned Stream', 'Subjects', 'Teaching Classes', 'Qualifications', 'Date Joined', 'Initials', 'Active'];
    const rows = teachers.map(t => [
      t.employeeId || '',
      t.name,
      t.gender,
      t.phone,
      t.email,
      (t.roles || []).join(';'),
      t.assignedClass || '',
      t.assignedStream || '',
      (t.subjects || []).join(';'),
      (t.teachingClasses || []).join(';'),
      t.qualifications || '',
      t.dateJoined || '',
      t.initials || '',
      t.isActive !== false ? 'Yes' : 'No'
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teachers_export.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToastMsg(`Exported ${teachers.length} teachers`, 'success');
  };

  const handleExportPayroll = async () => {
    try {
      const res = await fetch('/api/hr/payroll-export');
      if (!res.ok) throw new Error("Failed to fetch payroll data");
      const data = await res.json();

      if (!data || data.length === 0) {
        showToastMsg("No payroll data to export", "warning");
        return;
      }

      const headers = Object.keys(data[0]);
      const rows = data.map((row: any) => headers.map(h => `"${row[h] || ''}"`).join(','));
      const csv = [headers.join(','), ...rows].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll_export_${new Date().toISOString().substring(0, 7)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToastMsg("Payroll data exported successfully", "success");
    } catch (err: any) {
      console.error(err);
      showToastMsg(`Failed to export payroll: ${err.message}`, "error");
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Employee ID', 'Name', 'Gender', 'Phone', 'Email', 'Roles', 'Assigned Class', 'Assigned Stream', 'Subjects', 'Teaching Classes', 'Qualifications', 'Date Joined', 'Initials', 'Active'];
    const example = ['T001', 'MR. JOHN OKELLO', 'M', '0700123456', 'john@school.com', 'Class Teacher;Subject Teacher', 'P5', 'EAST', 'MATHS;SCIENCE', 'P3-DILIGENT;P6-WISDOM', 'Diploma in Education', '2020-01-15', 'JO', 'Yes'];
    const csv = [headers.join(','), example.map(c => `"${c}"`).join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teachers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/[\s_-]/g, ''),
      complete: async (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) {
          showToastMsg('CSV file is empty or invalid', 'error');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        let skipped = 0;
        const newTeachers: Teacher[] = [];

        try {
          for (const row of rows) {
            const name = row.name || row.fullname || `${row.firstname || ''} ${row.lastname || ''}`.trim();
            if (!name) {
              skipped++;
              continue;
            }

            const rolesStr = row.roles || row.role || '';
            const roles = rolesStr ? rolesStr.split(/[;,]/).map((r: string) => {
              const trimmed = r.trim();
              const match = ROLES.find(known => known.toLowerCase() === trimmed.toLowerCase());
              return match || trimmed;
            }).filter((r: string) => ROLES.includes(r)) : [];

            if (roles.length === 0) {
              skipped++;
              continue;
            }

            const subjectsStr = row.subjects || row.subject || '';
            const subjects = subjectsStr ? subjectsStr.split(/[;,]/).map((s: string) => s.trim().toUpperCase()).filter((s: string) => ALL_SUBJECTS.includes(s)) : [];

            const classesStr = row.teachingclasses || row.classes || '';
            const teachingClasses = classesStr ? classesStr.split(/[;,]/).map((c: string) => c.trim().toUpperCase()).filter((c: string) => {
              if (c.includes('-')) {
                const [cls] = c.split('-');
                return Object.values(ClassLevel).includes(cls as ClassLevel);
              }
              return Object.values(ClassLevel).includes(c as ClassLevel);
            }) : [];

            const assignedClassRaw = row.assignedclass || row.class || '';
            const assignedClass = Object.values(ClassLevel).includes(assignedClassRaw as ClassLevel) ? assignedClassRaw as ClassLevel : undefined;

            const teacher: Teacher = {
              employeeId: row.employeeid || row.id || row.empid || '',
              name: name.toUpperCase(),
              gender: ((row.gender || row.sex || '').toUpperCase().startsWith('F')) ? Gender.Female : Gender.Male,
              phone: row.phone || row.contact || '',
              email: row.email || '',
              roles,
              assignedClass,
              assignedStream: row.assignedstream || row.stream || undefined,
              subjects,
              teachingClasses,
              qualifications: row.qualifications || '',
              dateJoined: row.datejoined || row.joined || '',
              initials: row.initials || '',
              isActive: (row.active || 'yes').toLowerCase() !== 'no',
            };

            const exists = teachers.some(t =>
              (t.employeeId && teacher.employeeId && t.employeeId === teacher.employeeId) ||
              (t.name.toLowerCase() === teacher.name.toLowerCase())
            );

            if (exists) {
              skipped++;
              continue;
            }

            newTeachers.push(teacher);
          }

          let imported = 0;
          if (newTeachers.length > 0) {
            await importTeachers.mutateAsync(newTeachers);
            imported = newTeachers.length;
          }

          let msg = `Imported ${imported} teachers.`;
          if (skipped > 0) msg += ` ${skipped} skipped (duplicates or invalid data).`;
          showToastMsg(msg, imported > 0 ? 'success' : (skipped > 0 ? 'warning' : 'error'));

        } catch (error: any) {
          console.error("CSV Import Error:", error);
          showToastMsg(`Error processing CSV: ${error.message}`, 'error');
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error: any) => {
        showToastMsg(`CSV Parsing Error: ${error.message}`, 'error');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  if (viewMode === 'profile' && selectedTeacher) {
    return (
      <>
        <TeacherProfile
          teacher={selectedTeacher}
          students={students}
          onEdit={() => handleOpenModal(selectedTeacher)}
          onDelete={() => handleDelete(selectedTeacher.id!)}
          onBack={handleBackToList}
          onEnrollFace={() => {
            setFaceEnrollTeacher(selectedTeacher);
            setShowFaceEnrollment(true);
          }}
          hasFaceEnrolled={enrolledFaceIds.has(selectedTeacher.id!)}
          isDark={isDark}
        />
        {showFaceEnrollment && faceEnrollTeacher && (
          <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="animate-spin w-8 h-8 border-4 border-[#800020] border-t-transparent rounded-full"></div></div>}>
            <FaceEnrollment
              personId={faceEnrollTeacher.id!}
              personType="teacher"
              personName={faceEnrollTeacher.name}
              onSuccess={() => {
                setShowFaceEnrollment(false);
                setFaceEnrollTeacher(null);
                setEnrolledFaceIds(prev => new Set([...prev, faceEnrollTeacher!.id!]));
                showToastMsg('Face enrolled successfully!', 'success');
              }}
              onCancel={() => {
                setShowFaceEnrollment(false);
                setFaceEnrollTeacher(null);
              }}
            />
          </React.Suspense>
        )}

        {isModalOpen && (
          <TeacherModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
            formData={formData}
            setFormData={setFormData}
            isEdit={!!editingId}
            isDark={isDark}
          />
        )}

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <TeacherFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
        selectedGender={selectedGender}
        setSelectedGender={setSelectedGender}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        ROLES={ROLES}
        isDark={isDark}
        onDownloadTemplate={handleDownloadTemplate}
        onImport={() => fileInputRef.current?.click()}
        onExport={handleExportCSV}
        onExportPayroll={handleExportPayroll}
        onAddTeacher={() => handleOpenModal()}
        onStaffRollCall={() => setIsRollCallOpen(true)}
        fileInputRef={fileInputRef}
        handleImportCSV={handleImportCSV}
      />

      <TeacherStats stats={stats} isDark={isDark} />

      <TeacherList
        teachers={filteredTeachers} // Pass filtered list for display & selection logic context
        selectedIds={selectedIds}
        toggleSelection={toggleSelection}
        toggleSelectAll={toggleSelectAll}
        onViewProfile={handleViewProfile}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
        handleBulkDelete={handleBulkDelete}
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
        isDark={isDark}
      />

      {isModalOpen && (
        <TeacherFormWizard
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          initialData={formData}
          isEdit={!!editingId}
          settings={settings}
          isDark={isDark}
        />
      )}

      {isRollCallOpen && (
        <StaffRollCallModal
          isOpen={isRollCallOpen}
          onClose={() => setIsRollCallOpen(false)}
          teachers={teachers}
          isDark={isDark}
        />
      )}
    </div>
  );
};
