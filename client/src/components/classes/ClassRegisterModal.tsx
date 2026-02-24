import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Download, FileText, Loader2, Users, X } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ClassRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    classLevel: string;
    stream: string;
    term: number;
    year: number;
}

export function ClassRegisterModal({ isOpen, onClose, classLevel, stream, term, year }: ClassRegisterModalProps) {
    const { data: students = [], isLoading } = useQuery({
        queryKey: ["/api/students", term, year],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/students?term=${term}&year=${year}`);
            if (!res.ok) throw new Error("Failed to fetch students");
            return res.json();
        },
        enabled: isOpen
    });

    // Filter students for this specific class and stream
    const classStudents = students.filter(
        (s: any) => s.classLevel === classLevel && s.stream === stream && s.isActive === true
    ).sort((a: any, b: any) => a.name.localeCompare(b.name));

    const handleExportCSV = () => {
        if (classStudents.length === 0) return;

        const headers = ["No.", "Admission Number", "Student Name", "Gender", "Status"];
        const csvContent = [
            headers.join(","),
            ...classStudents.map((s: any, index: number) =>
                [
                    index + 1,
                    s.admissionNumber || "",
                    `"${s.name}"`, // Quote names in case of commas
                    s.gender || "",
                    s.isActive ? "Active" : "Inactive"
                ].join(",")
            )
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Class_Register_${classLevel}_${stream}_${year}_Term${term}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintPDF = () => {
        if (classStudents.length === 0) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(16);
        doc.text(`Class Register: ${classLevel} ${stream}`, 14, 15);
        doc.setFontSize(11);
        doc.text(`Term: ${term} | Year: ${year}`, 14, 22);
        doc.text(`Date Generated: ${format(new Date(), 'PP')}`, 14, 28);
        doc.text(`Total Students: ${classStudents.length}`, 14, 34);

        const tableColumn = ["No.", "Adm No", "Student Name", "Gender", "M", "T", "W", "T", "F"];
        const tableRows = classStudents.map((s: any, index: number) => [
            index + 1,
            s.admissionNumber,
            s.name,
            s.gender ? s.gender.charAt(0).toUpperCase() : '',
            "", "", "", "", "" // Empty checkboxes for attendance
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 25 },
                2: { cellWidth: 70 },
                3: { cellWidth: 15 },
                4: { cellWidth: 10 },
                5: { cellWidth: 10 },
                6: { cellWidth: 10 },
                7: { cellWidth: 10 },
                8: { cellWidth: 10 }
            }
        });

        doc.save(`Attendance_Register_${classLevel}_${stream}_${year}_Term${term}.pdf`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Class Register: {classLevel} {stream}
                            </h2>
                            <p className="text-sm text-gray-500">
                                Term {term} • {year} | Total Students: {classStudents.length}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportCSV}
                            disabled={classStudents.length === 0}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <FileText className="w-4 h-4" /> Export CSV
                        </button>
                        <button
                            onClick={handlePrintPDF}
                            disabled={classStudents.length === 0}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                        >
                            <Download className="w-4 h-4" /> Print PDF
                        </button>
                        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-500 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3 text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                            <p>Loading students...</p>
                        </div>
                    ) : classStudents.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium text-gray-700 dark:text-gray-300">No students found</p>
                            <p className="text-sm mt-1">There are no active students enrolled in this stream.</p>
                        </div>
                    ) : (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 w-16 text-center">#</th>
                                        <th className="px-4 py-3">Admission No.</th>
                                        <th className="px-4 py-3">Student Name</th>
                                        <th className="px-4 py-3">Gender</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-900 sm:rounded-lg">
                                    {classStudents.map((student: any, index: number) => (
                                        <StudentRow key={student.id} index={index + 1} student={student} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StudentRow({ index, student }: { index: number, student: any }) {
    return (
        <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 font-medium">
                {index}
            </td>
            <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                {student.admissionNumber || '-'}
            </td>
            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {student.name}
            </td>
            <td className="px-4 py-3">
                <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium capitalize bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {student.gender || '-'}
                </span>
            </td>
        </tr>
    );
}
