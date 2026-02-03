
import React, { useState, useEffect, useMemo } from 'react';
import { dbService, Student as ApiStudent, MarkRecord as ApiMarkRecord, Teacher as ApiTeacher } from '../services/api';
import { ClassLevel, AssessmentType, SUBJECTS_UPPER, SUBJECTS_LOWER, SchoolSettings } from '../types';
import { calculateGrade, getComment, getClassTeacherComment, getHeadTeacherComment } from '../services/grading';
import { Button } from '../components/Button';
import { useTheme } from '../contexts/ThemeContext';
import { useClassNames } from '../hooks/use-class-names';
import * as XLSX from 'xlsx';
import { ReportPreviewModal } from '../components/ReportPreviewModal';

declare const jspdf: any;

interface StudentPreview {
  student: ApiStudent;
  botMarks: ApiMarkRecord | null;
  eotMarks: ApiMarkRecord | null;
  botPosition: string;
  eotPosition: string;
  hasMissingMarks: boolean;
}

// Calculate total marks from a mark record
const calculateTotalMarks = (record: ApiMarkRecord, subjects: string[]): number => {
  if (!record || !record.marks) return 0;
  let total = 0;
  subjects.forEach(sub => {
    const mark = (record.marks as any)[sub];
    if (mark !== undefined && mark !== null && typeof mark === 'number') {
      total += mark;
    }
  });
  return total;
};

// Position based on total marks obtained (highest total = position 1)
const calculatePositionFromMarks = (studentId: number, marks: ApiMarkRecord[], classLevel: ClassLevel): string => {
  const studentRecord = marks.find(m => m.studentId === studentId);
  if (!studentRecord || !studentRecord.marks) {
    return '-';
  }

  // Determine subjects based on class level
  const subjects = ['P1', 'P2', 'P3'].includes(classLevel)
    ? SUBJECTS_LOWER
    : SUBJECTS_UPPER;

  const studentTotal = calculateTotalMarks(studentRecord, subjects);
  if (studentTotal === 0) return '-';

  // Calculate totals for all students and sort by total marks (highest first)
  const studentsWithTotals = marks
    .filter(m => m.marks && Object.keys(m.marks).length > 0)
    .map(m => ({
      studentId: m.studentId,
      totalMarks: calculateTotalMarks(m, subjects)
    }))
    .filter(s => s.totalMarks > 0)
    .sort((a, b) => b.totalMarks - a.totalMarks); // Descending order (highest first)

  // Find position - students with same total share the same position
  let position = 1;
  let prevTotal = -1;
  for (let i = 0; i < studentsWithTotals.length; i++) {
    if (studentsWithTotals[i].totalMarks !== prevTotal) {
      position = i + 1;
    }
    prevTotal = studentsWithTotals[i].totalMarks;

    if (studentsWithTotals[i].studentId === studentId) {
      break;
    }
  }

  if (position <= 0) return '-';

  const lastDigit = position % 10;
  const lastTwoDigits = position % 100;
  let suffix: string;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    suffix = 'th';
  } else if (lastDigit === 1) {
    suffix = 'st';
  } else if (lastDigit === 2) {
    suffix = 'nd';
  } else if (lastDigit === 3) {
    suffix = 'rd';
  } else {
    suffix = 'th';
  }

  return `${position}${suffix}`;
};

