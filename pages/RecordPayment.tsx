import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2, ArrowLeft, Printer, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

// Define types locally if not exported centrally, or just use any for speed then refine
interface Student {
    id: number;
    name: string;
    classLevel: string;
    stream?: string;
    boardingStatus?: string;
    studentId?: string; // e.g. LIN/Index
}

interface FeeStructure {
    id: number;
    classLevel: string;
    feeType: string;
    amount: number;
    term: number;
    year: number;
    boardingStatus: string;
}

interface StudentFeeOverride {
    id: number;
    studentId: number;
    feeType: string;
    customAmount: number;
    term: number;
    year: number;
}

interface FeePayment {
    id: number;
    paymentDate: string;
    amountPaid: number;
    feeType: string;
    receiptNumber: string;
}

export default function RecordPayment() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    // Payment Form State
    const [feeType, setFeeType] = useState('Tuition');
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [term, setTerm] = useState('1');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [notes, setNotes] = useState('');

    // Search Query
    const { data: searchResults, isLoading: isSearching } = useQuery<Student[]>({
        queryKey: ['students-search', searchQuery],
        queryFn: async () => {
            if (!searchQuery || searchQuery.length < 2) return [];
            const res = await apiRequest('GET', `/api/students/search?q=${encodeURIComponent(searchQuery)}`);
            return res.json();
        },
        enabled: searchQuery.length >= 2,
    });

    // Fetch Fee Data for Selected Student
    const { data: feeStructures } = useQuery<FeeStructure[]>({
        queryKey: ['fee-structures'],
        queryFn: async () => {
            const res = await apiRequest('GET', '/api/fee-structures');
            return res.json();
        },
        enabled: !!selectedStudent,
    });

    const { data: overrides } = useQuery<StudentFeeOverride[]>({
        queryKey: ['student-fee-overrides', selectedStudent?.id],
        queryFn: async () => {
            if (!selectedStudent) return [];
            const res = await apiRequest('GET', `/api/student-fee-overrides/${selectedStudent.id}`);
            return res.json();
        },
        enabled: !!selectedStudent,
    });

    const { data: recentPayments } = useQuery<FeePayment[]>({
        queryKey: ['recent-payments-student', selectedStudent?.id],
        queryFn: async () => {
            // We reuse the generic endpoint but filtering by student would be better.
            // For now, let's fetch all and filter or add a specific endpoint if volume is high.
            // Actually, the main Finance View shows all payments.
            // Let's assume we might need a specific endpoint or just fetch last few.
            // For now, let's just use the `finance-transactions` endpoint which shows balance.
            return [];
        },
        enabled: false // Skipping history for now to focus on recording
    });

    const createPaymentMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest('POST', '/api/fee-payments', data);
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Payment Recorded",
                description: "Transaction has been saved successfully.",
            });
            queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
            queryClient.invalidateQueries({ queryKey: ['fee-payments'] });
            // Reset form
            setAmountPaid('');
            setNotes('');
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to record payment",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSearchSelect = (student: Student) => {
        setSelectedStudent(student);
        setSearchQuery(''); // Clear search to show student details
    };

    const getAmountDue = () => {
        if (!selectedStudent || !feeStructures) return 0;

        // Check for override
        const override = overrides?.find(o =>
            o.feeType === feeType &&
            o.term === parseInt(term) &&
            o.year === parseInt(year)
        );

        if (override) return override.customAmount;

        // Find standard fee
        const structure = feeStructures.find(s =>
            s.feeType === feeType &&
            s.classLevel === selectedStudent.classLevel &&
            (s.boardingStatus === 'all' || s.boardingStatus === selectedStudent.boardingStatus) &&
            s.term === parseInt(term) &&
            s.year === parseInt(year)
        );

        return structure ? structure.amount : 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        const amount = parseInt(amountPaid);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Invalid Amount", variant: "destructive" });
            return;
        }

        createPaymentMutation.mutate({
            studentId: selectedStudent.id,
            feeType,
            amountDue: getAmountDue(),
            amountPaid: amount,
            term: parseInt(term),
            year: parseInt(year),
            paymentMethod,
            notes
        });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => selectedStudent ? setSelectedStudent(null) : navigate('/app/finance')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {selectedStudent ? 'Back to Search' : 'Back to Finance'}
                </Button>
                <h1 className="text-2xl font-bold">Record Payment</h1>
            </div>

            {!selectedStudent ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Find Student</CardTitle>
                        <CardDescription>Search by name or admission number</CardDescription>
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
                                            <p className="text-sm text-gray-500">{student.classLevel} {student.stream} • {student.studentId || 'No ID'}</p>
                                        </div>
                                        <Button variant="outline" size="sm">Select</Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchQuery.length >= 2 && searchResults?.length === 0 && !isSearching && (
                            <div className="text-center p-4 text-gray-500">No students found</div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Student Info Card */}
                    <Card className="md:col-span-1 h-fit">
                        <CardHeader>
                            <CardTitle>{selectedStudent.name}</CardTitle>
                            <CardDescription>Student Details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Class:</span>
                                <span className="font-medium">{selectedStudent.classLevel} {selectedStudent.stream}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Boarding Status:</span>
                                <span className="font-medium">{selectedStudent.boardingStatus || 'N/A'}</span>
                            </div>
                            <div className="pt-4 border-t mt-4">
                                <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Expected Fees (Current Term)</div>
                                {/* Simple preview of what they should pay */}
                                {feeStructures?.filter(f =>
                                    f.classLevel === selectedStudent.classLevel &&
                                    f.year === parseInt(year) &&
                                    f.term === parseInt(term) &&
                                    (f.boardingStatus === 'all' || f.boardingStatus === selectedStudent.boardingStatus)
                                ).map(f => (
                                    <div key={f.id} className="flex justify-between text-sm mb-1">
                                        <span>{f.feeType}</span>
                                        <span>{f.amount.toLocaleString()} UGX</span>
                                    </div>
                                ))}
                                {(!feeStructures || feeStructures.length === 0) && <p className="text-sm text-gray-400 italic">No fee structure found for this term.</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Form */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>New Transaction</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Term</Label>
                                        <Select value={term} onValueChange={setTerm}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">Term 1</SelectItem>
                                                <SelectItem value="2">Term 2</SelectItem>
                                                <SelectItem value="3">Term 3</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Year</Label>
                                        <Input type="number" value={year} onChange={e => setYear(e.target.value)} />
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
                                            <SelectItem value="Development">Development</SelectItem>
                                            <SelectItem value="Registration">Registration</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Amount Due (Auto-calculated)</Label>
                                        <div className="p-2 bg-gray-100 rounded-md font-medium text-right">
                                            {getAmountDue().toLocaleString()} UGX
                                        </div>
                                        {overrides?.some(o => o.feeType === feeType && o.term === parseInt(term) && o.year === parseInt(year)) && (
                                            <p className="text-xs text-amber-600">Custom amount applied</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Amount Paid <span className="text-red-500">*</span></Label>
                                        <Input
                                            type="number"
                                            value={amountPaid}
                                            onChange={e => setAmountPaid(e.target.value)}
                                            placeholder="Enter amount"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Payment Method</Label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                            <SelectItem value="Bank Deposit">Bank Deposit</SelectItem>
                                            <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                                            <SelectItem value="Cheque">Cheque</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Receipt number, breakdown, etc." />
                                </div>

                                <Button type="submit" className="w-full" disabled={createPaymentMutation.isPending}>
                                    {createPaymentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Record Payment
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
