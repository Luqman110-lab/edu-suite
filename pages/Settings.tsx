import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/api';
import { SchoolSettings, ClassLevel } from '../types';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/use-auth';
import { useTheme } from '../contexts/ThemeContext';

type TabType = 'general' | 'academic' | 'grading' | 'security' | 'users' | 'reports' | 'data';

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  createdAt?: string;
}

interface ActivityLog {
  id: number;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

interface School {
  id: number;
  name: string;
  code: string;
  addressBox?: string;
  contactPhones?: string;
  email?: string;
  motto?: string;
  regNumber?: string;
  centreNumber?: string;
  primaryColor?: string;
  secondaryColor?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface UserSchoolAssignment {
  schoolId: number;
  schoolName: string;
  schoolCode: string;
  role: string;
  isPrimary: boolean;
  isActive: boolean;
}

const TabButton = ({ active, onClick, children, icon, isDark }: { active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode; isDark: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${active
      ? isDark
        ? 'border-primary-500 text-primary-400 bg-primary-900/30'
        : 'border-primary-600 text-primary-700 bg-primary-50'
      : isDark
        ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
  >
    {icon}
    <span className="hidden sm:inline">{children}</span>
  </button>
);

const Card = ({ title, description, children, isDark }: { title: string; description?: string; children: React.ReactNode; isDark: boolean }) => (
  <div className={`shadow-soft rounded-2xl overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
    <div className={`px-6 py-4 border-b ${isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      {description && <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
  <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${type === 'success' ? 'bg-success-500 text-white' : 'bg-danger-500 text-white'
    }`}>
    <span>{message}</span>
    <button onClick={onClose} className="hover:opacity-70">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
);

export const Settings: React.FC = () => {
  const { user, activeSchool } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);

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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [newStreams, setNewStreams] = useState<{ [key: string]: string }>({});
  const [editingStream, setEditingStream] = useState<{ class: string, old: string, new: string } | null>(null);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', name: '', role: 'teacher', email: '', phone: '' });
  const [resetPasswordModal, setResetPasswordModal] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeFile, setMergeFile] = useState<File | null>(null);
  const [mergeOptions, setMergeOptions] = useState({
    updateStudentNames: true,
    addNewStudents: true,
    addNewTeachers: true,
    skipMarks: true
  });
  const [mergeStats, setMergeStats] = useState<{
    studentsAdded: number;
    studentsUpdated: number;
    teachersAdded: number;
    marksAdded: number;
    skipped: number;
  } | null>(null);



  const [showUserSchoolsModal, setShowUserSchoolsModal] = useState(false);
  const [selectedUserForSchools, setSelectedUserForSchools] = useState<User | null>(null);
  const [userSchoolAssignments, setUserSchoolAssignments] = useState<UserSchoolAssignment[]>([]);
  const [loadingUserSchools, setLoadingUserSchools] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, [activeSchool?.id]);

  useEffect(() => {
    if (activeTab === 'users' && user?.role === 'admin') {
      loadUsers();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === 'security' && user?.role === 'admin') {
      loadActivityLogs();
    }
  }, [activeTab, user]);



  const loadSettings = async () => {
    const s = await dbService.getSettings();
    setSettings(s);
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadActivityLogs = async () => {
    try {
      const response = await fetch('/api/activity-logs?limit=20', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data);
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    }
  };



  const loadUserSchoolAssignments = async (userId: number) => {
    setLoadingUserSchools(true);
    try {
      const response = await fetch(`/api/users/${userId}/schools`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUserSchoolAssignments(data);
      }
    } catch (err) {
      console.error('Failed to load user school assignments:', err);
    } finally {
      setLoadingUserSchools(false);
    }
  };

  const openUserSchoolsModal = async (u: User) => {
    setSelectedUserForSchools(u);
    setShowUserSchoolsModal(true);
    await loadUserSchoolAssignments(u.id);
  };

  const handleUpdateUserSchoolRole = async (schoolId: number, newRole: string) => {
    if (!selectedUserForSchools) return;

    try {
      const response = await fetch(`/api/users/${selectedUserForSchools.id}/schools/${schoolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        showToast('Role updated successfully', 'success');
        await loadUserSchoolAssignments(selectedUserForSchools.id);
        loadUsers();
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to update role', 'error');
      }
    } catch (err) {
      showToast('Failed to update role', 'error');
    }
  };

  const handleRemoveUserFromSchool = async (schoolId: number) => {
    if (!selectedUserForSchools) return;

    if (!window.confirm(`Remove ${selectedUserForSchools.name} from this school? If this is their only school, the user account will be deleted.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUserForSchools.id}/schools/${schoolId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        showToast('User removed from school', 'success');
        if (userSchoolAssignments.length <= 1) {
          setShowUserSchoolsModal(false);
          setSelectedUserForSchools(null);
        } else {
          await loadUserSchoolAssignments(selectedUserForSchools.id);
        }
        loadUsers();
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to remove user', 'error');
      }
    } catch (err) {
      showToast('Failed to remove user from school', 'error');
    }
  };



  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSettingsChange = (updates: Partial<SchoolSettings>) => {
    setSettings(prev => prev ? { ...prev, ...updates } : null);
    setHasChanges(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      await dbService.saveSettings(settings);
      showToast('Settings saved successfully!', 'success');
      setHasChanges(false);
    } catch (err) {
      showToast('Error saving settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        handleSettingsChange({ logoBase64: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    dbService.exportData();
    showToast('Backup downloaded successfully!', 'success');
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm("WARNING: Restoring data will OVERWRITE all current data. Are you sure?")) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          await dbService.importData(ev.target?.result as string);
          showToast('Data restored successfully!', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
          showToast('Failed to restore data.', 'error');
        }
      };
      reader.readAsText(file);
    }
    if (restoreInputRef.current) restoreInputRef.current.value = '';
  };

  const handleMergeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMergeFile(file);
      setMergeStats(null);
      setShowMergeModal(true);
    }
    if (mergeInputRef.current) mergeInputRef.current.value = '';
  };

  const handleMerge = async () => {
    if (!mergeFile) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const stats = await dbService.mergeData(ev.target?.result as string, mergeOptions);
        setMergeStats(stats);
        showToast(`Merge complete! Added ${stats.studentsAdded} students, updated ${stats.studentsUpdated}.`, 'success');
      } catch (err) {
        showToast('Failed to merge data. Please check the file format.', 'error');
        setShowMergeModal(false);
      }
    };
    reader.readAsText(mergeFile);
  };

  const closeMergeModal = () => {
    setShowMergeModal(false);
    setMergeFile(null);
    setMergeStats(null);
    if (mergeStats && (mergeStats.studentsAdded > 0 || mergeStats.studentsUpdated > 0 || mergeStats.teachersAdded > 0)) {
      window.location.reload();
    }
  };

  const handleDeleteAllData = async () => {
    const firstConfirm = window.confirm(
      "WARNING: This will permanently delete ALL students, teachers, and marks data. This action CANNOT be undone!\n\nAre you sure you want to continue?"
    );

    if (!firstConfirm) return;

    const secondConfirm = window.prompt(
      'Type "DELETE ALL" to confirm you want to permanently remove all data:'
    );

    if (secondConfirm !== "DELETE ALL") {
      showToast('Deletion cancelled - confirmation text did not match', 'error');
      return;
    }

    try {
      const response = await fetch('/api/all-data', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        showToast('All data has been deleted successfully', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to delete data', 'error');
      }
    } catch (err) {
      showToast('Failed to delete data', 'error');
    }
  };

  const addStream = async (classLevel: string) => {
    const val = newStreams[classLevel];
    if (val && val.trim()) {
      const streamName = val.trim();
      if (settings?.streams[classLevel]?.includes(streamName)) {
        showToast("Stream already exists", 'error');
        return;
      }
      await dbService.addStream(classLevel, streamName);
      setNewStreams(prev => ({ ...prev, [classLevel]: '' }));
      loadSettings();
      showToast('Stream added!', 'success');
    }
  };

  const removeStream = async (classLevel: string, streamToRemove: string) => {
    if (window.confirm(`Remove '${streamToRemove}' from ${classLevel}?`)) {
      await dbService.removeStream(classLevel, streamToRemove);
      loadSettings();
      showToast('Stream removed!', 'success');
    }
  };

  const saveEditedStream = async () => {
    if (editingStream && editingStream.new.trim()) {
      if (editingStream.new !== editingStream.old) {
        await dbService.renameStream(editingStream.class, editingStream.old, editingStream.new.trim());
        loadSettings();
        showToast('Stream renamed!', 'success');
      }
      setEditingStream(null);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userForm),
      });
      if (response.ok) {
        showToast('User created successfully!', 'success');
        setShowUserModal(false);
        setUserForm({ username: '', password: '', name: '', role: 'teacher', email: '', phone: '' });
        loadUsers();
        loadActivityLogs();
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to create user', 'error');
      }
    } catch (err) {
      showToast('Failed to create user', 'error');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(userForm),
      });
      if (response.ok) {
        showToast('User updated successfully!', 'success');
        setEditingUser(null);
        setShowUserModal(false);
        loadUsers();
        loadActivityLogs();
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to update user', 'error');
      }
    } catch (err) {
      showToast('Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        showToast('User deleted!', 'success');
        loadUsers();
        loadActivityLogs();
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to delete user', 'error');
      }
    } catch (err) {
      showToast('Failed to delete user', 'error');
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordModal || !newPassword) return;
    try {
      const response = await fetch(`/api/users/${resetPasswordModal.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });
      if (response.ok) {
        showToast('Password reset successfully!', 'success');
        setResetPasswordModal(null);
        setNewPassword('');
        loadActivityLogs();
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to reset password', 'error');
      }
    } catch (err) {
      showToast('Failed to reset password', 'error');
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const inputClasses = `mt-1 block w-full rounded-xl border px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none sm:text-sm transition-all duration-200 ${isDark
    ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600'
    : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white'
    }`;

  const labelClasses = `block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

  const tabs = [
    { id: 'general' as TabType, label: 'General', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
    { id: 'academic' as TabType, label: 'Academic', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    { id: 'grading' as TabType, label: 'Grading', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { id: 'reports' as TabType, label: 'Reports', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    ...(user?.role === 'admin' ? [{ id: 'security' as TabType, label: 'Security', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> }] : []),
    ...(user?.role === 'admin' ? [{ id: 'users' as TabType, label: 'Users', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> }] : []),

    { id: 'data' as TabType, label: 'Data', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg> },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Settings</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage your school configuration and preferences</p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-warning-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></span>
              Unsaved changes
            </span>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      <div className={`rounded-2xl shadow-soft border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className={`border-b overflow-x-auto ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex min-w-max">
            {tabs.map(tab => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                icon={tab.icon}
                isDark={isDark}
              >
                {tab.label}
              </TabButton>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <Card title="School Profile" description="Information displayed on report card headers" isDark={isDark}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClasses}>School Name</label>
                    <input
                      type="text"
                      className={inputClasses}
                      value={settings.schoolName}
                      onChange={e => handleSettingsChange({ schoolName: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClasses}>Address / P.O Box</label>
                    <input
                      type="text"
                      className={inputClasses}
                      value={settings.addressBox}
                      onChange={e => handleSettingsChange({ addressBox: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Contact Phones</label>
                    <input
                      type="text"
                      className={inputClasses}
                      value={settings.contactPhones}
                      onChange={e => handleSettingsChange({ contactPhones: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Motto</label>
                    <input
                      type="text"
                      className={inputClasses}
                      value={settings.motto}
                      onChange={e => handleSettingsChange({ motto: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Registration Number</label>
                    <input
                      type="text"
                      className={inputClasses}
                      value={settings.regNumber}
                      onChange={e => handleSettingsChange({ regNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Centre Number</label>
                    <input
                      type="text"
                      className={inputClasses}
                      value={settings.centreNumber}
                      onChange={e => handleSettingsChange({ centreNumber: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              <Card title="School Logo" description="Upload a badge to appear on reports" isDark={isDark}>
                <div className="flex items-center gap-6">
                  <div className={`flex-shrink-0 h-24 w-24 rounded-2xl flex items-center justify-center overflow-hidden border-2 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
                    {settings.logoBase64 ? (
                      <img src={settings.logoBase64} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className={`text-xs text-center ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>No Logo</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold ${isDark ? 'text-gray-400 file:bg-primary-900 file:text-primary-300 hover:file:bg-primary-800' : 'text-gray-500 file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100'}`}
                      onChange={handleLogoUpload}
                    />
                    {settings.logoBase64 && (
                      <button
                        type="button"
                        onClick={() => handleSettingsChange({ logoBase64: undefined })}
                        className="text-danger-600 text-sm hover:underline"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-6">
              <Card title="Current Academic Period" description="Set the current term and year" isDark={isDark}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>Current Term</label>
                    <select
                      className={inputClasses}
                      value={settings.currentTerm}
                      onChange={e => handleSettingsChange({ currentTerm: Number(e.target.value) })}
                    >
                      <option value={1}>Term 1</option>
                      <option value={2}>Term 2</option>
                      <option value={3}>Term 3</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>Current Year</label>
                    <input
                      type="number"
                      className={inputClasses}
                      value={settings.currentYear}
                      onChange={e => handleSettingsChange({ currentYear: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Boarders Start Date</label>
                    <input
                      type="date"
                      className={inputClasses}
                      value={settings.nextTermBeginBoarders}
                      onChange={e => handleSettingsChange({ nextTermBeginBoarders: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Day Scholars Start Date</label>
                    <input
                      type="date"
                      className={inputClasses}
                      value={settings.nextTermBeginDay}
                      onChange={e => handleSettingsChange({ nextTermBeginDay: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              <Card title="Class Streams" description="Define streams for each class level" isDark={isDark}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Object.values(ClassLevel).map((level) => (
                    <div key={level} className={`p-4 rounded-xl border ${isDark ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className={`font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{level}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'text-gray-400 bg-gray-700' : 'text-gray-500 bg-white'}`}>
                          {settings.streams[level]?.length || 0}
                        </span>
                      </div>

                      <div className="space-y-2 mb-3">
                        {(settings.streams[level] || []).map(stream => (
                          <div key={stream} className={`flex items-center justify-between group p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                            {editingStream?.class === level && editingStream.old === stream ? (
                              <div className="flex items-center gap-1 w-full">
                                <input
                                  type="text"
                                  className={`flex-1 px-2 py-1 text-xs border rounded focus:outline-none ${isDark ? 'border-primary-500 bg-gray-600 text-white' : 'border-primary-300 bg-white text-gray-900'}`}
                                  value={editingStream.new}
                                  onChange={e => setEditingStream({ ...editingStream, new: e.target.value })}
                                  autoFocus
                                  onKeyDown={e => e.key === 'Enter' && saveEditedStream()}
                                />
                                <button type="button" onClick={saveEditedStream} className="text-success-600 p-1">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{stream}</span>
                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button type="button" onClick={() => setEditingStream({ class: level, old: stream, new: stream })} className={`p-1 ${isDark ? 'text-gray-500 hover:text-primary-400' : 'text-gray-400 hover:text-primary-600'}`}>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                  </button>
                                  <button type="button" onClick={() => removeStream(level, stream)} className={`p-1 ${isDark ? 'text-gray-500 hover:text-danger-400' : 'text-gray-400 hover:text-danger-600'}`}>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="New stream..."
                          className={`flex-1 px-3 py-1.5 text-xs border rounded-lg focus:outline-none ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-primary-500' : 'border-gray-200 bg-white text-gray-900 focus:border-primary-400'}`}
                          value={newStreams[level] || ''}
                          onChange={e => setNewStreams(prev => ({ ...prev, [level]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addStream(level)}
                        />
                        <Button type="button" size="sm" variant="secondary" onClick={() => addStream(level)}>+</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'grading' && (
            <div className="space-y-6">
              <Card title="Grading Scale Presets" description="Choose a preset or customize your grading system" isDark={isDark}>
                <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      handleSettingsChange({
                        gradingConfig: {
                          ...settings.gradingConfig!,
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
                        }
                      });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                  >
                    UNEB Standard (D1-F9)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSettingsChange({
                        gradingConfig: {
                          ...settings.gradingConfig!,
                          grades: [
                            { grade: "A", minScore: 80, maxScore: 100, points: 1 },
                            { grade: "B", minScore: 65, maxScore: 79, points: 2 },
                            { grade: "C", minScore: 50, maxScore: 64, points: 3 },
                            { grade: "D", minScore: 40, maxScore: 49, points: 4 },
                            { grade: "F", minScore: 0, maxScore: 39, points: 5 },
                          ],
                          divisions: [
                            { division: "I", minAggregate: 4, maxAggregate: 8 },
                            { division: "II", minAggregate: 9, maxAggregate: 12 },
                            { division: "III", minAggregate: 13, maxAggregate: 16 },
                            { division: "IV", minAggregate: 17, maxAggregate: 20 },
                            { division: "U", minAggregate: 21, maxAggregate: 25 },
                          ],
                          passingMark: 40,
                        }
                      });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                  >
                    Letter Grades (A-F)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSettingsChange({
                        gradingConfig: {
                          ...settings.gradingConfig!,
                          grades: [
                            { grade: "A+", minScore: 90, maxScore: 100, points: 1 },
                            { grade: "A", minScore: 80, maxScore: 89, points: 2 },
                            { grade: "B+", minScore: 70, maxScore: 79, points: 3 },
                            { grade: "B", minScore: 60, maxScore: 69, points: 4 },
                            { grade: "C+", minScore: 55, maxScore: 59, points: 5 },
                            { grade: "C", minScore: 50, maxScore: 54, points: 6 },
                            { grade: "D", minScore: 40, maxScore: 49, points: 7 },
                            { grade: "F", minScore: 0, maxScore: 39, points: 8 },
                          ],
                          divisions: [
                            { division: "I", minAggregate: 4, maxAggregate: 12 },
                            { division: "II", minAggregate: 13, maxAggregate: 20 },
                            { division: "III", minAggregate: 21, maxAggregate: 28 },
                            { division: "IV", minAggregate: 29, maxAggregate: 32 },
                            { division: "U", minAggregate: 33, maxAggregate: 40 },
                          ],
                          passingMark: 40,
                        }
                      });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                  >
                    Extended Letter (A+ to F)
                  </button>
                </div>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Click a preset to apply it, or edit the grades below to customize.</p>
              </Card>

              <Card title="Grade Boundaries" description="Define your custom grading scale" isDark={isDark}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
                        <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Grade</th>
                        <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Min %</th>
                        <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Max %</th>
                        <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Points</th>
                        <th className={`px-4 py-2 text-center font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(settings.gradingConfig?.grades || []).map((grade, idx) => (
                        <tr key={idx} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              className={`w-16 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              value={grade.grade}
                              onChange={e => {
                                const newGrades = [...(settings?.gradingConfig?.grades || [])];
                                newGrades[idx] = { ...newGrades[idx], grade: e.target.value };
                                handleSettingsChange({ gradingConfig: { ...(settings?.gradingConfig || defaultGradingConfig), grades: newGrades } });
                              }}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className={`w-16 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              value={grade.minScore}
                              onChange={e => {
                                const newGrades = [...(settings?.gradingConfig?.grades || [])];
                                newGrades[idx] = { ...newGrades[idx], minScore: Number(e.target.value) };
                                handleSettingsChange({ gradingConfig: { ...(settings?.gradingConfig || defaultGradingConfig), grades: newGrades } });
                              }}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className={`w-16 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              value={grade.maxScore}
                              onChange={e => {
                                const newGrades = [...(settings?.gradingConfig?.grades || [])];
                                newGrades[idx] = { ...newGrades[idx], maxScore: Number(e.target.value) };
                                handleSettingsChange({ gradingConfig: { ...(settings?.gradingConfig || defaultGradingConfig), grades: newGrades } });
                              }}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="1"
                              className={`w-16 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              value={grade.points}
                              onChange={e => {
                                const newGrades = [...(settings?.gradingConfig?.grades || [])];
                                newGrades[idx] = { ...newGrades[idx], points: Number(e.target.value) };
                                handleSettingsChange({ gradingConfig: { ...(settings?.gradingConfig || defaultGradingConfig), grades: newGrades } });
                              }}
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const newGrades = settings?.gradingConfig?.grades?.filter((_, i) => i !== idx) || [];
                                handleSettingsChange({ gradingConfig: { ...(settings?.gradingConfig || defaultGradingConfig), grades: newGrades } });
                              }}
                              className={`p-1 rounded hover:bg-red-100 ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600'}`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newGrades = [...(settings.gradingConfig?.grades || []), { grade: "NEW", minScore: 0, maxScore: 0, points: 1 }];
                    handleSettingsChange({ gradingConfig: { ...settings.gradingConfig!, grades: newGrades } });
                  }}
                  className={`mt-4 px-4 py-2 text-sm font-medium rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  + Add Grade
                </button>
              </Card>

              <Card title="Division Configuration" description="Configure aggregate-to-division mapping" isDark={isDark}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
                        <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Division</th>
                        <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Min Aggregate</th>
                        <th className={`px-4 py-2 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Max Aggregate</th>
                        <th className={`px-4 py-2 text-center font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(settings.gradingConfig?.divisions || []).map((div, idx) => (
                        <tr key={idx} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              className={`w-20 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              value={div.division}
                              onChange={e => {
                                const newDivisions = [...(settings.gradingConfig?.divisions || [])];
                                newDivisions[idx] = { ...newDivisions[idx], division: e.target.value };
                                handleSettingsChange({ gradingConfig: { ...settings.gradingConfig!, divisions: newDivisions } });
                              }}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              className={`w-20 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              value={div.minAggregate}
                              onChange={e => {
                                const newDivisions = [...(settings.gradingConfig?.divisions || [])];
                                newDivisions[idx] = { ...newDivisions[idx], minAggregate: Number(e.target.value) };
                                handleSettingsChange({ gradingConfig: { ...settings.gradingConfig!, divisions: newDivisions } });
                              }}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              className={`w-20 px-2 py-1 text-sm rounded border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              value={div.maxAggregate}
                              onChange={e => {
                                const newDivisions = [...(settings.gradingConfig?.divisions || [])];
                                newDivisions[idx] = { ...newDivisions[idx], maxAggregate: Number(e.target.value) };
                                handleSettingsChange({ gradingConfig: { ...settings.gradingConfig!, divisions: newDivisions } });
                              }}
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const newDivisions = settings.gradingConfig?.divisions.filter((_, i) => i !== idx) || [];
                                handleSettingsChange({ gradingConfig: { ...settings.gradingConfig!, divisions: newDivisions } });
                              }}
                              className={`p-1 rounded hover:bg-red-100 ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600'}`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newDivisions = [...(settings.gradingConfig?.divisions || []), { division: "NEW", minAggregate: 0, maxAggregate: 0 }];
                    handleSettingsChange({ gradingConfig: { ...settings.gradingConfig!, divisions: newDivisions } });
                  }}
                  className={`mt-4 px-4 py-2 text-sm font-medium rounded-lg border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  + Add Division
                </button>
              </Card>

              <Card title="Passing Mark" description="Minimum score required to pass" isDark={isDark}>
                <div className="flex items-center gap-4">
                  <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Passing Mark:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={`w-24 px-3 py-2 text-sm rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                    value={settings.gradingConfig?.passingMark || 40}
                    onChange={e => handleSettingsChange({ gradingConfig: { ...settings.gradingConfig!, passingMark: Number(e.target.value) } })}
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>%</span>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <Card title="Report Card Settings" description="Configure report card appearance and fields" isDark={isDark}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>Headteacher Name</label>
                    <input
                      type="text"
                      className={inputClasses}
                      value={settings.reportConfig?.headteacherName || ''}
                      onChange={e => handleSettingsChange({
                        reportConfig: { ...settings.reportConfig!, headteacherName: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Headteacher Title</label>
                    <input
                      type="text"
                      className={inputClasses}
                      value={settings.reportConfig?.headteacherTitle || 'Headteacher'}
                      onChange={e => handleSettingsChange({
                        reportConfig: { ...settings.reportConfig!, headteacherTitle: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600"
                      checked={settings.reportConfig?.showClassTeacherSignature ?? true}
                      onChange={e => handleSettingsChange({
                        reportConfig: { ...settings.reportConfig!, showClassTeacherSignature: e.target.checked }
                      })}
                    />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Show Class Teacher Signature Line</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600"
                      checked={settings.reportConfig?.showHeadteacherSignature ?? true}
                      onChange={e => handleSettingsChange({
                        reportConfig: { ...settings.reportConfig!, showHeadteacherSignature: e.target.checked }
                      })}
                    />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Show Headteacher Signature Line</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600"
                      checked={settings.reportConfig?.showParentSignature ?? true}
                      onChange={e => handleSettingsChange({
                        reportConfig: { ...settings.reportConfig!, showParentSignature: e.target.checked }
                      })}
                    />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Show Parent Signature Line</span>
                  </label>
                </div>
              </Card>

              <Card title="Comment Templates" description="Pre-defined comments for quick selection" isDark={isDark}>
                <div className="space-y-2">
                  {(settings.reportConfig?.commentTemplates || []).map((comment, idx) => (
                    <div key={idx} className={`flex items-center gap-2 p-3 rounded-lg ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                      <span className={`flex-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{comment}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'security' && user?.role === 'admin' && (() => {
            const defaultSecurityConfig = {
              passwordMinLength: 8,
              passwordRequireUppercase: true,
              passwordRequireLowercase: true,
              passwordRequireNumbers: true,
              passwordRequireSpecialChars: false,
              passwordExpiryDays: 0,
              sessionTimeoutMinutes: 60,
              maxLoginAttempts: 5,
              lockoutDurationMinutes: 15,
              require2FA: false,
              allowedIPAddresses: [] as string[],
              enforceIPWhitelist: false
            };
            const securityConfig = { ...defaultSecurityConfig, ...settings.securityConfig };
            const updateSecurityConfig = (updates: Partial<typeof defaultSecurityConfig>) => {
              handleSettingsChange({ securityConfig: { ...securityConfig, ...updates } });
            };
            return (
              <div className="space-y-6">
                <Card title="Password Policy" description="Define password requirements for all users" isDark={isDark}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClasses}>Minimum Password Length</label>
                      <input
                        type="number"
                        min="6"
                        max="32"
                        className={inputClasses}
                        value={securityConfig.passwordMinLength}
                        onChange={e => updateSecurityConfig({ passwordMinLength: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className={labelClasses}>Password Expiry (Days)</label>
                      <input
                        type="number"
                        min="0"
                        className={inputClasses}
                        value={securityConfig.passwordExpiryDays}
                        onChange={e => updateSecurityConfig({ passwordExpiryDays: Number(e.target.value) })}
                      />
                      <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Set to 0 for no expiry</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600"
                        checked={securityConfig.passwordRequireUppercase}
                        onChange={e => updateSecurityConfig({ passwordRequireUppercase: e.target.checked })}
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Require uppercase letters (A-Z)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600"
                        checked={securityConfig.passwordRequireLowercase}
                        onChange={e => updateSecurityConfig({ passwordRequireLowercase: e.target.checked })}
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Require lowercase letters (a-z)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600"
                        checked={securityConfig.passwordRequireNumbers}
                        onChange={e => updateSecurityConfig({ passwordRequireNumbers: e.target.checked })}
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Require numbers (0-9)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-primary-600"
                        checked={securityConfig.passwordRequireSpecialChars}
                        onChange={e => updateSecurityConfig({ passwordRequireSpecialChars: e.target.checked })}
                      />
                      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Require special characters (!@#$%^&*)</span>
                    </label>
                  </div>
                </Card>

                <Card title="Session & Login Settings" description="Control session timeouts and login attempts" isDark={isDark}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClasses}>Session Timeout (Minutes)</label>
                      <input
                        type="number"
                        min="5"
                        max="1440"
                        className={inputClasses}
                        value={securityConfig.sessionTimeoutMinutes}
                        onChange={e => updateSecurityConfig({ sessionTimeoutMinutes: Number(e.target.value) })}
                      />
                      <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Time before inactive users are logged out</p>
                    </div>
                    <div>
                      <label className={labelClasses}>Max Login Attempts</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        className={inputClasses}
                        value={securityConfig.maxLoginAttempts}
                        onChange={e => updateSecurityConfig({ maxLoginAttempts: Number(e.target.value) })}
                      />
                      <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Failed attempts before account lockout</p>
                    </div>
                    <div>
                      <label className={labelClasses}>Lockout Duration (Minutes)</label>
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        className={inputClasses}
                        value={securityConfig.lockoutDurationMinutes}
                        onChange={e => updateSecurityConfig({ lockoutDurationMinutes: Number(e.target.value) })}
                      />
                      <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Time before locked account can try again</p>
                    </div>
                  </div>
                </Card>

                <Card title="Two-Factor Authentication" description="Enhanced security with 2FA" isDark={isDark}>
                  <div className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}>
                    <div>
                      <h4 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Require Two-Factor Authentication</h4>
                      <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Require all admin users to use 2FA for login</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={securityConfig.require2FA}
                        onChange={e => updateSecurityConfig({ require2FA: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                    <p className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      <strong>Note:</strong> 2FA functionality will require users to set up an authenticator app. This feature is recommended for schools with sensitive data.
                    </p>
                  </div>
                </Card>

                <Card title="Activity Logs" description="Recent security-related activities" isDark={isDark}>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activityLogs.length === 0 ? (
                      <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No activity logs available</p>
                    ) : (
                      activityLogs.slice(0, 10).map((log) => (
                        <div key={log.id} className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <svg className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{log.action.replace(/_/g, ' ')}</p>
                            <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {log.performedBy} - {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            );
          })()}

          {activeTab === 'users' && user?.role === 'admin' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'} shadow-soft`}>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{users.length}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Users</p>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'} shadow-soft`}>
                  <p className={`text-2xl font-bold text-primary-500`}>{users.filter(u => u.role === 'admin').length}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Administrators</p>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'} shadow-soft`}>
                  <p className={`text-2xl font-bold text-secondary-500`}>{users.filter(u => u.role === 'teacher').length}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Teachers</p>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'} shadow-soft`}>
                  <p className={`text-2xl font-bold text-success-500`}>{activityLogs.length}</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Recent Activities</p>
                </div>
              </div>

              <Card title="User Management" description="Manage system users and their roles" isDark={isDark}>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      onClick={() => {
                        const csv = ['Name,Username,Role,Email,Phone'];
                        users.forEach(u => csv.push(`"${u.name}","${u.username}","${u.role}","${u.email || ''}","${u.phone || ''}"`));
                        const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast('Users exported to CSV', 'success');
                      }}
                    >
                      <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export CSV
                    </button>
                  </div>
                  <Button onClick={() => {
                    setEditingUser(null);
                    setUserForm({ username: '', password: '', name: '', role: 'teacher', email: '', phone: '' });
                    setShowUserModal(true);
                  }}>
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add User
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
                        <th className={`px-4 py-3 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Name</th>
                        <th className={`px-4 py-3 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Username</th>
                        <th className={`px-4 py-3 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Role</th>
                        <th className={`px-4 py-3 text-left font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Contact</th>
                        <th className={`px-4 py-3 text-right font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className={`border-b ${isDark ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-100 hover:bg-gray-50'}`}>
                          <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{u.name}</td>
                          <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{u.username}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin'
                              ? isDark ? 'bg-primary-900/50 text-primary-300' : 'bg-primary-100 text-primary-700'
                              : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                              }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{u.email || u.phone || '-'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setUserForm({ username: u.username, password: '', name: u.name, role: u.role, email: u.email || '', phone: u.phone || '' });
                                  setShowUserModal(true);
                                }}
                                className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setResetPasswordModal(u)}
                                className="text-warning-600 hover:text-warning-700 text-xs font-medium"
                              >
                                Reset Password
                              </button>
                              {user?.isSuperAdmin && (
                                <button
                                  onClick={() => openUserSchoolsModal(u)}
                                  className="text-secondary-600 hover:text-secondary-700 text-xs font-medium"
                                >
                                  Schools
                                </button>
                              )}
                              {u.id !== user?.id && (
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="text-danger-600 hover:text-danger-700 text-xs font-medium"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Activity Log" description="Recent system activity" isDark={isDark}>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {activityLogs.length === 0 ? (
                    <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No activity logged yet</p>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className={`flex items-start gap-3 p-3 rounded-lg ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-primary-900/50' : 'bg-primary-100'}`}>
                          <span className={`text-xs font-bold ${isDark ? 'text-primary-300' : 'text-primary-700'}`}>{log.userName.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                            <span className="font-medium">{log.userName}</span>
                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}> {log.action} </span>
                            <span className="font-medium">{log.entityType}</span>
                          </p>
                          {log.details && <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{log.details}</p>}
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date(log.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <Card title="Backup & Restore" description="Export or import your school data" isDark={isDark}>
                <div className="flex flex-wrap gap-4">
                  <Button variant="outline" onClick={handleExport}>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Backup
                  </Button>

                  <div className="relative">
                    <input
                      type="file"
                      ref={restoreInputRef}
                      onChange={handleRestore}
                      accept=".json"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Button variant="danger">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Restore from Backup
                    </Button>
                  </div>
                </div>
                <div className={`mt-4 p-4 rounded-xl border ${isDark ? 'bg-warning-900/20 border-warning-700' : 'bg-warning-50 border-warning-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-warning-300' : 'text-warning-800'}`}>
                    <strong>Warning:</strong> Restoring from a backup will replace all existing data. Make sure to download a backup of your current data first.
                  </p>
                </div>
              </Card>

              <Card title="Merge Data" description="Import data from another backup without losing your existing work" isDark={isDark}>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Use this option to combine data from a friend's backup with your existing data.
                  The merge will update student names and add new students without overwriting your marks.
                </p>
                <div className="relative inline-block">
                  <input
                    type="file"
                    ref={mergeInputRef}
                    onChange={handleMergeSelect}
                    accept=".json,application/json"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="primary">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Merge from Backup
                  </Button>
                </div>
                <div className={`mt-4 p-4 rounded-xl border ${isDark ? 'bg-primary-900/20 border-primary-700' : 'bg-primary-50 border-primary-200'}`}>
                  <p className={`text-sm ${isDark ? 'text-primary-300' : 'text-primary-800'}`}>
                    <strong>Safe merge:</strong> This will only add missing students and update names - your marks and existing data stay safe.
                  </p>
                </div>
              </Card>

              {user?.role === 'admin' && (
                <Card title="Danger Zone" description="Permanently delete all data from the system" isDark={isDark}>
                  <div className={`p-4 rounded-xl border mb-4 ${isDark ? 'bg-danger-900/20 border-danger-700' : 'bg-danger-50 border-danger-200'}`}>
                    <p className={`text-sm ${isDark ? 'text-danger-300' : 'text-danger-800'}`}>
                      <strong>Warning:</strong> This action will permanently delete ALL students, teachers, and marks data.
                      This cannot be undone. Make sure to download a backup first if you need to keep your data.
                    </p>
                  </div>
                  <Button variant="danger" onClick={handleDeleteAllData}>
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete All Data
                  </Button>
                </Card>
              )}
            </div>
          )}


        </div>
      </div>



      {showUserSchoolsModal && selectedUserForSchools && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-xl max-w-lg w-full ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                School Assignments - {selectedUserForSchools.name}
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Manage which schools this user can access and their role in each
              </p>
            </div>
            <div className="p-6">
              {loadingUserSchools ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                  <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</p>
                </div>
              ) : userSchoolAssignments.length === 0 ? (
                <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  No school assignments found
                </p>
              ) : (
                <div className="space-y-3">
                  {userSchoolAssignments.map((assignment) => (
                    <div
                      key={assignment.schoolId}
                      className={`flex items-center justify-between p-4 rounded-xl border ${assignment.isActive
                        ? isDark ? 'bg-gray-750 border-gray-700' : 'bg-gray-50 border-gray-200'
                        : isDark ? 'bg-gray-800/50 border-gray-700/50 opacity-60' : 'bg-gray-100/50 border-gray-200/50 opacity-60'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-primary-900/50' : 'bg-primary-100'}`}>
                          <svg className={`w-5 h-5 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m4 6 8-4 8 4M18 10l4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4" />
                          </svg>
                        </div>
                        <div>
                          <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {assignment.schoolName}
                            {!assignment.isActive && (
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                                Inactive
                              </span>
                            )}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {assignment.schoolCode}
                            {assignment.isPrimary && (
                              <span className={`ml-2 text-primary-500`}>Primary</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={assignment.role}
                          onChange={(e) => handleUpdateUserSchoolRole(assignment.schoolId, e.target.value)}
                          className={`px-3 py-1.5 text-sm rounded-lg border ${isDark
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                            }`}
                        >
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemoveUserFromSchool(assignment.schoolId)}
                          className={`p-1.5 rounded-lg hover:bg-danger-100 dark:hover:bg-danger-900/30 text-danger-500`}
                          title="Remove from school"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={`px-6 py-4 border-t flex justify-end ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <Button variant="secondary" onClick={() => {
                setShowUserSchoolsModal(false);
                setSelectedUserForSchools(null);
                setUserSchoolAssignments([]);
              }}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-xl max-w-md w-full ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {!editingUser && (
                <div>
                  <label className={`${labelClasses} mb-1`}>Username</label>
                  <input
                    type="text"
                    className={inputClasses}
                    value={userForm.username}
                    onChange={e => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>
              )}
              {!editingUser && (
                <div>
                  <label className={`${labelClasses} mb-1`}>Password</label>
                  <input
                    type="password"
                    className={inputClasses}
                    value={userForm.password}
                    onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <label className={`${labelClasses} mb-1`}>Full Name</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={userForm.name}
                  onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className={`${labelClasses} mb-1`}>Role</label>
                <select
                  className={inputClasses}
                  value={userForm.role}
                  onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="teacher">Teacher</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className={`${labelClasses} mb-1`}>Email</label>
                <input
                  type="email"
                  className={inputClasses}
                  value={userForm.email}
                  onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <label className={`${labelClasses} mb-1`}>Phone</label>
                <input
                  type="tel"
                  className={inputClasses}
                  value={userForm.phone}
                  onChange={e => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <Button variant="secondary" onClick={() => setShowUserModal(false)}>Cancel</Button>
              <Button onClick={editingUser ? handleUpdateUser : handleCreateUser}>
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {resetPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-xl max-w-sm w-full ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Reset Password</h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>For user: {resetPasswordModal.name}</p>
            </div>
            <div className="p-6">
              <label className={`${labelClasses} mb-1`}>New Password</label>
              <input
                type="password"
                className={inputClasses}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <Button variant="secondary" onClick={() => { setResetPasswordModal(null); setNewPassword(''); }}>Cancel</Button>
              <Button onClick={handleResetPassword}>Reset Password</Button>
            </div>
          </div>
        </div>
      )}

      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl shadow-xl max-w-md w-full ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Merge Data Options</h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {mergeFile ? `File: ${mergeFile.name}` : 'Select options for merge'}
              </p>
            </div>

            {!mergeStats ? (
              <>
                <div className="p-6 space-y-4">
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Choose what to include from the backup file:
                  </p>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${isDark ? 'border-gray-600 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={mergeOptions.updateStudentNames}
                      onChange={e => setMergeOptions(prev => ({ ...prev, updateStudentNames: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Update student names</div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Update names for students that already exist (matched by index number)</div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${isDark ? 'border-gray-600 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={mergeOptions.addNewStudents}
                      onChange={e => setMergeOptions(prev => ({ ...prev, addNewStudents: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Add new students</div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Add students from the backup that don't exist yet</div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${isDark ? 'border-gray-600 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={mergeOptions.addNewTeachers}
                      onChange={e => setMergeOptions(prev => ({ ...prev, addNewTeachers: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Add new teachers</div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Add teachers from the backup that don't exist yet</div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${isDark ? 'border-gray-600 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={!mergeOptions.skipMarks}
                      onChange={e => setMergeOptions(prev => ({ ...prev, skipMarks: !e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Include marks data</div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Add missing marks from the backup (will NOT overwrite existing marks)</div>
                    </div>
                  </label>
                </div>
                <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <Button variant="secondary" onClick={closeMergeModal}>Cancel</Button>
                  <Button onClick={handleMerge}>Start Merge</Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-success-900/50' : 'bg-success-100'}`}>
                      <svg className={`w-5 h-5 ${isDark ? 'text-success-400' : 'text-success-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Merge Complete!</h4>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Your data has been merged successfully</p>
                    </div>
                  </div>

                  <div className={`space-y-2 rounded-xl p-4 ${isDark ? 'bg-gray-750' : 'bg-gray-50'}`}>
                    <div className="flex justify-between text-sm">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Students added:</span>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{mergeStats.studentsAdded}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Students updated:</span>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{mergeStats.studentsUpdated}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Teachers added:</span>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{mergeStats.teachersAdded}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Marks added:</span>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{mergeStats.marksAdded}</span>
                    </div>
                    <div className={`flex justify-between text-sm border-t pt-2 mt-2 ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Skipped (already existed):</span>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{mergeStats.skipped}</span>
                    </div>
                  </div>
                </div>
                <div className={`px-6 py-4 border-t flex justify-end ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <Button onClick={closeMergeModal}>Done</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
