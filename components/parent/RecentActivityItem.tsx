import { DollarSign, Award, Bell } from "lucide-react";

interface RecentActivityItemProps {
    activity: {
        type: 'mark' | 'payment' | string;
        message: string;
        date?: string;
        studentId: number; // Keep studentId for potential future linking
    };
    idx: number; // Used for key in map
}

export default function RecentActivityItem({ activity, idx }: RecentActivityItemProps) {
    return (
        <div key={idx} className="p-4 flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${activity.type === 'mark' ? 'bg-blue-100 text-blue-600' :
                activity.type === 'payment' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                }`}>
                {activity.type === 'mark' ? <Award className="w-4 h-4" /> :
                    activity.type === 'payment' ? <DollarSign className="w-4 h-4" /> :
                        <Bell className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                    {activity.date ? new Date(activity.date).toLocaleDateString() : ''}
                </p>
            </div>
        </div>
    );
}
