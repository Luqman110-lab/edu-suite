import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../services/api';

interface FeePayment {
    id: number;
    studentId: number;
    amountPaid: number;
    paymentDate: string;
    term: number;
    year: number;
    // ... other fields
}

interface AddPaymentPayload {
    studentId: number;
    amountPaid: number;
    // ...
}

export const useRecentPayments = (schoolId?: number, limit = 5) => {
    return useQuery({
        queryKey: ['recentPayments', schoolId, limit],
        queryFn: async () => {
            const result = await apiRequest<{ data: FeePayment[] }>('GET', `/fee-payments?limit=${limit}`);
            return result.data;
        },
        enabled: !!schoolId,
        staleTime: 0,
    });
};

export const useAddPayment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payment: AddPaymentPayload) => apiRequest<FeePayment>('POST', '/fee-payments', payment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recentPayments'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] }); // Updates outstanding fees
        },
    });
};
