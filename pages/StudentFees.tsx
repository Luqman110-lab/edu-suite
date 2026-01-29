import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react';
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
                    <CardHeader>
                        <CardTitle>Select Student</CardTitle>
                        <CardDescription>Search for a student to customize their fee structure</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search students..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {isSearching && <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}

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
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Form Card */}
                    <Card className="md:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle>Add Custom Fee</CardTitle>
                            <CardDescription>For {selectedStudent.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSave} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Term & Year</Label>
                                    <div className="flex gap-2">
                                        <Select value={term} onValueChange={setTerm}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Term 1</SelectItem>
                                                <SelectItem value="2">Term 2</SelectItem>
                                                <SelectItem value="3">Term 3</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-20" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Fee Type</Label>
                                    <Select value={feeType} onValueChange={setFeeType}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Tuition">Tuition</SelectItem>
                                            <SelectItem value="Transport">Transport</SelectItem>
                                            <SelectItem value="Uniform">Uniform</SelectItem>
                                            <SelectItem value="Meals">Meals</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Custom Amount</Label>
                                    <Input
                                        type="number"
                                        value={customAmount}
                                        onChange={e => setCustomAmount(e.target.value)}
                                        placeholder="New amount"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Reason</Label>
                                    <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Scholarship, sibling discount" />
                                </div>

                                <Button type="submit" className="w-full" disabled={saveOverrideMutation.isPending}>
                                    {saveOverrideMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Override
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* List Card */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Active Overrides</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingOverrides ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
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
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
