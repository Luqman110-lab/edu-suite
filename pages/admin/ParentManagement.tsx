import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Search, UserPlus, CheckCircle, XCircle, RefreshCw, Copy, Check, X, Link as LinkIcon, Trash2, ChevronRight, User } from "lucide-react";

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

interface Student {
    id: number;
    name: string;
    classLevel: string;
    stream: string;
}

interface StudentGuardian extends Guardian {
    relationship: string; // Relationship specific to this student
}

export function ParentManagement() {
    const [activeTab, setActiveTab] = useState<"guardians" | "assign">("guardians");
    const [search, setSearch] = useState("");
    const [studentSearch, setStudentSearch] = useState("");

    // Guardian Modal State
    const [inviteGuardian, setInviteGuardian] = useState<Guardian | null>(null);
    const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);

    // Assign Modal State
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isAddMode, setIsAddMode] = useState(false); // false = list/manage, true = add new
    const [isLinkMode, setIsLinkMode] = useState(false); // Link existing

    const [copied, setCopied] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const showToast = (message: string) => {
        setToastMsg(message);
        setTimeout(() => setToastMsg(null), 3000);
    };

    // --- Queries ---
    const { data: guardians, isLoading: isLoadingGuardians } = useQuery<Guardian[]>({
        queryKey: ['admin-guardians', search],
        queryFn: async () => {
            const res = await fetch(`/api/guardians?search=${search}`);
            if (!res.ok) throw new Error("Failed to fetch guardians");
            return res.json();
        }
    });

    const { data: students, isLoading: isLoadingStudents } = useQuery<Student[]>({
        queryKey: ['admin-students-search', studentSearch],
        queryFn: async () => {
            // Use the students API - ideally we'd have a server-side search, but for now fetch all and filter client-side 
            // if server search isn't robust, or use the existing /api/students endpoint
            const res = await fetch(`/api/students`);
            if (!res.ok) throw new Error("Failed to fetch students");
            return res.json();
        },
        enabled: activeTab === 'assign'
    });

    // Fetch guardians for selected student
    const { data: studentGuardians, isLoading: isLoadingStudentGuardians } = useQuery<StudentGuardian[]>({
        queryKey: ['student-guardians', selectedStudent?.id],
        queryFn: async () => {
            if (!selectedStudent) return [];
            // We can filter the main guardians endpoint by studentId
            const res = await fetch(`/api/guardians?studentId=${selectedStudent.id}`);
            if (!res.ok) throw new Error("Failed to fetch student guardians");
            return res.json();
        },
        enabled: !!selectedStudent
    });


    // --- Mutations ---
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
        onError: (err: Error) => showToast(`Error: ${err.message}`)
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
        onError: (err: Error) => showToast(`Error: ${err.message}`)
    });

    const createGuardianMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/guardians`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to create guardian");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student-guardians'] });
            queryClient.invalidateQueries({ queryKey: ['admin-guardians'] });
            setIsAddMode(false);
            showToast("Guardian added & linked successfully!");
        },
        onError: (err: Error) => showToast(`Error: ${err.message}`)
    });

    const linkGuardianMutation = useMutation({
        mutationFn: async ({ guardianId, studentId, relationship }: any) => {
            const res = await fetch(`/api/guardians/${guardianId}/students`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId, relationship })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to link guardian");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student-guardians'] });
            setIsLinkMode(false);
            showToast("Guardian linked successfully!");
        },
        onError: (err: Error) => showToast(`Error: ${err.message}`)
    });

    const unlinkMutation = useMutation({
        mutationFn: async ({ guardianId, studentId }: any) => {
            const res = await fetch(`/api/guardians/${guardianId}/students/${studentId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to unlink guardian");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student-guardians'] });
            showToast("Guardian unlinked.");
        },
        onError: (err: Error) => showToast(`Error: ${err.message}`)
    });

    // --- Helpers ---
    const copyCredentials = () => {
        if (credentials) {
            const text = `Username: ${credentials.username}\nPassword: ${credentials.password}\nLogin at: ${window.location.origin}/login`;
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            showToast("Credentials copied to clipboard");
        }
    };

    const filteredGuardians = guardians?.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.phoneNumber && g.phoneNumber.includes(search))
    );

    const filteredStudents = students?.filter(s =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.classLevel.toLowerCase().includes(studentSearch.toLowerCase())
    );

    // --- Render ---
    return (
        <div className="space-y-6">
            {/* Toast */}
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
                    {toastMsg}
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Parent Access Management</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage parent accounts and portal access.</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('guardians')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'guardians'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }
                        `}
                    >
                        <Users className="w-4 h-4 inline-block mr-2" />
                        All Guardians
                    </button>
                    <button
                        onClick={() => setActiveTab('assign')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                            ${activeTab === 'assign'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }
                        `}
                    >
                        <LinkIcon className="w-4 h-4 inline-block mr-2" />
                        Assign & Manage
                    </button>
                </nav>
            </div>

            {/* TAB: Guardians List */}
            {activeTab === 'guardians' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Guardians Directory</h2>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guardian Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Children</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {isLoadingGuardians ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                                ) : filteredGuardians?.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No guardians found.</td></tr>
                                ) : (
                                    filteredGuardians?.map((guardian) => (
                                        <tr key={guardian.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{guardian.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{guardian.relationship}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{guardian.phoneNumber || '-'}</td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{guardian.studentCount}</td>
                                            <td className="px-6 py-4">
                                                {guardian.userId ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm">
                                                        <CheckCircle className="w-3 h-3" /> Active
                                                        <span className="text-xs opacity-75">({guardian.username})</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-md text-sm">
                                                        <XCircle className="w-3 h-3" /> Not Invited
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {guardian.userId ? (
                                                    <button onClick={() => { setInviteGuardian(guardian); resetPasswordMutation.mutate(guardian.id); }} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title="Reset Password">
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => { setInviteGuardian(guardian); inviteMutation.mutate(guardian.id); }} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
                                                        <UserPlus className="w-3 h-3" /> Invite
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
            )}

            {/* TAB: Assign & Manage */}
            {activeTab === 'assign' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Student Search */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Find Student</h3>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or class..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {isLoadingStudents ? (
                                    <div className="text-center py-4 text-gray-500">Loading students...</div>
                                ) : filteredStudents?.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500">No students found.</div>
                                ) : (
                                    filteredStudents?.map(student => (
                                        <button
                                            key={student.id}
                                            onClick={() => { setSelectedStudent(student); setIsAddMode(false); setIsLinkMode(false); }}
                                            className={`w-full text-left p-3 rounded-lg border transition-colors flex justify-between items-center
                                                ${selectedStudent?.id === student.id
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{student.name}</div>
                                                <div className="text-xs text-gray-500">{student.classLevel} {student.stream && `(${student.stream})`}</div>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 ${selectedStudent?.id === student.id ? 'text-blue-500' : 'text-gray-300'}`} />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Manage Guardians */}
                    <div className="lg:col-span-2">
                        {selectedStudent ? (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedStudent.name}</h2>
                                        <p className="text-gray-500">Managing guardians for {selectedStudent.classLevel}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsLinkMode(true)}
                                            className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium"
                                        >
                                            Link Existing
                                        </button>
                                        <button
                                            onClick={() => setIsAddMode(true)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                                        >
                                            <UserPlus className="w-4 h-4" /> Add New
                                        </button>
                                    </div>
                                </div>

                                {/* Guardian List */}
                                <div className="space-y-4">
                                    {isLoadingStudentGuardians ? (
                                        <div className="text-center py-8 text-gray-500">Loading guardians...</div>
                                    ) : studentGuardians?.length === 0 ? (
                                        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                                            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <h3 className="text-lg font-medium text-gray-900">No guardians assigned</h3>
                                            <p className="text-gray-500">Add a new guardian or link an existing one.</p>
                                        </div>
                                    ) : (
                                        studentGuardians?.map(guardian => (
                                            <div key={guardian.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                        {guardian.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{guardian.name}</div>
                                                        <div className="text-sm text-gray-500">{guardian.relationship} • {guardian.phoneNumber}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!guardian.userId && (
                                                        <button
                                                            onClick={() => { setInviteGuardian(guardian); inviteMutation.mutate(guardian.id); }}
                                                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                                        >
                                                            Invite
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Are you sure you want to unlink this guardian?')) {
                                                                unlinkMutation.mutate({ guardianId: guardian.id, studentId: selectedStudent.id });
                                                            }
                                                        }}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Add New Form */}
                                {isAddMode && (
                                    <div className="mt-6 border-t pt-6">
                                        <h3 className="font-semibold mb-4">Add New Guardian</h3>
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            const fd = new FormData(e.currentTarget);
                                            createGuardianMutation.mutate({
                                                name: fd.get('name'),
                                                relationship: fd.get('relationship'),
                                                phoneNumber: fd.get('phoneNumber'),
                                                email: fd.get('email'),
                                                studentId: selectedStudent.id
                                            });
                                        }} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <input name="name" required placeholder="Full Name" className="p-2 border rounded-lg w-full" />
                                                <input name="relationship" required placeholder="Relationship (e.g. Father)" className="p-2 border rounded-lg w-full" />
                                                <input name="phoneNumber" required placeholder="Phone Number" className="p-2 border rounded-lg w-full" />
                                                <input name="email" type="email" placeholder="Email (Optional)" className="p-2 border rounded-lg w-full" />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => setIsAddMode(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save & Link</button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* Link Existing Form */}
                                {isLinkMode && (
                                    <div className="mt-6 border-t pt-6">
                                        <h3 className="font-semibold mb-4">Link Existing Guardian</h3>
                                        <div className="space-y-4">
                                            <input
                                                placeholder="Search guardian name..."
                                                className="w-full p-2 border rounded-lg"
                                                onChange={(e) => setSearch(e.target.value)}
                                            />
                                            <div className="max-h-40 overflow-y-auto border rounded-lg">
                                                {isLoadingGuardians ? <div className="p-4">Searching...</div> :
                                                    filteredGuardians?.map(g => (
                                                        <div key={g.id} className="p-3 hover:bg-gray-50 flex justify-between items-center cursor-pointer"
                                                            onClick={() => {
                                                                linkGuardianMutation.mutate({
                                                                    guardianId: g.id,
                                                                    studentId: selectedStudent.id,
                                                                    relationship: 'Guardian' // Default, or prompt user? prompt would be better but KISS for now
                                                                });
                                                            }}
                                                        >
                                                            <div>
                                                                <div className="font-medium">{g.name}</div>
                                                                <div className="text-xs text-gray-500">{g.phoneNumber}</div>
                                                            </div>
                                                            <button className="text-blue-600 text-sm font-medium">Link</button>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                            <div className="flex justify-end">
                                                <button onClick={() => setIsLinkMode(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">
                                Select a student from the list to manage their guardians.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Credentials Modal (Same as before) */}
            {inviteGuardian && credentials && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account Credentials</h3>
                            <button onClick={() => { setInviteGuardian(null); setCredentials(null); }}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm relative">
                                <div className="flex justify-between"><span>Username: <span className="text-green-400">{credentials.username}</span></span></div>
                                <div className="flex justify-between"><span>Password: <span className="text-green-400">{credentials.password}</span></span></div>
                                <button onClick={copyCredentials} className="absolute top-2 right-2 p-2 hover:bg-white/20 rounded">
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-sm text-gray-500">Share these with <strong>{inviteGuardian.name}</strong>.</p>
                        </div>
                        <div className="px-6 py-4 border-t flex justify-end">
                            <button onClick={() => { setInviteGuardian(null); setCredentials(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
