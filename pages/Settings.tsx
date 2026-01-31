import React, { useState, useEffect } from 'react';
import { dbService } from '../services/api';
import { SchoolSettings } from '../types';
import { useAuth } from '../hooks/use-auth';
import { useTheme } from '../contexts/ThemeContext';
import { SettingsLayout } from './settings/SettingsLayout';
import { GeneralSettings } from './settings/GeneralSettings';
import { AcademicSettings } from './settings/AcademicSettings';
import { GradingSettings } from './settings/GradingSettings';
import { ReportsSettings } from './settings/ReportsSettings';
import { UserManagementSettings } from './settings/UserManagementSettings';
import { SecuritySettings } from './settings/SecuritySettings';
import { DataManagementSettings } from './settings/DataManagementSettings';

export const Settings: React.FC = () => {
  const { user, activeSchool } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const defaultGradingConfig = {
    grades: [
      { grade: "D1", minScore: 90, maxScore: 100, points: 1 },
      { grade: "D2", minScore: 80, maxScore: 89, points: 2 },
      { grade: "C3", minScore: 70, maxScore: 79, points: 3 },
      { grade: "C4", minScore: 60, maxScore: 69, points: 4 },
      { grade: "C5", minScore: 55, maxScore: 59, points: 5 },
      { grade: "C6", minScore: 50, maxScore: 54, points: 6 },
      { grade: "P7", minScore: 45, maxScore: 49, points: 7 },
      { grade: "P8", minScore: 40, maxScore: 44, points: 8 },
      { grade: "F9", minScore: 0, maxScore: 39, points: 9 },
    ],
    divisions: [
      { division: "I", minAggregate: 4, maxAggregate: 12 },
      { division: "II", minAggregate: 13, maxAggregate: 24 },
      { division: "III", minAggregate: 25, maxAggregate: 28 },
      { division: "IV", minAggregate: 29, maxAggregate: 32 },
      { division: "U", minAggregate: 33, maxAggregate: 36 },
    ],
    passingMark: 40,
  };

  useEffect(() => {
    const fetchSettings = async () => {
      // Fallback to first school if activeSchool is missing, though useAuth usually handles this
      const targetSchoolId = activeSchool?.id || user?.schools?.[0]?.id;

      if (!targetSchoolId) {
        setLoading(false);
        return;
      }

      try {
        const data = await dbService.getSchoolSettings(targetSchoolId);
        // Ensure grading config has defaults if missing
        setSettings({
          ...data,
          gradingConfig: data.gradingConfig || defaultGradingConfig
        });
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        showToast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSettings();
    }
  }, [user, activeSchool]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateSettings = async (updates: Partial<SchoolSettings>) => {
    if (!settings) return;

    // Optimistic update
    const updatedSettings = { ...settings, ...updates };
    setSettings(updatedSettings);

    // Debounce actual save could be good, but for now we save directly or assume child components triggered this
    setSaving(true);
    try {
      await dbService.updateSchoolSettings(settings.id, updates);
      showToast('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to update settings:', error);
      showToast('Failed to save settings', 'error');
      // Revert on failure request? For now simple notice.
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
      </div>
    );
  }

  if (!settings && !loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load settings. Please try refreshing.</p>
      </div>
    );
  }

  // Helper to render content based on active tab
  const renderContent = () => {
    if (!settings) return null;

    switch (activeTab) {
      case 'general':
        return <GeneralSettings settings={settings} onUpdate={handleUpdateSettings} />;
      case 'academic':
        return <AcademicSettings settings={settings} onUpdate={handleUpdateSettings} />;
      case 'grading':
        return <GradingSettings settings={settings} onUpdate={handleUpdateSettings} />;
      case 'reports':
        return <ReportsSettings settings={settings} onUpdate={handleUpdateSettings} />;
      case 'users':
        return <UserManagementSettings />;
      case 'security':
        return <SecuritySettings settings={settings} onUpdate={handleUpdateSettings} />;
      case 'data':
        return <DataManagementSettings />;
      default:
        return <div>Select a setting to view</div>;
    }
  };

  return (
    <>
      <SettingsLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole={user?.role} // Assuming user object has role
      >
        {renderContent()}
      </SettingsLayout>

      {/* Global Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
};
