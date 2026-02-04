import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, AlertCircle, ChevronRight, School } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ParentDashboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['parent-dashboard'],
        queryFn: async () => {
            const res = await fetch('/api/parent/dashboard');
            if (!res.ok) throw new Error('Failed to fetch dashboard');
            return res.json();
        }
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
    if (error) return (
        <div className="p-8 text-center text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-lg font-bold">Unable to load dashboard</h2>
            <p className="text-sm">Please try again later or contact support.</p>
        </div>
    );

    const children = data?.children || [];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Children</h1>
                <p className="text-gray-500">View performance and reports for your children.</p>
            </div>

            {children.length === 0 ? (
                <div className="bg-white p-8 rounded-lg border text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No children linked to your account.</p>
                    <p className="text-sm">Please contact the school administration.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {children.map((child: any) => (
                        <Link to={`/parent/student/${child.id}`} key={child.id}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-[#0052CC]">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex-shrink-0 overflow-hidden border">
                                        {child.photoBase64 ? (
                                            <img src={child.photoBase64} alt={child.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <Users className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 truncate">{child.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                                                {child.classLevel} {child.stream}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${child.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {child.status}
                                            </span>
                                        </div>
                                        {child.schoolName && (
                                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                                                <School className="w-3 h-3" />
                                                {child.schoolName}
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