export const Reports: React.FC = () => {
  const { isDark } = useTheme();
  const { getDisplayName, getAllClasses } = useClassNames();
  const [selectedClass, setSelectedClass] = useState<ClassLevel>(ClassLevel.P7);
  const [selectedStream, setSelectedStream] = useState<string>('All');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [reportType, setReportType] = useState<AssessmentType>(AssessmentType.EOT);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [studentPreviews, setStudentPreviews] = useState<StudentPreview[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const [allMarks, setAllMarks] = useState<ApiMarkRecord[]>([]);
  const [allTeachers, setAllTeachers] = useState<ApiTeacher[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  // Enhanced filters
  const [filterDivision, setFilterDivision] = useState<string>('All');
  const [filterAggregateMin, setFilterAggregateMin] = useState<string>('');
  const [filterAggregateMax, setFilterAggregateMax] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const availableStreams = settings?.streams[selectedClass] || [];

  useEffect(() => {
    const loadConfig = async () => {
      const s = await dbService.getSettings();
      setSettings(s);
      if (s) {
        setSelectedTerm(s.currentTerm);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (settings && selectedStream !== 'All') {
      const streams = settings.streams[selectedClass] || [];
      if (!streams.includes(selectedStream)) {
        setSelectedStream('All');
      }
    }
  }, [selectedClass, settings]);

  useEffect(() => {
    const loadPreviewData = async () => {
      if (!settings) return;

      setDataLoading(true);
      try {
        const allStudents = await dbService.getStudents();
        const marks = await dbService.getMarks();
        const teachers = await dbService.getTeachers();

        setAllMarks(marks);
        setAllTeachers(teachers);

        let classStudents = allStudents.filter(s => s.classLevel === selectedClass);
        if (selectedStream !== 'All') {
          classStudents = classStudents.filter(s => s.stream === selectedStream);
        }

        const year = settings.currentYear || new Date().getFullYear();
        const subjects = ['P1', 'P2', 'P3'].includes(selectedClass) ? SUBJECTS_LOWER : SUBJECTS_UPPER;

        const wholeClassStudents = allStudents.filter(s => s.classLevel === selectedClass);

        const classBotMarks = marks.filter(m =>
          m.term === selectedTerm &&
          m.year === year &&
          m.type === AssessmentType.BOT &&
          wholeClassStudents.some(s => s.id === m.studentId)
        );

        const classEotMarks = marks.filter(m =>
          m.term === selectedTerm &&
          m.year === year &&
          m.type === AssessmentType.EOT &&
          wholeClassStudents.some(s => s.id === m.studentId)
        );

        const previews: StudentPreview[] = classStudents.map(student => {
          const botRecord = classBotMarks.find(m => m.studentId === student.id) || null;
          const eotRecord = classEotMarks.find(m => m.studentId === student.id) || null;

          const currentRecord = reportType === AssessmentType.BOT ? botRecord : eotRecord;
          const hasMissingMarks = !currentRecord || !currentRecord.marks ||
            subjects.some(subj => {
              const key = subj.toLowerCase().replace(' ', '') as keyof typeof currentRecord.marks;
              return currentRecord.marks[key] === undefined || currentRecord.marks[key] === null;
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

        setStudentPreviews(previews);
        setSelectedStudentIds(new Set(classStudents.map(s => s.id!)));
      } catch (error) {
        console.error('Error loading preview data:', error);
        setStudentPreviews([]);
        setSelectedStudentIds(new Set());
      } finally {
        setDataLoading(false);
      }
    };

    loadPreviewData();
  }, [selectedClass, selectedStream, selectedTerm, reportType, settings]);

  const filteredPreviews = useMemo(() => {
    if (!searchQuery.trim()) return studentPreviews;
    const query = searchQuery.toLowerCase();
    return studentPreviews.filter(p =>
      p.student.name.toLowerCase().includes(query) ||
      p.student.indexNumber.toLowerCase().includes(query)
    );
  }, [studentPreviews, searchQuery]);

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
      divisions,
      selected: selectedStudentIds.size
    };
  }, [studentPreviews, reportType, selectedStudentIds]);

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
    if (selectedStudentIds.size === filteredPreviews.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredPreviews.map(p => p.student.id!)));
    }
  };

  const selectOnlyWithMarks = () => {
    const ids = studentPreviews
      .filter(p => !p.hasMissingMarks)
      .map(p => p.student.id!);
    setSelectedStudentIds(new Set(ids));
  };

  // Map subject codes to possible display names (case-insensitive matching)
  const subjectAliases: { [key: string]: string[] } = {
    'english': ['english', 'eng', 'engl'],
    'maths': ['maths', 'math', 'mathematics', 'mtc'],
    'science': ['science', 'sci', 'scn'],
    'sst': ['sst', 'social studies', 'social', 'socialstudies'],
    'literacy1': ['literacy1', 'literacy 1', 'lit1', 'lit 1', 'reading'],
    'literacy2': ['literacy2', 'literacy 2', 'lit2', 'lit 2', 'writing']
  };

  const findSubjectTeacher = (teachers: ApiTeacher[], subject: string, classLevel: string, studentStream?: string): string => {
    // Normalize subject for comparison
    const subjectLower = subject.toLowerCase().trim();
    const possibleNames = subjectAliases[subjectLower] || [subjectLower];

    // Build the class-stream combination to match against
    const classStreamCombo = studentStream ? `${classLevel}-${studentStream}`.toUpperCase() : classLevel.toUpperCase();
    const classLevelUpper = classLevel.toUpperCase();
    const studentStreamUpper = studentStream?.toUpperCase();

    const teacher = teachers.find(t => {
      // Must be a Subject Teacher (case-insensitive check)
      const isSubjectTeacher = t.roles && t.roles.some(role =>
        role.toLowerCase().includes('subject') ||
        role.toLowerCase() === 'subject teacher'
      );
      if (!isSubjectTeacher) return false;

      // Check if teacher teaches this subject (case-insensitive with aliases)
      const teacherSubjects = t.subjects || [];
      const teachesSubject = teacherSubjects.some(teacherSubject => {
        const teacherSubjectLower = (teacherSubject || '').toLowerCase().trim();
        return possibleNames.some(alias =>
          teacherSubjectLower === alias ||
          teacherSubjectLower.includes(alias) ||
          alias.includes(teacherSubjectLower)
        );
      });
      if (!teachesSubject) return false;

      // Check teachingClasses for match first
      const teachingClasses = t.teachingClasses || [];
      if (teachingClasses.length > 0) {
        const matchesTeachingClass = teachingClasses.some(tc => {
          const tcUpper = (tc || '').toUpperCase().trim();

          // Exact match with class-stream combo (e.g., "P4-WISDOM")
          if (tcUpper === classStreamCombo) return true;

          // Match just the class level (legacy format, e.g., "P4")
          if (tcUpper === classLevelUpper) return true;

          // If teacher has class-stream format, check if it matches
          if (tcUpper.includes('-')) {
            const [cls, stream] = tcUpper.split('-');
            // Match if class matches and (stream matches OR no student stream provided)
            if (cls === classLevelUpper && (!studentStreamUpper || stream === studentStreamUpper)) {
              return true;
            }
          }
          return false;
        });
        if (matchesTeachingClass) return true;
      }

      // Fallback: check assignedClass and assignedStream fields
      if (t.assignedClass) {
        const assignedClassUpper = t.assignedClass.toUpperCase();
        const assignedStreamUpper = (t.assignedStream || '').toUpperCase();

        // Match if class matches
        if (assignedClassUpper === classLevelUpper) {
          // If no student stream or streams match
          if (!studentStreamUpper || !assignedStreamUpper || assignedStreamUpper === studentStreamUpper) {
            return true;
          }
        }
      }

      return false;
    });

    return teacher ? teacher.name : "";
  };

  const generatePDF = async (singleStudentId?: number) => {
    if (!settings) {
      alert("Settings not loaded. Please refresh.");
      return;
    }
    setLoading(true);

    const allStudents = await dbService.getStudents();
    let classStudents = allStudents.filter(s => s.classLevel === selectedClass);

    if (selectedStream !== 'All') {
      classStudents = classStudents.filter(s => s.stream === selectedStream);
    }

    if (singleStudentId) {
      classStudents = classStudents.filter(s => s.id === singleStudentId);
    } else {
      classStudents = classStudents.filter(s => selectedStudentIds.has(s.id!));
    }

    const allMarks = await dbService.getMarks();
    const allTeachers = await dbService.getTeachers();
    const year = settings.currentYear || new Date().getFullYear();

    if (classStudents.length === 0) {
      alert("No students selected for report generation.");
      setLoading(false);
      return;
    }

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

    const doc = new jspdf.jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    // Define Colors - Brand Colors (Maroon and Navy)
    const primaryColor = [123, 17, 19]; // Maroon #7B1113
    const darkBlue = [30, 58, 95]; // Navy #1E3A5F
    const accentColor = [212, 175, 55]; // Gold #D4AF37
    const lightBg = [253, 248, 248]; // Light maroon tint background
    const greenColor = [21, 128, 61]; // Green for good grades
    const amberColor = [180, 83, 9]; // Amber for okay grades  
    const redColor = [185, 28, 28]; // Red for poor grades

    for (let i = 0; i < classStudents.length; i++) {
      const student = classStudents[i];
      if (i > 0) doc.addPage();

      const botRecord = classBotMarks.find(m => m.studentId === student.id);
      const eotRecord = classEotMarks.find(m => m.studentId === student.id);

      const botPos = calculatePositionFromMarks(student.id!, classBotMarks, selectedClass);
      const eotPos = calculatePositionFromMarks(student.id!, classEotMarks, selectedClass);

      const isBotReport = reportType === AssessmentType.BOT;
      const mainRecord = isBotReport ? botRecord : eotRecord;
      const mainAgg = mainRecord ? mainRecord.aggregate : 0;

      const studentForComment = {
        ...student,
        classLevel: student.classLevel as any,
        gender: student.gender as any,
        specialCases: student.specialCases || { absenteeism: false, sickness: false, fees: false }
      };
      const ctComment = getClassTeacherComment(mainRecord?.division || 'U', studentForComment);
      const htComment = getHeadTeacherComment(mainRecord?.division || 'U', studentForComment);

      const classTeacher = allTeachers.find(t => t.roles.includes('Class Teacher') && t.assignedClass === selectedClass && t.assignedStream === student.stream);
      const headTeacher = allTeachers.find(t => t.roles.includes('Headteacher'));
      const headTeacherName = headTeacher ? headTeacher.name : "Head Teacher";
      const classTeacherName = classTeacher ? classTeacher.name : "Class Teacher";

      const textCenterX = pageWidth / 2;
      let cursorY = 15;

      // ================= DECORATIVE BORDER =================
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1.5);
      doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
      doc.setDrawColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.setLineWidth(0.5);
      doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

      // ================= HEADER =================
      const logoSize = 20;

      if (settings.logoBase64) {
        try {
          const logoData = settings.logoBase64;
          let format = 'PNG';
          if (logoData.startsWith('data:image/jpeg') || logoData.startsWith('data:image/jpg')) format = 'JPEG';
          doc.addImage(logoData, format, margin, cursorY - 5, logoSize, logoSize);
        } catch (e) { }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text(settings.schoolName, textCenterX, cursorY, { align: "center" });

      cursorY += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(settings.addressBox, textCenterX, cursorY, { align: "center" });

      cursorY += 4;
      doc.text(settings.contactPhones, textCenterX, cursorY, { align: "center" });

      cursorY += 8;
      const termText = selectedTerm === 1 ? "ONE" : selectedTerm === 2 ? "TWO" : "THREE";
      const reportTitle = isBotReport
        ? `BEGINNING OF TERM ${termText} REPORT ${year}`
        : `END OF TERM ${termText} REPORT ${year}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(reportTitle, textCenterX, cursorY, { align: "center" });

      // ================= STUDENT INFO BOX =================
      cursorY += 8;

      // Draw student info box with light background
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, cursorY - 4, pageWidth - margin * 2, 28, 2, 2, 'FD');

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      const col1X = margin + 3;
      const col2X = 70;
      const col3X = 130;

      // Row 1
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text("NAME:", col1X, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(student.name.toUpperCase(), col1X + 14, cursorY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text("INDEX NO:", col2X, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(student.indexNumber || '-', col2X + 20, cursorY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text("GENDER:", col3X, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(student.gender === 'M' ? 'Male' : 'Female', col3X + 18, cursorY);

      // Row 2
      cursorY += 6;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text("CLASS:", col1X, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(getDisplayName(student.classLevel), col1X + 14, cursorY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text("STREAM:", col2X, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(student.stream || '-', col2X + 18, cursorY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text("PAYCODE:", col3X, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(student.paycode || 'N/A', col3X + 20, cursorY);

      // Row 3
      cursorY += 6;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text("TERM:", col1X, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(termText, col1X + 12, cursorY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text("YEAR:", col2X, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(String(year), col2X + 12, cursorY);

      // Parent info
      const parentName = student.parentName || '-';
      const parentContact = student.parentContact || '-';
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text("PARENT:", col3X, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(parentName.substring(0, 20), col3X + 16, cursorY);

      // Row 4 - Parent contact
      cursorY += 6;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text("PARENT CONTACT:", col1X, cursorY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(parentContact, col1X + 35, cursorY);

      cursorY += 10;
      const subjects = ['P1', 'P2', 'P3'].includes(selectedClass) ? SUBJECTS_LOWER : SUBJECTS_UPPER;

      const drawAssessmentTable = (startY: number, title: string, record: any, position: string) => {
        // Section title with colored background
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(margin, startY - 4, pageWidth - margin * 2, 7, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(title, textCenterX, startY, { align: "center" });

        const tableWidth = pageWidth - margin * 2;
        const colWidths = { subject: 30, marks: 16, grade: 16, comment: 55, teacher: 25 };
        const tableStartX = margin;
        // Calculate teacher column X to fit within table bounds
        const teacherColX = pageWidth - margin - colWidths.teacher;
        let tableY = startY + 7;

        // Table header with light background
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(margin, tableY - 3, pageWidth - margin * 2, 6, 'F');

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.text("SUBJECT", tableStartX, tableY);
        doc.text("MARKS", tableStartX + colWidths.subject + 5, tableY);
        doc.text("GRADE", tableStartX + colWidths.subject + colWidths.marks + 10, tableY);
        doc.text("COMMENT", tableStartX + colWidths.subject + colWidths.marks + colWidths.grade + 15, tableY);
        doc.text("TEACHER", teacherColX, tableY);

        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        tableY += 2;
        doc.line(tableStartX, tableY, pageWidth - margin, tableY);

        tableY += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);

        subjects.forEach((sub, idx) => {
          const mark = record?.marks ? (record.marks as any)[sub] : undefined;
          const { grade } = calculateGrade(mark, settings?.gradingConfig);
          const teacherName = findSubjectTeacher(allTeachers, sub, selectedClass, student.stream);
          // Get last name, handling trailing spaces
          const nameParts = teacherName.trim().split(/\s+/).filter(p => p.length > 0);
          const displayTeacher = nameParts.length > 0 ? nameParts[nameParts.length - 1] : '';

          let displaySubject = sub.toUpperCase();
          if (sub === 'english') displaySubject = 'ENGLISH';
          if (sub === 'maths') displaySubject = 'MATHS';
          if (sub === 'science') displaySubject = 'SCIENCE';
          if (sub === 'sst') displaySubject = 'SST';
          if (sub === 'literacy1') displaySubject = 'LITERACY 1';
          if (sub === 'literacy2') displaySubject = 'LITERACY 2';

          // Alternate row background
          if (idx % 2 === 1) {
            doc.setFillColor(252, 252, 253);
            doc.rect(margin, tableY - 4, pageWidth - margin * 2, 7, 'F');
          }

          doc.setTextColor(0, 0, 0);
          doc.text(displaySubject, tableStartX, tableY);

          // Color code marks
          if (mark !== undefined) {
            if (mark >= 80) {
              doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
            } else if (mark < 40) {
              doc.setTextColor(redColor[0], redColor[1], redColor[2]);
            } else {
              doc.setTextColor(0, 0, 0);
            }
            doc.text(String(mark), tableStartX + colWidths.subject + 10, tableY, { align: 'center' });
          }

          // Color code grades
          if (grade !== '-') {
            if (grade === 'D1' || grade === 'D2') {
              doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
            } else if (['C3', 'C4', 'C5', 'C6'].includes(grade)) {
              doc.setTextColor(amberColor[0], amberColor[1], amberColor[2]);
            } else if (['P7', 'P8', 'F9'].includes(grade)) {
              doc.setTextColor(redColor[0], redColor[1], redColor[2]);
            }
            doc.text(grade, tableStartX + colWidths.subject + colWidths.marks + 15, tableY, { align: 'center' });
          }

          doc.setTextColor(0, 0, 0);
          doc.text(mark !== undefined ? getComment(sub, mark) : '', tableStartX + colWidths.subject + colWidths.marks + colWidths.grade + 15, tableY);
          // Width-aware truncation for teacher name to fit column
          let truncatedTeacher = displayTeacher;
          const maxWidth = colWidths.teacher - 2; // Leave small padding
          while (truncatedTeacher.length > 0 && doc.getTextWidth(truncatedTeacher) > maxWidth) {
            truncatedTeacher = truncatedTeacher.substring(0, truncatedTeacher.length - 1);
          }
          if (truncatedTeacher.length < displayTeacher.length && truncatedTeacher.length > 1) {
            truncatedTeacher = truncatedTeacher.substring(0, truncatedTeacher.length - 1) + '.';
          }
          doc.text(truncatedTeacher || '', teacherColX, tableY);

          tableY += 7;
        });

        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(tableStartX, tableY - 3, pageWidth - margin, tableY - 3);

        const agg = record ? record.aggregate : '';
        const div = record ? record.division : '';

        // Summary row with colored background
        doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
        doc.rect(margin, tableY - 1, pageWidth - margin * 2, 7, 'F');

        tableY += 3;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(`TOTAL AGGREGATE: ${agg}`, tableStartX + 5, tableY);
        doc.text(`DIVISION: ${div}`, textCenterX, tableY, { align: 'center' });
        doc.text(`CLASS POSN: ${position}`, pageWidth - margin - 35, tableY);

        return tableY + 10;
      };

      if (isBotReport || (!isBotReport && botRecord)) {
        cursorY = drawAssessmentTable(cursorY, "BEGINNING OF TERM", botRecord, botPos);
      }

      if (!isBotReport) {
        cursorY = drawAssessmentTable(cursorY, "END OF TERM", eotRecord, eotPos);
      }

      // ================= COMMENTS SECTION =================
      cursorY += 3;

      // Comments header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(margin, cursorY - 4, pageWidth - margin * 2, 7, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text("COMMENTS", textCenterX, cursorY, { align: "center" });

      cursorY += 10;

      // Class Teacher Comment Box
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, cursorY - 4, pageWidth - margin * 2, 18, 1, 1, 'FD');

      // Class Teacher label and name on same line
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("CLASS TEACHER:", margin + 2, cursorY);

      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text(classTeacherName ? classTeacherName.toUpperCase() : '', margin + 32, cursorY);

      // Signature line
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.1);
      doc.line(pageWidth - margin - 45, cursorY, pageWidth - margin - 5, cursorY);
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text("Signature", pageWidth - margin - 30, cursorY + 3, { align: "center" });

      // Comment text
      cursorY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const ctLines = doc.splitTextToSize(ctComment, pageWidth - margin * 2 - 10);
      doc.text(ctLines, margin + 2, cursorY);

      cursorY += 16;

      // Head Teacher Comment Box
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, cursorY - 4, pageWidth - margin * 2, 18, 1, 1, 'FD');

      // Head Teacher label and name on same line
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("HEAD TEACHER:", margin + 2, cursorY);

      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text(headTeacherName.toUpperCase(), margin + 30, cursorY);

      // Signature line
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.1);
      doc.line(pageWidth - margin - 45, cursorY, pageWidth - margin - 5, cursorY);
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text("Signature", pageWidth - margin - 30, cursorY + 3, { align: "center" });

      // Comment text
      cursorY += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const htLines = doc.splitTextToSize(htComment, pageWidth - margin * 2 - 10);
      doc.text(htLines, margin + 2, cursorY);

      // ================= GRADING KEY =================
      const keyY = pageHeight - 58;
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, keyY - 3, pageWidth - margin * 2, 12, 1, 1, 'FD');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text("GRADING KEY:", margin + 2, keyY + 2);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const gradingKey = settings?.gradingConfig?.grades
        .map(g => `${g.grade} (${g.minScore}-${g.maxScore})`)
        .join(' | ') || "D1 (90-100) | D2 (80-89) | C3 (70-79) | C4 (60-69) | C5 (55-59) | C6 (50-54) | P7 (45-49) | P8 (40-44) | F9 (0-39)";
      doc.text(gradingKey, margin + 28, keyY + 2);

      doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
      doc.text("DIVISIONS:", margin + 2, keyY + 7);
      doc.setTextColor(0, 0, 0);

      const divisionKey = settings?.gradingConfig?.divisions
        .map(d => `${d.division} (${d.minAggregate}-${d.maxAggregate})`)
        .join(' | ') || "I (4-12) | II (13-24) | III (25-28) | IV (29-32) | U (33-36)";
      doc.text(divisionKey, margin + 22, keyY + 7);

      // ================= FOOTER =================
      const footerY = pageHeight - 42;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);

      const boardersDate = settings.nextTermBeginBoarders || 'TBA';
      const dayDate = settings.nextTermBeginDay || 'TBA';
      doc.text(`NEXT TERM STARTS ON:        BOARDERS: ${boardersDate}          DAY LEARNERS: ${dayDate}`, textCenterX, footerY, { align: "center" });

      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY + 4, pageWidth - margin, footerY + 4);

      doc.setFontSize(8);
      // Use school address instead of hardcoded location
      const schoolLocation = settings.addressBox || '';
      if (schoolLocation) {
        doc.text(schoolLocation.toUpperCase(), textCenterX, footerY + 10, { align: "center" });
      }

      const regInfo = [];
      if (settings.regNumber) regInfo.push(`REG NO: ${settings.regNumber}`);
      if (settings.centreNumber) regInfo.push(`CENTRE NO: ${settings.centreNumber}`);
      doc.text(regInfo.join(' | '), textCenterX, footerY + 15, { align: "center" });

      doc.setLineWidth(0.5);
      doc.line(margin, footerY + 19, pageWidth - margin, footerY + 19);

      if (settings.motto) {
        doc.setFont("helvetica", "bolditalic");
        doc.setFontSize(10);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`"${settings.motto}"`, textCenterX, footerY + 26, { align: "center" });
      }
    }

    // Use school name in filename (sanitized)
    const safeSchoolName = settings.schoolName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    doc.save(`${safeSchoolName}_Report_${selectedClass}_${selectedStream}_Term${selectedTerm}.pdf`);
    setLoading(false);
  };

  const inputClasses = `block w-full rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} px-3 py-2.5 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-sm transition-all duration-200`;

  const getDivisionColor = (division: string | undefined) => {
    if (!division) return isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600';
    switch (division) {
      case 'I': return isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700';
      case 'II': return isDark ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700';
      case 'III': return isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700';
      case 'U': return isDark ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700';
      default: return isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600';
    }
  };

  const exportToExcel = () => {
    if (filteredPreviews.length === 0) {
      alert('No student data to export');
      return;
    }

    const subjects = ['P1', 'P2', 'P3'].includes(selectedClass) ? SUBJECTS_LOWER : SUBJECTS_UPPER;
    const year = settings?.currentYear || new Date().getFullYear();
    const termText = selectedTerm === 1 ? "ONE" : selectedTerm === 2 ? "TWO" : "THREE";
    const isBotReport = reportType === AssessmentType.BOT;

    // Prepare data for Excel
    const excelData = filteredPreviews.map((preview, index) => {
      const student = preview.student;
      const currentRecord = isBotReport ? preview.botMarks : preview.eotMarks;
      const currentPosition = isBotReport ? preview.botPosition : preview.eotPosition;

      const row: any = {
        '#': index + 1,
        'Student Name': student.name,
        'Index Number': student.indexNumber || '-',
        'Gender': student.gender === 'M' ? 'Male' : 'Female',
        'Class': getDisplayName(student.classLevel),
        'Stream': student.stream || '-',
      };

      // Add subject marks and grades
      subjects.forEach(sub => {
        const mark = currentRecord?.marks ? (currentRecord.marks as any)[sub] : undefined;
        const { grade } = calculateGrade(mark, settings?.gradingConfig);
        const displaySubject = sub.toUpperCase();
        row[`${displaySubject} Mark`] = mark !== undefined ? mark : '-';
        row[`${displaySubject} Grade`] = grade;
      });

      // Add aggregate, division, position
      row['Aggregate'] = currentRecord?.aggregate || '-';
      row['Division'] = currentRecord?.division || '-';
      row['Position'] = currentPosition;

      // Add comments if available
      if (currentRecord?.division) {
        const studentForComment = {
          ...student,
          classLevel: student.classLevel as any,
          gender: student.gender as any,
          specialCases: student.specialCases || { absenteeism: false, sickness: false, fees: false }
        };
        row['Class Teacher Comment'] = getClassTeacherComment(currentRecord.division, studentForComment);
        row['Head Teacher Comment'] = getHeadTeacherComment(currentRecord.division, studentForComment);
      }

      return row;
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 5 },  // #
      { wch: 30 }, // Name
      { wch: 15 }, // Index
      { wch: 10 }, // Gender
      { wch: 10 }, // Class
      { wch: 12 }, // Stream
    ];
    subjects.forEach(() => {
      colWidths.push({ wch: 10 }); // Mark
      colWidths.push({ wch: 8 });  // Grade
    });
    colWidths.push({ wch: 10 }); // Aggregate
    colWidths.push({ wch: 10 }); // Division
    colWidths.push({ wch: 10 }); // Position
    colWidths.push({ wch: 50 }); // CT Comment
    colWidths.push({ wch: 50 }); // HT Comment
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    const sheetName = `${getDisplayName(selectedClass)}_Term${selectedTerm}_${isBotReport ? 'BOT' : 'EOT'}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate filename
    const fileName = `Report_Cards_${getDisplayName(selectedClass)}_${selectedStream !== 'All' ? selectedStream + '_' : ''}Term${selectedTerm}_${year}_${isBotReport ? 'BOT' : 'EOT'}.xlsx`;

    // Save file
    XLSX.writeFile(wb, fileName);
  };

  const exportToCSV = () => {
    if (!studentPreviews || studentPreviews.length === 0) {
      alert('No student data to export');
      return;
    }

    const subjects = ['P1', 'P2', 'P3'].includes(selectedClass) ? SUBJECTS_LOWER : SUBJECTS_UPPER;
    const year = settings?.currentYear || new Date().getFullYear();
    const isBotReport = reportType === AssessmentType.BOT;
    const currentMarks = isBotReport
      ? allMarks.filter(m => m.type === AssessmentType.BOT && m.term === selectedTerm && m.year === year)
      : allMarks.filter(m => m.type === AssessmentType.EOT && m.term === selectedTerm && m.year === year);

    const headers = [
      'Student Name', 'Index Number', 'Gender', 'Class', 'Stream',
      ...subjects.map(s => `${s}_Mark`),
      ...subjects.map(s => `${s}_Grade`),
      'Aggregate', 'Division', 'Position',
      'Class Teacher Comment', 'Head Teacher Comment'
    ];

    const rows = studentPreviews.map(preview => {
      const student = preview.student;
      const markRecord = currentMarks.find(m => m.studentId === student.id);
      const position = isBotReport ? preview.botPosition : preview.eotPosition;

      const studentForComment = {
        ...student,
        classLevel: student.classLevel as any,
        gender: student.gender as any,
        specialCases: student.specialCases || { absenteeism: false, sickness: false, fees: false }
      };

      const ctComment = getClassTeacherComment(markRecord?.division || 'U', studentForComment);
      const htComment = getHeadTeacherComment(markRecord?.division || 'U', studentForComment);

      return [
        student.name, student.indexNumber || '', student.gender, student.classLevel, student.stream || '',
        ...subjects.map(s => markRecord?.marks?.[s] ?? ''),
        ...subjects.map(s => {
          const mark = markRecord?.marks?.[s];
          return mark !== undefined ? calculateGrade(mark) : '';
        }),
        markRecord?.aggregate || '', markRecord?.division || '', position,
        `"${ctComment.replace(/"/g, '""')}"`, `"${htComment.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `Report_Cards_${getDisplayName(selectedClass)}_${selectedStream !== 'All' ? selectedStream + '_' : ''}Term${selectedTerm}_${year}_${isBotReport ? 'BOT' : 'EOT'}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Report Cards</h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Generate and print student report cards</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-5 rounded-xl shadow-sm border`}>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-4 flex items-center gap-2`}>
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </h3>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1.5`}>Class</label>
                <select
                  className={inputClasses}
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value as ClassLevel)}
                >
                  {getAllClasses().map(({ level, displayName }) => <option key={level} value={level}>{displayName}</option>)}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1.5`}>Stream</label>
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
                <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1.5`}>Term</label>
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
                <label className={`block text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-1.5`}>Assessment Type</label>
                <select
                  className={inputClasses}
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as AssessmentType)}
                >
                  <option value={AssessmentType.BOT}>Beginning of Term (BOT)</option>
                  <option value={AssessmentType.EOT}>End of Term (EOT)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-xl shadow-sm text-white">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Quick Stats
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-indigo-100 text-sm">Total Students</span>
                <span className="font-bold text-lg">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-100 text-sm">With Marks</span>
                <span className="font-bold text-lg">{stats.withMarks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-100 text-sm">Missing Marks</span>
                <span className={`font-bold text-lg ${stats.missingMarks > 0 ? 'text-amber-300' : ''}`}>{stats.missingMarks}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-100 text-sm">Avg Aggregate</span>
                <span className="font-bold text-lg">{stats.avgAggregate}</span>
              </div>

              <div className="border-t border-indigo-400/30 pt-3 mt-3">
                <span className="text-indigo-100 text-xs block mb-2">Divisions</span>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center bg-white/10 rounded-lg py-1.5">
                    <div className="text-xs text-indigo-200">I</div>
                    <div className="font-bold">{stats.divisions.I}</div>
                  </div>
                  <div className="text-center bg-white/10 rounded-lg py-1.5">
                    <div className="text-xs text-indigo-200">II</div>
                    <div className="font-bold">{stats.divisions.II}</div>
                  </div>
                  <div className="text-center bg-white/10 rounded-lg py-1.5">
                    <div className="text-xs text-indigo-200">III</div>
                    <div className="font-bold">{stats.divisions.III}</div>
                  </div>
                  <div className="text-center bg-white/10 rounded-lg py-1.5">
                    <div className="text-xs text-indigo-200">U</div>
                    <div className="font-bold">{stats.divisions.U}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-5 rounded-xl shadow-sm border`}>
            <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-4`}>Generate Reports</h3>

            <div className="space-y-3">
              <Button
                onClick={() => generatePDF()}
                disabled={loading || !settings || selectedStudentIds.size === 0}
                size="md"
                className="w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Generate {selectedStudentIds.size} PDF Report{selectedStudentIds.size !== 1 ? 's' : ''}
                  </span>
                )}
              </Button>

              <button
                onClick={exportToExcel}
                disabled={filteredPreviews.length === 0}
                className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${filteredPreviews.length === 0
                  ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isDark ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20' : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to Excel
              </button>

              <button
                onClick={exportToCSV}
                disabled={studentPreviews.length === 0}
                className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${studentPreviews.length === 0
                  ? isDark ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isDark ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to CSV
              </button>

              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center`}>
                {selectedStudentIds.size} of {stats.total} students selected
              </p>
            </div>

            {!settings && (
              <p className="mt-4 text-xs text-red-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Settings not loaded
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-sm border overflow-hidden`}>
            <div className={`p-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50/50'}`}>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search by name or index number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'} text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none`}
                  />
                  <svg className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'} absolute left-3 top-1/2 -translate-y-1/2`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleAllSelection}
                    className={`px-3 py-1.5 text-xs font-medium text-indigo-600 ${isDark ? 'hover:bg-indigo-900/30' : 'hover:bg-indigo-50'} rounded-lg transition-colors`}
                  >
                    {selectedStudentIds.size === filteredPreviews.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={selectOnlyWithMarks}
                    className={`px-3 py-1.5 text-xs font-medium ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'} rounded-lg transition-colors`}
                  >
                    Select Ready Only
                  </button>
                </div>
              </div>
            </div>

            {dataLoading ? (
              <div className="p-12 text-center">
                <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading student data...</p>
              </div>
            ) : filteredPreviews.length === 0 ? (
              <div className="p-12 text-center">
                <svg className={`w-12 h-12 ${isDark ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-3`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} font-medium`}>No students found</p>
                <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-sm mt-1`}>Try adjusting your filters or add students first</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${isDark ? 'bg-gray-750 text-gray-400' : 'bg-gray-50 text-gray-500'} text-xs uppercase tracking-wider`}>
                    <tr>
                      <th className="w-10 px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.size === filteredPreviews.length && filteredPreviews.length > 0}
                          onChange={toggleAllSelection}
                          className={`rounded ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300'} text-indigo-600 focus:ring-indigo-500`}
                        />
                      </th>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Stream</th>
                      <th className="px-4 py-3 text-center">Aggregate</th>
                      <th className="px-4 py-3 text-center">Division</th>
                      <th className="px-4 py-3 text-center">Position</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {filteredPreviews.map((preview) => {
                      const currentMarks = reportType === AssessmentType.BOT ? preview.botMarks : preview.eotMarks;
                      const currentPosition = reportType === AssessmentType.BOT ? preview.botPosition : preview.eotPosition;

                      return (
                        <tr
                          key={preview.student.id}
                          className={`${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50/50'} transition-colors ${selectedStudentIds.has(preview.student.id!) ? (isDark ? 'bg-indigo-900/20' : 'bg-indigo-50/30') : ''}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.has(preview.student.id!)}
                              onChange={() => toggleStudentSelection(preview.student.id!)}
                              className={`rounded ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300'} text-indigo-600 focus:ring-indigo-500`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'} text-sm`}>{preview.student.name}</div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{preview.student.indexNumber}</div>
                          </td>
                          <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{preview.student.stream || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {currentMarks?.aggregate || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDivisionColor(currentMarks?.division)}`}>
                              {currentMarks?.division || '-'}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            {currentPosition || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {preview.hasMissingMarks ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Incomplete
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'}`}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Ready
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => generatePDF(preview.student.id)}
                              disabled={loading}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 ${isDark ? 'hover:bg-indigo-900/30' : 'hover:bg-indigo-50'} rounded-lg transition-colors disabled:opacity-50`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
