
import { useState } from 'react';
import { Clock, Plus, Settings, RefreshCw, Download, ChevronDown } from 'lucide-react';
import { TimetablePeriod, ClassTimetable, Teacher } from '../../types';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const CLASS_LEVELS = ['N1', 'N2', 'N3', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
const SUBJECTS = ['English', 'Mathematics', 'Science', 'Social Studies', 'Religious Education', 'Literacy', 'P.E.', 'Art', 'Music', 'Local Language'];

interface TimetablesTabProps {
    periods: TimetablePeriod[];
    timetableEntries: ClassTimetable[];
    teachers: Teacher[]; // Teacher interface needed here or imported? Defining locally for now if not in types
    selectedClass: string;
    selectedStream: string;
    onClassChange: (c: string) => void;
    onStreamChange: (s: string) => void;
    onAddPeriod: () => void;
    onEditPeriod: (period: TimetablePeriod) => void;
    onDeletePeriod: (id: number) => void;
    onSaveTimetable: (entries: Partial<ClassTimetable>[]) => void;
    onSeedPeriods: () => void;
    isDark: boolean;
}

export function TimetablesTab({
    periods,
    timetableEntries,
    teachers,
    selectedClass,
    selectedStream,
    onClassChange,
    onStreamChange,
    onAddPeriod,
    onEditPeriod,
    onDeletePeriod,
    onSaveTimetable,
    onSeedPeriods,
    isDark,
}: TimetablesTabProps) {
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';
    const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
    const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
    const [showPeriodSettings, setShowPeriodSettings] = useState(false);
    const [localTimetable, setLocalTimetable] = useState<Record<string, Partial<ClassTimetable>>>({});

    const lessonPeriods = periods.filter(p => p.periodType === 'lesson' && p.isActive);

    const getTimetableEntry = (periodId: number, day: string) => {
        const key = `${periodId}-${day}`;
        if (localTimetable[key]) return localTimetable[key];
        return timetableEntries.find(e => e.periodId === periodId && e.dayOfWeek === day);
    };

    const updateCell = (periodId: number, day: string, field: string, value: string | number | null) => {
        const key = `${periodId}-${day}`;
        setLocalTimetable(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                periodId,
                dayOfWeek: day,
                [field]: value,
            },
        }));
    };

    const handleSave = () => {
        const entries: Partial<ClassTimetable>[] = [];
        DAYS_OF_WEEK.forEach(day => {
            lessonPeriods.forEach(period => {
                const entry = getTimetableEntry(period.id, day);
                if (entry?.subject || entry?.teacherId) {
                    entries.push({
                        periodId: period.id,
                        dayOfWeek: day,
                        subject: entry.subject,
                        teacherId: entry.teacherId,
                        room: entry.room,
                    });
                }
            });
        });
        onSaveTimetable(entries);
    };

    const exportTimetablePDF = async () => {
        const jsPDF = (window as any).jspdf?.jsPDF;
        if (!jsPDF) {
            await new Promise<void>((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = () => {
                    const autoTableScript = document.createElement('script');
                    autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
                    autoTableScript.onload = () => resolve();
                    document.body.appendChild(autoTableScript);
                };
                document.body.appendChild(script);
            });
        }

        const PDF = (window as any).jspdf?.jsPDF;
        const doc = new PDF({ orientation: 'landscape' });

        doc.setFontSize(16);
        doc.text(`Class Timetable - ${selectedClass}${selectedStream ? ` (${selectedStream})` : ''}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

        const headers = ['Period', 'Time', ...DAYS_OF_WEEK];
        const rows = lessonPeriods.map(period => {
            const row: string[] = [
                period.name,
                `${period.startTime} - ${period.endTime}`,
            ];
            DAYS_OF_WEEK.forEach(day => {
                const entry = getTimetableEntry(period.id, day);
                const teacher = entry?.teacherId ? teachers.find(t => t.id === entry.teacherId)?.name : '';
                const cell = entry?.subject ? `${entry.subject}${teacher ? `\n(${teacher})` : ''}` : '-';
                row.push(cell);
            });
            return row;
        });

        (doc as any).autoTable({
            head: [headers],
            body: rows,
            startY: 28,
            theme: 'grid',
            headStyles: { fillColor: [123, 17, 19], textColor: 255, fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 30 },
            },
        });

        doc.save(`timetable-${selectedClass}${selectedStream ? `-${selectedStream}` : ''}.pdf`);
    };

    const exportTeacherTimetablePDF = async (teacherId: number) => {
        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return;

        const jsPDF = (window as any).jspdf?.jsPDF;
        if (!jsPDF) {
            await new Promise<void>((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = () => {
                    const autoTableScript = document.createElement('script');
                    autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
                    autoTableScript.onload = () => resolve();
                    document.body.appendChild(autoTableScript);
                };
                document.body.appendChild(script);
            });
        }

        const PDF = (window as any).jspdf?.jsPDF;
        const doc = new PDF({ orientation: 'landscape' });

        doc.setFontSize(16);
        doc.text(`Teacher Timetable - ${teacher.name}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

        const teacherEntries = timetableEntries.filter(e => e.teacherId === teacherId);
        const headers = ['Period', 'Time', ...DAYS_OF_WEEK];
        const rows = lessonPeriods.map(period => {
            const row: string[] = [
                period.name,
                `${period.startTime} - ${period.endTime}`,
            ];
            DAYS_OF_WEEK.forEach(day => {
                const entry = teacherEntries.find(e => e.periodId === period.id && e.dayOfWeek === day);
                const cell = entry?.subject ? `${entry.subject}\n(${entry.classLevel}${entry.stream ? `-${entry.stream}` : ''})` : '-';
                row.push(cell);
            });
            return row;
        });

        (doc as any).autoTable({
            head: [headers],
            body: rows,
            startY: 28,
            theme: 'grid',
            headStyles: { fillColor: [30, 58, 95], textColor: 255, fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 30 },
            },
        });

        doc.save(`teacher-timetable-${teacher.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    };

    const [showExportMenu, setShowExportMenu] = useState(false);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className={`text-lg font-semibold ${textColor}`}>Class Timetables</h2>
                <div className="flex flex-wrap gap-2">
                    <select
                        value={selectedClass}
                        onChange={(e) => onClassChange(e.target.value)}
                        className={`px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor} min-h-[44px]`}
                    >
                        {CLASS_LEVELS.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowPeriodSettings(!showPeriodSettings)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${inputBorder} ${textColor} min-h-[44px]`}
                    >
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">Periods</span>
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export PDF</span>
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showExportMenu && (
                            <div className={`absolute right-0 mt-1 w-56 rounded-lg shadow-lg border z-50 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                                <button
                                    onClick={() => { exportTimetablePDF(); setShowExportMenu(false); }}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 min-h-[44px] ${textColor}`}
                                >
                                    Class Timetable ({selectedClass})
                                </button>
                                <div className={`border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                                    <div className={`px-4 py-2 text-xs font-medium ${mutedText}`}>Teacher Timetables</div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {teachers.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => { exportTeacherTimetablePDF(t.id); setShowExportMenu(false); }}
                                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${textColor}`}
                                            >
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 min-h-[44px]"
                    >
                        Save Timetable
                    </button>
                </div>
            </div>

            {showPeriodSettings && (
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className={`font-medium ${textColor}`}>Period Configuration</h3>
                        <div className="flex gap-2">
                            {periods.length === 0 && (
                                <button
                                    onClick={onSeedPeriods}
                                    className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 min-h-[44px]"
                                >
                                    <RefreshCw className="w-3 h-3" /> Load Defaults
                                </button>
                            )}
                            <button
                                onClick={onAddPeriod}
                                className="flex items-center gap-1 px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 min-h-[44px]"
                            >
                                <Plus className="w-3 h-3" /> Add Period
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className={mutedText}>
                                    <th className="text-left py-2">Name</th>
                                    <th className="text-left py-2">Type</th>
                                    <th className="text-left py-2">Time</th>
                                    <th className="text-right py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {periods.map(period => (
                                    <tr key={period.id} className={`border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                                        <td className={`py-2 ${textColor}`}>{period.name}</td>
                                        <td className={`py-2 ${mutedText} capitalize`}>{period.periodType}</td>
                                        <td className={`py-2 ${mutedText}`}>{period.startTime} - {period.endTime}</td>
                                        <td className="py-2 text-right">
                                            <button onClick={() => onEditPeriod(period)} className="text-blue-600 hover:underline mr-2">Edit</button>
                                            <button onClick={() => onDeletePeriod(period.id)} className="text-red-600 hover:underline">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {lessonPeriods.length === 0 ? (
                <div className={`text-center py-12 ${mutedText}`}>
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No lesson periods configured. Add periods to create the timetable grid.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr>
                                <th className={`p-2 text-left border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'} ${textColor}`}>
                                    Period
                                </th>
                                {DAYS_OF_WEEK.map(day => (
                                    <th key={day} className={`p-2 text-center border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'} ${textColor}`}>
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {lessonPeriods.map(period => (
                                <tr key={period.id}>
                                    <td className={`p-2 border ${isDark ? 'border-gray-600' : 'border-gray-200'} ${textColor}`}>
                                        <div className="font-medium">{period.name}</div>
                                        <div className={`text-xs ${mutedText}`}>{period.startTime} - {period.endTime}</div>
                                    </td>
                                    {DAYS_OF_WEEK.map(day => {
                                        const entry = getTimetableEntry(period.id, day);
                                        return (
                                            <td key={day} className={`p-1 border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                                                <select
                                                    value={entry?.subject || ''}
                                                    onChange={(e) => updateCell(period.id, day, 'subject', e.target.value)}
                                                    className={`w-full px-2 py-1 text-xs rounded border ${inputBg} ${inputBorder} ${textColor} mb-1`}
                                                >
                                                    <option value="">Subject</option>
                                                    {SUBJECTS.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={entry?.teacherId || ''}
                                                    onChange={(e) => updateCell(period.id, day, 'teacherId', e.target.value ? parseInt(e.target.value) : null)}
                                                    className={`w-full px-2 py-1 text-xs rounded border ${inputBg} ${inputBorder} ${textColor}`}
                                                >
                                                    <option value="">Teacher</option>
                                                    {teachers.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

interface PeriodModalProps {
    period: TimetablePeriod | null;
    periods: TimetablePeriod[];
    onClose: () => void;
    onSave: (data: Partial<TimetablePeriod>) => void;
    isDark: boolean;
}

export function PeriodModal({
    period,
    periods,
    onClose,
    onSave,
    isDark,
}: PeriodModalProps) {
    const [formData, setFormData] = useState<Partial<TimetablePeriod>>({
        name: period?.name || '',
        periodType: period?.periodType || 'lesson',
        startTime: period?.startTime || '',
        endTime: period?.endTime || '',
        sortOrder: period?.sortOrder ?? periods.length,
        isActive: period?.isActive ?? true,
    });

    const inputBg = isDark ? 'bg-gray-700' : 'bg-white';
    const inputBorder = isDark ? 'border-gray-600' : 'border-gray-300';
    const textColor = isDark ? 'text-white' : 'text-gray-900';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg max-w-md w-full`}>
                <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h2 className={`text-xl font-bold ${textColor}`}>{period ? 'Edit Period' : 'New Period'}</h2>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Period Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            placeholder="e.g., Period 1, Break, Lunch"
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Type</label>
                        <select
                            value={formData.periodType}
                            onChange={(e) => setFormData(prev => ({ ...prev, periodType: e.target.value }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                        >
                            <option value="lesson">Lesson</option>
                            <option value="break">Break</option>
                            <option value="assembly">Assembly</option>
                            <option value="games">Games/Sports</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${textColor}`}>Start Time</label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${textColor}`}>End Time</label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                                className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${textColor}`}>Sort Order</label>
                        <input
                            type="number"
                            value={formData.sortOrder}
                            onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }))}
                            className={`w-full px-3 py-2 rounded-lg border ${inputBg} ${inputBorder} ${textColor}`}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                            className="rounded"
                        />
                        <label htmlFor="isActive" className={textColor}>Active</label>
                    </div>
                </div>
                <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg border ${inputBorder} ${textColor} min-h-[44px]`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave({ ...formData, id: period?.id })}
                        className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 min-h-[44px]"
                    >
                        {period ? 'Update' : 'Create'} Period
                    </button>
                </div>
            </div>
        </div>
    );
}
