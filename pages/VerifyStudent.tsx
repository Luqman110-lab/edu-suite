import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/UIComponents';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface VerificationData {
    valid: boolean;
    student?: {
        name: string;
        photoBase64?: string;
        classLevel: string;
        stream: string;
        schoolName: string;
        status: 'Active' | 'Inactive';
        indexNumber: string;
        // Extended
        medicalInfo?: {
            bloodGroup?: string;
            allergies?: string;
            medicalConditions?: string;
        };
        emergencyContacts?: {
            name: string;
            relationship: string;
            phone: string;
        }[];
        boardingStatus?: string;
        houseOrDormitory?: string;
        latestAcademic?: {
            term: number;
            year: number;
            aggregate?: number;
            division?: string;
        };
        academicHistory?: {
            term: number;
            year: number;
            aggregate?: number;
            division?: string;
        }[];
        testScores?: {
            score?: number;
            division?: string;
            sessionName: string;
            testType: string;
            term: number;
            year: number;
            date?: string;
        }[];
    };
    message?: string;
}

export function VerifyStudent() {
    const { id } = useParams();
    const [data, setData] = useState<VerificationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'medical'>('profile');

    useEffect(() => {
        if (!id) return;
        fetch(`/api/public/verify-student/${id}`)
            .then(res => {
                if (!res.ok) throw new Error('Verification failed');
                return res.json();
            })
            .then(setData)
            .catch(err => {
                console.error(err);
                setError('Unable to verify student ID. Please try again or contact the school.');
            })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0052CC] mx-auto mb-4" />
                    <p className="text-gray-600">Verifying Identity...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                    <p className="text-gray-600 mb-6">{error || 'Invalid ID Card'}</p>
                </Card>
            </div>
        );
    }

    const { student } = data;

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Card className="max-w-md w-full overflow-hidden">
                <div className={`p-6 text-center ${data.valid ? 'bg-green-50' : 'bg-red-50'}`}>
                    {data.valid ? (
                        <>
                            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-2" />
                            <h2 className="text-2xl font-bold text-green-800">Valid Identity</h2>
                        </>
                    ) : (
                        <>
                            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-2" />
                            <h2 className="text-2xl font-bold text-red-800">Invalid Identity</h2>
                        </>
                    )}
                </div>

                {student && (
                    <div className="p-0">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Profile
                            </button>
                            <button
                                onClick={() => setActiveTab('academic')}
                                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'academic' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Academics
                            </button>
                            <button
                                onClick={() => setActiveTab('medical')}
                                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'medical' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Medical
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Profile Tab */}
                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="w-32 h-32 rounded-lg bg-gray-200 overflow-hidden border-4 border-white shadow-lg mx-auto mb-4">
                                            {student.photoBase64 ? (
                                                <img src={student.photoBase64} alt={student.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900">{student.name}</h3>
                                        <p className="text-gray-500">{student.indexNumber}</p>
                                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {student.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <span className="block text-gray-500 mb-1">Class</span>
                                            <span className="font-semibold text-gray-900">{student.classLevel} {student.stream}</span>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg">
                                            <span className="block text-gray-500 mb-1">Boarding Status</span>
                                            <span className="font-semibold text-gray-900 capitalize">
                                                {student.boardingStatus || 'Day'}
                                                {student.houseOrDormitory && ` (${student.houseOrDormitory})`}
                                            </span>
                                        </div>
                                    </div>

                                    {student.emergencyContacts && student.emergencyContacts.length > 0 && (
                                        <div className="pt-4 border-t">
                                            <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Emergency Contacts</h4>
                                            <div className="space-y-3">
                                                {student.emergencyContacts.map((contact, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm">
                                                        <div>
                                                            <p className="font-medium text-gray-900">{contact.name}</p>
                                                            <p className="text-gray-500 text-xs">{contact.relationship}</p>
                                                        </div>
                                                        <a href={`tel:${contact.phone}`} className="text-[#0052CC] font-medium bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100">
                                                            {contact.phone}
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Academic Tab */}
                            {activeTab === 'academic' && (
                                <div className="space-y-6">
                                    {/* Latest Summary */}
                                    {student.latestAcademic && (
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <h4 className="text-sm font-bold text-blue-900 mb-3 uppercase tracking-wider">Latest Performance</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-blue-600 text-xs uppercase">Latest Result</p>
                                                    <p className="text-blue-900 font-medium">Term {student.latestAcademic.term} {student.latestAcademic.year}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-blue-600 text-xs uppercase">Agg / Div</p>
                                                    <p className="text-blue-900 font-bold text-lg">
                                                        {student.latestAcademic.aggregate ?? '-'} / {student.latestAcademic.division ?? '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Academic History */}
                                    {student.academicHistory && student.academicHistory.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 mb-3">Term Reports History</h4>
                                            <div className="border rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 text-gray-500">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left font-medium">Period</th>
                                                            <th className="px-3 py-2 text-center font-medium">Agg</th>
                                                            <th className="px-3 py-2 text-center font-medium">Div</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {student.academicHistory.map((rec, idx) => (
                                                            <tr key={idx} className="hover:bg-gray-50">
                                                                <td className="px-3 py-2 text-gray-900">
                                                                    T{rec.term} {rec.year}
                                                                </td>
                                                                <td className="px-3 py-2 text-center text-gray-600 font-medium">{rec.aggregate || '-'}</td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${['I', '1'].includes(String(rec.division)) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                        {rec.division || '-'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Test Scores */}
                                    {student.testScores && student.testScores.length > 0 && (
                                        <div className="pt-4 border-t">
                                            <h4 className="text-sm font-bold text-gray-900 mb-3">Weekly & Exam Tests</h4>
                                            <div className="space-y-3">
                                                {student.testScores.map((test, idx) => (
                                                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                                        <div>
                                                            <p className="font-medium text-gray-900">{test.sessionName}</p>
                                                            <p className="text-xs text-gray-500">{test.testType} • T{test.term} {test.year}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-gray-900">{test.score ?? '-'}</p>
                                                            {test.division && <p className="text-xs text-gray-500">Div {test.division}</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Medical Tab */}
                            {activeTab === 'medical' && (
                                <div className="space-y-6">
                                    {(student.medicalInfo?.allergies || student.medicalInfo?.medicalConditions || student.medicalInfo?.bloodGroup) ? (
                                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                            <h4 className="text-sm font-bold text-red-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                                                Medical Alert
                                            </h4>
                                            <div className="space-y-3 text-sm text-red-800">
                                                <div className="flex justify-between border-b border-red-100 pb-2">
                                                    <span className="font-semibold">Blood Group</span>
                                                    <span>{student.medicalInfo.bloodGroup || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="block font-semibold mb-1">Allergies</span>
                                                    <p className="bg-white bg-opacity-50 p-2 rounded">{student.medicalInfo.allergies || 'None reported'}</p>
                                                </div>
                                                <div>
                                                    <span className="block font-semibold mb-1">Medical Conditions</span>
                                                    <p className="bg-white bg-opacity-50 p-2 rounded">{student.medicalInfo.medicalConditions || 'None reported'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>No medical alerts on file.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t text-center bg-gray-50">
                            <p className="text-xs text-gray-400">Student at</p>
                            <p className="font-semibold text-gray-600">{student.schoolName}</p>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
