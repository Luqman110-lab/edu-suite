import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { User, Lock, Save, AlertCircle, CheckCircle, Users, Phone, Mail, Briefcase, MapPin } from "lucide-react";
import PasswordStrength, { isPasswordValid } from "../../components/parent/PasswordStrength";
import { ProfileSkeleton } from "../../components/parent/LoadingSkeletons";
import type { ProfileData, LinkedChild } from "../../types/parent";

export default function ParentProfile() {
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [formData, setFormData] = useState({ phone: '', email: '', addresses: '', occupation: '' });
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const { data, isLoading, error } = useQuery<ProfileData>({
        queryKey: ['parent-profile'],
        queryFn: async () => {
            const res = await fetch('/api/parent/profile', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
    });

    // Populate form when data loads (replaces deprecated onSuccess)
    useEffect(() => {
        if (data?.profile && !editing) {
            setFormData({
                phone: data.profile.phone || '',
                email: data.profile.email || '',
                addresses: data.profile.addresses || '',
                occupation: data.profile.occupation || ''
            });
        }
    }, [data, editing]);

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/parent/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to update');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parent-profile'] });
            setEditing(false);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => setMessage(null), 3000);
        },
        onError: (err: any) => {
            setMessage({ type: 'error', text: err.message });
        }
    });

    const passwordMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/parent/change-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to change password');
            }
            return res.json();
        },
        onSuccess: () => {
            setShowPasswordChange(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setTimeout(() => setMessage(null), 3000);
        },
        onError: (err: any) => {
            setMessage({ type: 'error', text: err.message });
        }
    });

    const handleSave = () => {
        updateMutation.mutate(formData);
    };

    const handlePasswordChange = () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        passwordMutation.mutate({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
        });
    };

    if (isLoading) return <ProfileSkeleton />;
    if (error) return (
        <div className="p-8 text-center text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>Failed to load profile.</p>
        </div>
    );

    const profile = data?.profile || { name: '', username: '', phone: '', email: '', addresses: '', occupation: '', relationship: '', workPhone: '', nationalId: '' };
    const children = data?.children || [];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
                <p className="text-gray-500">Manage your account information.</p>
            </div>

            {/* Status Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="p-6 border-b flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-2xl">
                            {profile.name?.charAt(0) || '?'}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
                            <p className="text-sm text-gray-500">@{profile.username}</p>
                            {profile.relationship && (
                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full mt-1 inline-block capitalize">
                                    {profile.relationship}
                                </span>
                            )}
                        </div>
                    </div>
                    {!editing && (
                        <button
                            onClick={() => {
                                setFormData({
                                    phone: profile.phone || '',
                                    email: profile.email || '',
                                    addresses: profile.addresses || '',
                                    occupation: profile.occupation || ''
                                });
                                setEditing(true);
                            }}
                            className="px-4 py-2 bg-[#0052CC] text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                            Edit Profile
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-4">
                    {editing ? (
                        <>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                    <Phone className="w-4 h-4" /> Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                    <Mail className="w-4 h-4" /> Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                    <MapPin className="w-4 h-4" /> Address
                                </label>
                                <input
                                    type="text"
                                    value={formData.addresses}
                                    onChange={(e) => setFormData(prev => ({ ...prev, addresses: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                    <Briefcase className="w-4 h-4" /> Occupation
                                </label>
                                <input
                                    type="text"
                                    value={formData.occupation}
                                    onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={updateMutation.isPending}
                                    className="px-4 py-2 bg-[#0052CC] text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={() => setEditing(false)}
                                    className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">Phone</p>
                                    <p className="text-sm font-medium text-gray-900">{profile.phone || 'Not set'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="text-sm font-medium text-gray-900">{profile.email || 'Not set'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">Address</p>
                                    <p className="text-sm font-medium text-gray-900">{profile.addresses || 'Not set'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <Briefcase className="w-4 h-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">Occupation</p>
                                    <p className="text-sm font-medium text-gray-900">{profile.occupation || 'Not set'}</p>
                                </div>
                            </div>
                            {profile.workPhone && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Work Phone</p>
                                        <p className="text-sm font-medium text-gray-900">{profile.workPhone}</p>
                                    </div>
                                </div>
                            )}
                            {profile.nationalId && (
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">National ID</p>
                                        <p className="text-sm font-medium text-gray-900">{profile.nationalId}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Linked Children */}
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="p-4 border-b flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-gray-900">Linked Children</h3>
                </div>
                <div className="divide-y">
                    {children.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 text-center">No children linked.</p>
                    ) : (
                        children.map((child: LinkedChild) => (
                            <div key={child.id} className="p-4 flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex-shrink-0 overflow-hidden">
                                    {child.photoBase64 ? (
                                        <img src={child.photoBase64} alt={child.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{child.name}</p>
                                    <p className="text-xs text-gray-500">{child.classLevel} {child.stream}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-600" />
                        <h3 className="font-bold text-gray-900">Security</h3>
                    </div>
                    {!showPasswordChange && (
                        <button
                            onClick={() => setShowPasswordChange(true)}
                            className="text-sm text-blue-600 hover:underline font-medium"
                        >
                            Change Password
                        </button>
                    )}
                </div>
                {showPasswordChange && (
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                aria-describedby="password-requirements"
                            />
                            <PasswordStrength password={passwordData.newPassword} className="mt-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePasswordChange}
                                disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || passwordMutation.isPending || !isPasswordValid(passwordData.newPassword) || passwordData.newPassword !== passwordData.confirmPassword}
                                className="px-4 py-2 bg-[#0052CC] text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                                {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowPasswordChange(false);
                                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                }}
                                className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
