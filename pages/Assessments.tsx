import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ClassLevel, AssessmentType, SUBJECTS_UPPER, SUBJECTS_LOWER } from '../types';
import { calculateGrade } from '../services/grading';
import { useClassNames } from '../hooks/use-class-names';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { useStudents } from '../client/src/hooks/useStudents';
import { useMarks } from '../client/src/hooks/useMarks';
import { useSettings } from '../client/src/hooks/useSettings';
import { useTeachers } from '../client/src/hooks/useTeachers';

import { AssessmentFilters } from '../client/src/components/assessments/AssessmentFilters';
import { AssessmentStats } from '../client/src/components/assessments/AssessmentStats';
import { generateAssessmentPDF, downloadAssessmentCSV } from '../client/src/services/assessmentsReportService';

export const Assessments: React.FC = () => {
  const { isDark } = useTheme();
  const { selectedYear, isArchiveMode } = useAcademicYear();
  const { getDisplayName } = useClassNames();

  // Hooks
  const { settings, isLoading: settingsLoading } = useSettings();
  const { students: allStudents, isLoading: studentsLoading } = useStudents(isArchiveMode ? String(selectedYear) : undefined);
  const { marks: allMarks, isLoading: marksLoading } = useMarks(isArchiveMode ? String(selectedYear) : undefined);
  const { teachers, isLoading: teachersLoading } = useTeachers();

  // State
  const [selectedClass, setSelectedClass] = useState<ClassLevel>(ClassLevel.P7);
  const [selectedStream, setSelectedStream] = useState<string>('ALL');
  const [selectedTerm, setSelectedTerm] = useState(1);
  // AssessmentType is a string enum, so we can use 'BOTH' as a value if we type it correctly or cast
  const [selectedType, setSelectedType] = useState<AssessmentType | 'BOTH'>('BOTH');
  const [generating, setGenerating] = useState(false);

  const analyzing = studentsLoading || marksLoading || settingsLoading || teachersLoading;

  // Effects
  useEffect(() => {
    if (settings && selectedTerm === 1) {
      setSelectedTerm(settings.currentTerm);
    }
  }, [settings]);

  useEffect(() => {
    setSelectedStream('ALL');
  }, [selectedClass]);

  // Data Processing
  const subjects = ['P1', 'P2', 'P3'].includes(selectedClass) ? SUBJECTS_LOWER : SUBJECTS_UPPER;
  const subjectShortNames: { [key: string]: string } = {
    'english': 'ENG',
    'maths': 'MTC',
    'science': 'SCI',
    'sst': 'SST',
    'literacy1': 'LIT1',
    'literacy2': 'LIT2'
  };

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

  const filteredData = useMemo(() => {
    if (!allStudents || !allMarks || !settings) return [];

    let classStudents = allStudents.filter(s => s.classLevel === selectedClass);
    if (selectedStream !== 'ALL') {
      classStudents = classStudents.filter(s => s.stream === selectedStream);
    }

    const year = settings.currentYear || new Date().getFullYear();
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
  }, [allStudents, allMarks, settings, selectedClass, selectedStream, selectedTerm, selectedType, subjects]);

  const stats = useMemo(() => {
    if (!filteredData.length || !settings) return null;

    const data = filteredData;
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
      if (genderStats[g]) {
        genderStats[g].total++;
        if (d.aggregate > 0) {
          genderStats[g].aggSum += d.aggregate;
          genderStats[g].count++;
        }
      }
    });

    const subjectStats = subjects.map(sub => {
      const scores = data.map(d => (d.marks as any)[sub]).filter(m => m !== undefined && m !== null);
      const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const grade = calculateGrade(Math.round(avg), settings.gradingConfig).grade;
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

    return {
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
    };
  }, [filteredData, settings, subjects]);

  // Handlers
  const handleGenerate = async () => {
    if (!settings || !allStudents || !allMarks) return;
    setGenerating(true);
    // Add small delay to let UI update
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      await generateAssessmentPDF(
        allStudents,
        allMarks,
        settings,
        selectedClass,
        selectedStream,
        selectedTerm,
        selectedType,
        teachers,
        subjects
      );
    } catch (error) {
      console.error("Error generating sheet:", error);
      alert("Failed to generate assessment sheet.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCSV = () => {
    downloadAssessmentCSV(filteredData, subjects, selectedClass, selectedStream, selectedTerm, selectedType);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Assessment Sheets & Analytics</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Generate assessment reports and analyze class performance</p>
        </div>
      </div>

      <AssessmentFilters
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        selectedStream={selectedStream}
        setSelectedStream={setSelectedStream}
        selectedTerm={selectedTerm}
        setSelectedTerm={setSelectedTerm}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        settings={settings || null}
        generating={generating}
        onGenerate={handleGenerate}
        onDownloadCSV={handleDownloadCSV}
        classTeacher={classTeacher}
      />

      <AssessmentStats
        stats={stats}
        analyzing={analyzing}
        isDark={isDark}
      />

      {stats && stats.totalStudents > 0 && (
        <div className={`text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-4`}>
          Analysis based on {stats.totalStudents} records for {getDisplayName(selectedClass)} {selectedStream !== 'ALL' ? selectedStream : ''} - {selectedType === 'BOTH' ? 'End of Term' : (selectedType === 'BOT' ? 'Beginning of Term' : 'End of Term')}.
        </div>
      )}
    </div>
  );
};
