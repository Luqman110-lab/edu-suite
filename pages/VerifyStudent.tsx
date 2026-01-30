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
    };
    message?: string;
}

export function VerifyStudent() {
    const { id } = useParams();
    const [data, setData] = useState<VerificationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;

        // In a real implementation, this should call a public API
        // For now, we might need to rely on existing APIs which require auth,
        // so this page might redirect to login if not authenticated.
        // Ideally: fetch(`/api/public/verify-student/${id}`)

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
                    <div className="p-6">
                        <div className="flex justify-center mb-6">
                            <div className="w-32 h-32 rounded-lg bg-gray-200 overflow-hidden border-4 border-white shadow-lg">
                                {student.photoBase64 ? (
                                    <img src={student.photoBase64} alt={student.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 text-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{student.name}</h3>
                                <p className="text-gray-500">{student.indexNumber}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <span className="block text-gray-500 mb-1">Class</span>
                                    <span className="font-semibold text-gray-900">{student.classLevel} {student.stream}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <span className="block text-gray-500 mb-1">Status</span>
                                    <span className={`font-semibold ${student.status === 'Active' ? 'text-green-600' : 'text-red-600'}`}>
                                        {student.status}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <p className="text-sm text-gray-500">Student at</p>
                                <p className="font-semibold text-[#0052CC]">{student.schoolName}</p>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
