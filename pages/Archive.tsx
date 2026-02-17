import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { apiRequest } from '../services/api';
import { Archive, Users, BookOpen, Calendar, ArrowRight } from 'lucide-react';

interface ArchiveSummary {
  year: number;
  studentCount: number;
  marksEntries: number;
  feesCollected: number;
}

export const ArchivePage: React.FC = () => {
  const { currentYear, archivedYears, setSelectedYear, loading: yearsLoading } = useAcademicYear();
  const [summaries, setSummaries] = useState<Record<number, ArchiveSummary>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSummaries = async () => {
      if (archivedYears.length === 0) return;
      setLoading(true);
      try {
        const results: Record<number, ArchiveSummary> = {};
        for (const year of archivedYears) {
          try {
            const data = await apiRequest<ArchiveSummary>('GET', `/archive/summary?year=${year}`);
            results[year] = data;
          } catch {
            results[year] = { year, studentCount: 0, marksEntries: 0, feesCollected: 0 };
          }
        }
        setSummaries(results);
      } finally {
        setLoading(false);
      }
    };
    fetchSummaries();
  }, [archivedYears]);

  if (yearsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (archivedYears.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archive</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View historical data from previous academic years</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Archive className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Archives Yet</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Archives are created automatically when the academic year changes. The current year is {currentYear}.
            When you advance to the next year in Settings, all {currentYear} data will be archived here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archive</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">View historical data from previous academic years</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {archivedYears.sort((a, b) => b - a).map((year) => {
          const summary = summaries[year];
          return (
            <div
              key={year}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{year}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Academic Year</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : summary ? (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Users className="w-4 h-4" /> Students
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{summary.studentCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <BookOpen className="w-4 h-4" /> Marks Entries
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{summary.marksEntries.toLocaleString()}</span>
                  </div>
                </div>
              ) : null}

              <button
                onClick={() => setSelectedYear(year)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors text-sm font-medium"
              >
                View {year} Data
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
