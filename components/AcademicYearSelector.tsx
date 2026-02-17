import React, { useState, useRef, useEffect } from 'react';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { Calendar, ChevronDown, Lock } from 'lucide-react';

export const AcademicYearSelector: React.FC = () => {
  const { selectedYear, setSelectedYear, currentYear, archivedYears, isArchiveMode, loading } = useAcademicYear();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading || archivedYears.length === 0) {
    return null;
  }

  const allYears = [currentYear, ...archivedYears].sort((a, b) => b - a);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
          isArchiveMode
            ? 'border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <Calendar className={`w-4 h-4 ${isArchiveMode ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`} />
        <span className={`text-sm font-medium ${isArchiveMode ? 'text-amber-700 dark:text-amber-300' : 'text-gray-700 dark:text-gray-300'}`}>
          {selectedYear}
        </span>
        {isArchiveMode && (
          <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400" />
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="py-1">
            {allYears.map((year) => {
              const isCurrent = year === currentYear;
              const isSelected = year === selectedYear;
              return (
                <button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${isSelected ? 'text-primary-500' : 'text-gray-400'}`} />
                    {year}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {isCurrent && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                        Current
                      </span>
                    )}
                    {!isCurrent && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        Archive
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
