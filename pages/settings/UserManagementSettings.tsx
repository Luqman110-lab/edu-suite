import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/use-auth';
import { Button } from '../../components/Button';
import { User, ActivityLog, Crown, GraduationCap, X } from 'lucide-react';

// Use local interfaces as they match the parent Settings.tsx
interface UserType {
    id: number;
    username: string;
    name: string;
    role: string;
    email?: string;
    phone?: string;
    createdAt?: string;
}

interface UserManagementSettingsProps {
}

export const UserManagementSettings: React.FC<UserManagementSettingsProps> = () => {
    const { isDark } = useTheme();
    const { user } = useAuth();
    const [users, setUsers] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [userForm, setUserForm] = useState({ username: '', password: '', name: '', role: 'teacher', email: '', phone: '' });
    const [resetPasswordModal, setResetPasswordModal] = useState<UserType | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/users', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoading(false);
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
            } else {
                const data = await response.json();
                showToast(data.message || 'Failed to reset password', 'error');
            }
        } catch (err) {
            showToast('Failed to reset password', 'error');
        }
    };

    const inputClasses = `mt-1 block w-full rounded-xl border px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none sm:text-sm transition-all duration-200 ${isDark
            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:bg-gray-600'
            : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white'
        }`;

    if (loading) return <div className="p-8 text-center">Loading users...</div>;

    return (
        <div className="space-y-6">
            {toast && (
                <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${toast.type === 'success' ? 'bg-success-500 text-white' : 'bg-danger-500 text-white'}`}>
                    {toast.message}
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className={`text-lg font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>System Users</h3>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manage access and roles</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                            Export CSV
                        </button>
                        <Button onClick={() => {
                            setEditingUser(null);
                            setUserForm({ username: '', password: '', name: '', role: 'teacher', email: '', phone: '' });
                            setShowUserModal(true);
                        }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add User
                        </Button>
                    </div>
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
                                <tr key={u.id} className={`border-b ${isDark ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}>
                                    <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                                                {u.name.charAt(0)}
                                            </div>
                                            {u.name}
                                        </div>
                                    </td>
                                    <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{u.username}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center">
                                            {u.role === 'admin' ?
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-primary-900/30 text-primary-400 border border-primary-800' : 'bg-primary-50 text-primary-700 border border-primary-100'}`}>
                                                    <Crown className="w-3 h-3" /> Admin
                                                </span> :
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                                    <GraduationCap className="w-3 h-3" /> Teacher
                                                </span>
                                            }
                                        </div>
                                    </td>
                                    <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{u.email || u.phone || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => {
                                                    setEditingUser(u);
                                                    setUserForm({ username: u.username, password: '', name: u.name, role: u.role, email: u.email || '', phone: u.phone || '' });
                                                    setShowUserModal(true);
                                                }}
                                                className="text-primary-600 hover:text-primary-500 text-xs font-medium"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setResetPasswordModal(u)}
                                                className="text-warning-600 hover:text-warning-500 text-xs font-medium"
                                            >
                                                Reset PW
                                            </button>
                                            {u.id !== user?.id && (
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="text-danger-600 hover:text-danger-500 text-xs font-medium"
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
            </div>

            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {editingUser ? 'Edit User' : 'Create User'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                                <input
                                    type="text"
                                    className={inputClasses}
                                    value={userForm.name}
                                    onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Username</label>
                                <input
                                    type="text"
                                    className={inputClasses}
                                    value={userForm.username}
                                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                                />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
                                    <input
                                        type="password"
                                        className={inputClasses}
                                        value={userForm.password}
                                        onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                    />
                                </div>
                            )}
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Role</label>
                                <select
                                    className={inputClasses}
                                    value={userForm.role}
                                    onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                >
                                    <option value="teacher">Teacher</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email (Optional)</label>
                                <input
                                    type="email"
                                    className={inputClasses}
                                    value={userForm.email}
                                    onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Phone (Optional)</label>
                                <input
                                    type="text"
                                    className={inputClasses}
                                    value={userForm.phone}
                                    onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <Button variant="secondary" onClick={() => setShowUserModal(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button onClick={editingUser ? handleUpdateUser : handleCreateUser} className="flex-1">
                                    {editingUser ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className={`w-full max-w-sm p-6 rounded-2xl shadow-xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Reset Password
                        </h3>
                        <p className={`mb-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Enter new password for <strong>{resetPasswordModal.name}</strong>
                        </p>
                        <div className="space-y-4">
                            <input
                                type="password"
                                className={inputClasses}
                                autoFocus
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="New Password"
                            />
                            <div className="flex gap-3 mt-6">
                                <Button variant="secondary" onClick={() => { setResetPasswordModal(null); setNewPassword(''); }} className="flex-1">
                                    Cancel
                                </Button>
                                <Button onClick={handleResetPassword} disabled={!newPassword} className="flex-1">
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
