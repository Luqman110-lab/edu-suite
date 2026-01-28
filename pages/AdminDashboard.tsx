import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/api';
import { School, AuthUser as User } from '../types';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/use-auth';
import { useTheme } from '../contexts/ThemeContext';


// Redefining Card locally to avoid import issues and keep it self-contained if Settings exports change
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

export const AdminDashboard: React.FC = () => {
    const { user, isSuperAdmin } = useAuth();
    const { isDark } = useTheme();

    // Checking for super admin early, though route protection should handle it too
    if (!isSuperAdmin) {
        return <div className="p-8 text-center">Access Denied</div>;
    }

    const [activeTab, setActiveTab] = useState<'overview' | 'schools' | 'users'>('overview');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [allSchools, setAllSchools] = useState<School[]>([]);
    const [showSchoolModal, setShowSchoolModal] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [schoolSaving, setSchoolSaving] = useState(false);

    const [schoolForm, setSchoolForm] = useState({
        name: '',
        code: '',
        addressBox: '',
        contactPhones: '',
        email: '',
        motto: '',
        regNumber: '',
        centreNumber: '',
        primaryColor: '#7B1113',
        secondaryColor: '#1E3A5F',
        isActive: true,
    });

    const loadSchools = async () => {
        try {
            // Use the new admin-specific endpoint that returns ALL schools
            const response = await fetch('/api/admin/schools', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setAllSchools(data);
            }
        } catch (err) {
            console.error('Failed to load schools:', err);
            showToast('Failed to load schools', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSchools();
    }, []);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const openSchoolModal = (school?: School) => {
        if (school) {
            setEditingSchool(school);
            setSchoolForm({
                name: school.name,
                code: school.code,
                addressBox: school.addressBox || '',
                contactPhones: school.contactPhones || '',
                email: school.email || '',
                motto: school.motto || '',
                regNumber: school.regNumber || '',
                centreNumber: school.centreNumber || '',
                primaryColor: school.primaryColor || '#7B1113',
                secondaryColor: school.secondaryColor || '#1E3A5F',
                isActive: school.isActive !== false,
            });
        } else {
            setEditingSchool(null);
            setSchoolForm({
                name: '',
                code: '',
                addressBox: '',
                contactPhones: '',
                email: '',
                motto: '',
                regNumber: '',
                centreNumber: '',
                primaryColor: '#7B1113',
                secondaryColor: '#1E3A5F',
                isActive: true,
            });
        }
        setShowSchoolModal(true);
    };

    const handleSchoolSave = async () => {
        if (!schoolForm.name.trim() || !schoolForm.code.trim()) {
            showToast('School name and code are required', 'error');
            return;
        }

        setSchoolSaving(true);
        try {
            const url = editingSchool ? `/api/schools/${editingSchool.id}` : '/api/schools';
            const method = editingSchool ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(schoolForm),
            });

            if (response.ok) {
                showToast(editingSchool ? 'School updated!' : 'School created!', 'success');
                setShowSchoolModal(false);
                loadSchools();
            } else {
                const data = await response.json();
                showToast(data.message || 'Failed to save school', 'error');
            }
        } catch (err) {
            showToast('Failed to save school', 'error');
        } finally {
            setSchoolSaving(false);
        }
    };

    const handleSchoolToggleActive = async (school: School) => {
        if (school.code === 'DEFAULT') {
            showToast('Cannot deactivate the default school', 'error');
            return;
        }

        const newStatus = school.isActive === false ? true : false;
        const action = newStatus ? 'reactivate' : 'deactivate';

        if (!window.confirm(`Are you sure you want to ${action} "${school.name}"?`)) {
            return;
        }

        try {
            // Re-using the endpoint logic, assuming endpoint handles partial updates correctly or we send full body.
            // In Settings.tsx it sent the full body. I will replicate that to be safe.
            const response = await fetch(`/api/schools/${school.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...school,
                    isActive: newStatus,
                    // DB might require mapped fields if the types don't match exactly, but usually api handles it.
                    // Let's verify routes.ts... it expects body to match insert schema usually.
                    // Safe to send all school fields.
                }),
            });

            if (response.ok) {
                showToast(`School ${action}d successfully`, 'success');
                loadSchools();
            } else {
                const data = await response.json();
                showToast(data.message || `Failed to ${action} school`, 'error');
            }
        } catch (err) {
            showToast(`Failed to ${action} school`, 'error');
        }
    };



    const handleSchoolDelete = async (school: School) => {
        if (school.code === 'DEFAULT') {
            showToast('Cannot delete the default school', 'error');
            return;
        }

        if (!window.confirm(`DANGER: Are you sure you want to PERMANENTLY DELETE "${school.name}"?\n\nThis action cannot be undone and will delete ALL data associated with this school (students, marks, etc.).`)) {
            return;
        }

        if (!window.confirm(`Double check: Really delete "${school.name}" permanently?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/schools/${school.id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (response.ok) {
                showToast('School deleted permanently', 'success');
                loadSchools();
            } else {
                const data = await response.json();
                showToast(data.message || 'Failed to delete school', 'error');
            }
        } catch (err) {
            showToast('Failed to delete school', 'error');
        }
    };

    const labelClasses = `block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`;
    const inputClasses = `mt-1 block w-full rounded-xl border px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none sm:text-sm transition-all duration-200 ${isDark
        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600'
        : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white'
        }`;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Admin Console</h1>
                    <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Super Admin System Management</p>
                </div>
            </div>

            <div className={`rounded-2xl shadow-soft border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className={`border-b overflow-x-auto ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex min-w-max">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('schools')}
                            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'schools'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Schools Management
                        </button>
                        {/* Future: Users Tab */}
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card title="Total Schools" isDark={isDark}>
                                <p className="text-3xl font-bold text-primary-600">{allSchools.length}</p>
                            </Card>
                            <Card title="Active Schools" isDark={isDark}>
                                <p className="text-3xl font-bold text-success-600">{allSchools.filter(s => s.isActive !== false).length}</p>
                            </Card>
                            {/* Add more system stats here */}
                        </div>
                    )}

                    {activeTab === 'schools' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Registered Schools</h2>
                                <Button onClick={() => openSchoolModal()}>
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add School
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {allSchools.map(school => (
                                    <div
                                        key={school.id}
                                        className={`p-4 rounded-xl border transition-shadow hover:shadow-md relative ${school.isActive === false
                                            ? isDark ? 'bg-gray-800/50 border-gray-700 opacity-70' : 'bg-gray-100/50 border-gray-300 opacity-70'
                                            : isDark ? 'bg-gray-750 border-gray-600' : 'bg-gray-50 border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                                style={{
                                                    backgroundColor: `${school.primaryColor || '#7B1113'}20`,
                                                    color: school.primaryColor || '#7B1113'
                                                }}
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m4 6 8-4 8 4M18 10l4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2" />
                                                </svg>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openSchoolModal(school)}
                                                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
                                                    title="Edit school"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                {school.code !== 'DEFAULT' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleSchoolToggleActive(school)}
                                                            className={`p-1.5 rounded-lg transition-colors ${school.isActive === false
                                                                ? isDark ? 'hover:bg-success-900/50 text-gray-400 hover:text-success-400' : 'hover:bg-success-50 text-gray-500 hover:text-success-600'
                                                                : isDark ? 'hover:bg-warning-900/50 text-gray-400 hover:text-warning-400' : 'hover:bg-warning-50 text-gray-500 hover:text-warning-600'
                                                                }`}
                                                            title={school.isActive === false ? 'Reactivate school' : 'Deactivate school'}
                                                        >
                                                            {school.isActive === false ? (
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleSchoolDelete(school)}
                                                            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-900/50 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'}`}
                                                            title="Permanently Delete School"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{school.name}</h4>
                                        <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Code: {school.code}</p>
                                        {school.motto && (
                                            <p className={`text-xs italic mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>"{school.motto}"</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-3">
                                            <div className="flex items-center gap-1">
                                                <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: school.primaryColor || '#7B1113' }}></div>
                                                <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: school.secondaryColor || '#1E3A5F' }}></div>
                                            </div>
                                            {school.isActive === false && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'}`}>
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showSchoolModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    {/* School Modal Content - Copied/Adapted from Settings.tsx */}
                    <div className={`rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {editingSchool ? 'Edit School' : 'Register New School'}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className={`${labelClasses} mb-1`}>School Name *</label>
                                    <input
                                        type="text"
                                        className={inputClasses}
                                        value={schoolForm.name}
                                        onChange={e => setSchoolForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., Broadway Primary School"
                                    />
                                </div>
                                <div>
                                    <label className={`${labelClasses} mb-1`}>School Code *</label>
                                    <input
                                        type="text"
                                        className={inputClasses}
                                        value={schoolForm.code}
                                        onChange={e => setSchoolForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        placeholder="e.g., BPS001"
                                        disabled={editingSchool?.code === 'DEFAULT'}
                                    />
                                </div>
                                {/* Simplified other fields for brevity/robustness, or copy all */}
                                <div className="sm:col-span-2">
                                    <label className={`${labelClasses} mb-1`}>Address / P.O Box</label>
                                    <input type="text" className={inputClasses} value={schoolForm.addressBox} onChange={e => setSchoolForm(prev => ({ ...prev, addressBox: e.target.value }))} />
                                </div>
                                <div>
                                    <label className={`${labelClasses} mb-1`}>Context Phones</label>
                                    <input type="text" className={inputClasses} value={schoolForm.contactPhones} onChange={e => setSchoolForm(prev => ({ ...prev, contactPhones: e.target.value }))} />
                                </div>
                                <div>
                                    <label className={`${labelClasses} mb-1`}>Email</label>
                                    <input type="email" className={inputClasses} value={schoolForm.email} onChange={e => setSchoolForm(prev => ({ ...prev, email: e.target.value }))} />
                                </div>
                                <div>
                                    <label className={`${labelClasses} mb-1`}>Motto</label>
                                    <input type="text" className={inputClasses} value={schoolForm.motto} onChange={e => setSchoolForm(prev => ({ ...prev, motto: e.target.value }))} />
                                </div>
                                <div>
                                    <label className={`${labelClasses} mb-1`}>Reg Number</label>
                                    <input type="text" className={inputClasses} value={schoolForm.regNumber} onChange={e => setSchoolForm(prev => ({ ...prev, regNumber: e.target.value }))} />
                                </div>
                                <div>
                                    <label className={`${labelClasses} mb-1`}>Centre Number</label>
                                    <input type="text" className={inputClasses} value={schoolForm.centreNumber} onChange={e => setSchoolForm(prev => ({ ...prev, centreNumber: e.target.value }))} />
                                </div>
                            </div>

                            <div className={`mt-6 pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                <h4 className={`text-sm font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>School Branding</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`${labelClasses} mb-1`}>Primary Color</label>
                                        <div className="flex items-center gap-3">
                                            <input type="color" className="w-10 h-10 rounded-lg border cursor-pointer" value={schoolForm.primaryColor} onChange={e => setSchoolForm(prev => ({ ...prev, primaryColor: e.target.value }))} />
                                            <input type="text" className={inputClasses} value={schoolForm.primaryColor} onChange={e => setSchoolForm(prev => ({ ...prev, primaryColor: e.target.value }))} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`${labelClasses} mb-1`}>Secondary Color</label>
                                        <div className="flex items-center gap-3">
                                            <input type="color" className="w-10 h-10 rounded-lg border cursor-pointer" value={schoolForm.secondaryColor} onChange={e => setSchoolForm(prev => ({ ...prev, secondaryColor: e.target.value }))} />
                                            <input type="text" className={inputClasses} value={schoolForm.secondaryColor} onChange={e => setSchoolForm(prev => ({ ...prev, secondaryColor: e.target.value }))} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`px-6 py-4 border-t flex justify-end gap-3 mt-4 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <Button variant="secondary" onClick={() => setShowSchoolModal(false)}>Cancel</Button>
                                <Button onClick={handleSchoolSave} disabled={schoolSaving}>
                                    {schoolSaving ? 'Saving...' : (editingSchool ? 'Update School' : 'Create School')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
