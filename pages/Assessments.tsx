
import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { dbService } from '../services/api';
import { ClassLevel, AssessmentType, SUBJECTS_UPPER, SUBJECTS_LOWER, SchoolSettings, MarkRecord, Student, Gender, Teacher } from '../types';
import { calculateGrade, calculateAggregate, calculateDivision } from '../services/grading';
import { useClassNames } from '../hooks/use-class-names';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { Button } from '../components/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

declare const jspdf: any;

const Icons = {
  FileText: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></svg>
  ),
  Download: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
  ),
  Users: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  TrendingUp: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
  ),
  Award: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></svg>
  ),
  BarChart3: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
  ),
};

export const Assessments: React.FC = () => {
  const { isDark } = useTheme();
  const { getDisplayName, getAllClasses } = useClassNames();
  const { selectedYear, isArchiveMode } = useAcademicYear();
  const [selectedClass, setSelectedClass] = useState<ClassLevel>(ClassLevel.P7);
  const [selectedStream, setSelectedStream] = useState<string>('ALL');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedType, setSelectedType] = useState<AssessmentType | 'BOTH'>('BOTH');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [stats, setStats] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const [s, t] = await Promise.all([
        dbService.getSettings(),
        dbService.getTeachers()
      ]);
      setSettings(s);
      setTeachers(t);
      if (s) setSelectedTerm(s.currentTerm);
    };
    loadConfig();
  }, []);

  useEffect(() => {
    setSelectedStream('ALL');
  }, [selectedClass]);

  useEffect(() => {
    if (settings) runAnalysis();
  }, [selectedClass, selectedStream, selectedTerm, selectedType, settings]);

  const availableStreams = useMemo(() => {
    if (!settings) return [];
    return settings.streams[selectedClass] || [];
  }, [settings, selectedClass]);

  const classTeacher = useMemo(() => {
    if (selectedStream === 'ALL') {
      return teachers.find(t =>
        t.assignedClass === selectedClass &&
        (t.roles || []).includes('Class Teacher')
      );
    }
    return teachers.find(t =>
      t.assignedClass === selectedClass &&
      t.assignedStream === selectedStream &&
      (t.roles || []).includes('Class Teacher')
    );
  }, [teachers, selectedClass, selectedStream]);

  const subjects = ['P1', 'P2', 'P3'].includes(selectedClass) ? SUBJECTS_LOWER : SUBJECTS_UPPER;
  const subjectShortNames: { [key: string]: string } = {
    'english': 'ENG',
    'maths': 'MTC',
    'science': 'SCI',
    'sst': 'SST',
    'literacy1': 'LIT1',
    'literacy2': 'LIT2'
  };

  const getFilteredData = async () => {
    const allStudents = await dbService.getStudents(isArchiveMode ? selectedYear : undefined);
    let classStudents = allStudents.filter(s => s.classLevel === selectedClass);

    if (selectedStream !== 'ALL') {
      classStudents = classStudents.filter(s => s.stream === selectedStream);
    }

    const allMarks = await dbService.getMarks(isArchiveMode ? selectedYear : undefined);
    const year = settings?.currentYear || new Date().getFullYear();
    const typeToAnalyze = selectedType === 'BOTH' ? AssessmentType.EOT : selectedType;

    const processed = classStudents.map(student => {
      const record = allMarks.find(m =>
        m.studentId === student.id &&
        m.term === selectedTerm &&
        m.year === year &&
        m.type === typeToAnalyze
      );

      const marks = record ? record.marks : {};
      let totalMarks = 0;
      subjects.forEach(sub => totalMarks += (marks as any)[sub] || 0);

      return {
        student,
        marks,
        aggregate: record ? record.aggregate : 0,
        division: record ? record.division : 'X',
        totalMarks
      };
    }).filter(r => r.aggregate > 0);

    return processed;
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    const data = await getFilteredData();

    const divs = { I: 0, II: 0, III: 0, IV: 0, U: 0, X: 0 };
    data.forEach(d => {
      if (d.division in divs) divs[d.division as keyof typeof divs]++;
      else divs.X++;
    });

    const genderStats = {
      M: { total: 0, aggSum: 0, count: 0 },
      F: { total: 0, aggSum: 0, count: 0 }
    };
    data.forEach(d => {
      const g = d.student.gender;
      genderStats[g].total++;
      if (d.aggregate > 0) {
        genderStats[g].aggSum += d.aggregate;
        genderStats[g].count++;
      }
    });

    const subjectStats = subjects.map(sub => {
      const scores = data.map(d => (d.marks as any)[sub]).filter(m => m !== undefined && m !== null);
      const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const grade = calculateGrade(Math.round(avg), settings?.gradingConfig).grade;
      return { name: subjectShortNames[sub], avg: Math.round(avg), grade };
    });

    const sortedData = [...data].sort((a, b) => {
      if (a.aggregate === 0 && b.aggregate > 0) return 1;
      if (b.aggregate === 0 && a.aggregate > 0) return -1;
      if (a.aggregate !== b.aggregate) return a.aggregate - b.aggregate;
      return b.totalMarks - a.totalMarks;
    });
    const topPerformers = sortedData.slice(0, 5);

    const passRate = data.length > 0
      ? ((data.filter(d => ['I', 'II', 'III', 'IV'].includes(d.division)).length / data.length) * 100).toFixed(1)
      : '0';

    setStats({
      totalStudents: data.length,
      divisions: [
        { name: 'Div I', value: divs.I, color: '#22c55e' },
        { name: 'Div II', value: divs.II, color: '#3b82f6' },
        { name: 'Div III', value: divs.III, color: '#eab308' },
        { name: 'Div IV', value: divs.IV, color: '#8b5cf6' },
        { name: 'Div U', value: divs.U, color: '#ef4444' }
      ],
      gender: {
        maleAvg: genderStats.M.count ? (genderStats.M.aggSum / genderStats.M.count).toFixed(1) : '-',
        femaleAvg: genderStats.F.count ? (genderStats.F.aggSum / genderStats.F.count).toFixed(1) : '-',
        maleCount: genderStats.M.total,
        femaleCount: genderStats.F.total
      },
      subjects: subjectStats,
      topPerformers,
      passRate
    });
    setAnalyzing(false);
  };

  const downloadCSV = async () => {
    const data = await getFilteredData();
    const header = ['Rank', 'Name', 'Stream', 'Gender', ...subjects.map(s => subjectShortNames[s]), 'Total', 'Agg', 'Div'];

    const sortedData = [...data].sort((a, b) => {
      if (a.aggregate === 0 && b.aggregate > 0) return 1;
      if (b.aggregate === 0 && a.aggregate > 0) return -1;
      if (a.aggregate !== b.aggregate) return a.aggregate - b.aggregate;
      return b.totalMarks - a.totalMarks;
    });

    const rows = sortedData.map((row, idx) => [
      idx + 1,
      row.student.name,
      row.student.stream,
      row.student.gender,
      ...subjects.map(s => (row.marks as any)[s] || ''),
      row.totalMarks,
      row.aggregate,
      row.division
    ]);

    const csvContent = [
      header.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const streamSuffix = selectedStream !== 'ALL' ? `_${selectedStream}` : '';
    link.download = `${selectedClass}${streamSuffix}_Assessment_Term${selectedTerm}_${selectedType}.csv`;
    link.click();
  };

  const generateSection = (doc: any, type: AssessmentType, classStudents: any[], allMarks: any[], settings: SchoolSettings, year: number, streamFilter: string) => {
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

    let filteredStudents = classStudents;
    if (streamFilter !== 'ALL') {
      filteredStudents = classStudents.filter((s: any) => s.stream === streamFilter);
    }

    const studentRows = filteredStudents.map((student: any) => {
      const record = allMarks.find((m: any) =>
        m.studentId === student.id &&
        m.term === selectedTerm &&
        m.year === year &&
        m.type === type
      );

      const marks = record ? record.marks : {};
      let totalMarks = 0;
      subjects.forEach(sub => {
        totalMarks += (marks as any)[sub] || 0;
      });

      return {
        student,
        marks,
        aggregate: record ? record.aggregate : 0,
        division: record ? record.division : '-',
        totalMarks
      };
    });

    // Sort by total marks (highest first) - students without results go to bottom
    studentRows.sort((a: any, b: any) => {
      // Students without results go to the bottom
      if (a.totalMarks === 0 && b.totalMarks > 0) return 1;
      if (b.totalMarks === 0 && a.totalMarks > 0) return -1;
      // Sort by total marks descending (highest total marks = position 1)
      return b.totalMarks - a.totalMarks;
    });

    const bestPerformer = studentRows.find((r: any) => r.totalMarks > 0);
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 12;
    const timestamp = new Date().toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const typeText = type === AssessmentType.BOT ? "BEGINNING OF TERM" : "END OF TERM";
    const termText = selectedTerm === 1 ? "I" : selectedTerm === 2 ? "II" : "III";
    const termFull = selectedTerm === 1 ? "ONE" : selectedTerm === 2 ? "TWO" : "THREE";
    const streamText = streamFilter !== 'ALL' ? ` (${streamFilter} STREAM)` : '';

    const teacherForStream = streamFilter !== 'ALL'
      ? teachers.find(t => {
        const assignments = t.teachingClasses || [];
        const hasAssignment = assignments.some((a: string) => {
          if (a.includes('-')) {
            const [cls, strm] = a.split('-');
            return cls === selectedClass && strm === streamFilter;
          }
          return a === selectedClass;
        });
        return hasAssignment && (t.roles || []).includes('Class Teacher');
      })
      : teachers.find(t => {
        const assignments = t.teachingClasses || [];
        const hasAssignment = assignments.some((a: string) => a === selectedClass || a.startsWith(selectedClass + '-'));
        return hasAssignment && (t.roles || []).includes('Class Teacher');
      });

    const studentsWithResults = studentRows.filter((r: any) => r.aggregate > 0);
    const divCounts: { [key: string]: number } = { I: 0, II: 0, III: 0, IV: 0, U: 0 };
    studentsWithResults.forEach((r: any) => {
      if (r.division in divCounts) divCounts[r.division as keyof typeof divCounts]++;
    });

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
    doc.text(settings.schoolName.toUpperCase(), pageWidth / 2, headerY, { align: "center" });
    headerY += 5;

    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(settings.addressBox || '', pageWidth / 2, headerY, { align: "center" });
    headerY += 4;

    doc.setFontSize(8);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(`Tel: ${settings.contactPhones || 'N/A'}`, pageWidth / 2, headerY, { align: "center" });
    headerY += 4;

    if (settings.motto) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      doc.text(`"${settings.motto}"`, pageWidth / 2, headerY, { align: "center" });
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
    doc.text("CLASS ASSESSMENT REPORT", pageWidth / 2, headerY + 5.5, { align: "center" });
    headerY += 12;

    const infoBoxY = headerY;
    const infoBoxHeight = 18;
    doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.2);
    doc.rect(margin, infoBoxY, pageWidth - (margin * 2), infoBoxHeight, 'FD');

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

    const col1X = margin + 5;
    const col2X = margin + 80;
    const col3X = margin + 160;
    const infoY1 = infoBoxY + 6;
    const infoY2 = infoBoxY + 13;

    doc.setFont("helvetica", "bold");
    doc.text("Class:", col1X, infoY1);
    doc.setFont("helvetica", "normal");
    doc.text(`${getDisplayName(selectedClass)}${streamText}`, col1X + 15, infoY1);

    doc.setFont("helvetica", "bold");
    doc.text("Term:", col2X, infoY1);
    doc.setFont("helvetica", "normal");
    doc.text(`Term ${termFull} (${year})`, col2X + 15, infoY1);

    doc.setFont("helvetica", "bold");
    doc.text("Assessment:", col3X, infoY1);
    doc.setFont("helvetica", "normal");
    doc.text(typeText, col3X + 28, infoY1);

    doc.setFont("helvetica", "bold");
    doc.text("Class Teacher:", col1X, infoY2);
    doc.setFont("helvetica", "normal");
    doc.text(teacherForStream ? teacherForStream.name : 'Not Assigned', col1X + 32, infoY2);

    doc.setFont("helvetica", "bold");
    doc.text("Enrollment:", col2X, infoY2);
    doc.setFont("helvetica", "normal");
    doc.text(`${filteredStudents.length} Students`, col2X + 26, infoY2);

    doc.setFont("helvetica", "bold");
    doc.text("With Results:", col3X, infoY2);
    doc.setFont("helvetica", "normal");
    doc.text(`${studentsWithResults.length} Students`, col3X + 28, infoY2);

    headerY = infoBoxY + infoBoxHeight + 4;

    const subjectColWidth = subjects.length <= 4 ? 22 : 18;
    const gradeColWidth = subjects.length <= 4 ? 10 : 8;

    const head = [
      [
        { content: 'POS', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
        { content: 'STUDENT NAME', styles: { halign: 'left', fillColor: colors.primary, textColor: colors.white } },
        { content: 'SEX', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white } },
        ...subjects.flatMap(sub => [
          { content: subjectShortNames[sub] || sub.toUpperCase().substring(0, 3), styles: { halign: 'center', fillColor: colors.darkBlue, textColor: colors.white } },
          { content: 'GR', styles: { halign: 'center', fillColor: colors.darkBlue, textColor: [200, 200, 200], fontSize: 6 } }
        ]),
        { content: 'TOT', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' } },
        { content: 'AGG', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' } },
        { content: 'DIV', styles: { halign: 'center', fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold' } }
      ]
    ];

    let currentRank = 0;
    let prevTotal = -1;

    const body = studentRows.map((row: any, index: number) => {
      // Ranking based on total marks - same total marks = same rank
      if (row.totalMarks !== prevTotal) {
        currentRank = index + 1;
      }
      prevTotal = row.totalMarks;

      const rowData: any[] = [
        row.totalMarks > 0 ? currentRank.toString() : '-',
        row.student.name.toUpperCase(),
        row.student.gender === 'Male' ? 'M' : row.student.gender === 'Female' ? 'F' : '-'
      ];

      subjects.forEach(sub => {
        const mark = (row.marks as any)[sub];
        const { grade } = calculateGrade(mark, settings?.gradingConfig);
        rowData.push(mark !== undefined && mark !== null ? mark : '-');
        rowData.push(mark !== undefined && mark !== null ? grade : '-');
      });

      rowData.push(row.totalMarks > 0 ? row.totalMarks : '-');
      rowData.push(row.aggregate > 0 ? row.aggregate : '-');
      rowData.push(row.aggregate > 0 ? row.division : '-');

      return rowData;
    });

    const baseColIdx = 3 + (subjects.length * 2);
    const columnStyles: any = {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 50, halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 10, halign: 'center' },
    };

    subjects.forEach((_, i) => {
      columnStyles[3 + (i * 2)] = { cellWidth: subjectColWidth, halign: 'center' };
      columnStyles[3 + (i * 2) + 1] = { cellWidth: gradeColWidth, halign: 'center', fontSize: 7, textColor: colors.muted };
    });

    columnStyles[baseColIdx] = { cellWidth: 14, halign: 'center', fontStyle: 'bold' };
    columnStyles[baseColIdx + 1] = { cellWidth: 12, halign: 'center', fontStyle: 'bold' };
    columnStyles[baseColIdx + 2] = { cellWidth: 12, halign: 'center', fontStyle: 'bold' };

    // @ts-ignore
    doc.autoTable({
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
      headStyles: {
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: colors.white,
        minCellHeight: 7
      },
      bodyStyles: {
        minCellHeight: 6
      },
      alternateRowStyles: {
        fillColor: colors.lightGray
      },
      columnStyles: columnStyles,
      margin: { left: margin, right: margin },
      didParseCell: function (data: any) {
        if (data.section === 'body') {
          const colIdx = data.column.index;
          const divColIdx = baseColIdx + 2;

          if (colIdx === 0 && data.cell.raw !== '-') {
            const rank = parseInt(data.cell.raw);
            if (rank === 1) {
              data.cell.styles.textColor = [212, 175, 55];
              data.cell.styles.fontStyle = 'bold';
            } else if (rank === 2) {
              data.cell.styles.textColor = [156, 163, 175];
              data.cell.styles.fontStyle = 'bold';
            } else if (rank === 3) {
              data.cell.styles.textColor = [180, 83, 9];
              data.cell.styles.fontStyle = 'bold';
            }
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
      },
      didDrawPage: function () {
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, 0, pageWidth, 3, 'F');

        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
        doc.setLineWidth(0.3);
        doc.rect(margin - 2, 6, pageWidth - (margin * 2) + 4, pageHeight - 12, 'S');
      }
    });

    const tableEndY = (doc as any).lastAutoTable.finalY;
    let footerY = tableEndY + 6;

    if (footerY < pageHeight - 35) {
      doc.setFillColor(colors.cream[0], colors.cream[1], colors.cream[2]);
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.2);
      doc.rect(margin, footerY, pageWidth - (margin * 2), 12, 'FD');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
      doc.text("DIVISION SUMMARY:", margin + 4, footerY + 5);

      const passCount = studentsWithResults.filter((r: any) => ['I', 'II', 'III', 'IV'].includes(r.division)).length;
      const passRate = studentsWithResults.length > 0 ? ((passCount / studentsWithResults.length) * 100).toFixed(0) : '0';

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      let divTextX = margin + 45;

      const divColorMap: { [key: string]: number[] } = {
        'I': colors.green, 'II': colors.blue, 'III': [180, 140, 20], 'IV': colors.purple, 'U': colors.red
      };

      ['I', 'II', 'III', 'IV', 'U'].forEach(div => {
        doc.setFillColor(divColorMap[div][0], divColorMap[div][1], divColorMap[div][2]);
        doc.circle(divTextX, footerY + 4.5, 1.5, 'F');
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        doc.text(`${div}: ${divCounts[div]}`, divTextX + 3, footerY + 5);
        divTextX += 22;
      });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.text(`Pass Rate: ${passRate}%`, pageWidth - margin - 35, footerY + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      doc.text(`Grading: D1(90-100) D2(80-89) C3(70-79) C4(60-69) C5(55-59) C6(50-54) P7(45-49) P8(40-44) F9(0-39)`, margin + 4, footerY + 10);

      footerY += 15;
    }

    if (footerY < pageHeight - 22) {
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.3);

      const sigY = footerY + 5;
      const sigWidth = 55;

      doc.line(margin + 5, sigY + 8, margin + 5 + sigWidth, sigY + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      doc.text("Class Teacher's Signature", margin + 5, sigY + 12);

      doc.line(margin + 75, sigY + 8, margin + 75 + sigWidth, sigY + 8);
      doc.text("Head Teacher's Signature", margin + 75, sigY + 12);

      doc.line(margin + 145, sigY + 8, margin + 145 + sigWidth, sigY + 8);
      doc.text("Date", margin + 145, sigY + 12);
    }

    doc.setFontSize(6);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(`Generated: ${timestamp}`, margin, pageHeight - 4);
    doc.text(settings.schoolName, pageWidth / 2, pageHeight - 4, { align: 'center' });
    doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - margin, pageHeight - 4, { align: 'right' });

    doc.addPage();

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.3);
    doc.rect(margin - 2, 6, pageWidth - (margin * 2) + 4, pageHeight - 12, 'S');

    let analysisY = 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("PERFORMANCE ANALYSIS REPORT", pageWidth / 2, analysisY, { align: 'center' });
    analysisY += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(`${getDisplayName(selectedClass)}${streamText} | ${typeText} | Term ${termFull} ${year}`, pageWidth / 2, analysisY, { align: 'center' });
    analysisY += 4;

    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(margin + 60, analysisY, pageWidth - margin - 60, analysisY);
    analysisY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("1. DIVISION ANALYSIS", margin + 2, analysisY);
    analysisY += 6;

    const passCount = studentsWithResults.filter((r: any) => ['I', 'II', 'III', 'IV'].includes(r.division)).length;
    const passRate = studentsWithResults.length > 0 ? ((passCount / studentsWithResults.length) * 100).toFixed(1) : '0';

    const divAnalysisHead = [['DIVISION', 'COUNT', 'PERCENTAGE', 'STATUS']];
    const divTotal = Object.values(divCounts).reduce((a, b) => a + b, 0);
    const divAnalysisBody = [
      ['Division I', divCounts['I'], divTotal > 0 ? ((divCounts['I'] / divTotal) * 100).toFixed(1) + '%' : '0%', 'Excellent'],
      ['Division II', divCounts['II'], divTotal > 0 ? ((divCounts['II'] / divTotal) * 100).toFixed(1) + '%' : '0%', 'Very Good'],
      ['Division III', divCounts['III'], divTotal > 0 ? ((divCounts['III'] / divTotal) * 100).toFixed(1) + '%' : '0%', 'Good'],
      ['Division IV', divCounts['IV'], divTotal > 0 ? ((divCounts['IV'] / divTotal) * 100).toFixed(1) + '%' : '0%', 'Pass'],
      ['Ungraded (U)', divCounts['U'], divTotal > 0 ? ((divCounts['U'] / divTotal) * 100).toFixed(1) + '%' : '0%', 'Fail'],
      ['TOTAL', divTotal, '100%', `Pass Rate: ${passRate}%`]
    ];

    // @ts-ignore
    doc.autoTable({
      startY: analysisY,
      head: divAnalysisHead,
      body: divAnalysisBody,
      theme: 'grid',
      styles: { fontSize: 8, lineColor: colors.border, lineWidth: 0.1, textColor: colors.text, cellPadding: 2 },
      headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 40 }
      },
      margin: { left: margin },
      tableWidth: 130,
      didParseCell: function (data: any) {
        if (data.section === 'body' && data.row.index === 5) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = colors.cream;
        }
        if (data.section === 'body' && data.column.index === 0) {
          if (data.row.index === 0) data.cell.styles.textColor = colors.green;
          else if (data.row.index === 1) data.cell.styles.textColor = colors.blue;
          else if (data.row.index === 2) data.cell.styles.textColor = [180, 140, 20];
          else if (data.row.index === 3) data.cell.styles.textColor = colors.purple;
          else if (data.row.index === 4) data.cell.styles.textColor = colors.red;
        }
      }
    });

    analysisY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("2. SUBJECT PERFORMANCE STATISTICS", margin + 2, analysisY);
    analysisY += 6;

    const statsHead = [['SUBJECT', 'ENTRIES', 'AVERAGE', 'GRADE', 'HIGHEST', 'LOWEST', 'PASS %']];
    const statsBody = subjects.map(sub => {
      const marks = studentRows.map((r: any) => (r.marks as any)[sub]).filter((m: any) => m !== undefined && m !== null);
      const max = marks.length ? Math.max(...marks) : 0;
      const min = marks.length ? Math.min(...marks) : 0;
      const sum = marks.reduce((a: number, b: number) => a + b, 0);
      const avg = marks.length ? Math.round(sum / marks.length) : 0;
      const { grade } = calculateGrade(avg, settings?.gradingConfig);
      const passCountSub = marks.filter((m: number) => m >= 40).length;
      const passPercent = marks.length ? ((passCountSub / marks.length) * 100).toFixed(0) + '%' : '0%';

      return [subjectShortNames[sub] || sub, marks.length, avg, grade, max, min, passPercent];
    });

    // @ts-ignore
    doc.autoTable({
      startY: analysisY,
      head: statsHead,
      body: statsBody,
      theme: 'grid',
      styles: { fontSize: 8, lineColor: colors.border, lineWidth: 0.1, textColor: colors.text, cellPadding: 2 },
      headStyles: { fillColor: colors.darkBlue, textColor: colors.white, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: colors.lightGray },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 25 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'center', cellWidth: 20 }
      },
      margin: { left: margin },
      tableWidth: 143,
      didParseCell: function (data: any) {
        if (data.section === 'body' && data.column.index === 3) {
          const grade = data.cell.raw;
          if (['D1', 'D2'].includes(grade)) data.cell.styles.textColor = colors.green;
          else if (['C3', 'C4', 'C5', 'C6'].includes(grade)) data.cell.styles.textColor = colors.blue;
          else if (['P7', 'P8'].includes(grade)) data.cell.styles.textColor = [180, 140, 20];
          else if (grade === 'F9') data.cell.styles.textColor = colors.red;
        }
      }
    });

    analysisY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
    doc.text("3. GRADE DISTRIBUTION BY SUBJECT", margin + 2, analysisY);
    analysisY += 6;

    const grades = ['D1', 'D2', 'C3', 'C4', 'C5', 'C6', 'P7', 'P8', 'F9'];
    const gradeDistHead = [['SUBJECT', ...grades]];

    const gradeDistBody = subjects.map(sub => {
      const counts: { [key: string]: number } = {};
      grades.forEach(g => counts[g] = 0);

      studentRows.forEach((row: any) => {
        const mark = (row.marks as any)[sub];
        if (mark !== undefined && mark !== null) {
          const { grade } = calculateGrade(mark, settings?.gradingConfig);
          if (counts[grade] !== undefined) counts[grade]++;
        }
      });

      return [subjectShortNames[sub], ...grades.map(g => counts[g] || '-')];
    });

    // @ts-ignore
    doc.autoTable({
      startY: analysisY,
      head: gradeDistHead,
      body: gradeDistBody,
      theme: 'grid',
      styles: { fontSize: 7.5, lineColor: colors.border, lineWidth: 0.1, textColor: colors.text, cellPadding: 1.5, halign: 'center' },
      headStyles: { fillColor: colors.primary, textColor: colors.white, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: colors.lightGray },
      columnStyles: { 0: { fontStyle: 'bold', halign: 'left', cellWidth: 22 } },
      margin: { left: margin },
      tableWidth: pageWidth - (margin * 2)
    });

    analysisY = (doc as any).lastAutoTable.finalY + 10;

    if (bestPerformer && analysisY < pageHeight - 45) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(colors.darkBlue[0], colors.darkBlue[1], colors.darkBlue[2]);
      doc.text("4. TOP PERFORMERS", margin + 2, analysisY);
      analysisY += 6;

      // Top performers based on total marks (already sorted by total marks)
      const top5 = studentRows.filter((r: any) => r.totalMarks > 0).slice(0, 5);
      const topHead = [['POSITION', 'STUDENT NAME', 'STREAM', 'TOTAL MARKS', 'AGGREGATE', 'DIVISION']];
      const topBody = top5.map((row: any, i: number) => [
        i + 1,
        row.student.name.toUpperCase(),
        row.student.stream || '-',
        row.totalMarks,
        row.aggregate,
        row.division
      ]);

      // @ts-ignore
      doc.autoTable({
        startY: analysisY,
        head: topHead,
        body: topBody,
        theme: 'grid',
        styles: { fontSize: 8, lineColor: colors.border, lineWidth: 0.1, textColor: colors.text, cellPadding: 2 },
        headStyles: { fillColor: colors.gold, textColor: colors.text, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 60, fontStyle: 'bold' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }
        },
        margin: { left: margin },
        tableWidth: 175,
        didParseCell: function (data: any) {
          if (data.section === 'body') {
            if (data.column.index === 0) {
              if (data.row.index === 0) data.cell.styles.textColor = [212, 175, 55];
              else if (data.row.index === 1) data.cell.styles.textColor = [156, 163, 175];
              else if (data.row.index === 2) data.cell.styles.textColor = [180, 83, 9];
            }
            if (data.column.index === 5) {
              const div = data.cell.raw;
              if (div === 'I') data.cell.styles.textColor = colors.green;
              else if (div === 'II') data.cell.styles.textColor = colors.blue;
              else if (div === 'III') data.cell.styles.textColor = [180, 140, 20];
              else if (div === 'IV') data.cell.styles.textColor = colors.purple;
            }
          }
        }
      });
    }

    doc.setFontSize(6);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(`Generated: ${timestamp}`, margin, pageHeight - 4);
    doc.text(settings.schoolName, pageWidth / 2, pageHeight - 4, { align: 'center' });
    doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - margin, pageHeight - 4, { align: 'right' });
  };

  const generateSheet = async () => {
    if (!settings) return;
    setLoading(true);

    const allStudents = await dbService.getStudents(isArchiveMode ? selectedYear : undefined);
    const classStudents = allStudents.filter(s => s.classLevel === selectedClass);
    const allMarks = await dbService.getMarks(isArchiveMode ? selectedYear : undefined);
    const year = settings.currentYear || new Date().getFullYear();

    let filteredStudents = classStudents;
    if (selectedStream !== 'ALL') {
      filteredStudents = classStudents.filter(s => s.stream === selectedStream);
    }

    if (filteredStudents.length === 0) {
      alert("No students found for this selection.");
      setLoading(false);
      return;
    }

    const doc = new jspdf.jsPDF('l', 'mm', 'a4');

    const reportsToGenerate = selectedType === 'BOTH'
      ? [AssessmentType.BOT, AssessmentType.EOT]
      : [selectedType];

    for (let i = 0; i < reportsToGenerate.length; i++) {
      const type = reportsToGenerate[i];
      if (i > 0) doc.addPage();
      generateSection(doc, type, classStudents, allMarks, settings, year, selectedStream);
    }

    const sanitizedSchoolName = settings.schoolName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const streamSuffix = selectedStream !== 'ALL' ? `_${selectedStream}` : '';
    doc.save(`${sanitizedSchoolName}_Assessment_${selectedClass}${streamSuffix}_Term${selectedTerm}_${selectedType}.pdf`);
    setLoading(false);
  };

  const inputClasses = `block w-full rounded-lg border ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'} px-3 py-2.5 shadow-sm focus:border-[#7B1113] focus:ring-2 focus:ring-[#7B1113]/30 focus:outline-none text-sm transition-all duration-200`;

  const divisionColors = ['#22c55e', '#3b82f6', '#eab308', '#8b5cf6', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Assessment Sheets & Analytics</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Generate assessment reports and analyze class performance</p>
        </div>
      </div>

      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-xl shadow-lg border`}>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div>
            <label className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Class</label>
            <select
              className={inputClasses}
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as ClassLevel)}
            >
              {getAllClasses().map(({ level, displayName }) => <option key={level} value={level}>{displayName}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Stream</label>
            <select
              className={inputClasses}
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
            >
              <option value="ALL">All Streams</option>
              {availableStreams.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Term</label>
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
            <label className={`block text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-2`}>Assessment</label>
            <select
              className={inputClasses}
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as AssessmentType | 'BOTH')}
            >
              <option value="BOTH">BOT & EOT</option>
              <option value={AssessmentType.BOT}>Beginning of Term</option>
              <option value={AssessmentType.EOT}>End of Term</option>
            </select>
          </div>
          <div className="col-span-2 flex items-end gap-2">
            <Button onClick={generateSheet} disabled={loading || !settings} className="flex-1 justify-center gap-2">
              <Icons.FileText className="w-4 h-4" />
              {loading ? 'Generating...' : 'Generate PDF'}
            </Button>
            <Button onClick={downloadCSV} variant="outline" disabled={loading} className="flex-1 justify-center gap-2">
              <Icons.Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {classTeacher && (
          <div className={`mb-6 p-3 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-[#7B1113]' : 'bg-[#7B1113]'} text-white font-bold`}>
              {classTeacher.initials || classTeacher.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Class Teacher: {classTeacher.name}
              </div>
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {getDisplayName(selectedClass)} {selectedStream !== 'ALL' ? selectedStream : ''}
              </div>
            </div>
          </div>
        )}

        {analyzing ? (
          <div className={`py-16 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="animate-spin w-8 h-8 border-2 border-[#7B1113] border-t-transparent rounded-full mx-auto mb-3"></div>
            Analyzing class data...
          </div>
        ) : stats && stats.totalStudents > 0 ? (
          <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} pt-6`}>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className={`${isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-blue-50 to-white'} p-4 rounded-xl border ${isDark ? 'border-gray-600' : 'border-blue-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Icons.Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.totalStudents}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Students with Results</div>
                  </div>
                </div>
              </div>
              <div className={`${isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-green-50 to-white'} p-4 rounded-xl border ${isDark ? 'border-gray-600' : 'border-green-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Icons.TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.passRate}%</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pass Rate</div>
                  </div>
                </div>
              </div>
              <div className={`${isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-purple-50 to-white'} p-4 rounded-xl border ${isDark ? 'border-gray-600' : 'border-purple-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Icons.Award className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.divisions[0]?.value || 0}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Division I</div>
                  </div>
                </div>
              </div>
              <div className={`${isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-amber-50 to-white'} p-4 rounded-xl border ${isDark ? 'border-gray-600' : 'border-amber-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Icons.BarChart3 className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {stats.subjects.reduce((sum: number, s: any) => sum + s.avg, 0) / stats.subjects.length || 0}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Avg Score</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className={`${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'} p-4 rounded-xl border`}>
                <h3 className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-3`}>Division Distribution</h3>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.divisions} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} horizontal={false} />
                      <XAxis type="number" fontSize={10} tick={{ fill: isDark ? '#9ca3af' : '#6b7280' }} />
                      <YAxis type="category" dataKey="name" fontSize={10} tick={{ fill: isDark ? '#9ca3af' : '#6b7280' }} width={50} />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{
                          backgroundColor: isDark ? '#1f2937' : '#ffffff',
                          border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          color: isDark ? '#f3f4f6' : '#111827'
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {stats.divisions.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={divisionColors[index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={`${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'} p-4 rounded-xl border`}>
                <h3 className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-4`}>Gender Comparison (Avg Aggregate)</h3>
                <div className="flex items-center justify-around h-32">
                  <div className="text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                      <span className="text-2xl font-bold text-blue-600">{stats.gender.maleAvg}</span>
                    </div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Boys</div>
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{stats.gender.maleCount} students</div>
                  </div>
                  <div className={`h-16 w-px ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                  <div className="text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${isDark ? 'bg-pink-900/30' : 'bg-pink-100'}`}>
                      <span className="text-2xl font-bold text-pink-600">{stats.gender.femaleAvg}</span>
                    </div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Girls</div>
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{stats.gender.femaleCount} students</div>
                  </div>
                </div>
              </div>

              <div className={`${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'} p-4 rounded-xl border`}>
                <h3 className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'} uppercase mb-3`}>Subject Performance</h3>
                <div className="space-y-3">
                  {stats.subjects.map((sub: any) => (
                    <div key={sub.name} className="flex items-center gap-3">
                      <span className={`w-10 text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{sub.name}</span>
                      <div className={`flex-1 h-3 ${isDark ? 'bg-gray-600' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                        <div
                          className={`h-full rounded-full ${sub.avg >= 50 ? 'bg-green-500' : sub.avg >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${sub.avg}%` }}
                        ></div>
                      </div>
                      <span className={`w-12 text-right text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{sub.avg}%</span>
                      <span className={`w-8 text-xs font-medium ${sub.grade.startsWith('D') ? 'text-green-500' : sub.grade.startsWith('C') ? 'text-blue-500' : sub.grade.startsWith('P') ? 'text-yellow-600' : 'text-red-500'}`}>{sub.grade}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {stats.topPerformers && stats.topPerformers.length > 0 && (
              <div className={`${isDark ? 'bg-gradient-to-r from-[#7B1113]/20 to-gray-800 border-[#7B1113]/30' : 'bg-gradient-to-r from-amber-50 to-white border-amber-200'} p-4 rounded-xl border`}>
                <h3 className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'} uppercase mb-3 flex items-center gap-2`}>
                  <Icons.Award className="w-4 h-4" /> Top 5 Performers
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {stats.topPerformers.map((p: any, idx: number) => (
                    <div key={p.student.id} className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'} ${idx === 0 ? 'ring-2 ring-amber-400' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : isDark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                          {idx + 1}
                        </span>
                        <span className={`text-xs font-medium truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{p.student.name}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Agg: {p.aggregate}</span>
                        <span className={`font-bold ${p.division === 'I' ? 'text-green-500' : p.division === 'II' ? 'text-blue-500' : 'text-yellow-500'}`}>Div {p.division}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-4`}>
              Analysis based on {stats.totalStudents} records for {getDisplayName(selectedClass)} {selectedStream !== 'ALL' ? selectedStream : ''} - {selectedType === 'BOTH' ? 'End of Term' : (selectedType === 'BOT' ? 'Beginning of Term' : 'End of Term')}.
            </div>
          </div>
        ) : stats && stats.totalStudents === 0 ? (
          <div className={`py-16 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Icons.BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No assessment data found</p>
            <p className="text-sm mt-1">Enter marks for {getDisplayName(selectedClass)} {selectedStream !== 'ALL' ? selectedStream : ''} to see analytics</p>
          </div>
        ) : null}

      </div>
    </div>
  );
};
