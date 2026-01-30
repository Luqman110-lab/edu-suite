import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import {
    Building2,
    Users,
    GraduationCap,
    UserCheck,
    Activity,
    Settings,
    Shield,
    FileText,
    ChevronDown,
    ChevronRight,
    Plus,
    Pencil,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Search,
    RefreshCw,
    Key,
    AlertTriangle,
    Clock,
    Check,
    X,
    Eye,
    Download,
} from 'lucide-react';

// Types
interface School {
    id: number;
    name: string;
    code: string;
    email?: string;
    contactPhones?: string;
    isActive: boolean;
    createdAt: string;
}

interface AdminUser {
    id: number;
    username: string;
    name: string;
    email?: string;
    phone?: string;
    role: string;
    isSuperAdmin: boolean;
    createdAt: string;
    schools: { schoolId: number; schoolName: string; role: string; isPrimary: boolean }[];
    schoolCount: number;
}

interface AuditLog {
    id: number;
    userName: string;
    action: string;
    entityType: string;
    entityName: string;
    createdAt: string;
}

interface AdminStats {
    totalSchools: number;
    activeSchools: number;
    totalUsers: number;
    totalStudents: number;
    totalTeachers: number;
    recentActivity: AuditLog[];
}

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, color, isDark }: {
    title: string;
    value: number | string;
    icon: React.FC<{ className?: string }>;
    color: string;
    isDark: boolean;
}) => (
    <div className={`relative overflow-hidden rounded-2xl p-6 transition-all hover:scale-[1.02] ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100 shadow-soft'
        }`}>
        <div className="flex items-center justify-between">
            <div>
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
                <p className={`text-3xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
            </div>
            <div className={`p-4 rounded-xl ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
        <div className={`absolute inset-x-0 bottom-0 h-1 ${color}`} />
    </div>
);

// Tab Button Component
const TabButton = ({ active, icon: Icon, label, onClick, isDark }: {
    active: boolean;
    icon: React.FC<{ className?: string }>;
    label: string;
    onClick: () => void;
    isDark: boolean;
}) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${active
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : isDark
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
    >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
    </button>
);

export const AdminDashboard: React.FC = () => {
    const { isSuperAdmin } = useAuth();
    const { isDark } = useTheme();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<'overview' | 'schools' | 'users' | 'audit'>('overview');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [schools, setSchools] = useState<School[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [showSchoolModal, setShowSchoolModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [newPassword, setNewPassword] = useState('');

    // School form
    const [schoolForm, setSchoolForm] = useState({
        name: '', code: '', addressBox: '', contactPhones: '', email: '', motto: '',
        regNumber: '', centreNumber: '', primaryColor: '#7B1113', secondaryColor: '#1E3A5F', isActive: true,
    });

    // User form
    const [userForm, setUserForm] = useState({
        name: '', email: '', phone: '', role: 'teacher', isSuperAdmin: false,
    });

    if (!isSuperAdmin) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className={`text-center p-8 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white shadow-lg'}`}>
                    <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Access Denied</h2>
                    <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Super Admin access required</p>
                </div>
            </div>
        );
    }

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats', { credentials: 'include' });
            if (res.ok) setStats(await res.json());
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    };

    const fetchSchools = async () => {
        try {
            const res = await fetch('/api/admin/schools', { credentials: 'include' });
            if (res.ok) setSchools(await res.json());
        } catch (err) {
            console.error('Failed to fetch schools:', err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', { credentials: 'include' });
            if (res.ok) setUsers(await res.json());
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const res = await fetch('/api/admin/audit-logs?limit=100', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data.logs || []);
            }
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchStats(), fetchSchools(), fetchUsers(), fetchAuditLogs()]);
            setLoading(false);
        };
        loadData();
    }, []);

    const handleSaveSchool = async () => {
        if (!schoolForm.name.trim() || !schoolForm.code.trim()) {
            toast({ title: 'Error', description: 'Name and code are required', variant: 'destructive' });
            return;
        }
        try {
            const url = editingSchool ? `/api/schools/${editingSchool.id}` : '/api/schools';
            const method = editingSchool ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(schoolForm),
            });
            if (res.ok) {
                toast({ title: 'Success', description: editingSchool ? 'School updated!' : 'School created!' });
                setShowSchoolModal(false);
                fetchSchools();
                fetchStats();
            } else {
                const data = await res.json();
                toast({ title: 'Error', description: data.message, variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to save school', variant: 'destructive' });
        }
    };

    const handleToggleSchool = async (school: School) => {
        if (school.code === 'DEFAULT') {
            toast({ title: 'Error', description: 'Cannot toggle default school', variant: 'destructive' });
            return;
        }
        try {
            const res = await fetch(`/api/schools/${school.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ...school, isActive: !school.isActive }),
            });
            if (res.ok) {
                toast({ title: 'Success', description: `School ${school.isActive ? 'deactivated' : 'activated'}!` });
                fetchSchools();
                fetchStats();
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to update school', variant: 'destructive' });
        }
    };

    const handleDeleteSchool = async (school: School) => {
        if (school.code === 'DEFAULT') {
            toast({ title: 'Error', description: 'Cannot delete default school', variant: 'destructive' });
            return;
        }
        if (!window.confirm(`Permanently delete "${school.name}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/admin/schools/${school.id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                toast({ title: 'Success', description: 'School deleted!' });
                fetchSchools();
                fetchStats();
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to delete school', variant: 'destructive' });
        }
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        try {
            const res = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(userForm),
            });
            if (res.ok) {
                toast({ title: 'Success', description: 'User updated!' });
                setShowUserModal(false);
                fetchUsers();
            } else {
                const data = await res.json();
                toast({ title: 'Error', description: data.message, variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' });
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUserId || newPassword.length < 6) {
            toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
            return;
        }
        try {
            const res = await fetch(`/api/admin/users/${selectedUserId}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ newPassword }),
            });
            if (res.ok) {
                toast({ title: 'Success', description: 'Password reset!' });
                setShowPasswordModal(false);
                setNewPassword('');
                fetchAuditLogs();
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to reset password', variant: 'destructive' });
        }
    };

    const handleDeleteUser = async (user: AdminUser) => {
        if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                toast({ title: 'Success', description: 'User deleted!' });
                fetchUsers();
                fetchStats();
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
        }
    };

    const openSchoolModal = (school?: School) => {
        if (school) {
            setEditingSchool(school);
            setSchoolForm({
                name: school.name, code: school.code, addressBox: '', contactPhones: school.contactPhones || '',
                email: school.email || '', motto: '', regNumber: '', centreNumber: '',
                primaryColor: '#7B1113', secondaryColor: '#1E3A5F', isActive: school.isActive,
            });
        } else {
            setEditingSchool(null);
            setSchoolForm({
                name: '', code: '', addressBox: '', contactPhones: '', email: '', motto: '',
                regNumber: '', centreNumber: '', primaryColor: '#7B1113', secondaryColor: '#1E3A5F', isActive: true,
            });
        }
        setShowSchoolModal(true);
    };

    const openUserModal = (user: AdminUser) => {
        setEditingUser(user);
        setUserForm({
            name: user.name, email: user.email || '', phone: user.phone || '',
            role: user.role, isSuperAdmin: user.isSuperAdmin,
        });
        setShowUserModal(true);
    };

    const openPasswordModal = (userId: number) => {
        setSelectedUserId(userId);
        setNewPassword('');
        setShowPasswordModal(true);
    };

    const inputClasses = `w-full rounded-xl border px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-200 bg-gray-50 text-gray-900 focus:bg-white'
        }`;

    const filteredSchools = schools.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <Shield className="inline-block w-7 h-7 mr-2 text-primary-500" />
                        Super Admin Console
                    </h1>
                    <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Platform management and system administration
                    </p>
                </div>
                <button
                    onClick={() => { fetchStats(); fetchSchools(); fetchUsers(); fetchAuditLogs(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2">
                <TabButton active={activeTab === 'overview'} icon={Activity} label="Overview" onClick={() => setActiveTab('overview')} isDark={isDark} />
                <TabButton active={activeTab === 'schools'} icon={Building2} label="Schools" onClick={() => setActiveTab('schools')} isDark={isDark} />
                <TabButton active={activeTab === 'users'} icon={Users} label="Users" onClick={() => setActiveTab('users')} isDark={isDark} />
                <TabButton active={activeTab === 'audit'} icon={FileText} label="Audit Logs" onClick={() => setActiveTab('audit')} isDark={isDark} />
            </div>

            {/* Content */}
            <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100 shadow-soft'}`}>
                {/* Overview Tab */}
                {activeTab === 'overview' && stats && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <StatsCard title="Total Schools" value={stats.totalSchools} icon={Building2} color="bg-blue-500" isDark={isDark} />
                            <StatsCard title="Active Schools" value={stats.activeSchools} icon={Check} color="bg-green-500" isDark={isDark} />
                            <StatsCard title="Total Users" value={stats.totalUsers} icon={Users} color="bg-purple-500" isDark={isDark} />
                            <StatsCard title="Students" value={stats.totalStudents} icon={GraduationCap} color="bg-amber-500" isDark={isDark} />
                            <StatsCard title="Teachers" value={stats.totalTeachers} icon={UserCheck} color="bg-pink-500" isDark={isDark} />
                        </div>

                        <div>
                            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <Clock className="inline-block w-5 h-5 mr-2" />
                                Recent Activity
                            </h3>
                            {stats.recentActivity.length === 0 ? (
                                <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No recent activity</p>
                            ) : (
                                <div className="space-y-2">
                                    {stats.recentActivity.slice(0, 10).map((log) => (
                                        <div key={log.id} className={`flex items-center gap-4 p-3 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                                            <div className={`p-2 rounded-lg ${log.action === 'create' ? 'bg-green-100 text-green-600' :
                                                    log.action === 'delete' ? 'bg-red-100 text-red-600' :
                                                        log.action === 'update' ? 'bg-blue-100 text-blue-600' :
                                                            'bg-gray-100 text-gray-600'
                                                }`}>
                                                <Activity className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                    {log.userName} <span className="font-normal text-gray-500">{log.action}</span> {log.entityType}
                                                    {log.entityName && <span className="font-semibold"> "{log.entityName}"</span>}
                                                </p>
                                                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Schools Tab */}
                {activeTab === 'schools' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3 justify-between">
                            <div className="relative flex-1 max-w-md">
                                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                <input
                                    type="text"
                                    placeholder="Search schools..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className={`${inputClasses} pl-10`}
                                />
                            </div>
                            <button
                                onClick={() => openSchoolModal()}
                                className="flex items-center gap-2 px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Add School
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className={`text-left border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <th className="py-3 px-4 font-medium">School</th>
                                        <th className="py-3 px-4 font-medium">Code</th>
                                        <th className="py-3 px-4 font-medium">Status</th>
                                        <th className="py-3 px-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSchools.map((school) => (
                                        <tr key={school.id} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                            <td className="py-3 px-4">
                                                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{school.name}</p>
                                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{school.email}</p>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-mono ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                                    {school.code}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${school.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {school.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex gap-2">
                                                    <button onClick={() => openSchoolModal(school)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                                        <Pencil className="w-4 h-4 text-blue-500" />
                                                    </button>
                                                    <button onClick={() => handleToggleSchool(school)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                                        {school.isActive ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                                                    </button>
                                                    <button onClick={() => handleDeleteSchool(school)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="relative max-w-md">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`${inputClasses} pl-10`}
                            />
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className={`text-left border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <th className="py-3 px-4 font-medium">User</th>
                                        <th className="py-3 px-4 font-medium">Role</th>
                                        <th className="py-3 px-4 font-medium">Schools</th>
                                        <th className="py-3 px-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className={`border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                            <td className="py-3 px-4">
                                                <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user.name}</p>
                                                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>@{user.username}</p>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isSuperAdmin ? 'bg-purple-100 text-purple-700' :
                                                        user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {user.isSuperAdmin ? 'Super Admin' : user.role}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    {user.schoolCount} school{user.schoolCount !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex gap-2">
                                                    <button onClick={() => openUserModal(user)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                                        <Pencil className="w-4 h-4 text-blue-500" />
                                                    </button>
                                                    <button onClick={() => openPasswordModal(user.id)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                                        <Key className="w-4 h-4 text-amber-500" />
                                                    </button>
                                                    <button onClick={() => handleDeleteUser(user)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Audit Logs Tab */}
                {activeTab === 'audit' && (
                    <div className="space-y-4">
                        <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <FileText className="inline-block w-5 h-5 mr-2" />
                            Audit Logs
                        </h3>
                        {auditLogs.length === 0 ? (
                            <p className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No audit logs yet</p>
                        ) : (
                            <div className="space-y-2">
                                {auditLogs.map((log) => (
                                    <div key={log.id} className={`flex items-center gap-4 p-4 rounded-xl ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                                        <div className={`p-2 rounded-lg ${log.action === 'create' ? 'bg-green-100 text-green-600' :
                                                log.action === 'delete' ? 'bg-red-100 text-red-600' :
                                                    log.action === 'update' ? 'bg-blue-100 text-blue-600' :
                                                        log.action === 'reset_password' ? 'bg-amber-100 text-amber-600' :
                                                            'bg-gray-100 text-gray-600'
                                            }`}>
                                            <Activity className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                {log.userName || 'System'}{' '}
                                                <span className={`font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{log.action}</span>{' '}
                                                {log.entityType && <span className="text-primary-500">{log.entityType}</span>}
                                                {log.entityName && <span className="font-semibold"> "{log.entityName}"</span>}
                                            </p>
                                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {new Date(log.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* School Modal */}
            {showSchoolModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {editingSchool ? 'Edit School' : 'Add New School'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name *</label>
                                <input className={inputClasses} value={schoolForm.name} onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Code *</label>
                                <input className={inputClasses} value={schoolForm.code} onChange={(e) => setSchoolForm({ ...schoolForm, code: e.target.value.toUpperCase() })} />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                                <input className={inputClasses} value={schoolForm.email} onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })} />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Contact</label>
                                <input className={inputClasses} value={schoolForm.contactPhones} onChange={(e) => setSchoolForm({ ...schoolForm, contactPhones: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowSchoolModal(false)} className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Cancel</button>
                            <button onClick={handleSaveSchool} className="flex-1 py-3 rounded-xl bg-primary-500 text-white hover:bg-primary-600">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Modal */}
            {showUserModal && editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-lg rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit User</h3>
                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                                <input className={inputClasses} value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                                <input className={inputClasses} value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
                                <input className={inputClasses} value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Role</label>
                                <select className={inputClasses} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                                    <option value="teacher">Teacher</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={userForm.isSuperAdmin} onChange={(e) => setUserForm({ ...userForm, isSuperAdmin: e.target.checked })} className="rounded" />
                                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Super Admin</span>
                            </label>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowUserModal(false)} className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Cancel</button>
                            <button onClick={handleSaveUser} className="flex-1 py-3 rounded-xl bg-primary-500 text-white hover:bg-primary-600">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Reset Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Reset Password</h3>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
                            <input type="password" className={inputClasses} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowPasswordModal(false)} className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Cancel</button>
                            <button onClick={handleResetPassword} className="flex-1 py-3 rounded-xl bg-amber-500 text-white hover:bg-amber-600">Reset</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
