
import { Clock, Calendar, CheckCircle2, ChevronRight, MoreHorizontal } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface Exam {
    id: number;
    subject: string;
    date: string; // YYYY-MM-DD
    startTime: string;
    endTime: string;
    status: 'confirmed' | 'pending' | 'completed';
}

interface UpcomingExamWidgetProps {
    exams: Exam[];
    onViewAll?: () => void;
    isDark?: boolean;
}

export function UpcomingExamWidget({ exams, onViewAll, isDark = false }: UpcomingExamWidgetProps) {
    // Sort by date nearest to today
    const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3);

    const getDayLeft = (dateStr: string) => {
        const diff = differenceInDays(new Date(dateStr), new Date());
        if (diff === 0) return 'Today';
        if (diff === 1) return 'Tomorrow';
        return `${diff} Days left`;
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'completed': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
            default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Upcoming Exams</h3>
                <button onClick={onViewAll} className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                    View All <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-4">
                {sortedExams.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">No upcoming exams found.</div>
                ) : (
                    sortedExams.map((exam, idx) => (
                        <div
                            key={exam.id}
                            className={`p-4 rounded-xl border transition-all hover:scale-[1.02] cursor-default
                ${idx === 0
                                    ? 'bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-800/30'
                                    : 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-700/50'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 inline-block ${idx === 0 ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'}`}>
                                        {exam.date ? format(new Date(exam.date), 'MMM d') : 'TBA'}
                                    </span>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{exam.subject} Exam</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        <Clock className="w-3 h-3" />
                                        {exam.startTime} - {exam.endTime}
                                    </div>
                                </div>
                                <div className={`text-xs font-semibold px-2 py-1.5 rounded-lg ${idx === 0 ? 'bg-white text-violet-600 shadow-sm dark:bg-gray-800 dark:text-violet-300' : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                    {getDayLeft(exam.date)}
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                                <div className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${statusColor(exam.status)}`}>
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span className="capitalize">{exam.status}</span>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
