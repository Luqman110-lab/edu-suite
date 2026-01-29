import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, Input, Spinner } from '../components/UIComponents';
import { Button } from '../components/Button';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, ArrowLeft, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Student {
    id: number;
    name: string;
    classLevel: string;
    stream?: string;
    studentId?: string;
}

interface StudentFeeOverride {
    id: number;
    studentId: number;
    feeType: string;
    customAmount: number;
    term: number;
    year: number;
    reason?: string;
}

export default function StudentFees() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    // Override Form
    const [feeType, setFeeType] = useState('Tuition');
    const [customAmount, setCustomAmount] = useState('');
    const [term, setTerm] = useState('1');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [reason, setReason] = useState('');

    // Search
    const { data: searchResults, isLoading: isSearching } = useQuery<Student[]>({
        queryKey: ['students-search', searchQuery],
        queryFn: async () => {
            if (!searchQuery || searchQuery.length < 2) return [];
            const res = await apiRequest('GET', `/api/students/search?q=${encodeURIComponent(searchQuery)}`);
            return res.json();
        },
        enabled: searchQuery.length >= 2,
    });

    // Fetch Overrides
    const { data: overrides, isLoading: isLoadingOverrides } = useQuery<StudentFeeOverride[]>({
        queryKey: ['student-fee-overrides', selectedStudent?.id],
        queryFn: async () => {
            if (!selectedStudent) return [];
            const res = await apiRequest('GET', `/api/student-fee-overrides/${selectedStudent.id}`);
            return res.json();
        },
        enabled: !!selectedStudent,
    });

    const saveOverrideMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest('POST', '/api/student-fee-overrides', data);
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Fee Structure Updated", description: "Custom fee applied successfully." });
            queryClient.invalidateQueries({ queryKey: ['student-fee-overrides', selectedStudent?.id] });
            setCustomAmount('');
            setReason('');
        },
        onError: (error: Error) => {
            toast({ title: "Failed to update fee", description: error.message, variant: "destructive" });
        },
    });

    const handleSearchSelect = (student: Student) => {
        setSelectedStudent(student);
        setSearchQuery('');
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        if (!customAmount || parseInt(customAmount) < 0) {
            toast({ title: "Invalid Amount", variant: "destructive" });
            return;
        }

        saveOverrideMutation.mutate({
            studentId: selectedStudent.id,
            feeType,
            customAmount: parseInt(customAmount),
            term: parseInt(term),
            year: parseInt(year),
            reason
        });
    };

    // Helper for Select elements
    const renderSelect = (label: string, value: string, onChange: (val: string) => void, options: { value: string, label: string }[]) => (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {label}
            </label>
            <div className="relative">
                <select
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 appearance-none transition-all"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => selectedStudent ? setSelectedStudent(null) : navigate('/app/finance')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {selectedStudent ? 'Back to Search' : 'Back to Finance'}
                </Button>
                <h1 className="text-2xl font-bold">Individual Fee Structures</h1>
            </div>

            {!selectedStudent ? (
                <Card>
                    <div className="mb-6">
                        <h3 className="text-lg font-bold">Select Student</h3>
                        <p className="text-sm text-gray-500">Search for a student to customize their fee structure</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" style={{ zIndex: 10 }} />
                        <Input
                            placeholder="Search students..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {isSearching && <div className="p-4 text-center"><Spinner /></div>}

                    {searchResults && searchResults.length > 0 && (
                        <div className="mt-4 border rounded-md divide-y">
                            {searchResults.map(student => (
                                <div
                                    key={student.id}
                                    className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                    onClick={() => handleSearchSelect(student)}
                                >
                                    <div>
                                        <p className="font-medium">{student.name}</p>
                                        <p className="text-sm text-gray-500">{student.classLevel} {student.stream}</p>
                                    </div>
                                    <Button variant="outline" size="sm">Modify Fees</Button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Form Card */}
                    <Card className="md:col-span-1 h-fit">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold">Add Custom Fee</h3>
                            <p className="text-sm text-gray-500">For {selectedStudent.name}</p>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Term & Year</label>
                                <div className="flex gap-2">
                                    <div className="relative w-full">
                                        <select
                                            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 appearance-none"
                                            value={term}
                                            onChange={(e) => setTerm(e.target.value)}
                                        >
                                            <option value="1">Term 1</option>
                                            <option value="2">Term 2</option>
                                            <option value="3">Term 3</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        value={year}
                                        onChange={e => setYear(e.target.value)}
                                        className="w-24 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                    />
                                </div>
                            </div>

                            {renderSelect("Fee Type", feeType, setFeeType, [
                                { value: "Tuition", label: "Tuition" },
                                { value: "Transport", label: "Transport" },
                                { value: "Uniform", label: "Uniform" },
                                { value: "Meals", label: "Meals" }
                            ])}

                            <Input
                                label="Custom Amount"
                                type="number"
                                value={customAmount}
                                onChange={e => setCustomAmount(e.target.value)}
                                placeholder="New amount"
                                required
                            />

                            <Input
                                label="Reason"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="e.g. Scholarship"
                            />

                            <Button type="submit" fullWidth disabled={saveOverrideMutation.isPending} loading={saveOverrideMutation.isPending}>
                                Save Override
                            </Button>
                        </form>
                    </Card>

                    {/* List Card */}
                    <Card className="md:col-span-2">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold">Active Overrides</h3>
                        </div>
                        {isLoadingOverrides ? (
                            <div className="flex justify-center p-4"><Spinner /></div>
                        ) : overrides && overrides.length > 0 ? (
                            <div className="border rounded-md">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="p-3">Fee Type</th>
                                            <th className="p-3">Details</th>
                                            <th className="p-3">Custom Amount</th>
                                            <th className="p-3">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {overrides.map(ov => (
                                            <tr key={ov.id}>
                                                <td className="p-3 font-medium">{ov.feeType}</td>
                                                <td className="p-3 text-gray-500">Term {ov.term} {ov.year}</td>
                                                <td className="p-3 font-bold text-blue-600">{ov.customAmount.toLocaleString()} UGX</td>
                                                <td className="p-3 text-gray-500">{ov.reason || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-md">
                                No custom fee overrides found for this student.
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
