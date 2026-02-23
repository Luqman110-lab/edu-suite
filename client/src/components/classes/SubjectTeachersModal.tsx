import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useClassAssignments } from "../../hooks/useClassAssignments";
import { Plus, X, UserX, Loader2 } from "lucide-react";

interface SubjectTeachersModalProps {
    isOpen: boolean;
    onClose: () => void;
    classLevel: string;
    stream: string;
    term: number;
    year: number;
}

const SUBJECTS = [
    "Mathematics", "English", "Science", "Social Studies", "CRE", "IRE", "Art", "Music", "P.E.", "Computer"
];

export function SubjectTeachersModal({ isOpen, onClose, classLevel, stream, term, year }: SubjectTeachersModalProps) {
    const { assignments, assignSubjectTeacher, removeAssignment, isAssigningSubject, isRemoving } = useClassAssignments(term, year);

    // Filter assignments specifically for this class, stream, and role
    const subjectAssignments = assignments.filter(
        a => a.assignment.classLevel === classLevel &&
            a.assignment.stream === stream &&
            a.assignment.role === "subject_teacher"
    );

    const { data: teachers = [] } = useQuery({
        queryKey: ["/api/teachers"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/teachers");
            if (!res.ok) throw new Error("Failed to fetch teachers");
            return res.json();
        }
    });

    const [isAdding, setIsAdding] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedTeacher, setSelectedTeacher] = useState<string>("");

    const handleAssign = async () => {
        if (!selectedSubject || !selectedTeacher) return;

        await assignSubjectTeacher({
            teacherId: parseInt(selectedTeacher),
            classLevel,
            stream,
            subject: selectedSubject
        });

        setIsAdding(false);
        setSelectedSubject("");
        setSelectedTeacher("");
    };

    const handleRemove = async (assignmentId: number) => {
        if (confirm("Are you sure you want to remove this subject teacher?")) {
            await removeAssignment(assignmentId);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Subject Teachers - {classLevel} {stream}
                    </h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-500 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm text-gray-500">Current Assignments</h4>
                        {!isAdding && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Add Subject Teacher
                            </button>
                        )}
                    </div>

                    {isAdding && (
                        <div className="p-4 border border-primary-200 bg-primary-50/50 dark:bg-primary-900/10 dark:border-primary-800 rounded-xl">
                            <div className="flex justify-between items-start mb-4">
                                <h5 className="font-medium text-sm text-gray-900 dark:text-white">New Assignment</h5>
                                <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-500 p-1">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                                    <select
                                        value={selectedSubject}
                                        onChange={e => setSelectedSubject(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">Select subject...</option>
                                        {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Teacher</label>
                                    <select
                                        value={selectedTeacher}
                                        onChange={e => setSelectedTeacher(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">Select teacher...</option>
                                        {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={handleAssign}
                                    disabled={!selectedSubject || !selectedTeacher || isAssigningSubject}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                >
                                    {isAssigningSubject ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Assign Teacher
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        {subjectAssignments.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                <UserX className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No subject teachers assigned yet</p>
                            </div>
                        ) : (
                            subjectAssignments.map((record) => (
                                <div key={record.assignment.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 w-24">
                                            {record.assignment.subject}
                                        </span>
                                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                                            {record.teacher?.name || "Unknown Teacher"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(record.assignment.id)}
                                        disabled={isRemoving}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Remove assignment"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
