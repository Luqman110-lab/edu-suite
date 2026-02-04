import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Search, UserPlus, CheckCircle, XCircle, RefreshCw, Copy, Check, X } from "lucide-react";

interface Guardian {
    id: number;
    name: string;
    relationship: string;
    phoneNumber: string;
    email: string;
    userId: number | null;
    studentCount: number;
    username?: string;
}

export function ParentManagement() {
    const [search, setSearch] = useState("");
    const [inviteGuardian, setInviteGuardian] = useState<Guardian | null>(null);
    const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const showToast = (message: string) => {
        setToastMsg(message);
        setTimeout(() => setToastMsg(null), 3000);
    };

    const { data: guardians, isLoading } = useQuery<Guardian[]>({
        queryKey: ['admin-guardians', search],
        queryFn: async () => {
            const res = await fetch(`/api/guardians?search=${search}`);
            if (!res.ok) throw new Error("Failed to fetch guardians");
            return res.json();
        }
    });

    const inviteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/guardians/${id}/invite`, { method: "POST" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to invite");
            }
            return res.json();
        },
        onSuccess: (data) => {
            setCredentials(data.credentials);
            queryClient.invalidateQueries({ queryKey: ['admin-guardians'] });
            showToast("Account created successfully!");
        },
        onError: (err: Error) => {
            showToast(`Error: ${err.message}`);
        }
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/guardians/${id}/reset-password`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to reset password");
            return res.json();
        },
        onSuccess: (data) => {
            setCredentials(data.credentials);
            showToast("Password reset successfully!");
        },
        onError: (err: Error) => {
            showToast(`Error: ${err.message}`);
        }
    });

    const copyCredentials = () => {
        if (credentials) {
            const text = `Username: ${credentials.username}\nPassword: ${credentials.password}\nLogin at: ${window.location.origin}/login`;
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            showToast("Credentials copied to clipboard");
        }
    };

    const closeDialog = () => {
        setInviteGuardian(null);
        setCredentials(null);
    };

    const filteredGuardians = guardians?.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.phoneNumber && g.phoneNumber.includes(search))
    );

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
                    {toastMsg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Parent Access Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage parent accounts and portal access.</p>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                {/* Card Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Guardians</h2>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or phone..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Guardian Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Children</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">Loading...</td>
                                </tr>
                            ) : filteredGuardians?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No guardians found.</td>
                                </tr>
                            ) : (
                                filteredGuardians?.map((guardian) => (
                                    <tr key={guardian.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{guardian.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{guardian.relationship}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{guardian.phoneNumber || guardian.email || '-'}</td>
                                        <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{guardian.studentCount} Student(s)</td>
                                        <td className="px-6 py-4">
                                            {guardian.userId ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-md text-sm">
                                                    <CheckCircle className="w-3 h-3" /> Active
                                                    <span className="text-xs opacity-75">({guardian.username})</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-md text-sm">
                                                    <XCircle className="w-3 h-3" /> Not Invited
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {guardian.userId ? (
                                                <button
                                                    onClick={() => {
                                                        setInviteGuardian(guardian);
                                                        resetPasswordMutation.mutate(guardian.id);
                                                    }}
                                                    className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                    title="Reset Password"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setInviteGuardian(guardian);
                                                        inviteMutation.mutate(guardian.id);
                                                    }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <UserPlus className="w-4 h-4" /> Enable Access
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Credentials Modal */}
            {inviteGuardian && credentials && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Parent Account Details</h3>
                                <button
                                    onClick={closeDialog}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Share these credentials with <strong>{inviteGuardian.name}</strong>. They can use them to log in to the Parent Portal.
                            </p>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-4 space-y-4">
                            <div className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg font-mono text-sm space-y-2 relative">
                                <div className="flex justify-between items-center">
                                    <span>Username: <span className="text-green-400">{credentials.username}</span></span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span>Password: <span className="text-green-400">{credentials.password}</span></span>
                                </div>
                                <button
                                    onClick={copyCredentials}
                                    className="absolute top-2 right-2 p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Note: This password is temporary. The parent should change it after logging in (feature pending).
                            </p>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                            <button
                                onClick={closeDialog}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
