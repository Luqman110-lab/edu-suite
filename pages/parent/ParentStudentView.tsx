import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Clock, Award, FileText, Download } from "lucide-react";
import { useState } from "react";

export default function ParentStudentView() {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState<'overview' | 'academics'>('overview');

    const { data: info, isLoading, error } = useQuery({
        queryKey: ['parent-student', id],
        queryFn: async () => {
            const res = await fetch(`/api/parent/student/${id}`);
            if (!res.ok) throw new Error('Failed to fetch student details');
            return res.json();
        }
    });

    if (isLoading) return <div className="p-8 text-center">Loading student details...</div>;
    if (error || !info) return <div className="p-8 text-center text-red-500">Student not found</div>;

    const { student, academic } = info;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <Link to="/parent" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
            </Link>

            {/* Student Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col md:flex-row gap-6 items-center md:items-start">
                <div className="w-24 h-24 bg-gray-100 rounded-full border-4 border-white shadow-lg overflow-hidden flex-shrink-0">
                    {student.photoBase64 ? (
                        <img src={student.photoBase64} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                    )}
                </div>
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                    <p className="text-gray-500">{student.indexNumber}</p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                            {student.classLevel} {student.stream}
                        </span>
                        <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium capitalize">
                            {student.boardingStatus}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-white px-6 rounded-t-lg">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('academics')}
                    className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === 'academics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Academic History
                </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
                {activeTab === 'overview' && (
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Latest Result Card */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Award className="w-5 h-5 text-yellow-600" />
                                    <h3 className="font-bold text-gray-900">Latest Performance</h3>
                                </div>
                                {academic.latest ? (
                                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">
                                            Term {academic.latest.term} {academic.latest.year}
                                        </p>
                                        <div className="flex justify-center gap-8 items-end">
                                            <div>
                                                <p className="text-3xl font-bold text-gray-900">{academic.latest.aggregate}</p>
                                                <p className="text-xs text-gray-500">Aggregate</p>
                                            </div>
                                            <div className="h-8 w-px bg-gray-300"></div>
                                            <div>
                                                <p className="text-3xl font-bold text-gray-900">{academic.latest.division}</p>
                                                <p className="text-xs text-gray-500">Division</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm text-center py-4">No recent marks available.</p>
                                )}
                            </div>
                        </div>

                        {/* Recent Tests */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Clock className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-bold text-gray-900">Recent Tests</h3>
                                </div>
                                <div className="space-y-3">
                                    {(academic.tests || []).slice(0, 3).map((test: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded">
                                            <div>
                                                <p className="font-medium text-gray-900">{test.sessionName}</p>
                                                <p className="text-xs text-gray-500">{test.testType}</p>
                                            </div>
                                            <span className="font-bold text-gray-900">{test.score}</span>
                                        </div>
                                    ))}
                                    {(!academic.tests || academic.tests.length === 0) && (
                                        <p className="text-center text-gray-500 py-2">No recent test scores.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'academics' && (
                    <div className="space-y-6">
                        {/* Term History */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-6">
                                <h3 className="font-bold text-gray-900 mb-4">Term Reports</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium">Period</th>
                                                <th className="px-4 py-3 text-center font-medium">Agg</th>
                                                <th className="px-4 py-3 text-center font-medium">Div</th>
                                                <th className="px-4 py-3 text-right font-medium">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {academic.history.map((rec: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">Term {rec.term} {rec.year}</td>
                                                    <td className="px-4 py-3 text-center font-medium">{rec.aggregate}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-xs ${['1', 'I'].includes(rec.division) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                            {rec.division}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center">
                                                            <Download className="w-3 h-3 mr-1" />
                                                            Download PDF
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* All Tests */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-6">
                                <h3 className="font-bold text-gray-900 mb-4">All Test Scores</h3>
                                <div className="space-y-3">
                                    {academic.tests.map((test: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-sm p-3 border rounded hover:bg-gray-50 transition-colors">
                                            <div>
                                                <p className="font-medium text-gray-900">{test.sessionName}</p>
                                                <p className="text-xs text-gray-500">
                                                    {test.testType} • Term {test.term} {test.year}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-xl text-gray-900">{test.score}</p>
                                                {test.division && <p className="text-xs text-gray-500">Div {test.division}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
