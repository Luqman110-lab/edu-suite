import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, Input, Spinner } from '../components/UIComponents';
import { Button } from '../components/Button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Calendar, DollarSign, User, CheckCircle, Clock, AlertCircle, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { StudentFilter } from '@/components/StudentFilter';

// Types
interface PaymentPlan {
    id: number;
    planName: string;
    totalAmount: number;
    downPayment: number;
    installmentCount: number;
    frequency: 'weekly' | 'monthly';
    startDate: string;
    status: 'active' | 'completed' | 'defaulted' | 'cancelled';
    student?: { name: string; classLevel: string; stream: string };
    installments?: PlanInstallment[];
}

interface PlanInstallment {
    id: number;
    installmentNumber: number;
    dueDate: string;
    amount: number;
    paidAmount: number;
    status: 'pending' | 'paid' | 'partial' | 'overdue';
}

interface CreatePlanData {
    studentId: number;
    planName: string;
    totalAmount: number;
    downPayment: number;
    installmentCount: number;
    frequency: 'weekly' | 'monthly';
    startDate: string;
}

export default function PaymentPlans() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [view, setView] = useState<'list' | 'create'>('list');
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [showPayModal, setShowPayModal] = useState<{ installment: PlanInstallment, plan: PaymentPlan } | null>(null);

    // Fetch Plans
    const { data: plans, isLoading } = useQuery<PaymentPlan[]>({
        queryKey: ['payment-plans'],
        queryFn: async () => {
            const res = await apiRequest('GET', '/api/payment-plans');
            return res.json();
        }
    });

    // Create Plan Logic
    const [formData, setFormData] = useState<Partial<CreatePlanData>>({
        frequency: 'monthly',
        installmentCount: 3,
        startDate: new Date().toISOString().split('T')[0]
    });

    const createPlanMutation = useMutation({
        mutationFn: async (data: CreatePlanData) => {
            const res = await apiRequest('POST', '/api/payment-plans', data);
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Plan Created", description: "Payment plan activated successfully." });
            queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
            setView('list');
            setFormData({ frequency: 'monthly', installmentCount: 3, startDate: new Date().toISOString().split('T')[0] });
            setSelectedStudent(null);
        },
        onError: () => toast({ title: "Failed", description: "Could not create payment plan", variant: "destructive" })
    });

    // Payment Logic (including MoMo)
    const [payMethod, setPayMethod] = useState<'cash' | 'momo'>('cash');
    const [momoPhone, setMomoPhone] = useState('');
    const [payAmount, setPayAmount] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showPayModal) return;

        setProcessingPayment(true);
        try {
            const amount = parseFloat(payAmount);

            if (payMethod === 'momo') {
                // Mobile Money Flow
                const res = await apiRequest('POST', '/api/finance/momo/pay', {
                    phoneNumber: momoPhone,
                    amount,
                    provider: 'mtn', // Default to MTN for mock
                    description: `Inst #${showPayModal.installment.installmentNumber} - ${showPayModal.plan.planName}`,
                    entityType: 'plan_installment',
                    entityId: showPayModal.installment.id
                });
                const data = await res.json();

                if (data.success) {
                    toast({
                        title: "Request Sent",
                        description: "Check your phone to approve the payment. (Mock: Auto-success in 5s)"
                    });
                }
            } else {
                // Cash Flow (Direct Record)
                await apiRequest('POST', `/api/payment-plans/${showPayModal.plan.id}/pay`, {
                    installmentId: showPayModal.installment.id,
                    amount
                });
                toast({ title: "Payment Recorded", description: "Cash payment saved." });
            }

            queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
            setShowPayModal(null);
            setPayAmount('');
            setMomoPhone('');
        } catch (error) {
            toast({ title: "Error", description: "Transaction failed", variant: "destructive" });
        } finally {
            setProcessingPayment(false);
        }
    };

    // Render Helpers
    const calculateInstallmentAmount = () => {
        if (!formData.totalAmount || !formData.installmentCount) return 0;
        const remaining = formData.totalAmount - (formData.downPayment || 0);
        return remaining / formData.installmentCount;
    };

    if (view === 'create') {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setView('list')}>← Back to Plans</Button>
                    <h2 className="text-2xl font-bold">Create Payment Plan</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="font-semibold mb-4 text-lg">1. Select Student</h3>
                        {!selectedStudent ? (
                            <StudentFilter onFilterChange={() => { }} simpleSelect onSelect={(s) => setSelectedStudent(s)} />
                        ) : (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="font-bold">{selectedStudent.name}</div>
                                    <div className="text-sm opacity-70">{selectedStudent.classLevel} {selectedStudent.stream}</div>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => setSelectedStudent(null)}>Change</Button>
                            </div>
                        )}
                    </Card>

                    <Card>
                        <h3 className="font-semibold mb-4 text-lg">2. Plan Details</h3>
                        <div className="space-y-4">
                            <Input
                                label="Plan Name (e.g. Term 1 Fees)"
                                value={formData.planName || ''}
                                onChange={e => setFormData({ ...formData, planName: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Total Amount"
                                    type="number"
                                    value={formData.totalAmount || ''}
                                    onChange={e => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) })}
                                />
                                <Input
                                    label="Down Payment"
                                    type="number"
                                    value={formData.downPayment || ''}
                                    onChange={e => setFormData({ ...formData, downPayment: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Installments"
                                    type="number"
                                    value={formData.installmentCount || ''}
                                    onChange={e => setFormData({ ...formData, installmentCount: parseInt(e.target.value) })}
                                />
                                <div>
                                    <label className="block text-sm font-medium mb-1">Frequency</label>
                                    <select
                                        className="w-full p-2 rounded-lg border bg-background"
                                        value={formData.frequency}
                                        onChange={e => setFormData({ ...formData, frequency: e.target.value as any })}
                                    >
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                            </div>
                            <Input
                                label="Start Date"
                                type="date"
                                value={formData.startDate || ''}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                    </Card>
                </div>

                <div className="flex justify-end pt-4">
                    <div className="text-right mr-6">
                        <div className="text-sm text-gray-500">Estimated Installment</div>
                        <div className="text-2xl font-bold">{calculateInstallmentAmount().toLocaleString()} <span className="text-sm font-normal">/ {formData.frequency}</span></div>
                    </div>
                    <Button
                        size="lg"
                        disabled={!selectedStudent || !formData.totalAmount || createPlanMutation.isPending}
                        onClick={() => createPlanMutation.mutate({
                            studentId: selectedStudent.id,
                            ...formData
                        } as CreatePlanData)}
                    >
                        {createPlanMutation.isPending ? <Spinner /> : 'Activate Plan'}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Active Payment Plans</h2>
                <Button onClick={() => setView('create')}>
                    <Plus className="w-4 h-4 mr-2" /> New Plan
                </Button>
            </div>

            {isLoading ? <div className="p-8 text-center"><Spinner /></div> : (
                <div className="grid grid-cols-1 gap-6">
                    {plans?.length === 0 && (
                        <Card className="text-center py-12 text-gray-500">
                            No active payment plans found. Create one to get started.
                        </Card>
                    )}
                    {plans?.map(plan => (
                        <Card key={plan.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-lg">{plan.planName}</h3>
                                            <div className="flex items-center text-sm text-gray-500 gap-2">
                                                <User className="w-4 h-4" /> {plan.student?.name}
                                                <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
                                                    {plan.student?.classLevel}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                                            }`}>
                                            {plan.status}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-4">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Progress</span>
                                            <span className="font-medium">
                                                {Math.round(((plan.installments?.reduce((acc, i) => acc + (i.paidAmount || 0), 0) || 0) + plan.downPayment) / plan.totalAmount * 100)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                            <div
                                                className="bg-blue-600 h-2.5 rounded-full"
                                                style={{ width: `${((plan.installments?.reduce((acc, i) => acc + (i.paidAmount || 0), 0) || 0) + plan.downPayment) / plan.totalAmount * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>Start: {new Date(plan.startDate).toLocaleDateString()}</span>
                                            <span>Total: {plan.totalAmount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Installments List */}
                                <div className="flex-1 border-t md:border-t-0 md:border-l md:pl-6 pt-4 md:pt-0">
                                    <h4 className="text-sm font-semibold mb-3">Installments</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {plan.installments?.map(inst => (
                                            <div key={inst.id} className="flex justify-between items-center text-sm p-2 rounded bg-gray-50 dark:bg-gray-800/50">
                                                <div className="flex items-center gap-2">
                                                    {inst.status === 'paid' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-orange-500" />}
                                                    <span className={inst.status === 'paid' ? 'line-through opacity-50' : ''}>
                                                        Due {new Date(inst.dueDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-medium">{(inst.amount - (inst.paidAmount || 0)).toLocaleString()}</span>
                                                    {inst.status !== 'paid' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs"
                                                            onClick={() => {
                                                                setShowPayModal({ installment: inst, plan });
                                                                setPayAmount((inst.amount - (inst.paidAmount || 0)).toString());
                                                            }}
                                                        >
                                                            Pay
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Payment Modal */}
            {showPayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="mb-4">
                            <h3 className="text-lg font-bold">Record Installment Payment</h3>
                            <p className="text-sm text-gray-500">
                                {showPayModal.plan.planName} - Installment #{showPayModal.installment.installmentNumber}
                            </p>
                        </div>

                        <form onSubmit={handlePayment} className="space-y-4">
                            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('cash')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${payMethod === 'cash' ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500'}`}
                                >
                                    💵 Cash
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('momo')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${payMethod === 'momo' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200' : 'text-gray-500'}`}
                                >
                                    📱 Mobile Money
                                </button>
                            </div>

                            <Input
                                label="Amount to Pay"
                                type="number"
                                value={payAmount}
                                onChange={e => setPayAmount(e.target.value)}
                                required
                            />

                            {payMethod === 'momo' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
                                            placeholder="256..."
                                            value={momoPhone}
                                            onChange={e => setMomoPhone(e.target.value)}
                                            required={payMethod === 'momo'}
                                        />
                                    </div>
                                    <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                                        ℹ️ Mock Mode: This will simulate a transaction. No real money will be deducted.
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="ghost" onClick={() => setShowPayModal(null)}>Cancel</Button>
                                <Button type="submit" disabled={processingPayment} className={payMethod === 'momo' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : ''}>
                                    {processingPayment ? <Spinner /> : (payMethod === 'momo' ? 'Push Request' : 'Record Payment')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
}
