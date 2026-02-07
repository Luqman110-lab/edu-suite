import { Link } from "react-router-dom";
import { Users, ChevronRight, DollarSign, Award } from "lucide-react";

interface ParentChildCardProps {
    child: {
        id: number;
        name: string;
        photoBase64?: string;
        classLevel: string;
        stream: string;
        latestGrade?: {
            term: number;
            year: number;
            aggregate: number;
            division: string;
        } | null;
        feeBalance: number;
        attendanceRate: number;
    };
}

export default function ParentChildCard({ child }: ParentChildCardProps) {
    return (
        <Link to={`/parent/student/${child.id}`} key={child.id} className="block">
            <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow p-5">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex-shrink-0 overflow-hidden border-2 border-blue-100">
                        {child.photoBase64 ? (
                            <img src={child.photoBase64} alt={child.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                                                <Users className="w-6 h-6" aria-label="Users icon" />                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{child.name}</h3>
                        <p className="text-sm text-gray-500">{child.classLevel} {child.stream}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500">Grade</p>
                        <p className="font-bold text-blue-700">
                            {child.latestGrade ? `Agg ${child.latestGrade.aggregate}` : 'N/A'}
                        </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500">Attendance</p>
                        <p className="font-bold text-green-700">{child.attendanceRate}%</p>
                    </div>
                    <div className={`rounded-lg p-2 ${child.feeBalance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className="text-xs text-gray-500">Fees</p>
                        <p className={`font-bold text-sm ${child.feeBalance > 0 ? 'UGX ' + (child.feeBalance / 1000).toFixed(0) + 'k' : 'Paid'}`}>
                            {child.feeBalance > 0 ? `UGX ${(child.feeBalance / 1000).toFixed(0)}k` : 'Paid'}
                        </p>
                    </div>
                </div>
            </div>
        </Link>
    );
}
