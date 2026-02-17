import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../services/api';

interface AcademicYearContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  currentYear: number;
  archivedYears: number[];
  isArchiveMode: boolean;
  loading: boolean;
  refreshYears: () => Promise<void>;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

export const AcademicYearProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [archivedYears, setArchivedYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [loading, setLoading] = useState(true);

  const fetchYears = useCallback(async () => {
    try {
      const data = await apiRequest<{ currentYear: number; archivedYears: number[] }>('GET', '/archive/years');
      setCurrentYear(data.currentYear);
      setArchivedYears(data.archivedYears || []);
      // Only reset selected year if it was pointing to the old current year
      setSelectedYear(prev => {
        // If user hadn't explicitly picked an archive year, track current
        if (prev === currentYear || prev === data.currentYear) return data.currentYear;
        return prev;
      });
    } catch {
      // If endpoint fails (no school selected), use defaults
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const isArchiveMode = selectedYear !== currentYear;

  return (
    <AcademicYearContext.Provider value={{
      selectedYear,
      setSelectedYear,
      currentYear,
      archivedYears,
      isArchiveMode,
      loading,
      refreshYears: fetchYears,
    }}>
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => {
  const context = useContext(AcademicYearContext);
  if (!context) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
};
