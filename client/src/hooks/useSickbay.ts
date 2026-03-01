import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/queryClient';
import { useAuth } from '../../../hooks/use-auth';
import {
    MedicalRecord, InsertMedicalRecord,
    SickbayVisit, InsertSickbayVisit,
    SickbayInventory, InsertSickbayInventory,
    SickbayInventoryTransaction, InsertSickbayInventoryTransaction
} from '../../../shared/schema';

// --- Types ---
export interface VisitWithDetails {
    visit: SickbayVisit;
    studentName?: string;
    studentAdmissionNumber?: string;
    handledBy?: string;
}

export interface TransactionWithDetails {
    transaction: SickbayInventoryTransaction;
    item?: string;
    recordedBy?: string;
}

// --- Hooks ---

export function useMedicalRecords(patientId: number, type: 'student' | 'staff') {
    return useQuery<MedicalRecord>({
        queryKey: ['medicalRecord', patientId, type],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/sickbay/records/${type}/${patientId}`);
            // Return null if empty object
            const data = await res.json();
            return Object.keys(data).length === 0 ? null : data;
        },
        enabled: !!patientId
    });
}

export function useUpsertMedicalRecord() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: InsertMedicalRecord) => {
            const res = await apiRequest("POST", "/api/sickbay/records", data);
            return res.json();
        },
        onSuccess: (data) => {
            const patientId = data.studentId || data.userSchoolId;
            const type = data.studentId ? 'student' : 'staff';
            queryClient.invalidateQueries({ queryKey: ['medicalRecord', patientId, type] });
        }
    });
}

export function useSickbayVisits(limit = 50) {
    const { activeSchool } = useAuth();
    return useQuery<VisitWithDetails[]>({
        queryKey: ['sickbayVisits', activeSchool?.id, limit],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/sickbay/visits?limit=${limit}`);
            return res.json();
        },
        enabled: !!activeSchool?.id
    });
}

export function usePatientVisits(patientId: number, type: 'student' | 'staff') {
    return useQuery<VisitWithDetails[]>({
        queryKey: ['patientVisits', patientId, type],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/sickbay/visits/patient/${patientId}?type=${type}`);
            return res.json();
        },
        enabled: !!patientId
    });
}

export function useRecordVisit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: InsertSickbayVisit) => {
            const res = await apiRequest("POST", "/api/sickbay/visits", data);
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sickbayVisits'] });
            if (data.studentId) queryClient.invalidateQueries({ queryKey: ['patientVisits', data.studentId, 'student'] });
            if (data.userSchoolId) queryClient.invalidateQueries({ queryKey: ['patientVisits', data.userSchoolId, 'staff'] });
        }
    });
}

export function useUpdateVisitStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: number, status: string, treatmentGiven?: string, medicationPrescribed?: string }) => {
            const res = await apiRequest("PATCH", `/api/sickbay/visits/${id}/status`, data);
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['sickbayVisits'] });
            if (data.studentId) queryClient.invalidateQueries({ queryKey: ['patientVisits', data.studentId, 'student'] });
            if (data.userSchoolId) queryClient.invalidateQueries({ queryKey: ['patientVisits', data.userSchoolId, 'staff'] });
        }
    });
}

export function useSickbayInventory() {
    const { activeSchool } = useAuth();
    return useQuery<SickbayInventory[]>({
        queryKey: ['sickbayInventory', activeSchool?.id],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/sickbay/inventory");
            return res.json();
        },
        enabled: !!activeSchool?.id
    });
}

export function useAddInventoryItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: InsertSickbayInventory) => {
            const res = await apiRequest("POST", "/api/sickbay/inventory", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sickbayInventory'] });
        }
    });
}

export function useUpdateInventoryItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<InsertSickbayInventory> & { id: number }) => {
            const res = await apiRequest("PATCH", `/api/sickbay/inventory/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sickbayInventory'] });
        }
    });
}

export function useInventoryTransactions() {
    const { activeSchool } = useAuth();
    return useQuery<TransactionWithDetails[]>({
        queryKey: ['sickbayInventoryTransactions', activeSchool?.id],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/sickbay/inventory/transactions");
            return res.json();
        },
        enabled: !!activeSchool?.id
    });
}

export function useRecordInventoryTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: InsertSickbayInventoryTransaction) => {
            const res = await apiRequest("POST", "/api/sickbay/inventory/transactions", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sickbayInventory'] });
            queryClient.invalidateQueries({ queryKey: ['sickbayInventoryTransactions'] });
        }
    });
}
